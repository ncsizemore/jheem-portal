'use client';

import dynamic from 'next/dynamic';
import {
  useAnalysisQuery,
  useAnalysisReady,
  updateAnalysisQuery,
} from '@/hooks/useAnalysisQuery';
import { ALL_CITIES } from '@/data/cities';
import { ryanWhiteConfig } from '@/config/model-configs';
import AnalysisView from '@/components/AnalysisView';
import ExplorerFrame from '@/components/analysis/ExplorerFrame';
import ExplorerLoading from '@/components/analysis/ExplorerLoading';

const CityExplorerMap = dynamic(
  () => import('@/components/maps/CityExplorerMap'),
  {
    ssr: false,
    loading: ExplorerLoading,
  },
);
const locations = ALL_CITIES.filter((city) =>
  ryanWhiteConfig.locations.includes(city.code),
);

export default function ExploreV2() {
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
