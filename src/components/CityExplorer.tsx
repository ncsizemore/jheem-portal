'use client';

import {
  useAnalysisQuery,
  useAnalysisReady,
  updateAnalysisQuery,
} from '@/hooks/useAnalysisQuery';
import { ALL_CITIES } from '@/data/cities';
import { ryanWhiteConfig } from '@/config/model-configs';
import AnalysisView from '@/components/AnalysisView';
import ExplorerFrame from '@/components/analysis/ExplorerFrame';
import CityExplorerMap from '@/components/maps/CityExplorerMap';
const locations = ALL_CITIES.filter((city) =>
  ryanWhiteConfig.locations.includes(city.code),
);

export default function CityExplorer() {
  const ready = useAnalysisReady();
  const query = useAnalysisQuery();
  const location = locations.find((city) => city.code === query.get('loc'));
  return (
    <ExplorerFrame
      ready={ready}
      map={<CityExplorerMap />}
      analysis={
        location ? (
          <AnalysisView
            config={ryanWhiteConfig}
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
