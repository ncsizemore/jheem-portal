'use client';

/**
 * SimulationProgress - Stepped progress bar for custom simulation workflows.
 *
 * Five phases that map to the actual workflow timeline:
 *   1. Setting up (~2 min): GHA checkout, config, download, npm install
 *   2. Loading model (~30s): workspace + base simset loading in R container
 *   3. Simulating (1-10 min): R simulation with live % progress
 *   4. Processing (~5-10 min): data extraction with file count progress
 *   5. Uploading (~30s): aggregate, S3 upload, CloudFront invalidation
 *
 * Phases 1 and 5 come from the GHA step-level API.
 * Phases 2-4 come from Redis (written by report-progress.sh in the workflow).
 */

import { useState, useEffect } from 'react';

const PHASES = [
  { id: 'preparing', label: 'Setting up' },
  { id: 'loading', label: 'Loading model' },
  { id: 'simulating', label: 'Simulating' },
  { id: 'extracting', label: 'Processing' },
  { id: 'uploading', label: 'Uploading' },
] as const;

/** Map API phase values to our display phases */
function consolidatePhase(phase: string | null): string {
  if (!phase) return 'preparing';
  switch (phase) {
    case 'loading': return 'loading';
    case 'simulating': return 'simulating';
    case 'saving': return 'simulating'; // saving is tail end of sim phase
    case 'extracting':
    case 'processing': return 'extracting';
    case 'uploading':
    case 'finishing':
    case 'finalizing': return 'uploading';
    default: return 'preparing'; // queued, downloading, etc.
  }
}

interface SimProgressData {
  phase: string;
  message?: string;
  percent?: number;
  simsComplete?: number;
  simsTotal?: number;
  filesComplete?: number;
  filesTotal?: number;
}

interface SimulationProgressProps {
  phase: string | null;
  phaseMessage: string | null;
  startedAt: string | null;
  simulationProgress: SimProgressData | null;
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

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="mt-4 max-w-sm mx-auto">
      <div className="flex items-center justify-between text-sm text-slate-500 mb-1.5">
        <span>{label}</span>
        <span className="font-medium text-blue-600">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function SimulationProgress({
  phase,
  phaseMessage,
  startedAt,
  simulationProgress,
}: SimulationProgressProps) {
  const displayPhase = consolidatePhase(phase);
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === displayPhase);

  // Build progress bar content based on what data we have
  const progressBar = (() => {
    if (!simulationProgress || simulationProgress.percent == null) return null;

    if (simulationProgress.simsComplete != null && simulationProgress.simsTotal != null) {
      return (
        <ProgressBar
          percent={simulationProgress.percent}
          label={`Simulation ${simulationProgress.simsComplete} of ${simulationProgress.simsTotal}`}
        />
      );
    }

    if (simulationProgress.filesComplete != null && simulationProgress.filesTotal != null) {
      return (
        <ProgressBar
          percent={simulationProgress.percent}
          label={`File ${simulationProgress.filesComplete} of ~${simulationProgress.filesTotal}`}
        />
      );
    }

    return (
      <ProgressBar percent={simulationProgress.percent} label="Processing..." />
    );
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8 max-w-xl mx-auto">
        {PHASES.map((step, i) => {
          const isComplete = currentPhaseIndex > i;
          const isActive = currentPhaseIndex === i;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step dot + label */}
              <div className="flex flex-col items-center min-w-[70px]">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${
                    isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < PHASES.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
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
        {/* Phase message + spinner */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-700 font-medium">
            {phaseMessage ?? 'Starting up...'}
          </p>
        </div>

        {/* Progress bar (simulation % or extraction file count) */}
        {progressBar}

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
