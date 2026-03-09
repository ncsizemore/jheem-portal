/**
 * Hook for triggering and polling custom simulations.
 *
 * Handles the full lifecycle:
 *   1. POST /api/custom-sim with parameters
 *   2. If cached: fetch data immediately
 *   3. If triggered/running: poll status URL until complete, then fetch data
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
}

interface TriggerResponse {
  status: 'cached' | 'running' | 'triggered';
  scenarioKey: string;
  dataUrl: string;
  statusUrl: string;
  error?: string;
}

const POLL_INTERVAL_MS = 8000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max

export function useCustomSimulation() {
  const [state, setState] = useState<CustomSimState>({
    status: 'idle',
    data: null,
    error: null,
    scenarioKey: null,
  });

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
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
    (statusUrl: string, dataUrl: string, scenarioKey: string, startTime: number) => {
      const controller = new AbortController();
      abortRef.current = controller;

      const poll = async () => {
        if (controller.signal.aborted) return;

        // Check timeout
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: 'Simulation timed out. Please try again.',
          }));
          return;
        }

        try {
          const response = await fetch(statusUrl, { signal: controller.signal });

          if (response.ok) {
            const statusData = await response.json();

            if (statusData.status === 'complete') {
              // Simulation finished — fetch the data
              setState((prev) => ({ ...prev, status: 'loading' }));

              try {
                const data = await fetchData(dataUrl);
                setState({
                  status: 'complete',
                  data,
                  error: null,
                  scenarioKey,
                });
              } catch (err) {
                setState((prev) => ({
                  ...prev,
                  status: 'error',
                  error: `Simulation completed but failed to load results: ${err}`,
                }));
              }
              return;
            }
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
    async (modelId: string, location: string, parameters: Record<string, number>) => {
      cleanup();

      setState({
        status: 'checking',
        data: null,
        error: null,
        scenarioKey: null,
      });

      try {
        const response = await fetch('/api/custom-sim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, location, parameters }),
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
          });
        } else {
          // Running or just triggered — start polling
          setState((prev) => ({
            ...prev,
            status: 'running',
            scenarioKey: result.scenarioKey,
          }));

          pollForCompletion(result.statusUrl, result.dataUrl, result.scenarioKey, Date.now());
        }
      } catch (err) {
        setState({
          status: 'error',
          data: null,
          error: err instanceof Error ? err.message : 'Unknown error',
          scenarioKey: null,
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
    });
  }, [cleanup]);

  return {
    ...state,
    runSimulation,
    reset,
  };
}
