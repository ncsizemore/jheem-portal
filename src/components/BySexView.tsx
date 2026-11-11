'use client';
import { useMemo } from 'react';
import MultiStateChartGrid from './MultiStateChartGrid';
import { getMultiStateSexData } from '@/data/hiv-age-projections-sex';
import { getStateCode } from '@/data/hiv-age-catalog';
import type { AgingSelection } from '@/lib/aging-state';
export default function BySexView({
  selection,
}: {
  selection: AgingSelection;
}) {
  const states = useMemo(
    () =>
      getMultiStateSexData(
        selection.states.map(getStateCode),
        selection.sex,
      ).map((item) => ({
        state_code: `${item.state_code}_${item.sex}`,
        state_name: `${item.state_name} - ${item.sex_label}`,
        data: item.data,
      })),
    [selection.states, selection.sex],
  );
  return (
    <MultiStateChartGrid
      states={states}
      normalized={selection.normalized}
      yearRange={selection.years}
      ages={selection.ages}
      viewMode="sex"
    />
  );
}
