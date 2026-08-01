/** Custom simulation lookup, explicit launch, polling, and result loading. */

import { useState, useCallback, useRef } from 'react';
import type { AggregatedLocationData } from './useCityData';
import {
  selectCustomSimulationProgress,
  type CustomSimulationProgress as SimulationProgress,
} from '@/utils/customSimulationProgress';

export type CustomSimStatus = 'idle' | 'checking' | 'running' | 'loading' | 'complete' | 'error';

interface CustomSimState {
  status: CustomSimStatus;
  data: AggregatedLocationData | null;
  error: string | null;
  scenarioKey: string | null;
  phaseMessage: string | null;
  phase: string | null;
  startedAt: string | null;
  simulationProgress: SimulationProgress | null;
}

interface TriggerResponse {
  status: 'cached' | 'running' | 'triggered' | 'not_found';
  scenarioKey: string;
  requestId: string;
  dataUrl: string;
  runId?: number;
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
const PHASE_ORDER: Record<string, number> = {
  queued: 0, preparing: 1, downloading: 1, loading: 2, simulating: 3,
  saving: 4, extracting: 5, processing: 5, uploading: 6,
  finishing: 6, finalizing: 6,
};

const EMPTY_STATE: CustomSimState = {
  status: 'idle', data: null, error: null, scenarioKey: null,
  phaseMessage: null, phase: null, startedAt: null, simulationProgress: null,
};

function isPhaseForward(current: string | null, next: string | null): boolean {
  if (!current || !next) return true;
  return (PHASE_ORDER[next] ?? 0) >= (PHASE_ORDER[current] ?? 0);
}

export function useCustomSimulation() {
  const [state, setState] = useState<CustomSimState>(EMPTY_STATE);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<number | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const notFoundPollsRef = useRef(0);

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    runIdRef.current = null;
    requestIdRef.current = null;
    notFoundPollsRef.current = 0;
  }, []);

  const fetchData = useCallback(async (dataUrl: string): Promise<AggregatedLocationData> => {
    const response = await fetch(dataUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Failed to fetch results: ${response.status}`);
    return response.json();
  }, []);

  const loadCompletedData = useCallback(async (dataUrl: string, scenarioKey: string) => {
    setState((previous) => ({ ...previous, status: 'loading', scenarioKey, phaseMessage: null, phase: null, simulationProgress: null }));
    const data = await fetchData(dataUrl);
    setState({ ...EMPTY_STATE, status: 'complete', data, scenarioKey });
  }, [fetchData]);

  const pollForCompletion = useCallback((
    modelId: string,
    location: string,
    scenarioKey: string,
    requestId: string,
    dataUrl: string,
  ) => {
    const controller = new AbortController();
    abortRef.current = controller;
    requestIdRef.current = requestId;

    const poll = async () => {
      if (controller.signal.aborted) return;
      try {
        const params = new URLSearchParams({
          model: modelId,
          loc: location,
          key: scenarioKey,
          requestId: requestIdRef.current ?? requestId,
        });
        if (runIdRef.current) params.set('runId', String(runIdRef.current));

        const response = await fetch(`/api/custom-sim/status?${params}`, { signal: controller.signal });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          if (response.status >= 400 && response.status < 500) {
            throw new Error(payload.error || `Status request failed: ${response.status}`);
          }
          throw new TypeError('Transient status service failure');
        }

        const statusData: StatusResponse = await response.json();
        if (statusData.runId) runIdRef.current = statusData.runId;

        if (statusData.status === 'not_found') {
          notFoundPollsRef.current += 1;
          if (notFoundPollsRef.current >= 8) {
            setState((previous) => ({
              ...previous,
              status: 'error',
              error: 'The simulation launch was not registered. Please try again.',
              phaseMessage: null,
              phase: null,
            }));
            return;
          }
        } else {
          notFoundPollsRef.current = 0;
        }

        if (statusData.status === 'complete') {
          try {
            await loadCompletedData(statusData.dataUrl || dataUrl, scenarioKey);
          } catch (error) {
            setState((previous) => ({
              ...previous,
              status: 'error',
              error: `Simulation completed but failed to load results: ${error}`,
              phaseMessage: null,
              phase: null,
              simulationProgress: null,
            }));
          }
          return;
        }

        if (statusData.status === 'failed') {
          setState((previous) => ({
            ...previous,
            status: 'error',
            error: statusData.error || 'Simulation failed. Please try again.',
            phaseMessage: null,
            phase: null,
            simulationProgress: null,
          }));
          return;
        }

        setState((previous) => {
          const nextPhase = statusData.phase ?? previous.phase;
          const nextProgress = statusData.simulationProgress ?? null;
          const phaseForward = isPhaseForward(previous.phase, nextPhase);
          const acceptedPhase = phaseForward
            ? nextPhase
            : previous.phase;
          const simulationProgress = selectCustomSimulationProgress(
            previous.simulationProgress,
            phaseForward ? nextProgress : null,
            previous.phase,
            acceptedPhase,
          );
          return {
            ...previous,
            phaseMessage: statusData.label ?? previous.phaseMessage,
            phase: acceptedPhase,
            startedAt: statusData.startedAt ?? previous.startedAt,
            simulationProgress,
          };
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof Error && !(error instanceof TypeError)) {
          setState((previous) => ({ ...previous, status: 'error', error: error.message }));
          return;
        }
        // Network and 5xx failures are transient; keep the long-running job attached.
      }

      if (!controller.signal.aborted) pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    void poll();
  }, [loadCompletedData]);

  const requestSimulation = useCallback(async (
    action: 'lookup' | 'launch',
    modelId: string,
    location: string,
    parameters: Record<string, number>,
    email?: string,
  ) => {
    cleanup();
    setState({ ...EMPTY_STATE, status: 'checking' });

    try {
      const response = await fetch('/api/custom-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, modelId, location, parameters, ...(email && { email }) }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Request failed: ${response.status}`);
      }

      const result: TriggerResponse = await response.json();
      if (result.status === 'not_found') {
        setState(EMPTY_STATE);
        return;
      }
      if (result.status === 'cached') {
        await loadCompletedData(result.dataUrl, result.scenarioKey);
        return;
      }

      if (result.runId) runIdRef.current = result.runId;
      requestIdRef.current = result.requestId;
      setState({
        ...EMPTY_STATE,
        status: 'running',
        scenarioKey: result.scenarioKey,
        phaseMessage: 'Waiting to start...',
        phase: 'queued',
      });
      pollForCompletion(modelId, location, result.scenarioKey, result.requestId, result.dataUrl);
    } catch (error) {
      setState({
        ...EMPTY_STATE,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [cleanup, loadCompletedData, pollForCompletion]);

  const runSimulation = useCallback((
    modelId: string,
    location: string,
    parameters: Record<string, number>,
    email?: string,
  ) => requestSimulation('launch', modelId, location, parameters, email), [requestSimulation]);

  const resumeSimulation = useCallback((
    modelId: string,
    location: string,
    parameters: Record<string, number>,
  ) => requestSimulation('lookup', modelId, location, parameters), [requestSimulation]);

  const reset = useCallback(() => {
    cleanup();
    setState(EMPTY_STATE);
  }, [cleanup]);

  return { ...state, runSimulation, resumeSimulation, reset };
}
