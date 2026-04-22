/**
 * Hook for triggering and polling custom simulations.
 *
 * Handles the full lifecycle:
 *   1. POST /api/custom-sim with parameters → cache check + trigger
 *   2. If cached: fetch data immediately
 *   3. If triggered/running: poll /api/custom-sim/status for GitHub Actions progress
 *   4. When complete: fetch data from CloudFront
 *
 * Returns the same AggregatedLocationData shape as useLocationData,
 * so the existing AnalysisView/NativeSimulationChart can render it.
 */

import { useState, useCallback, useRef } from 'react';
import type { AggregatedLocationData } from './useCityData';

export type CustomSimStatus =
  | 'idle'
  | 'checking'     // checking cache / triggering
  | 'running'      // workflow running, polling status
  | 'loading'      // fetching completed data
  | 'complete'     // data loaded and ready
  | 'error';

interface CustomSimState {
  status: CustomSimStatus;
  data: AggregatedLocationData | null;
  error: string | null;
  scenarioKey: string | null;
  /** Current step label from the workflow */
  phaseMessage: string | null;
  /** Current workflow phase identifier */
  phase: string | null;
  /** When the workflow started */
  startedAt: string | null;
  /** Live simulation progress from Redis (only during simulating phase) */
  simulationProgress: SimulationProgress | null;
}

interface TriggerResponse {
  status: 'cached' | 'running' | 'triggered';
  scenarioKey: string;
  dataUrl: string;
  runId?: number;
}

interface SimulationProgress {
  percent: number;
  simsComplete: number;
  simsTotal: number;
}

interface StatusResponse {
  status: 'complete' | 'running' | 'failed' | 'not_found';
  dataUrl?: string;
  runId?: number;
  label?: string;
  phase?: string;
  error?: string;
  startedAt?: string;
  simulationProgress?: SimulationProgress;
}

const POLL_INTERVAL_MS = 8000;

/** Phase ordering — never allow regression to an earlier phase */
const PHASE_ORDER: Record<string, number> = {
  queued: 0,
  preparing: 1,
  downloading: 1,
  simulating: 2,
  processing: 3,
  extracting: 3,
  uploading: 4,
  finishing: 4,
  finalizing: 4,
};

function isPhaseForward(current: string | null, next: string | null): boolean {
  if (!current || !next) return true;
  return (PHASE_ORDER[next] ?? 0) >= (PHASE_ORDER[current] ?? 0);
}

export function useCustomSimulation() {
  const [state, setState] = useState<CustomSimState>({
    status: 'idle',
    data: null,
    error: null,
    scenarioKey: null,
    phaseMessage: null,
    phase: null,
    startedAt: null,
    simulationProgress: null,
  });

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    runIdRef.current = null;
  }, []);

  const fetchData = useCallback(async (dataUrl: string): Promise<AggregatedLocationData> => {
    const response = await fetch(dataUrl, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch results: ${response.status}`);
    }
    return response.json();
  }, []);

  const pollForCompletion = useCallback(
    (modelId: string, location: string, scenarioKey: string, dataUrl: string) => {
      const controller = new AbortController();
      abortRef.current = controller;

      const poll = async () => {
        if (controller.signal.aborted) return;

        try {
          const params = new URLSearchParams({
            model: modelId,
            loc: location,
            key: scenarioKey,
          });
          if (runIdRef.current) {
            params.set('runId', String(runIdRef.current));
          }

          const response = await fetch(`/api/custom-sim/status?${params}`, {
            signal: controller.signal,
          });

          if (response.ok) {
            const statusData: StatusResponse = await response.json();

            // Track run ID for efficient subsequent polls
            if (statusData.runId) {
              runIdRef.current = statusData.runId;
            }

            if (statusData.status === 'complete') {
              setState((prev) => ({ ...prev, status: 'loading', phaseMessage: null, phase: null, simulationProgress: null }));

              try {
                const url = statusData.dataUrl || dataUrl;
                const data = await fetchData(url);
                setState({
                  status: 'complete',
                  data,
                  error: null,
                  scenarioKey,
                  phaseMessage: null,
                  phase: null,
                  startedAt: null,
                  simulationProgress: null,
                });
              } catch (err) {
                setState((prev) => ({
                  ...prev,
                  status: 'error',
                  phaseMessage: null,
                  phase: null,
                  simulationProgress: null,
                  error: `Simulation completed but failed to load results: ${err}`,
                }));
              }
              return;
            }

            if (statusData.status === 'failed') {
              setState((prev) => ({
                ...prev,
                status: 'error',
                phaseMessage: null,
                phase: null,
                simulationProgress: null,
                error: statusData.error || 'Simulation failed. Please try again.',
              }));
              return;
            }

            // Update progress info — never regress to an earlier phase
            setState((prev) => {
              const nextPhase = statusData.phase ?? prev.phase;
              const phaseForward = isPhaseForward(prev.phase, nextPhase);
              // Only accept simulation progress if it moves forward (never jump backwards)
              const nextSimProgress = statusData.simulationProgress ?? null;
              const simProgress = nextSimProgress &&
                (!prev.simulationProgress || nextSimProgress.percent >= prev.simulationProgress.percent)
                ? nextSimProgress
                : prev.simulationProgress;
              return {
                ...prev,
                phaseMessage: statusData.label ?? prev.phaseMessage,
                phase: phaseForward ? nextPhase : prev.phase,
                startedAt: statusData.startedAt ?? prev.startedAt,
                simulationProgress: phaseForward && nextPhase !== 'simulating' ? null : simProgress,
              };
            });
          }

          // Not complete yet — poll again
          if (!controller.signal.aborted) {
            pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
          }
        } catch (err) {
          if (controller.signal.aborted) return;

          // Network error during poll — retry
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      };

      poll();
    },
    [fetchData]
  );

  const runSimulation = useCallback(
    async (modelId: string, location: string, parameters: Record<string, number>, email?: string) => {
      cleanup();

      setState({
        status: 'checking',
        data: null,
        error: null,
        scenarioKey: null,
        phaseMessage: null,
        phase: null,
        startedAt: null,
        simulationProgress: null,
      });

      try {
        const response = await fetch('/api/custom-sim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, location, parameters, ...(email && { email }) }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed: ${response.status}`);
        }

        const result: TriggerResponse = await response.json();

        if (result.status === 'cached') {
          // Results already exist — fetch immediately
          setState((prev) => ({ ...prev, status: 'loading', scenarioKey: result.scenarioKey }));

          const data = await fetchData(result.dataUrl);
          setState({
            status: 'complete',
            data,
            error: null,
            scenarioKey: result.scenarioKey,
            phaseMessage: null,
            phase: null,
            startedAt: null,
            simulationProgress: null,
          });
        } else {
          // Running or just triggered — start polling
          if (result.runId) {
            runIdRef.current = result.runId;
          }

          setState((prev) => ({
            ...prev,
            status: 'running',
            scenarioKey: result.scenarioKey,
            phaseMessage: 'Waiting to start...',
            phase: 'queued',
            simulationProgress: null,
          }));

          pollForCompletion(modelId, location, result.scenarioKey, result.dataUrl);
        }
      } catch (err) {
        setState({
          status: 'error',
          data: null,
          error: err instanceof Error ? err.message : 'Unknown error',
          scenarioKey: null,
          phaseMessage: null,
          phase: null,
          startedAt: null,
          simulationProgress: null,
        });
      }
    },
    [cleanup, fetchData, pollForCompletion]
  );

  const reset = useCallback(() => {
    cleanup();
    setState({
      status: 'idle',
      data: null,
      error: null,
      scenarioKey: null,
      phaseMessage: null,
      phase: null,
      startedAt: null,
      simulationProgress: null,
    });
  }, [cleanup]);

  return {
    ...state,
    runSimulation,
    reset,
  };
}
