'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchRyanWhiteCostingSeries,
  ryanWhiteCostingMetadata,
  ryanWhiteCostingSummary,
  type AnnualCostPoint,
  type CostScenarioId,
  type FinalYearSummary,
  type RyanWhiteCostingSeries,
  type ScenarioValues,
} from '@/data/ryan-white-costing';
import { STATE_CODE_TO_NAME } from '@/data/states';

type LocationKey = 'Total' | string;

interface ChartPoint {
  year: number;
  careMedian: number;
  careLower: number;
  careUpper: number;
  adap: number;
  totalRwhap: number;
  netMedian: number;
  excessDiagnoses: number;
}

const SCENARIO_LABELS: Record<CostScenarioId, string> = {
  low: 'Low drug cost',
  median: 'Median drug cost',
  high: 'High drug cost',
};

const SCENARIO_ORDER: CostScenarioId[] = ['low', 'median', 'high'];

function stateName(code: string): string {
  return STATE_CODE_TO_NAME[code] ?? code;
}

function formatBillions(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  return `${sign}$${(abs / 1_000_000_000).toLocaleString('en-US', {
    maximumFractionDigits: abs >= 10_000_000_000 ? 1 : 2,
  })}B`;
}

function formatCompactDollars(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function scenarioMetric(values: ScenarioValues, scenario: CostScenarioId) {
  return values[scenario];
}

function buildChartData(points: AnnualCostPoint[], scenario: CostScenarioId): ChartPoint[] {
  return points.map((point) => {
    const care = scenarioMetric(point.cumulativeCareCost, scenario);
    const net = scenarioMetric(point.cumulativeNetCostVsAdap, scenario);

    return {
      year: point.year,
      careMedian: care.median,
      careLower: care.lower,
      careUpper: care.upper,
      adap: point.cumulativeAdapSpendingAvoided,
      totalRwhap: point.cumulativeTotalRwhapSpendingAvoided,
      netMedian: net.median,
      excessDiagnoses: point.cumulativeExcessNewDiagnoses.median,
    };
  });
}

function finalForLocation(location: LocationKey): FinalYearSummary {
  if (location === 'Total') {
    return ryanWhiteCostingSummary.national.finalYear;
  }

  return (
    ryanWhiteCostingSummary.states.find((item) => item.state === location)?.finalYear ??
    ryanWhiteCostingSummary.national.finalYear
  );
}

function seriesForLocation(
  series: RyanWhiteCostingSeries | null,
  location: LocationKey
): AnnualCostPoint[] {
  if (!series) return [];
  if (location === 'Total') return series.national;
  return series.states[location] ?? [];
}

function MetricTile({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'funding' | 'net' | 'cases';
}) {
  const toneClass = {
    default: 'border-gray-200 bg-white',
    funding: 'border-emerald-200 bg-emerald-50',
    net: 'border-amber-200 bg-amber-50',
    cases: 'border-sky-200 bg-sky-50',
  }[tone];

  return (
    <div className={`rounded-lg border ${toneClass} p-4 min-h-[132px]`}>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-950">{value}</p>
      {detail && <p className="mt-2 text-sm leading-snug text-gray-600">{detail}</p>}
    </div>
  );
}

export default function RyanWhiteCostingPage() {
  const [scenario, setScenario] = useState<CostScenarioId>(
    ryanWhiteCostingSummary.sensitivity.primaryScenario
  );
  const [selectedLocation, setSelectedLocation] = useState<LocationKey>(
    ryanWhiteCostingMetadata.defaultFocusState
  );
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
          setSeriesError(error instanceof Error ? error.message : 'Unable to load series data');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const nationalFinal = ryanWhiteCostingSummary.national.finalYear;
  const nationalCare = scenarioMetric(nationalFinal.cumulativeCareCost, scenario);
  const nationalNet = scenarioMetric(nationalFinal.cumulativeNetCostVsAdap, scenario);
  const nationalRatio = scenarioMetric(nationalFinal.cumulativeNetCostRatioVsAdap, scenario);

  const selectedFinal = finalForLocation(selectedLocation);
  const selectedPoints = seriesForLocation(series, selectedLocation);
  const chartData = useMemo(
    () => buildChartData(selectedPoints, scenario),
    [selectedPoints, scenario]
  );

  const rankedStates = useMemo(() => {
    return [...ryanWhiteCostingSummary.states].sort((a, b) => {
      const bValue = scenarioMetric(b.finalYear.cumulativeNetCostVsAdap, scenario).median;
      const aValue = scenarioMetric(a.finalYear.cumulativeNetCostVsAdap, scenario).median;
      return bValue - aValue;
    });
  }, [scenario]);

  const ratioBars = useMemo(() => {
    return [...ryanWhiteCostingSummary.states]
      .map((item) => ({
        state: item.state,
        stateName: stateName(item.state),
        ratio: scenarioMetric(item.finalYear.cumulativeNetCostRatioVsAdap, scenario).median,
        net: scenarioMetric(item.finalYear.cumulativeNetCostVsAdap, scenario).median,
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);
  }, [scenario]);

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

  const selectedLabel = selectedLocation === 'Total' ? 'National total' : stateName(selectedLocation);
  const selectedCare = scenarioMetric(selectedFinal.cumulativeCareCost, scenario);
  const selectedNet = scenarioMetric(selectedFinal.cumulativeNetCostVsAdap, scenario);

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-50 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span className="font-medium text-hopkins-blue">Ryan White ADAP</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>Economic analysis preview</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>
                  {ryanWhiteCostingMetadata.horizon.startYear}-
                  {ryanWhiteCostingMetadata.horizon.endYear}
                </span>
              </div>
              <h1 className="text-3xl font-semibold leading-tight text-gray-950 sm:text-4xl">
                ADAP elimination costing preview
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                Static preview of downstream HIV care costs for excess incident infections compared with
                deterministic Ryan White funding benchmarks. Values are shown in{' '}
                {ryanWhiteCostingMetadata.dollarYear}.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-gray-700">Cost scenario</span>
              <div className="grid grid-cols-3 rounded-md border border-gray-200 bg-white p-1">
                {SCENARIO_ORDER.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setScenario(item)}
                    className={`min-h-9 px-3 text-sm font-medium transition-colors ${
                      scenario === item
                        ? 'rounded bg-hopkins-blue text-white'
                        : 'rounded text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                    }`}
                  >
                    {item[0].toUpperCase() + item.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Downstream care cost"
            value={formatBillions(nationalCare.median)}
            detail={`${formatBillions(nationalCare.lower)} to ${formatBillions(nationalCare.upper)} interval`}
          />
          <MetricTile
            label="ADAP spending avoided"
            value={formatBillions(nationalFinal.cumulativeAdapSpendingAvoided)}
            detail="Deterministic funding comparator from the state funding CSV"
            tone="funding"
          />
          <MetricTile
            label="Net cost vs ADAP"
            value={formatBillions(nationalNet.median)}
            detail={`${formatBillions(nationalNet.lower)} to ${formatBillions(nationalNet.upper)} interval`}
            tone="net"
          />
          <MetricTile
            label="Excess diagnoses"
            value={formatNumber(nationalFinal.cumulativeExcessNewDiagnoses.median)}
            detail={`${formatNumber(nationalFinal.cumulativePersonYearsOnArt.median)} cumulative ART person-years`}
            tone="cases"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">Cumulative costs</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedLabel} · {SCENARIO_LABELS[scenario]}
                </p>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Location
                <select
                  value={selectedLocation}
                  onChange={(event) => setSelectedLocation(event.target.value)}
                  className="min-h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-hopkins-blue focus:ring-2 focus:ring-hopkins-blue/20"
                >
                  {locationOptions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="h-[420px] p-4">
              {seriesError ? (
                <div className="flex h-full items-center justify-center rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                  {seriesError}
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-500">
                  Loading cost series
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatBillions}
                      width={76}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const label = {
                          careMedian: 'Care cost median',
                          careLower: 'Care cost lower',
                          careUpper: 'Care cost upper',
                          adap: 'ADAP spending avoided',
                          totalRwhap: 'Total RWHAP benchmark',
                          netMedian: 'Net cost vs ADAP',
                          excessDiagnoses: 'Excess diagnoses',
                        }[String(name)] ?? String(name);

                        if (String(name) === 'excessDiagnoses') {
                          return [formatNumber(Number(value)), label];
                        }

                        return [formatBillions(Number(value)), label];
                      }}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="careUpper"
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="careLower"
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="careMedian"
                      stroke="#002D72"
                      dot={false}
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="adap"
                      stroke="#059669"
                      dot={false}
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="netMedian"
                      stroke="#b45309"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">Selected location</h2>
              <p className="mt-1 text-sm text-gray-500">{selectedLabel}</p>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Care cost</p>
                <p className="mt-1 text-2xl font-semibold text-gray-950">
                  {formatBillions(selectedCare.median)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatBillions(selectedCare.lower)} to {formatBillions(selectedCare.upper)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">ADAP benchmark</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatBillions(selectedFinal.cumulativeAdapSpendingAvoided)}
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Total RWHAP</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatBillions(selectedFinal.cumulativeTotalRwhapSpendingAvoided)}
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-800">Net cost vs ADAP</p>
                <p className="mt-1 text-xl font-semibold text-gray-950">
                  {formatBillions(selectedNet.median)}
                </p>
                <p className="text-sm text-gray-600">
                  Final-year ratio: {formatNumber(nationalRatio.median)} national,{' '}
                  {formatNumber(scenarioMetric(selectedFinal.cumulativeNetCostRatioVsAdap, scenario).median)} selected
                </p>
              </div>
              <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
                <p className="text-xs font-medium text-sky-800">Epidemiologic burden</p>
                <p className="mt-1 text-sm text-gray-700">
                  {formatNumber(selectedFinal.cumulativeExcessNewDiagnoses.median)} excess diagnoses and{' '}
                  {formatNumber(selectedFinal.cumulativePersonYearsOnArt.median)} cumulative ART
                  person-years.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">Highest net-cost ratios</h2>
              <p className="mt-1 text-sm text-gray-500">Final-year net cost divided by ADAP benchmark</p>
            </div>
            <div className="h-[360px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ratioBars}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 32 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                  <YAxis
                    type="category"
                    dataKey="stateName"
                    width={96}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name, item) => {
                      if (name === 'ratio') {
                        return [formatNumber(Number(value)), 'Net-cost ratio'];
                      }
                      return [formatCompactDollars(Number(item.payload.net)), 'Net cost'];
                    }}
                  />
                  <Bar dataKey="ratio" radius={[0, 4, 4, 0]}>
                    {ratioBars.map((item) => (
                      <Cell key={item.state} fill={item.ratio >= 0 ? '#0f766e' : '#9ca3af'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">State comparison</h2>
              <p className="mt-1 text-sm text-gray-500">Sorted by final-year net cost vs ADAP</p>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">State</th>
                    <th className="px-4 py-3 font-semibold">Care cost</th>
                    <th className="px-4 py-3 font-semibold">ADAP benchmark</th>
                    <th className="px-4 py-3 font-semibold">Net cost</th>
                    <th className="px-4 py-3 font-semibold">Ratio</th>
                    <th className="px-4 py-3 font-semibold">Excess diagnoses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rankedStates.map((item) => {
                    const final = item.finalYear;
                    const care = scenarioMetric(final.cumulativeCareCost, scenario);
                    const net = scenarioMetric(final.cumulativeNetCostVsAdap, scenario);
                    const ratio = scenarioMetric(final.cumulativeNetCostRatioVsAdap, scenario);

                    return (
                      <tr
                        key={item.state}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setSelectedLocation(item.state)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-950">
                          {stateName(item.state)}
                          <span className="ml-2 text-xs text-gray-400">{item.state}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatCompactDollars(care.median)}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatCompactDollars(final.cumulativeAdapSpendingAvoided)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-950">
                          {formatCompactDollars(net.median)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatNumber(ratio.median)}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatNumber(final.cumulativeExcessNewDiagnoses.median)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-950">Model assumptions for review</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-gray-500">Reengagement</dt>
                <dd className="mt-1 text-gray-900">
                  pi {ryanWhiteCostingMetadata.modelParameters.reengagementPi}, lambda{' '}
                  {ryanWhiteCostingMetadata.modelParameters.reengagementLambda}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Discount rate</dt>
                <dd className="mt-1 text-gray-900">
                  {formatPercent(ryanWhiteCostingMetadata.modelParameters.discountRate)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Routine care cost</dt>
                <dd className="mt-1 text-gray-900">
                  {formatCompactDollars(ryanWhiteCostingMetadata.modelParameters.routineCareCost)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Negative excess-new draws</dt>
                <dd className="mt-1 text-gray-900">
                  {ryanWhiteCostingMetadata.validation.negativeExcessNewCount} draws ·{' '}
                  {formatPercent(ryanWhiteCostingMetadata.validation.negativeExcessNewShare)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700">Validation</p>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                <li>
                  Total equals state sum:{' '}
                  <span className="font-medium text-gray-950">
                    {ryanWhiteCostingMetadata.validation.totalEqualsStateSum ? 'passed' : 'failed'}
                  </span>
                </li>
                <li>
                  Excluded funding locations:{' '}
                  <span className="font-medium text-gray-950">
                    {ryanWhiteCostingMetadata.excludedFundingLocations.join(', ') || 'none'}
                  </span>
                </li>
                <li>{ryanWhiteCostingMetadata.fundingAdjustment.description}</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-950">Open review questions</h2>
            <ol className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
              {ryanWhiteCostingMetadata.reviewQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
            <div className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-600">
              Funding lines are deterministic under the current inputs. Care-cost bands show simulation
              uncertainty after per-path cumulative costing, not propagated input quantiles.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
