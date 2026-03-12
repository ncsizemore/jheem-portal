'use client';

/**
 * SimulationProgress - Stepped progress bar for custom simulation workflows.
 *
 * Based on actual timing data from completed runs:
 *   - Preparing (~30s): checkout, config, download, npm install
 *   - Simulating (10-20 min): the R container simulation
 *   - Finishing (~10s): aggregate, upload, CloudFront invalidation
 *
 * Shows simulation % progress bar during the simulating phase
 * and a live elapsed time counter.
 */

import { useState, useEffect } from 'react';
import type { SimulationProgress as SimProgress } from '@/hooks/useCustomSimulation';

const PHASES = [
  { id: 'preparing', label: 'Preparing', description: 'Setting up environment' },
  { id: 'simulating', label: 'Simulating', description: 'Running simulation' },
  { id: 'finishing', label: 'Finishing', description: 'Processing & uploading' },
] as const;

/** Map API phase values to our consolidated phases */
function consolidatePhase(phase: string | null): string {
  if (!phase) return 'preparing';
  if (phase === 'simulating') return 'simulating';
  if (phase === 'processing' || phase === 'uploading') return 'finishing';
  return 'preparing'; // queued, downloading, and all setup phases
}

interface SimulationProgressProps {
  phase: string | null;
  phaseMessage: string | null;
  simulationProgress: SimProgress | null;
  startedAt: string | null;
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const start = new Date(startedAt).getTime();

    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span>{elapsed}</span>;
}

export default function SimulationProgress({
  phase,
  phaseMessage,
  simulationProgress,
  startedAt,
}: SimulationProgressProps) {
  const displayPhase = consolidatePhase(phase);
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === displayPhase);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8 max-w-lg mx-auto">
        {PHASES.map((step, i) => {
          const isComplete = currentPhaseIndex > i;
          const isActive = currentPhaseIndex === i;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step dot + label */}
              <div className="flex flex-col items-center min-w-[80px]">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-sm mt-2 font-medium ${
                    isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < PHASES.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 mt-[-1.5rem] ${
                    isComplete ? 'bg-green-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="text-center">
        {/* Simulation progress bar */}
        {displayPhase === 'simulating' && simulationProgress && (
          <div className="max-w-sm mx-auto mb-5">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-slate-600 font-medium">
                Simulation {simulationProgress.current} of {simulationProgress.total}
              </span>
              <span className="text-blue-600 font-semibold">{simulationProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${simulationProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Phase message + spinner */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-700 font-medium">
            {phaseMessage ?? 'Running simulation...'}
          </p>
        </div>

        {/* Elapsed time */}
        {startedAt && (
          <p className="text-slate-400 text-sm mt-2">
            Elapsed: <ElapsedTime startedAt={startedAt} />
          </p>
        )}
      </div>
    </div>
  );
}
