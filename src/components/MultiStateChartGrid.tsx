'use client';
import { memo, useMemo, useRef, useState } from 'react';
import AgeDistributionChart from './AgeDistributionChart';
import {
  AGE_COHORT_COLORS,
  type StateAgeData,
  transformDataForChart,
} from '@/data/hiv-age-projections';
import { AGES, type AgeGroup } from '@/lib/aging-state';
import { exportToCSV, type ViewMode } from '@/utils/csvExport';
interface Props {
  states: StateAgeData[];
  normalized?: boolean;
  yearRange?: [number, number];
  ages?: readonly AgeGroup[];
  viewMode?: ViewMode;
}
const DEFAULT_YEARS: [number, number] = [2025, 2040];
function MultiStateChartGrid({
  states,
  normalized = false,
  yearRange = DEFAULT_YEARS,
  ages = AGES,
  viewMode = 'state',
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const chartData = useMemo(
    () => transformDataForChart(states, yearRange, normalized),
    [states, yearRange, normalized],
  );
  async function exportPng() {
    if (!root.current) return;
    setExporting(true);
    setStatus('Preparing image…');
    try {
      const { exportAgingCharts } = await import('@/utils/exportAgingCharts');
      await exportAgingCharts(
        root.current,
        `${yearRange[0]}–${yearRange[1]} · ${normalized ? 'Percent of all age groups' : 'People with diagnosed HIV; count scales vary by panel'}`,
        ages.map((age) => ({ label: age, color: AGE_COHORT_COLORS[age] })),
      );
      setStatus('Image downloaded.');
    } catch {
      setStatus(
        'The image could not be exported. Please try again; CSV remains available.',
      );
    } finally {
      setExporting(false);
    }
  }
  if (!states.length)
    return (
      <p
        role="status"
        className="border-y border-rule py-12 text-sm text-muted"
      >
        Choose at least one state to view projections.
      </p>
    );
  return (
    <section aria-label="Age distribution results" data-testid="aging-results">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h3 className="text-base font-medium">
            {normalized ? 'Age distribution' : 'People with diagnosed HIV'} ·{' '}
            {yearRange[0]}–{yearRange[1]}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {normalized
              ? 'Percentages use all five age groups as the denominator, including any hidden groups.'
              : 'Count scales vary by panel. Use Percentage to compare age profiles across populations.'}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <button
            type="button"
            onClick={exportPng}
            disabled={exporting}
            className="editorial-link min-h-11 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Download PNG'}
          </button>
          <button
            type="button"
            onClick={() =>
              exportToCSV(states, yearRange, normalized, viewMode, ages)
            }
            className="editorial-link min-h-11"
          >
            Download CSV
          </button>
        </div>
      </div>
      <p role="status" className="mt-2 text-sm text-muted">
        {status}
      </p>

      <div
        ref={root}
        className={`mt-5 grid gap-x-9 gap-y-10 ${states.length === 1 ? 'grid-cols-1' : states.length <= 4 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}
      >
        {states.map((state) => (
          <AgeDistributionChart
            key={state.state_code}
            data={chartData}
            statePrefix={state.state_name.replace(/\s+/g, '_')}
            stateName={state.state_name}
            normalized={normalized}
            height={states.length > 4 ? 300 : 340}
            ages={ages}
          />
        ))}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Bars show median projections for each age group across 1,000
        simulations; uncertainty intervals are not shown. “Combined study
        states” covers the 24 modeled states, not the entire United States.
      </p>
    </section>
  );
}
export default memo(MultiStateChartGrid);
