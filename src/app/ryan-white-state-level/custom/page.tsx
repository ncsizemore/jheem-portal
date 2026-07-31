'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ajphStateLevelConfig, croiStateLevelConfig } from '@/config/model-configs';
import CustomSimulationExplorer from '@/components/CustomSimulationExplorer';
import { STATE_CODE_TO_NAME } from '@/data/states';

const MODEL_OPTIONS = [
  { id: 'ajph', label: '11 States (AJPH)', config: ajphStateLevelConfig },
  { id: 'croi', label: '30 States (CROI)', config: croiStateLevelConfig },
] as const;

function CustomSimulationPage() {
  const searchParams = useSearchParams();
  const activeModel = MODEL_OPTIONS.find(m => m.id === searchParams.get('model')) ?? MODEL_OPTIONS[0];

  const locations = useMemo(() => {
    return activeModel.config.locations
      .map((code) => ({ code, name: STATE_CODE_TO_NAME[code] ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeModel]);

  return (
    <CustomSimulationExplorer
      key={activeModel.id}
      config={activeModel.config}
      locations={locations}
      basePath={`/ryan-white-state-level/custom?model=${activeModel.id}`}
      modelSelector={
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span id="custom-model-label" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Model</span>
          <div className="flex flex-wrap gap-1" role="group" aria-labelledby="custom-model-label">
            {MODEL_OPTIONS.map((model) => (
              <Link
                key={model.id}
                href={`/ryan-white-state-level/custom?model=${model.id}`}
                aria-current={activeModel.id === model.id ? 'page' : undefined}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                  activeModel.id === model.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {model.label}
              </Link>
            ))}
          </div>
        </div>
      }
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Custom Simulations</h1>
        <p className="text-slate-500 mt-2 max-w-3xl leading-relaxed">
          Create a permanent-cessation scenario that is not included in the pre-run explorer.
          Choose a state and specify how strongly the loss of three Ryan White service groups
          affects viral suppression, then submit the model to run in the background.
        </p>
      </div>
    </CustomSimulationExplorer>
  );
}

export default function StateLevelCustomSimulationPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CustomSimulationPage />
    </Suspense>
  );
}
