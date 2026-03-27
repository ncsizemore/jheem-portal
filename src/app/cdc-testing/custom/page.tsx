'use client';

import { Suspense, useMemo } from 'react';
import { cdcTestingConfig } from '@/config/model-configs';
import CustomSimulationExplorer from '@/components/CustomSimulationExplorer';
import { STATE_CODE_TO_NAME } from '@/data/states';

export default function CDCTestingCustomSimulationPage() {
  const locations = useMemo(() => {
    return cdcTestingConfig.locations
      .map((code) => ({ code, name: STATE_CODE_TO_NAME[code] ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <Suspense fallback={
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CustomSimulationExplorer
        config={cdcTestingConfig}
        locations={locations}
        basePath="/cdc-testing/custom"
      />
    </Suspense>
  );
}
