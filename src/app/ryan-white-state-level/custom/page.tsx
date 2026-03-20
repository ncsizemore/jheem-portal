'use client';

import { Suspense, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ajphStateLevelConfig, croiStateLevelConfig } from '@/config/model-configs';
import CustomSimulationExplorer from '@/components/CustomSimulationExplorer';
import { STATE_CODE_TO_NAME } from '@/data/states';

const MODEL_OPTIONS = [
  { id: 'ajph', label: '11 States (AJPH)', config: ajphStateLevelConfig },
  { id: 'croi', label: '30 States (CROI)', config: croiStateLevelConfig },
] as const;

function CustomSimulationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialModel = MODEL_OPTIONS.find(m => m.id === searchParams.get('model')) ?? MODEL_OPTIONS[0];
  const [activeModel, setActiveModel] = useState(initialModel);

  const handleModelChange = useCallback((model: typeof MODEL_OPTIONS[number]) => {
    setActiveModel(model);
    router.replace(`/ryan-white-state-level/custom?model=${model.id}`, { scroll: false });
  }, [router]);

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
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Model:</span>
          <div className="flex gap-1">
            {MODEL_OPTIONS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelChange(model)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeModel.id === model.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>
        </div>
      }
    />
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
