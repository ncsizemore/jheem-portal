'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchRyanWhiteCostingSeries,
  ryanWhiteCostingMetadata,
  ryanWhiteCostingSummary,
  type CostScenarioId,
  type RyanWhiteCostingSeries,
} from '@/data/ryan-white-costing';
import {
  buildRankedStates,
  buildRatioLeaders,
  buildScenarioComparison,
  buildTrajectoryData,
  finalForLocation,
  formatBillions,
  formatCompactDollars,
  formatNumber,
  formatPercent,
  formatRatio,
  LocationKey,
  scenarioMetric,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  SCENARIO_SHORT_LABELS,
  seriesForLocation,
  stateName,
} from './view-model';

function Metric({
  label,
  value,
  detail,
  accent = 'slate',
}: {
  label: string;
  value: string;
  detail: string;
  accent?: 'slate' | 'teal' | 'amber' | 'sky';
}) {
  const accentClass = {
    slate: 'border-l-slate-500',
    teal: 'border-l-teal-600',
    amber: 'border-l-amber-500',
    sky: 'border-l-sky-500',
  }[accent];

  return (
    <div className={`border-l-4 ${accentClass} bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200`}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-950">{value}</p>
      <p className="mt-1 text-sm leading-snug text-gray-600">{detail}</p>
    </div>
  );
}

function ToolPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
      {children}
    </span>
  );
}

function LegendItem({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
      <span
        className={`h-0.5 w-6 ${dashed ? 'border-t-2 border-dashed bg-transparent' : ''}`}
        style={dashed ? { borderColor: color } : { backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export default function RyanWhiteCostingApp() {
  const [scenario, setScenario] = useState<CostScenarioId>(
    ryanWhiteCostingSummary.sensitivity.primaryScenario
  );
  const [location, setLocation] = useState<LocationKey>(ryanWhiteCostingMetadata.defaultFocusState);
  const [series, setSeries] = useState<RyanWhiteCostingSeries | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchRyanWhiteCostingSeries()
      .then((data) => {
        if (!cancelled) {
          setSeries(data);
          setSeriesError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSeriesError(error instanceof Error ? error.message : 'Unable to load costing series');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const nationalFinal = ryanWhiteCostingSummary.national.finalYear;
  const selectedFinal = finalForLocation(ryanWhiteCostingSummary, location);
  const selectedSeries = seriesForLocation(series, location);
  const trajectory = useMemo(() => buildTrajectoryData(selectedSeries, scenario), [selectedSeries, scenario]);
  const rankedStates = useMemo(
    () => buildRankedStates(ryanWhiteCostingSummary.states, scenario),
    [scenario]
  );
  const ratioLeaders = useMemo(
    () => buildRatioLeaders(ryanWhiteCostingSummary.states, scenario),
    [scenario]
  );
  const scenarioComparison = useMemo(
    () => buildScenarioComparison(nationalFinal),
    [nationalFinal]
  );

  const nationalCare = scenarioMetric(nationalFinal.cumulativeCareCost, scenario);
  const nationalNet = scenarioMetric(nationalFinal.cumulativeNetCostVsAdap, scenario);
  const selectedCare = scenarioMetric(selectedFinal.cumulativeCareCost, scenario);
  const selectedNet = scenarioMetric(selectedFinal.cumulativeNetCostVsAdap, scenario);
  const selectedRatio = scenarioMetric(selectedFinal.cumulativeNetCostRatioVsAdap, scenario);
  const selectedName = location === 'Total' ? 'National total' : stateName(location);

  const locationOptions = useMemo(
    () => [
      { code: 'Total', label: 'National total' },
      ...ryanWhiteCostingMetadata.modeledStates.map((code) => ({
        code,
        label: stateName(code),
      })),
    ],
    []
  );

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f6f7f9] text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span className="font-semibold text-hopkins-blue">Ryan White ADAP</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>Economic review workspace</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>
                  {ryanWhiteCostingMetadata.horizon.startYear}-
                  {ryanWhiteCostingMetadata.horizon.endYear}
                </span>
              </div>
              <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-gray-950 sm:text-4xl">
                ADAP elimination costing preview
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                A review-oriented economic lens on downstream HIV care costs for excess incident
                infections, compared against deterministic Ryan White funding benchmarks in{' '}
                {ryanWhiteCostingMetadata.dollarYear}.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ToolPill>30 modeled states</ToolPill>
                <ToolPill>DC excluded from national totals</ToolPill>
                <ToolPill>95% simulation interval</ToolPill>
                <ToolPill>Net language pending payer perspective review</ToolPill>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="grid gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Cost scenario
                </label>
                <div className="grid grid-cols-3 rounded-md border border-gray-200 bg-white p-1">
                  {SCENARIO_ORDER.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setScenario(item)}
                      className={`min-h-9 rounded px-3 text-sm font-semibold transition-colors ${
                        scenario === item
                          ? 'bg-hopkins-blue text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                      }`}
                    >
                      {SCENARIO_SHORT_LABELS[item]}
                    </button>
                  ))}
                </div>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Focus location
                  <select
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="min-h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-gray-900 shadow-sm outline-none focus:border-hopkins-blue focus:ring-2 focus:ring-hopkins-blue/20"
                  >
                    {locationOptions.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              National interpretation under current perspective
            </p>
            <div className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
              <div>
                <p className="text-3xl font-semibold leading-tight text-gray-950 sm:text-4xl">
                  {formatBillions(nationalNet.median)} net cost vs ADAP benchmark
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                  Median downstream care cost is {formatBillions(nationalCare.median)}, compared with{' '}
                  {formatBillions(nationalFinal.cumulativeAdapSpendingAvoided)} in deterministic ADAP
                  spending avoided. This is not a payer-perspective conclusion until the counterfactual
                  is reviewed.
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-4 ring-1 ring-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Uncertainty interval
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-950">
                  {formatBillions(nationalNet.lower)} to {formatBillions(nationalNet.upper)}
                </p>
                <p className="mt-1 text-sm text-gray-600">Care-cost simulation paths shifted by fixed funding.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Metric
              label="Excess diagnoses"
              value={formatNumber(nationalFinal.cumulativeExcessNewDiagnoses.median)}
              detail={`${formatNumber(nationalFinal.cumulativePersonYearsOnArt.median)} cumulative ART person-years`}
              accent="sky"
            />
            <Metric
              label="ADAP spending avoided"
              value={formatBillions(nationalFinal.cumulativeAdapSpendingAvoided)}
              detail="Deterministic state funding CSV, summed over modeled states"
              accent="teal"
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
          <div className="self-start rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">Cost trajectory</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedName} · {SCENARIO_LABELS[scenario]}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <LegendItem color="#c7d2fe" label="Care-cost interval" />
                <LegendItem color="#002D72" label="Care median" />
                <LegendItem color="#0f766e" label="ADAP benchmark" />
                <LegendItem color="#64748b" label="Total RWHAP" dashed />
              </div>
            </div>
            <div className="h-[440px] p-3 sm:p-5">
              {seriesError ? (
                <div className="flex h-full items-center justify-center rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                  {seriesError}
                </div>
              ) : trajectory.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-500">
                  Loading cost series
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trajectory} margin={{ top: 12, right: 16, bottom: 8, left: 6 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={formatBillions}
                      tickLine={false}
                      axisLine={false}
                      width={76}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const key = String(name);
                        const labels: Record<string, string> = {
                          careMedian: 'Care cost median',
                          careLower: 'Care cost lower',
                          careUpper: 'Care cost upper',
                          adap: 'ADAP spending avoided',
                          totalRwhap: 'Total RWHAP benchmark',
                          netMedian: 'Net cost vs ADAP',
                        };
                        return [formatBillions(Number(value)), labels[key] ?? key];
                      }}
                      labelFormatter={(value) => `Year ${value}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="careLower"
                      stackId="care"
                      stroke="none"
                      fill="transparent"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="careBand"
                      stackId="care"
                      stroke="none"
                      fill="#c7d2fe"
                      fillOpacity={0.55}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="careMedian"
                      stroke="#002D72"
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="adap"
                      stroke="#0f766e"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalRwhap"
                      stroke="#64748b"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="netMedian"
                      stroke="#b45309"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">State lens</h2>
              <p className="mt-1 text-sm text-gray-500">{selectedName}</p>
            </div>
            <div className="grid gap-4 p-4">
              <Metric
                label="Care cost"
                value={formatBillions(selectedCare.median)}
                detail={`${formatBillions(selectedCare.lower)} to ${formatBillions(selectedCare.upper)} interval`}
              />
              <Metric
                label="Net cost vs ADAP"
                value={formatBillions(selectedNet.median)}
                detail={`Final-year ratio ${formatRatio(selectedRatio.median)}; ${formatNumber(selectedFinal.cumulativeExcessNewDiagnoses.median)} excess diagnoses`}
                accent="amber"
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border-t border-gray-200 pt-3">
                  <p className="font-medium text-gray-500">ADAP benchmark</p>
                  <p className="mt-1 text-lg font-semibold text-gray-950">
                    {formatBillions(selectedFinal.cumulativeAdapSpendingAvoided)}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <p className="font-medium text-gray-500">Total RWHAP</p>
                  <p className="mt-1 text-lg font-semibold text-gray-950">
                    {formatBillions(selectedFinal.cumulativeTotalRwhapSpendingAvoided)}
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-blue-50 p-3 text-sm leading-6 text-gray-700 ring-1 ring-blue-100">
                Immediate-start and reengagement assumptions drive the ART person-year path. This panel
                is a review target, not a final payer conclusion.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">Where the ratio is largest</h2>
              <p className="mt-1 text-sm text-gray-500">Final-year net cost divided by ADAP benchmark</p>
            </div>
            <div className="h-[390px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ratioLeaders}
                  layout="vertical"
                  margin={{ top: 4, right: 18, bottom: 4, left: 36 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatRatio} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="stateName"
                    width={108}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name, item) => {
                      if (name === 'netRatio') return [formatRatio(Number(value)), 'Net-cost ratio'];
                      return [formatCompactDollars(Number(item.payload.netCost)), 'Net cost'];
                    }}
                  />
                  <Bar dataKey="netRatio" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {ratioLeaders.map((item) => (
                      <Cell key={item.state} fill={item.state === location ? '#002D72' : '#0f766e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">State comparison</h2>
              <p className="mt-1 text-sm text-gray-500">Sorted by final-year net cost vs ADAP</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-left text-xs">
                <thead className="bg-gray-50 text-[0.7rem] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold">State</th>
                    <th className="px-3 py-3 font-semibold">Care</th>
                    <th className="px-3 py-3 font-semibold">ADAP</th>
                    <th className="px-3 py-3 font-semibold">Net</th>
                    <th className="px-3 py-3 font-semibold">Ratio</th>
                    <th className="px-3 py-3 font-semibold">Excess dx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rankedStates.map((item) => (
                    <tr
                      key={item.state}
                      onClick={() => setLocation(item.state)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        item.state === location ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="px-3 py-3 font-semibold text-gray-950">
                        {item.stateName}
                        <span className="ml-2 text-xs font-medium text-gray-400">{item.state}</span>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{formatCompactDollars(item.careCost)}</td>
                      <td className="px-3 py-3 text-gray-700">{formatCompactDollars(item.adapBenchmark)}</td>
                      <td className="px-3 py-3 font-semibold text-gray-950">
                        {formatCompactDollars(item.netCost)}
                      </td>
                      <td className="px-3 py-3 text-gray-700">{formatRatio(item.netRatio)}</td>
                      <td className="px-3 py-3 text-gray-700">{formatNumber(item.excessDiagnoses)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">National sensitivity</h2>
              <p className="mt-1 text-sm text-gray-500">
                Final-year results across ART drug-cost assumptions
              </p>
            </div>
            <div className="grid gap-0 divide-y divide-gray-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              {scenarioComparison.map((item) => (
                <button
                  key={item.scenario}
                  type="button"
                  onClick={() => setScenario(item.scenario)}
                  className={`p-4 text-left transition-colors hover:bg-slate-50 ${
                    scenario === item.scenario ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {item.label} scenario
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-gray-950">
                    {formatBillions(item.netMedian)}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Net vs ADAP · ratio {formatRatio(item.ratioMedian)}
                  </p>
                  <p className="mt-3 text-sm text-gray-500">
                    Care cost {formatBillions(item.careMedian)} ({formatBillions(item.careLower)} to{' '}
                    {formatBillions(item.careUpper)})
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Validation snapshot</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">Total equals states</dt>
                <dd className="font-semibold text-gray-950">
                  {ryanWhiteCostingMetadata.validation.totalEqualsStateSum ? 'Passed' : 'Failed'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">Excluded funding locations</dt>
                <dd className="font-semibold text-gray-950">
                  {ryanWhiteCostingMetadata.excludedFundingLocations.join(', ') || 'None'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">Negative excess-new draws</dt>
                <dd className="font-semibold text-gray-950">
                  {ryanWhiteCostingMetadata.validation.negativeExcessNewCount} ·{' '}
                  {formatPercent(ryanWhiteCostingMetadata.validation.negativeExcessNewShare)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Funding adjustment</dt>
                <dd className="mt-1 leading-6 text-gray-700">
                  {ryanWhiteCostingMetadata.fundingAdjustment.description}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Model assumptions to review</h2>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-gray-500">Reengagement</p>
                <p className="mt-1 text-gray-950">
                  pi {ryanWhiteCostingMetadata.modelParameters.reengagementPi}, lambda{' '}
                  {ryanWhiteCostingMetadata.modelParameters.reengagementLambda}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Discount rate</p>
                <p className="mt-1 text-gray-950">
                  {formatPercent(ryanWhiteCostingMetadata.modelParameters.discountRate)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Routine care cost</p>
                <p className="mt-1 text-gray-950">
                  {formatCompactDollars(ryanWhiteCostingMetadata.modelParameters.routineCareCost)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Drug tiers</p>
                <p className="mt-1 text-gray-950">
                  {SCENARIO_ORDER.map((item) =>
                    formatCompactDollars(ryanWhiteCostingMetadata.modelParameters.artDrugCosts[item])
                  ).join(' / ')}
                </p>
              </div>
            </div>
            <p className="mt-5 rounded-md bg-gray-50 p-3 text-sm leading-6 text-gray-600 ring-1 ring-gray-200">
              {ryanWhiteCostingMetadata.modelParameters.immediateStartCareFractionDescription}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Open review queue</h2>
            <ol className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
              {ryanWhiteCostingMetadata.reviewQuestions.map((question, index) => (
                <li key={question} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
                  <span className="font-semibold text-hopkins-blue">{index + 1}.</span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              The page intentionally uses "ADAP spending avoided" and "net cost under current
              perspective" language until payer perspective and downstream eligibility are settled.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
