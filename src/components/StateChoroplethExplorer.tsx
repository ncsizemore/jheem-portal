'use client';

import { useMemo } from 'react';
import {
  useAnalysisQuery,
  useAnalysisReady,
  updateAnalysisQuery,
} from '@/hooks/useAnalysisQuery';
import type { ModelConfig } from '@/config/model-configs';
import { STATE_CODE_TO_NAME } from '@/data/states';
import AnalysisView from '@/components/AnalysisView';
import ExplorerFrame from '@/components/analysis/ExplorerFrame';
import StateExplorerMap from '@/components/maps/StateExplorerMap';

export default function StateChoroplethExplorer({
  config,
}: {
  config: ModelConfig;
}) {
  const ready = useAnalysisReady();
  const query = useAnalysisQuery();
  const locations = useMemo(
    () =>
      config.locations
        .map((code) => ({
          code,
          name: STATE_CODE_TO_NAME[code] || code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [config.locations],
  );
  const location = locations.find((state) => state.code === query.get('loc'));
  return (
    <ExplorerFrame
      key={config.id}
      ready={ready}
      map={<StateExplorerMap key={config.id} config={config} />}
      analysis={
        location ? (
          <AnalysisView
            key={config.id}
            config={config}
            locationCode={location.code}
            availableLocations={locations}
            onLocationChange={(code) => updateAnalysisQuery({ loc: code })}
            onBackToMap={() => updateAnalysisQuery({ loc: null })}
          />
        ) : null
      }
    />
  );
}
