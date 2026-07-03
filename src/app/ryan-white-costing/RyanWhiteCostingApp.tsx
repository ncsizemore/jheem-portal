'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ComposableMap, Geographies, Geography, type GeographyObject } from 'react-simple-maps';
import {
  fetchRyanWhiteCostingSeries,
  ryanWhiteCostingMetadata,
  ryanWhiteCostingSummary,
  type CostScenarioId,
  type RyanWhiteCostingSeries,
} from '@/data/ryan-white-costing';
import { STATE_NAME_TO_CODE } from '@/data/states';
import {
  buildEvidenceDomain,
  buildRankBins,
  buildRankedStates,
  buildReviewCards,
  buildScenarioEvidence,
  buildStateLookup,
  buildStateUncertaintySummary,
  buildTrajectoryData,
  finalForLocation,
  formatCompactDollars,
  formatNumber,
  formatPercent,
  getMapMetricConfig,
  getRankBinIndex,
  getStateMetricValue,
  LocationKey,
  MAP_METRICS,
  MapBin,
  MapMetric,
  RankedStatePoint,
  ScenarioEvidencePoint,
  scenarioMetric,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  SCENARIO_SHORT_LABELS,
  seriesForLocation,
  stateName,
} from './view-model';

const US_STATES_GEOJSON = '/us-states.json';

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function getGeoStateCode(geography: GeographyObject): string | undefined {
  const name = geography.properties.NAME;
  return typeof name === 'string' ? STATE_NAME_TO_CODE[name] : undefined;
}

function pct(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function metricButtonDescription(metric: MapMetric): string {
  if (metric === 'careCost') return 'Care-cost burden';
  if (metric === 'excessDiagnoses') return 'Epi burden';
  return 'Median ranking';
}

function mapPalette(metric: MapMetric): string[] {
  if (metric === 'careCost') return ['#dbeafe', '#bfdbfe', '#93c5fd', '#3b82f6', '#1d4ed8'];
  if (metric === 'excessDiagnoses') return ['#fce7f3', '#fbcfe8', '#f9a8d4', '#db2777', '#831843'];
  return ['#fef3c7', '#fde68a', '#fbbf24', '#d97706', '#92400e'];
}

function mapColor(value: number, metric: MapMetric, bins: MapBin[], selected = false): string {
  if (selected) return '#002D72';
  const palette = mapPalette(metric);
  if (!Number.isFinite(value) || bins.length === 0) return '#e5e7eb';
  const binIndex = getRankBinIndex(value, bins);
  return palette[Math.min(palette.length - 1, binIndex)];
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>}
    </div>
  );
}

function ScenarioSelector({
  scenario,
  onChange,
}: {
  scenario: CostScenarioId;
  onChange: (scenario: CostScenarioId) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/85 p-1 shadow-sm">
      <div className="grid grid-cols-3 gap-1">
        {SCENARIO_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cx(
              'min-h-10 rounded-md px-4 text-sm font-semibold transition-colors',
              scenario === item
                ? 'bg-hopkins-blue text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            )}
          >
            {SCENARIO_SHORT_LABELS[item]}
          </button>
        ))}
      </div>
    </div>
  );
}

function SplitBand({
  min,
  max,
  start,
  end,
  className,
}: {
  min: number;
  max: number;
  start: number;
  end: number;
  className: string;
}) {
  const segments =
    start < 0 && end > 0
      ? [
          { start, end: 0, color: '#0f766e' },
          { start: 0, end, color: '#b45309' },
        ]
      : [{ start, end, color: end <= 0 ? '#0f766e' : '#b45309' }];

  return (
    <>
      {segments.map((segment) => (
        <span
          key={`${segment.start}-${segment.end}-${className}`}
          className={cx('absolute rounded-full', className)}
          style={{
            left: `${pct(segment.start, min, max)}%`,
            width: `${Math.max(0.6, pct(segment.end, min, max) - pct(segment.start, min, max))}%`,
            backgroundColor: segment.color,
          }}
        />
      ))}
    </>
  );
}

function ScenarioEvidenceStrip({
  points,
  selectedScenario,
  onSelect,
}: {
  points: ScenarioEvidencePoint[];
  selectedScenario: CostScenarioId;
  onSelect: (scenario: CostScenarioId) => void;
}) {
  const domain = buildEvidenceDomain(points);
  const zeroPct = pct(0, domain.min, domain.max);
  const negativeWidth = pct(0, domain.min, domain.max);
  const positiveWidth = 100 - negativeWidth;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Scenario evidence</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Bands show simulation draws within each row; rows show drug-cost assumptions.
          </p>
        </div>
        <div className="flex gap-3 text-xs font-semibold">
          <span className="inline-flex items-center gap-2 text-teal-800">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-700" />
            Net offset
          </span>
          <span className="inline-flex items-center gap-2 text-amber-800">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
            Net cost
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {points.map((point) => {
          const selected = point.scenario === selectedScenario;
          const medianPct = pct(point.curve.p50, domain.min, domain.max);

          return (
            <button
              key={point.scenario}
              type="button"
              onClick={() => onSelect(point.scenario)}
              className={cx(
                'grid w-full gap-3 rounded-lg border p-3 text-left transition-colors lg:grid-cols-[132px_minmax(0,1fr)_154px]',
                selected ? 'border-hopkins-blue bg-blue-50/70' : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">{point.label}</p>
                <p className="mt-1 text-xs text-slate-500">{formatCompactDollars(point.netMedian)} median net</p>
              </div>

              <div className="min-w-0">
                <div className="relative h-14 overflow-hidden rounded-lg bg-slate-100">
                  <span
                    className="absolute inset-y-0 left-0 bg-teal-50"
                    style={{ width: `${negativeWidth}%` }}
                  />
                  <span
                    className="absolute inset-y-0 right-0 bg-amber-50"
                    style={{ width: `${positiveWidth}%` }}
                  />
                  <span
                    className="absolute inset-y-0 w-px bg-slate-700"
                    style={{ left: `${zeroPct}%` }}
                  />
                  <SplitBand min={domain.min} max={domain.max} start={point.curve.p025} end={point.curve.p975} className="top-[24px] h-2 opacity-25" />
                  <SplitBand min={domain.min} max={domain.max} start={point.curve.p10} end={point.curve.p90} className="top-[22px] h-3 opacity-45" />
                  <SplitBand min={domain.min} max={domain.max} start={point.curve.p25} end={point.curve.p75} className="top-[20px] h-4 opacity-80" />
                  <span
                    className="absolute top-[12px] h-8 w-1 rounded-full bg-slate-950 shadow-sm"
                    style={{ left: `${medianPct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[0.68rem] font-medium text-slate-500">
                  <span>{formatCompactDollars(domain.min)}</span>
                  <span>0</span>
                  <span>{formatCompactDollars(domain.max)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Interval</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-950">
                    {formatCompactDollars(point.netLower)} to {formatCompactDollars(point.netUpper)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Draws above zero</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-950">
                    {formatPercent(point.shareNetPositive)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StateContributionMap({
  states,
  selected,
  metric,
  onMetricChange,
  onSelect,
}: {
  states: RankedStatePoint[];
  selected: LocationKey;
  metric: MapMetric;
  onMetricChange: (metric: MapMetric) => void;
  onSelect: (location: LocationKey) => void;
}) {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const stateLookup = useMemo(() => buildStateLookup(states), [states]);
  const bins = useMemo(() => buildRankBins(states, metric), [states, metric]);
  const metricConfig = getMapMetricConfig(metric);
  const hoveredState = hoveredCode ? stateLookup[hoveredCode] : null;
  const selectedState = selected !== 'Total' ? stateLookup[selected] : null;
  const displayState = hoveredState ?? selectedState ?? states[0];
  const uncertainty = buildStateUncertaintySummary(states);
  const colors = mapPalette(metric);

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 border-b border-slate-200 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">State contribution landscape</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Median rankings across the 30 modeled states. {uncertainty.crossing} of {uncertainty.total}{' '}
            state intervals cross zero, so medians are best read as rankings.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MAP_METRICS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onMetricChange(item.id)}
              className={cx(
                'min-h-14 rounded-lg border px-3 py-2 text-left transition-colors',
                metric === item.id
                  ? 'border-hopkins-blue bg-hopkins-blue text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              )}
            >
              <span className="block text-xs font-semibold sm:text-sm">{item.label}</span>
              <span className={cx('mt-0.5 block text-[0.68rem]', metric === item.id ? 'text-white/75' : 'text-slate-500')}>
                {metricButtonDescription(item.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div className="min-w-0">
          <div className="min-h-[330px] overflow-hidden">
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 960 }}
              width={980}
              height={600}
              className="block h-full w-full max-w-full"
            >
              <Geographies geography={US_STATES_GEOJSON}>
                {({ geographies }) =>
                  geographies.map((geography) => {
                    const code = getGeoStateCode(geography);
                    const state = code ? stateLookup[code] : undefined;
                    const isSelected = code === selected;
                    const value = state ? getStateMetricValue(state, metric) : NaN;

                    return (
                      <Geography
                        key={geography.rsmKey}
                        geography={geography}
                        onMouseEnter={() => setHoveredCode(code ?? null)}
                        onMouseLeave={() => setHoveredCode(null)}
                        onClick={() => {
                          if (state) onSelect(state.state);
                        }}
                        fill={state ? mapColor(value, metric, bins, isSelected) : '#e5e7eb'}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.8 : 0.8}
                        style={{
                          default: { outline: 'none' },
                          hover: {
                            outline: 'none',
                            fill: state ? '#F2C413' : '#e5e7eb',
                            cursor: state ? 'pointer' : 'default',
                          },
                          pressed: { outline: 'none' },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <span>Lowest modeled states</span>
            <div className="grid h-2 grid-cols-5 overflow-hidden rounded-full">
              {colors.map((color) => (
                <span key={color} style={{ backgroundColor: color }} />
              ))}
            </div>
            <span>Highest modeled states</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Top bin range for {metricConfig.label}: {bins.at(-1)?.label ?? 'not available'}.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">{displayState.stateName}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {metricConfig.format(getStateMetricValue(displayState, metric))}
          </p>
          <p className="mt-1 text-sm text-slate-600">{metricConfig.label}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatTile label="Net" value={formatCompactDollars(displayState.netCost)} />
            <StatTile label="Draws > 0" value={formatPercent(displayState.shareNetPositive)} />
            <StatTile label="Care" value={formatCompactDollars(displayState.careCost)} />
            <StatTile label="Excess dx" value={formatNumber(displayState.excessDiagnoses)} />
          </div>
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Bounded positive states: {uncertainty.boundedPositive.map((state) => state.state).join(', ')}.
          </div>
        </div>
      </div>
    </div>
  );
}

function StateImpactScatter({
  states,
  selected,
  onSelect,
}: {
  states: RankedStatePoint[];
  selected: LocationKey;
  onSelect: (state: string) => void;
}) {
  const data = states.map((state) => ({
    ...state,
    careError: [Math.max(0, state.careCost - state.careQuantiles.p10), Math.max(0, state.careQuantiles.p90 - state.careCost)],
  }));
  const maxAxis = Math.max(...states.map((state) => Math.max(state.adapBenchmark, state.careQuantiles.p90))) * 1.08;
  const maxDiagnoses = Math.max(...states.map((state) => state.excessDiagnoses));
  const renderDot = (props: unknown) => {
    const { cx: x, cy: y, payload } = props as {
      cx?: number;
      cy?: number;
      payload?: RankedStatePoint;
    };
    if (typeof x !== 'number' || typeof y !== 'number' || !payload) return <g />;

    const radius = 4 + (Math.sqrt(payload.excessDiagnoses) / Math.sqrt(maxDiagnoses)) * 11;
    const selectedPoint = payload.state === selected;

    return (
      <circle
        cx={x}
        cy={y}
        r={selectedPoint ? radius + 2 : radius}
        fill={selectedPoint ? '#002D72' : payload.boundedPositive ? '#b45309' : '#64748b'}
        fillOpacity={selectedPoint ? 0.95 : 0.72}
        stroke={selectedPoint ? '#F2C413' : '#ffffff'}
        strokeWidth={selectedPoint ? 2.5 : 1}
      />
    );
  };

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-xl font-semibold text-slate-950">Impact space</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          ADAP spending avoided is deterministic in this artifact; downstream care cost varies across simulation draws.
        </p>
      </div>
      <div className="h-[430px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 18, right: 20, bottom: 22, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="adapBenchmark"
              domain={[0, maxAxis]}
              tickFormatter={formatCompactDollars}
              tickLine={false}
              axisLine={false}
              label={{ value: 'ADAP spending avoided', position: 'insideBottom', offset: -14 }}
            />
            <YAxis
              type="number"
              dataKey="careCost"
              domain={[0, maxAxis]}
              tickFormatter={formatCompactDollars}
              tickLine={false}
              axisLine={false}
              width={72}
              label={{ value: 'Downstream care cost', angle: -90, position: 'insideLeft' }}
            />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: maxAxis, y: maxAxis },
              ]}
              stroke="#94a3b8"
              strokeDasharray="5 5"
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => {
                const key = String(name);
                if (key === 'ADAP benchmark' || key === 'Care cost') return [formatCompactDollars(Number(value)), key];
                return [formatNumber(Number(value)), key];
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.stateName ?? ''}
            />
            <Scatter
              data={data}
              name="States"
              shape={renderDot}
              onClick={(point: unknown) => {
                const payload = (point as { payload?: RankedStatePoint }).payload;
                if (payload?.state) onSelect(payload.state);
              }}
            >
              <ErrorBar dataKey="careError" direction="y" stroke="#94a3b8" width={4} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SelectedStateRail({
  selectedName,
  final,
  scenario,
}: {
  selectedName: string;
  final: ReturnType<typeof finalForLocation>;
  scenario: CostScenarioId;
}) {
  const net = scenarioMetric(final.cumulativeNetCostVsAdap, scenario);
  const care = scenarioMetric(final.cumulativeCareCost, scenario);
  const crossesZero = net.lower <= 0 && net.upper >= 0;
  const boundedPositive = net.lower > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected analysis</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-950">{selectedName}</h2>
      <p className="mt-1 text-sm text-slate-500">{SCENARIO_LABELS[scenario]}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatTile label="Net cost vs ADAP" value={formatCompactDollars(net.median)} />
        <StatTile label="Draws > 0" value={formatPercent(final.shareNetCostPositiveVsAdap[scenario])} />
        <StatTile
          label="Interval"
          value={`${formatCompactDollars(net.lower)} to ${formatCompactDollars(net.upper)}`}
          note={crossesZero ? 'Crosses zero' : boundedPositive ? 'Bounded positive' : 'Bounded negative'}
        />
        <StatTile label="Care cost" value={formatCompactDollars(care.median)} />
        <StatTile label="ADAP avoided" value={formatCompactDollars(final.cumulativeAdapSpendingAvoided)} />
        <StatTile label="Excess diagnoses" value={formatNumber(final.cumulativeExcessNewDiagnoses.median)} />
      </div>
    </div>
  );
}

function ModelReviewSection() {
  const final = ryanWhiteCostingSummary.national.finalYear;
  const cards = buildReviewCards(final);
  const parameters = ryanWhiteCostingMetadata.modelParameters;
  const openQuestions = ryanWhiteCostingMetadata.reviewQuestions.slice(0, 6);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-hopkins-blue">Model review</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Assumptions worth challenging</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          This section is intentionally visible for internal review; these parameters can move the conclusion.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-950">{card.title}</h3>
            <dl className="mt-3 space-y-2">
              {card.items.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-slate-500">{item.label}</dt>
                  <dd className="text-right font-semibold text-slate-900">{item.value}</dd>
                </div>
              ))}
            </dl>
            {card.note && <p className="mt-3 text-xs leading-5 text-slate-600">{card.note}</p>}
          </div>
        ))}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-base font-semibold text-slate-950">Cost assumptions</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Drug tiers</dt>
              <dd className="text-right font-semibold text-slate-900">
                {SCENARIO_ORDER.map((item) => formatCompactDollars(parameters.artDrugCosts[item])).join(' / ')}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Routine care</dt>
              <dd className="font-semibold text-slate-900">{formatCompactDollars(parameters.routineCareCost)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Discount rate</dt>
              <dd className="font-semibold text-slate-900">{formatPercent(parameters.discountRate)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-base font-semibold text-amber-950">Open questions</h3>
        <ol className="mt-3 grid gap-2 text-sm leading-6 text-amber-950 lg:grid-cols-2">
          {openQuestions.map((question, index) => (
            <li key={question} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
              <span className="font-semibold">{index + 1}.</span>
              <span>{question}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TrajectoryPanel({
  trajectory,
  selectedName,
  scenario,
  error,
}: {
  trajectory: ReturnType<typeof buildTrajectoryData>;
  selectedName: string;
  scenario: CostScenarioId;
  error: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-xl font-semibold text-slate-950">Trajectory detail</h2>
        <p className="mt-1 text-sm text-slate-500">
          {selectedName} &middot; {SCENARIO_LABELS[scenario]}
        </p>
      </div>
      <div className="h-[340px] p-4">
        {error ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : trajectory.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
            Loading cost series
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trajectory} margin={{ top: 12, right: 16, bottom: 8, left: 6 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="year" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCompactDollars} tickLine={false} axisLine={false} width={76} />
              <Tooltip
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    careMedian: 'Care median',
                    adap: 'ADAP spending avoided',
                    totalRwhap: 'Total RWHAP',
                    netMedian: 'Net cost vs ADAP',
                  };
                  return [formatCompactDollars(Number(value)), labels[String(name)] ?? String(name)];
                }}
                labelFormatter={(value) => `Year ${value}`}
              />
              <Area type="monotone" dataKey="careLower" stackId="care" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area type="monotone" dataKey="careBand" stackId="care" stroke="none" fill="#c7d2fe" fillOpacity={0.55} isAnimationActive={false} />
              <Line type="monotone" dataKey="careMedian" stroke="#002D72" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="adap" stroke="#64748b" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="netMedian" stroke="#b45309" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function RyanWhiteCostingApp() {
  const [scenario, setScenario] = useState<CostScenarioId>(
    ryanWhiteCostingSummary.sensitivity.primaryScenario
  );
  const [location, setLocation] = useState<LocationKey>(ryanWhiteCostingMetadata.defaultFocusState);
  const [mapMetric, setMapMetric] = useState<MapMetric>('netCost');
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
  const scenarioEvidence = useMemo(() => buildScenarioEvidence(nationalFinal), [nationalFinal]);
  const selectedFinal = finalForLocation(ryanWhiteCostingSummary, location);
  const selectedSeries = seriesForLocation(series, location);
  const trajectory = useMemo(() => buildTrajectoryData(selectedSeries, scenario), [selectedSeries, scenario]);
  const rankedStates = useMemo(
    () => buildRankedStates(ryanWhiteCostingSummary.states, scenario),
    [scenario]
  );
  const selectedName = location === 'Total' ? 'National total' : stateName(location);
  const medianNet = scenarioMetric(nationalFinal.cumulativeNetCostVsAdap, 'median');
  const medianCare = scenarioMetric(nationalFinal.cumulativeCareCost, 'median');
  const stateUncertainty = buildStateUncertaintySummary(rankedStates);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f7f9] text-slate-950">
      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)]">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
              <div>
                <p className="text-sm font-semibold text-hopkins-blue">
                  Ryan White ADAP Cost-Consequence Explorer &middot; {ryanWhiteCostingMetadata.horizon.startYear}-{ryanWhiteCostingMetadata.horizon.endYear}
                </p>
                <h1 className="mt-4 max-w-5xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                  Current accounting frame suggests positive median net cost, but uncertainty crosses zero.
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                  Median net cost vs ADAP is {formatCompactDollars(medianNet.median)} under the median drug-cost
                  scenario; simulation interval ranges from {formatCompactDollars(medianNet.lower)} to{' '}
                  {formatCompactDollars(medianNet.upper)}.
                </p>
              </div>

              <div className="grid gap-4">
                <ScenarioSelector scenario={scenario} onChange={setScenario} />
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-amber-950">Interpretation depends on payer perspective</p>
                  <p className="mt-2 text-sm leading-6 text-amber-950">
                    This frame compares avoided ADAP spending with downstream HIV care costs; those downstream costs may
                    be ADAP/RWHAP-eligible under alternative counterfactual assumptions.
                  </p>
                </div>
              </div>
            </div>

            <ScenarioEvidenceStrip points={scenarioEvidence} selectedScenario={scenario} onSelect={setScenario} />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="ADAP spending avoided" value={formatCompactDollars(nationalFinal.cumulativeAdapSpendingAvoided)} />
              <StatTile
                label="Downstream care cost"
                value={formatCompactDollars(medianCare.median)}
                note={`${formatCompactDollars(medianCare.lower)} to ${formatCompactDollars(medianCare.upper)} interval`}
              />
              <StatTile
                label="Draws above zero"
                value={formatPercent(nationalFinal.shareNetCostPositiveVsAdap.median)}
                note="Median drug-cost scenario"
              />
              <StatTile
                label="State-level uncertainty"
                value={`${stateUncertainty.crossing}/${stateUncertainty.total}`}
                note="Modeled state intervals cross zero"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start">
            <StateContributionMap
              states={rankedStates}
              selected={location}
              metric={mapMetric}
              onMetricChange={setMapMetric}
              onSelect={setLocation}
            />
            <div className="grid gap-6">
              <StateImpactScatter states={rankedStates} selected={location} onSelect={setLocation} />
              <SelectedStateRail selectedName={selectedName} final={selectedFinal} scenario={scenario} />
            </div>
          </section>

          <ModelReviewSection />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <TrajectoryPanel
              trajectory={trajectory}
              selectedName={selectedName}
              scenario={scenario}
              error={seriesError}
            />

            <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-semibold text-slate-950">State detail</h2>
                <p className="mt-1 text-sm text-slate-500">Sorted by median net cost vs ADAP</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-slate-50 text-[0.68rem] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">State</th>
                      <th className="px-3 py-3 font-semibold">Net</th>
                      <th className="px-3 py-3 font-semibold">Interval</th>
                      <th className="px-3 py-3 font-semibold">Draws &gt; 0</th>
                      <th className="px-3 py-3 font-semibold">Care</th>
                      <th className="px-3 py-3 font-semibold">Excess dx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankedStates.map((item) => (
                      <tr
                        key={item.state}
                        onClick={() => setLocation(item.state)}
                        className={cx(
                          'cursor-pointer transition-colors hover:bg-slate-50',
                          item.state === location && 'bg-blue-50/70'
                        )}
                      >
                        <td className="px-3 py-3 font-semibold text-slate-950">
                          {item.stateName}
                          <span className="ml-2 text-xs font-medium text-slate-400">{item.state}</span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-950">{formatCompactDollars(item.netCost)}</td>
                        <td className="px-3 py-3 text-slate-700">
                          {formatCompactDollars(item.netLower)} to {formatCompactDollars(item.netUpper)}
                        </td>
                        <td className="px-3 py-3 text-slate-700">{formatPercent(item.shareNetPositive)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatCompactDollars(item.careCost)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatNumber(item.excessDiagnoses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
            <span className="font-semibold text-slate-950">Data notes:</span> 30 modeled states are shown. DC funding is
            excluded because no DC epidemiologic output is present. Funding comparators are deterministic; care-cost
            intervals are computed after per-simulation cumulative costing.
          </section>
        </div>
      </main>
    </div>
  );
}
