'use client';
import { useMemo } from 'react';
import MultiStateChartGrid from './MultiStateChartGrid';
import { getMultiStateRaceData } from '@/data/hiv-age-projections-race';
import { getStateCode } from '@/data/hiv-age-catalog';
import type { AgingSelection } from '@/lib/aging-state';
export default function ByRaceView({
  selection,
}: {
  selection: AgingSelection;
}) {
  const states = useMemo(
    () =>
      getMultiStateRaceData(
        selection.states.map(getStateCode),
        selection.races,
      ).map((item) => ({
        state_code: `${item.state_code}_${item.race}`,
        state_name: `${item.state_name} - ${item.race_label}`,
        data: item.data,
      })),
    [selection.states, selection.races],
  );
  return (
    <MultiStateChartGrid
      states={states}
      normalized={selection.normalized}
      yearRange={selection.years}
      ages={selection.ages}
      viewMode="race"
    />
  );
}
