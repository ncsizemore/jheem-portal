'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
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
  buildCostBridge,
  buildMechanismSteps,
  buildMetricDomain,
  buildRankedStates,
  buildScenarioComparison,
  buildStateLookup,
  buildTrajectoryData,
  finalForLocation,
  formatBillions,
  formatCompactDollars,
  formatNumber,
  formatRatio,
  getMapMetricConfig,
  getStateMetricValue,
  LocationKey,
  MAP_METRICS,
  MapMetric,
  RankedStatePoint,
  scenarioMetric,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  SCENARIO_SHORT_LABELS,
  seriesForLocation,
  stateName,
} from './view-model';

const US_STATES_GEOJSON = '/us-states.json';

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-950">{value}</p>
    </div>
  );
}

function LensButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[56px] rounded-md border px-3 py-2 text-left transition-colors ${
        active
          ? 'border-hopkins-blue bg-hopkins-blue text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className={`mt-0.5 block text-xs ${active ? 'text-white/75' : 'text-gray-500'}`}>
        {description}
      </span>
    </button>
  );
}

function metricButtonDescription(metric: MapMetric): string {
  if (metric === 'netRatio') return 'Relative gap';
  if (metric === 'excessDiagnoses') return 'Epi burden';
  if (metric === 'careCost') return 'Cost burden';
  return 'Dollar gap';
}

function metricPalette(metric: MapMetric): string[] {
  if (metric === 'careCost') {
    return ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0284c7', '#075985'];
  }
  if (metric === 'excessDiagnoses') {
    return ['#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#db2777', '#831843'];
  }
  if (metric === 'netRatio') {
    return ['#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#0f766e', '#134e4a'];
  }
  return ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#92400e'];
}

function metricColor(value: number, min: number, max: number, metric: MapMetric, selected = false): string {
  if (selected) return '#002D72';
  const palette = metricPalette(metric);
  if (!Number.isFinite(value)) return '#e5e7eb';
  if (max <= min) return palette[3];
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return palette[Math.min(palette.length - 1, Math.floor(normalized * palette.length))];
}

function getGeoStateCode(geography: GeographyObject): string | undefined {
  const name = geography.properties.NAME;
  return typeof name === 'string' ? STATE_NAME_TO_CODE[name] : undefined;
}

function StateCostMap({
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
  const domain = useMemo(() => buildMetricDomain(states, metric), [states, metric]);
  const metricConfig = getMapMetricConfig(metric);
  const hoveredState = hoveredCode ? stateLookup[hoveredCode] : null;
  const selectedState = selected !== 'Total' ? stateLookup[selected] : null;
  const displayState = hoveredState ?? selectedState;
  const topStates = states.slice(0, 5);
  const legendColors = metricPalette(metric);

  return (
    <div className="relative min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-950">State cost landscape</h2>
          <p className="mt-1 text-sm text-gray-500">{metricConfig.description}</p>
          <button
            type="button"
            onClick={() => onSelect('Total')}
            className={`mt-3 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
              selected === 'Total'
                ? 'border-hopkins-blue bg-hopkins-blue text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            National total
          </button>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:w-[320px]">
          {MAP_METRICS.map((item) => (
            <LensButton
              key={item.id}
              active={metric === item.id}
              label={item.label}
              description={metricButtonDescription(item.id)}
              onClick={() => onMetricChange(item.id)}
            />
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div className="min-w-0">
          <div className="min-h-[300px] overflow-hidden sm:min-h-[360px]">
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
                        fill={state ? metricColor(value, domain.min, domain.max, metric, isSelected) : '#e5e7eb'}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.6 : 0.8}
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
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>{metricConfig.format(domain.min)}</span>
            <div className="grid h-2 flex-1 grid-cols-6 overflow-hidden rounded-full">
              {legendColors.map((color) => (
                <span key={color} style={{ backgroundColor: color }} />
              ))}
            </div>
            <span>{metricConfig.format(domain.max)}</span>
          </div>
        </div>

        <div className="min-w-0 rounded-md bg-slate-50 p-4 ring-1 ring-gray-200">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500">
            {displayState ? displayState.stateName : selected === 'Total' ? 'National total' : 'Hover a modeled state'}
          </p>
          {displayState ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-2xl font-semibold text-gray-950">
                  {metricConfig.format(getStateMetricValue(displayState, metric))}
                </p>
                <p className="mt-1 text-sm text-gray-500">{metricConfig.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricChip label="Net" value={formatCompactDollars(displayState.netCost)} />
                <MetricChip label="Ratio" value={formatRatio(displayState.netRatio)} />
                <MetricChip label="Care" value={formatCompactDollars(displayState.careCost)} />
                <MetricChip label="Excess dx" value={formatNumber(displayState.excessDiagnoses)} />
              </div>
            </div>
          ) : selected === 'Total' ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-6 text-gray-600">
                Click a modeled state to inspect its bridge, trajectory, and position in impact space.
              </p>
              <div className="space-y-2">
                {topStates.map((state, index) => (
                  <button
                    key={state.state}
                    type="button"
                    onClick={() => onSelect(state.state)}
                    className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-white px-2.5 py-2 text-left text-xs ring-1 ring-gray-200 transition-colors hover:bg-blue-50"
                  >
                    <span className="font-semibold text-gray-400">{index + 1}</span>
                    <span className="truncate font-semibold text-gray-800">{state.stateName}</span>
                    <span className="font-semibold text-gray-950">{formatCompactDollars(state.netCost)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-gray-600">
              The map shades the 30 modeled states. Unmodeled states are intentionally muted.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CostBridgePanel({
  selectedName,
  final,
  scenario,
}: {
  selectedName: string;
  final: ReturnType<typeof finalForLocation>;
  scenario: CostScenarioId;
}) {
  const bridge = buildCostBridge(final, scenario);
  const scale = (value: number) => `${Math.max(3, Math.min(100, (Math.abs(value) / bridge.maxValue) * 100))}%`;
  const careLower = `${Math.max(0, (bridge.careLower / bridge.maxValue) * 100)}%`;
  const careWidth = `${Math.max(2, ((bridge.careUpper - bridge.careLower) / bridge.maxValue) * 100)}%`;
  const careMedian = `${Math.max(0, Math.min(100, (bridge.careMedian / bridge.maxValue) * 100))}%`;

  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-950">Cost consequence bridge</h2>
        <p className="mt-1 text-sm text-gray-500">
          {selectedName} &middot; {SCENARIO_LABELS[scenario]}
        </p>
      </div>
      <div className="space-y-5 p-4">
        <div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p className="text-sm font-semibold text-gray-700">ADAP spending avoided</p>
            <p className="text-lg font-semibold text-emerald-700">{formatBillions(bridge.adapBenchmark)}</p>
          </div>
          <div className="mt-2 h-4 rounded-full bg-gray-100">
            <div className="h-4 rounded-full bg-emerald-600" style={{ width: scale(bridge.adapBenchmark) }} />
          </div>
        </div>

        <div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p className="text-sm font-semibold text-gray-700">Downstream care cost</p>
            <p className="text-lg font-semibold text-hopkins-blue">{formatBillions(bridge.careMedian)}</p>
          </div>
          <div className="relative mt-2 h-5 rounded-full bg-gray-100">
            <div
              className="absolute top-0 h-5 rounded-full bg-blue-200"
              style={{ left: careLower, width: careWidth }}
            />
            <div
              className="absolute top-[-3px] h-7 w-1 rounded-full bg-hopkins-blue"
              style={{ left: careMedian }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {formatBillions(bridge.careLower)} to {formatBillions(bridge.careUpper)} simulation interval
          </p>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p className="text-sm font-semibold text-amber-900">Net gap under current perspective</p>
            <p className="text-2xl font-semibold text-gray-950">{formatBillions(bridge.netMedian)}</p>
          </div>
          <div className="mt-3 h-4 rounded-full bg-white/80">
            <div
              className="h-4 rounded-full bg-amber-500"
              style={{ width: scale(bridge.netMedian) }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            Interval: {formatBillions(bridge.netLower)} to {formatBillions(bridge.netUpper)}.
          </p>
        </div>
      </div>
    </div>
  );
}

function MechanismChain({
  final,
  scenario,
}: {
  final: ReturnType<typeof finalForLocation>;
  scenario: CostScenarioId;
}) {
  const steps = buildMechanismSteps(final, scenario);

  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">Epi-to-cost chain</h2>
          <p className="mt-1 text-sm text-gray-500">How modeled infections become economic burden</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step.id} className="relative rounded-md bg-slate-50 p-4 ring-1 ring-gray-200">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-gray-500">{step.label}</p>
            <p className="mt-2 text-xl font-semibold text-gray-950">{step.value}</p>
            <p className="mt-2 text-xs leading-5 text-gray-600">{step.detail}</p>
            {index < steps.length - 1 && (
              <span className="absolute right-[-14px] top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 lg:flex">
                &rarr;
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactScatter({
  states,
  selected,
  onSelect,
}: {
  states: RankedStatePoint[];
  selected: LocationKey;
  onSelect: (state: string) => void;
}) {
  const maxAxis = Math.max(...states.map((item) => Math.max(item.adapBenchmark, item.careCost))) * 1.08;
  const maxDiagnoses = Math.max(...states.map((item) => item.excessDiagnoses));
  const renderDot = (props: unknown) => {
    const { cx, cy, payload } = props as {
      cx?: number;
      cy?: number;
      payload?: RankedStatePoint;
    };

    if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return <g />;

    const radius = 5 + (Math.sqrt(payload.excessDiagnoses) / Math.sqrt(maxDiagnoses)) * 12;
    const isSelected = payload.state === selected;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? radius + 2 : radius}
        fill={isSelected ? '#002D72' : payload.netCost >= 0 ? '#0f766e' : '#9ca3af'}
        fillOpacity={isSelected ? 0.96 : 0.72}
        stroke={isSelected ? '#F2C413' : '#ffffff'}
        strokeWidth={isSelected ? 2.5 : 1}
      />
    );
  };

  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-950">State impact space</h2>
        <p className="mt-1 text-sm text-gray-500">
          Break-even line compares downstream care cost with ADAP spending avoided
        </p>
      </div>
      <div className="h-[420px] p-3 sm:p-5">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 18, right: 18, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="adapBenchmark"
              name="ADAP benchmark"
              domain={[0, maxAxis]}
              tickFormatter={formatBillions}
              tickLine={false}
              axisLine={false}
              label={{ value: 'ADAP spending avoided', position: 'insideBottom', offset: -12 }}
            />
            <YAxis
              type="number"
              dataKey="careCost"
              name="Care cost"
              domain={[0, maxAxis]}
              tickFormatter={formatBillions}
              tickLine={false}
              axisLine={false}
              width={78}
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
                if (key === 'ADAP benchmark' || key === 'Care cost') {
                  return [formatBillions(Number(value)), key];
                }
                return [formatNumber(Number(value)), key];
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.stateName ?? ''}
            />
            <Scatter
              data={states}
              name="States"
              shape={renderDot}
              onClick={(point: unknown) => {
                const payload = (point as { payload?: RankedStatePoint }).payload;
                if (payload?.state) onSelect(payload.state);
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
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
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-950">Trajectory detail</h2>
        <p className="mt-1 text-sm text-gray-500">
          {selectedName} &middot; {SCENARIO_LABELS[scenario]}
        </p>
      </div>
      <div className="h-[360px] p-3 sm:p-5">
        {error ? (
          <div className="flex h-full items-center justify-center rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
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
              <YAxis tickFormatter={formatBillions} tickLine={false} axisLine={false} width={76} />
              <Tooltip
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    careMedian: 'Care median',
                    adap: 'ADAP benchmark',
                    totalRwhap: 'Total RWHAP',
                    netMedian: 'Net gap',
                  };
                  return [formatBillions(Number(value)), labels[String(name)] ?? String(name)];
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
              <Line type="monotone" dataKey="careMedian" stroke="#002D72" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="adap" stroke="#0f766e" strokeWidth={2.5} dot={false} />
              <Line
                type="monotone"
                dataKey="totalRwhap"
                stroke="#64748b"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
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
  const selectedFinal = finalForLocation(ryanWhiteCostingSummary, location);
  const selectedSeries = seriesForLocation(series, location);
  const trajectory = useMemo(() => buildTrajectoryData(selectedSeries, scenario), [selectedSeries, scenario]);
  const rankedStates = useMemo(
    () => buildRankedStates(ryanWhiteCostingSummary.states, scenario),
    [scenario]
  );
  const scenarioComparison = useMemo(() => buildScenarioComparison(nationalFinal), [nationalFinal]);
  const scenarioMaxNet = Math.max(...scenarioComparison.map((item) => item.netMedian));
  const selectedName = location === 'Total' ? 'National total' : stateName(location);
  const nationalCare = scenarioMetric(nationalFinal.cumulativeCareCost, scenario);
  const nationalNet = scenarioMetric(nationalFinal.cumulativeNetCostVsAdap, scenario);

  return (
    <div className="min-h-screen overflow-x-hidden overflow-y-auto bg-[#f4f6f8] text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span className="font-semibold text-hopkins-blue">Ryan White ADAP</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>Cost-consequence explorer</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>
                  {ryanWhiteCostingMetadata.horizon.startYear}-
                  {ryanWhiteCostingMetadata.horizon.endYear}
                </span>
              </div>
              <h1 className="max-w-4xl break-words text-2xl font-semibold leading-tight text-gray-950 sm:text-4xl">
                Where avoided ADAP spending becomes downstream HIV care cost
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                Explore which states drive the economic conclusion, how the burden compares with the
                ADAP benchmark, and how epidemiologic impact turns into care costs.
              </p>
            </div>

            <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Drug-cost scenario</p>
              <div className="mt-2 grid grid-cols-3 rounded-md border border-gray-200 bg-white p-1">
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
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
          <StateCostMap
            states={rankedStates}
            selected={location}
            metric={mapMetric}
            onMetricChange={setMapMetric}
            onSelect={setLocation}
          />

          <div className="grid min-w-0 gap-6">
            <CostBridgePanel selectedName={selectedName} final={selectedFinal} scenario={scenario} />
            <div className="grid grid-cols-2 gap-3">
              <MetricChip label="National net" value={formatBillions(nationalNet.median)} />
              <MetricChip label="National care" value={formatBillions(nationalCare.median)} />
              <MetricChip
                label="Excess diagnoses"
                value={formatNumber(nationalFinal.cumulativeExcessNewDiagnoses.median)}
              />
              <MetricChip label="ADAP benchmark" value={formatBillions(nationalFinal.cumulativeAdapSpendingAvoided)} />
            </div>
          </div>
        </section>

        <MechanismChain final={selectedFinal} scenario={scenario} />

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ImpactScatter states={rankedStates} selected={location} onSelect={setLocation} />

          <div className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">National sensitivity</h2>
              <p className="mt-1 text-sm text-gray-500">Final-year net gap across drug-cost assumptions</p>
            </div>
            <div className="grid divide-y divide-gray-100">
              {scenarioComparison.map((item) => (
                <button
                  key={item.scenario}
                  type="button"
                  onClick={() => setScenario(item.scenario)}
                  className={`grid gap-3 p-4 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[110px_minmax(0,1fr)_90px] sm:items-center ${
                    scenario === item.scenario ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                    <p className="mt-1 text-xl font-semibold text-gray-950">{formatBillions(item.netMedian)}</p>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100">
                    <div
                      className="h-3 rounded-full bg-hopkins-blue"
                      style={{ width: `${Math.max(8, Math.min(100, (item.netMedian / scenarioMaxNet) * 100))}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Ratio {formatRatio(item.ratioMedian)}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <TrajectoryPanel
            trajectory={trajectory}
            selectedName={selectedName}
            scenario={scenario}
            error={seriesError}
          />

          <div className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-950">State detail</h2>
              <p className="mt-1 text-sm text-gray-500">Sorted by final-year net cost vs ADAP</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-gray-50 text-[0.68rem] uppercase tracking-wide text-gray-500">
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
                        item.state === location ? 'bg-blue-50/70' : ''
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

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-600 shadow-sm">
          <span className="font-semibold text-gray-950">Data notes:</span> 30 modeled states are shown.
          DC funding is excluded because no DC epidemiologic output is present. Funding comparators are
          deterministic; care-cost intervals are computed after per-simulation cumulative costing.
        </section>
      </main>
    </div>
  );
}
