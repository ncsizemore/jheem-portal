'use client';

import { Suspense, useMemo } from 'react';
import { ryanWhiteConfig } from '@/config/model-configs';
import CustomSimulationExplorer from '@/components/CustomSimulationExplorer';
import { ALL_CITIES } from '@/data/cities';

export default function CustomSimulationPage() {
  const locations = useMemo(() => {
    const locationSet = new Set(ryanWhiteConfig.locations);
    return ALL_CITIES
      .filter((c) => locationSet.has(c.code))
      .map((c) => ({ code: c.code, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <Suspense fallback={
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CustomSimulationExplorer
        config={ryanWhiteConfig}
        locations={locations}
        basePath="/ryan-white/custom"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Custom Simulations</h1>
          <p className="text-slate-500 mt-1">
            Explore custom Ryan White funding scenarios by adjusting suppression loss parameters.
          </p>
        </div>
      </CustomSimulationExplorer>
    </Suspense>
  );
}
