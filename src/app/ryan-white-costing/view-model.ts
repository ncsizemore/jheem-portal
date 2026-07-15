import type {
  AnnualCostPoint,
  CostScenarioId,
  FinalYearSummary,
  QuantileCurve,
  QuantileValue,
  RyanWhiteCostingSeries,
  RyanWhiteCostingSummary,
  ScenarioQuantileCurves,
  ScenarioShares,
  ScenarioValues,
  StateCostingSummary,
} from '@/data/ryan-white-costing';
import { STATE_CODE_TO_NAME } from '@/data/states';

export type LocationKey = 'Total' | string;

export type EstimandId = 'pooled' | CostScenarioId;

export const HORIZON_MIN = 2026;
export const HORIZON_MAX = 2035;

export interface CostTrajectoryPoint {
  year: number;
  careMedian: number;
  careLower: number;
  careUpper: number;
  careBand: number;
  adap: number;
  totalRwhap: number;
  netMedian: number;
  excessDiagnoses: number;
}

export interface RankedStatePoint {
  state: string;
  stateName: string;
  careCost: number;
  careLower: number;
  careUpper: number;
  adapBenchmark: number;
  totalRwhapBenchmark: number;
  netCost: number;
  netLower: number;
  netUpper: number;
  netRatio: number;
  netQuantiles: QuantileCurve;
  careQuantiles: QuantileCurve;
  shareNetPositive: number;
  crossesZero: boolean;
  boundedPositive: boolean;
  excessDiagnoses: number;
  excessInfections: number;
  artPersonYears: number;
  binIndex?: number;
}

export interface ScenarioComparisonPoint {
  scenario: CostScenarioId;
  label: string;
  careMedian: number;
  careLower: number;
  careUpper: number;
  netMedian: number;
  netLower: number;
  netUpper: number;
  ratioMedian: number;
}

export type MapMetric = 'netCost' | 'careCost' | 'excessDiagnoses';

export interface MapMetricConfig {
  id: MapMetric;
  label: string;
  description: string;
  format: (value: number) => string;
}

export interface CostBridge {
  adapBenchmark: number;
  careMedian: number;
  careLower: number;
  careUpper: number;
  netMedian: number;
  netLower: number;
  netUpper: number;
  maxValue: number;
}

export interface MechanismStep {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface ScenarioEvidencePoint {
  scenario: CostScenarioId;
  label: string;
  shortLabel: string;
  curve: QuantileCurve;
  careCurve: QuantileCurve;
  shareNetPositive: number;
  netMedian: number;
  netLower: number;
  netUpper: number;
  careMedian: number;
}

export interface EvidenceDomain {
  min: number;
  max: number;
  zero: number;
}

export interface StateUncertaintySummary {
  total: number;
  crossing: number;
  boundedPositive: RankedStatePoint[];
}

export interface MapBin {
  min: number;
  max: number;
  label: string;
}

export interface ReviewCard {
  title: string;
  items: Array<{ label: string; value: string }>;
  note?: string;
}

export const SCENARIO_LABELS: Record<CostScenarioId, string> = {
  low: 'Low drug cost',
  median: 'Median drug cost',
  high: 'High drug cost',
};

export const SCENARIO_SHORT_LABELS: Record<CostScenarioId, string> = {
  low: 'Low',
  median: 'Median',
  high: 'High',
};

export const SCENARIO_ORDER: CostScenarioId[] = ['low', 'median', 'high'];

export const MAP_METRICS: MapMetricConfig[] = [
  {
    id: 'netCost',
    label: 'Net cost vs ADAP',
    description: 'Median magnitude ranking',
    format: formatCompactDollars,
  },
  {
    id: 'careCost',
    label: 'Downstream care cost',
    description: 'Median care-cost burden',
    format: formatCompactDollars,
  },
  {
    id: 'excessDiagnoses',
    label: 'Excess diagnoses',
    description: 'Cumulative excess diagnoses',
    format: formatNumber,
  },
];

export function stateName(code: string): string {
  return STATE_CODE_TO_NAME[code] ?? code;
}

export function scenarioMetric(values: ScenarioValues, scenario: CostScenarioId) {
  return values[scenario];
}

export function scenarioCurve(values: ScenarioQuantileCurves, scenario: CostScenarioId): QuantileCurve {
  return values[scenario];
}

export function scenarioShare(values: ScenarioShares, scenario: CostScenarioId): number {
  return values[scenario];
}

export function formatBillions(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  return `${sign}$${(abs / 1_000_000_000).toLocaleString('en-US', {
    maximumFractionDigits: abs >= 10_000_000_000 ? 1 : 2,
  })}B`;
}

// Deterministic compact currency: Intl compact notation renders differently
// across the server's Node ICU and the browser's ICU, which caused an SSR/
// client hydration mismatch. This hand-rolled version is stable everywhere.
export function formatCompactDollars(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${Math.round(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export function formatRatio(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function finalForLocation(
  summary: RyanWhiteCostingSummary,
  location: LocationKey
): FinalYearSummary {
  if (location === 'Total') {
    return summary.national.finalYear;
  }

  return summary.states.find((item) => item.state === location)?.finalYear ?? summary.national.finalYear;
}

export function seriesForLocation(
  series: RyanWhiteCostingSeries | null,
  location: LocationKey
): AnnualCostPoint[] {
  if (!series) return [];
  if (location === 'Total') return series.national;
  return series.states[location] ?? [];
}

export function pointForYear(points: AnnualCostPoint[], year: number): AnnualCostPoint | null {
  return points.find((point) => point.year === year) ?? null;
}

// Headline values for one location at one horizon year, under either estimand.
// perDollar is care cost per dollar of ADAP spending avoided (= paper ratio + 1);
// the denominator is deterministic, so the interval is exact.
export interface HeadlineValues {
  year: number;
  care: QuantileValue;
  net: QuantileValue;
  adap: number;
  perDollar: QuantileValue;
  excessDiagnoses: number;
  excessInfections: number;
  personYears: number;
}

export function headlineAt(point: AnnualCostPoint, estimand: EstimandId): HeadlineValues {
  const care = estimand === 'pooled' ? point.pooledCumulativeCareCost : scenarioMetric(point.cumulativeCareCost, estimand);
  const net = estimand === 'pooled' ? point.pooledCumulativeNetCostVsAdap : scenarioMetric(point.cumulativeNetCostVsAdap, estimand);
  const adap = point.cumulativeAdapSpendingAvoided;

  return {
    year: point.year,
    care,
    net,
    adap,
    perDollar: {
      median: care.median / adap,
      lower: care.lower / adap,
      upper: care.upper / adap,
    },
    excessDiagnoses: point.cumulativeExcessNewDiagnoses.median,
    excessInfections: point.cumulativeExcessInfections.median,
    personYears: point.cumulativePersonYearsOnArt.median,
  };
}

export const ESTIMAND_LABELS: Record<EstimandId, string> = {
  pooled: 'Pooled across drug-cost scenarios',
  low: 'Low drug-cost scenario',
  median: 'Median drug-cost scenario',
  high: 'High drug-cost scenario',
};

// One row of the uncertainty decomposition: the pooled distribution mixes
// drug-price and epidemic uncertainty; the three scenario rows isolate the
// epidemic component at a fixed price.
export interface DecompositionRow {
  id: EstimandId;
  label: string;
  detail: string;
  net: QuantileValue;
  perDollar: number;
  sharePositive: number | null;
  isPooled: boolean;
}

export function buildDecomposition(
  point: AnnualCostPoint,
  finalShares: { pooled: number; scenarios: ScenarioShares } | null
): DecompositionRow[] {
  const adap = point.cumulativeAdapSpendingAvoided;

  const pooledRow: DecompositionRow = {
    id: 'pooled',
    label: 'Equal-weight pooled',
    detail: 'all three tiers + model draws',
    net: point.pooledCumulativeNetCostVsAdap,
    perDollar: point.pooledCumulativeCareCost.median / adap,
    sharePositive: finalShares?.pooled ?? null,
    isPooled: true,
  };

  const scenarioRows = SCENARIO_ORDER.map((scenario): DecompositionRow => ({
    id: scenario,
    label: SCENARIO_SHORT_LABELS[scenario],
    detail: 'price fixed; model draws vary',
    net: scenarioMetric(point.cumulativeNetCostVsAdap, scenario),
    perDollar: scenarioMetric(point.cumulativeCareCost, scenario).median / adap,
    sharePositive: finalShares?.scenarios[scenario] ?? null,
    isPooled: false,
  }));

  return [pooledRow, ...scenarioRows];
}

export function formatPerDollar(value: number): string {
  return `$${value >= 10 ? value.toFixed(1) : value.toFixed(2)}`;
}

// First year the median net cost is positive (care cost overtakes claimed
// savings), with a linearly interpolated fractional position for markers.
export interface Crossover {
  year: number;
  position: number;
}

function computeCrossover(years: number[], netMedians: number[]): Crossover | null {
  for (let i = 0; i < netMedians.length; i += 1) {
    if (netMedians[i] > 0) {
      return {
        year: years[i],
        position: i === 0 ? years[0] : years[i - 1] + -netMedians[i - 1] / (netMedians[i] - netMedians[i - 1]),
      };
    }
  }
  return null;
}

function netMediansOf(points: AnnualCostPoint[], estimand: EstimandId): number[] {
  return points.map(
    (point) =>
      (estimand === 'pooled' ? point.pooledCumulativeNetCostVsAdap : scenarioMetric(point.cumulativeNetCostVsAdap, estimand))
        .median
  );
}

export function crossoverForPoints(points: AnnualCostPoint[], estimand: EstimandId): Crossover | null {
  if (points.length === 0) return null;
  return computeCrossover(points.map((point) => point.year), netMediansOf(points, estimand));
}

// Per-dollar trajectory across horizon years, plus the break-even crossing,
// for the budget-window control and its sparkline.
export interface HorizonProfile {
  years: number[];
  perDollar: number[];
  crossoverYear: number | null;
  crossoverPosition: number | null;
  maxPerDollar: number;
  finalPerDollar: number;
}

export function buildHorizonProfile(points: AnnualCostPoint[], estimand: EstimandId): HorizonProfile | null {
  if (points.length === 0) return null;

  const years = points.map((point) => point.year);
  const perDollar = points.map((point) => {
    const care =
      estimand === 'pooled' ? point.pooledCumulativeCareCost : scenarioMetric(point.cumulativeCareCost, estimand);
    return care.median / point.cumulativeAdapSpendingAvoided;
  });
  const crossover = computeCrossover(years, netMediansOf(points, estimand));

  return {
    years,
    perDollar,
    crossoverYear: crossover?.year ?? null,
    crossoverPosition: crossover?.position ?? null,
    maxPerDollar: Math.max(...perDollar, 1),
    finalPerDollar: perDollar[perDollar.length - 1],
  };
}

// Driver-table rows: the supplemental table's columns (excess diagnoses,
// person-years, care cost, ADAP avoided, net, ratio), evaluated at the
// selected budget window from the annual series. Falls back to the 2035
// summary while the series loads. shareNetPositive is a 2035 quantity.
export interface DriverRow {
  state: string;
  stateName: string;
  year: number;
  excessDiagnoses: number;
  excessInfections: number;
  personYears: number;
  careCost: QuantileValue;
  adap: number;
  net: QuantileValue;
  ratio: number;
  ratioLower: number;
  ratioUpper: number;
  perDollar: number;
  crossoverYear: number | null;
  shareNetPositive2035: number;
}

export type DriverSortKey =
  | 'net'
  | 'careCost'
  | 'adap'
  | 'ratio'
  | 'excessDiagnoses'
  | 'excessInfections'
  | 'personYears';

function driverRowFrom(
  state: string,
  displayName: string,
  point: AnnualCostPoint,
  scenario: CostScenarioId,
  crossoverYear: number | null,
  shareNetPositive2035: number
): DriverRow {
  const care = scenarioMetric(point.cumulativeCareCost, scenario);
  const net = scenarioMetric(point.cumulativeNetCostVsAdap, scenario);
  const adap = point.cumulativeAdapSpendingAvoided;

  return {
    state,
    stateName: displayName,
    year: point.year,
    excessDiagnoses: point.cumulativeExcessNewDiagnoses.median,
    excessInfections: point.cumulativeExcessInfections.median,
    personYears: point.cumulativePersonYearsOnArt.median,
    careCost: care,
    adap,
    net,
    ratio: net.median / adap,
    ratioLower: net.lower / adap,
    ratioUpper: net.upper / adap,
    perDollar: care.median / adap,
    crossoverYear,
    shareNetPositive2035,
  };
}

export function buildDriverRows(
  series: RyanWhiteCostingSeries | null,
  states: StateCostingSummary[],
  scenario: CostScenarioId,
  horizon: number,
  crossovers: StateCrossover[]
): DriverRow[] {
  const crossoverByState = new Map(crossovers.map((item) => [item.state, item.crossoverYear]));

  return states.map((item) => {
    const point = pointForYear(series?.states[item.state] ?? [], horizon) ?? item.finalYear;
    return driverRowFrom(
      item.state,
      stateName(item.state),
      point,
      scenario,
      crossoverByState.get(item.state) ?? null,
      item.finalYear.shareNetCostPositiveVsAdap[scenario]
    );
  });
}

export function buildNationalDriverRow(
  series: RyanWhiteCostingSeries | null,
  summary: RyanWhiteCostingSummary,
  scenario: CostScenarioId,
  horizon: number
): DriverRow {
  const point = pointForYear(series?.national ?? [], horizon) ?? summary.national.finalYear;
  const crossover = crossoverForPoints(series?.national ?? [], scenario);
  return driverRowFrom(
    'Total',
    'Modeled-jurisdiction total',
    point,
    scenario,
    crossover?.year ?? null,
    summary.national.finalYear.shareNetCostPositiveVsAdap[scenario]
  );
}

export function sortDriverRows(rows: DriverRow[], key: DriverSortKey): DriverRow[] {
  const value = (row: DriverRow): number => {
    if (key === 'net') return row.net.median;
    if (key === 'careCost') return row.careCost.median;
    return row[key];
  };
  return [...rows].sort((a, b) => value(b) - value(a));
}

// Mechanism decomposition series for the drilldown: who is accruing cost.
export interface MechanismSeriesPoint {
  year: number;
  immediate: number;
  reengaged: number;
  offArt: number;
}

export function buildMechanismSeries(points: AnnualCostPoint[]): MechanismSeriesPoint[] {
  return points.map((point) => ({
    year: point.year,
    immediate: point.mechanism.activeOnArtImmediate,
    reengaged: point.mechanism.activeOnArtReengaged,
    offArt: point.mechanism.offArtExcess,
  }));
}

// Heterogeneity explorer: net/ADAP ratio against a selectable baseline-context
// variable. Descriptive associations only - no fitted lines, no adjustment.
export type ContextAxisId =
  | 'sexualTransmissionRate'
  | 'propSuppressedOnAdap'
  | 'adapSpendingPerClient'
  | 'diagnosedHivWeightedUrbanicity';

export interface ContextAxis {
  id: ContextAxisId;
  label: string;
  shortLabel: string;
  description: string;
  format: (value: number) => string;
  domain?: [number, number];
  ticks?: number[];
}

export const CONTEXT_AXES: ContextAxis[] = [
  {
    id: 'sexualTransmissionRate',
    label: 'Average transmission rate',
    shortLabel: 'Transmission',
    description:
      'Mean modeled 2025 sexual transmissions divided by diagnosed PWH who were not virally suppressed.',
    format: (value) => value.toFixed(3),
    domain: [0, 4],
    ticks: [0, 1, 2, 3, 4],
  },
  {
    id: 'adapSpendingPerClient',
    label: 'Annual ADAP spending per client',
    shortLabel: 'Spending / client',
    description: 'Annual baseline ADAP funding (2026 USD) divided by mean 2025 baseline clients.',
    format: (value) => `$${(value / 1_000).toFixed(1)}K`,
    domain: [0, 10_000],
    ticks: [0, 2_500, 5_000, 7_500, 10_000],
  },
  {
    id: 'propSuppressedOnAdap',
    label: 'Suppressed PWH supported through ADAP',
    shortLabel: 'Suppressed on ADAP',
    description: 'Mean share of virally suppressed PWH who were supported through ADAP at baseline.',
    format: formatPercent,
    domain: [0, 0.7],
    ticks: [0, 0.2, 0.4, 0.6],
  },
  {
    id: 'diagnosedHivWeightedUrbanicity',
    label: 'Diagnosed-HIV-weighted urbanicity',
    shortLabel: 'Urbanicity',
    description: 'County urban population share weighted by 2021 diagnosed HIV prevalence.',
    format: formatPercent,
    domain: [0.5, 1.02],
    ticks: [0.5, 0.6, 0.7, 0.8, 0.9, 1],
  },
];

export interface HeterogeneityPoint {
  state: string;
  stateName: string;
  x: number;
  ratio: number;
  adap: number;
  medicaidExpansion: boolean;
}

export function buildHeterogeneityPoints(
  rows: DriverRow[],
  states: StateCostingSummary[],
  axis: ContextAxisId
): HeterogeneityPoint[] {
  const contextByState = new Map(states.map((item) => [item.state, item.baselineContext]));

  return rows
    .map((row) => {
      const context = contextByState.get(row.state);
      if (!context) return null;
      return {
        state: row.state,
        stateName: row.stateName,
        x: context[axis],
        ratio: row.ratio,
        adap: row.adap,
        medicaidExpansion: context.medicaidExpansion,
      };
    })
    .filter((point): point is HeterogeneityPoint => point !== null && Number.isFinite(point.x));
}

function averageRanks(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(values.length);

  for (let start = 0; start < sorted.length; ) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end += 1;
    const average = (start + 1 + end) / 2;
    for (let index = start; index < end; index += 1) ranks[sorted[index].index] = average;
    start = end;
  }

  return ranks;
}

export function spearmanRho(points: Array<{ x: number; ratio: number }>): number | null {
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.ratio));
  if (finite.length < 2) return null;
  const xRanks = averageRanks(finite.map((point) => point.x));
  const yRanks = averageRanks(finite.map((point) => point.ratio));
  const meanX = xRanks.reduce((sum, value) => sum + value, 0) / xRanks.length;
  const meanY = yRanks.reduce((sum, value) => sum + value, 0) / yRanks.length;
  let numerator = 0;
  let xSquares = 0;
  let ySquares = 0;

  for (let index = 0; index < finite.length; index += 1) {
    const xDelta = xRanks[index] - meanX;
    const yDelta = yRanks[index] - meanY;
    numerator += xDelta * yDelta;
    xSquares += xDelta * xDelta;
    ySquares += yDelta * yDelta;
  }

  const denominator = Math.sqrt(xSquares * ySquares);
  return denominator === 0 ? null : numerator / denominator;
}

// Crossover year for every state, for the ranked crossover timeline.
export interface StateCrossover {
  state: string;
  stateName: string;
  crossoverYear: number | null;
  perDollarFinal: number;
}

export function buildStateCrossovers(
  series: RyanWhiteCostingSeries | null,
  scenario: CostScenarioId
): StateCrossover[] {
  if (!series) return [];
  return Object.entries(series.states).map(([state, points]) => {
    const crossover = crossoverForPoints(points, scenario);
    const final = points[points.length - 1];
    return {
      state,
      stateName: stateName(state),
      crossoverYear: crossover?.year ?? null,
      perDollarFinal:
        scenarioMetric(final.cumulativeCareCost, scenario).median / final.cumulativeAdapSpendingAvoided,
    };
  });
}

export function buildTrajectoryData(
  points: AnnualCostPoint[],
  scenario: CostScenarioId
): CostTrajectoryPoint[] {
  return points.map((point) => {
    const care = scenarioMetric(point.cumulativeCareCost, scenario);
    const net = scenarioMetric(point.cumulativeNetCostVsAdap, scenario);

    return {
      year: point.year,
      careMedian: care.median,
      careLower: care.lower,
      careUpper: care.upper,
      careBand: Math.max(care.upper - care.lower, 0),
      adap: point.cumulativeAdapSpendingAvoided,
      totalRwhap: point.cumulativeTotalRwhapSpendingAvoided,
      netMedian: net.median,
      excessDiagnoses: point.cumulativeExcessNewDiagnoses.median,
    };
  });
}

export function buildRankedStates(
  states: StateCostingSummary[],
  scenario: CostScenarioId
): RankedStatePoint[] {
  return states
    .map((item) => {
      const final = item.finalYear;
      const care = scenarioMetric(final.cumulativeCareCost, scenario);
      const net = scenarioMetric(final.cumulativeNetCostVsAdap, scenario);
      const netQuantiles = scenarioCurve(final.cumulativeNetCostVsAdapQuantiles, scenario);
      const careQuantiles = scenarioCurve(final.cumulativeCareCostQuantiles, scenario);
      return {
        state: item.state,
        stateName: stateName(item.state),
        careCost: care.median,
        careLower: care.lower,
        careUpper: care.upper,
        adapBenchmark: final.cumulativeAdapSpendingAvoided,
        totalRwhapBenchmark: final.cumulativeTotalRwhapSpendingAvoided,
        netCost: net.median,
        netLower: net.lower,
        netUpper: net.upper,
        netRatio: scenarioMetric(final.cumulativeNetCostRatioVsAdap, scenario).median,
        netQuantiles,
        careQuantiles,
        shareNetPositive: scenarioShare(final.shareNetCostPositiveVsAdap, scenario),
        crossesZero: net.lower <= 0 && net.upper >= 0,
        boundedPositive: net.lower > 0,
        excessDiagnoses: final.cumulativeExcessNewDiagnoses.median,
        excessInfections: final.cumulativeExcessInfections.median,
        artPersonYears: final.cumulativePersonYearsOnArt.median,
      };
    })
    .sort((a, b) => b.netCost - a.netCost);
}

export function buildRatioLeaders(
  states: StateCostingSummary[],
  scenario: CostScenarioId,
  count = 10
): RankedStatePoint[] {
  return buildRankedStates(states, scenario)
    .sort((a, b) => b.netRatio - a.netRatio)
    .slice(0, count);
}

export function buildScenarioComparison(final: FinalYearSummary): ScenarioComparisonPoint[] {
  return SCENARIO_ORDER.map((scenario) => {
    const care = scenarioMetric(final.cumulativeCareCost, scenario);
    const net = scenarioMetric(final.cumulativeNetCostVsAdap, scenario);
    const ratio = scenarioMetric(final.cumulativeNetCostRatioVsAdap, scenario);

    return {
      scenario,
      label: SCENARIO_SHORT_LABELS[scenario],
      careMedian: care.median,
      careLower: care.lower,
      careUpper: care.upper,
      netMedian: net.median,
      netLower: net.lower,
      netUpper: net.upper,
      ratioMedian: ratio.median,
    };
  });
}

export function buildScenarioEvidence(final: FinalYearSummary): ScenarioEvidencePoint[] {
  return SCENARIO_ORDER.map((scenario) => {
    const net = scenarioMetric(final.cumulativeNetCostVsAdap, scenario);
    const care = scenarioMetric(final.cumulativeCareCost, scenario);

    return {
      scenario,
      label: SCENARIO_LABELS[scenario],
      shortLabel: SCENARIO_SHORT_LABELS[scenario],
      curve: scenarioCurve(final.cumulativeNetCostVsAdapQuantiles, scenario),
      careCurve: scenarioCurve(final.cumulativeCareCostQuantiles, scenario),
      shareNetPositive: scenarioShare(final.shareNetCostPositiveVsAdap, scenario),
      netMedian: net.median,
      netLower: net.lower,
      netUpper: net.upper,
      careMedian: care.median,
    };
  });
}

export function buildEvidenceDomain(points: ScenarioEvidencePoint[]): EvidenceDomain {
  const min = Math.min(0, ...points.map((point) => point.curve.p025));
  const max = Math.max(0, ...points.map((point) => point.curve.p975));
  const roundTo = 1_000_000_000;

  return {
    min: Math.floor(min / roundTo) * roundTo,
    max: Math.ceil(max / roundTo) * roundTo,
    zero: 0,
  };
}

export function getMapMetricConfig(metric: MapMetric): MapMetricConfig {
  return MAP_METRICS.find((item) => item.id === metric) ?? MAP_METRICS[0];
}

export function getStateMetricValue(state: RankedStatePoint, metric: MapMetric): number {
  return state[metric];
}

export function buildStateLookup(states: RankedStatePoint[]): Record<string, RankedStatePoint> {
  return Object.fromEntries(states.map((item) => [item.state, item]));
}

export function buildMetricDomain(states: RankedStatePoint[], metric: MapMetric): { min: number; max: number } {
  const values = states.map((state) => getStateMetricValue(state, metric));
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function buildRankBins(states: RankedStatePoint[], metric: MapMetric, count = 5): MapBin[] {
  const sortedValues = states
    .map((state) => getStateMetricValue(state, metric))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (sortedValues.length === 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * sortedValues.length) / count);
    const end = Math.min(sortedValues.length - 1, Math.floor(((index + 1) * sortedValues.length) / count) - 1);
    const min = sortedValues[start] ?? sortedValues[0];
    const max = sortedValues[end] ?? sortedValues[sortedValues.length - 1];
    return {
      min,
      max,
      label: `${getMapMetricConfig(metric).format(min)}-${getMapMetricConfig(metric).format(max)}`,
    };
  });
}

export function getRankBinIndex(value: number, bins: MapBin[]): number {
  const index = bins.findIndex((bin, binIndex) => {
    const isLast = binIndex === bins.length - 1;
    return value >= bin.min && (value <= bin.max || isLast);
  });

  return index >= 0 ? index : Math.max(0, bins.length - 1);
}

export function buildStateUncertaintySummary(states: RankedStatePoint[]): StateUncertaintySummary {
  return {
    total: states.length,
    crossing: states.filter((state) => state.crossesZero).length,
    boundedPositive: states.filter((state) => state.boundedPositive),
  };
}

export function buildCostBridge(final: FinalYearSummary, scenario: CostScenarioId): CostBridge {
  const care = scenarioMetric(final.cumulativeCareCost, scenario);
  const net = scenarioMetric(final.cumulativeNetCostVsAdap, scenario);

  return {
    adapBenchmark: final.cumulativeAdapSpendingAvoided,
    careMedian: care.median,
    careLower: care.lower,
    careUpper: care.upper,
    netMedian: net.median,
    netLower: net.lower,
    netUpper: net.upper,
    maxValue: Math.max(care.upper, final.cumulativeAdapSpendingAvoided, Math.abs(net.upper), Math.abs(net.lower)),
  };
}

export function buildMechanismSteps(final: FinalYearSummary, scenario: CostScenarioId): MechanismStep[] {
  const care = scenarioMetric(final.cumulativeCareCost, scenario);
  const net = scenarioMetric(final.cumulativeNetCostVsAdap, scenario);

  return [
    {
      id: 'diagnoses',
      label: 'Excess diagnoses',
      value: formatNumber(final.cumulativeExcessNewDiagnoses.median),
      detail: 'Model-estimated additional diagnoses over the costing horizon.',
    },
    {
      id: 'person-years',
      label: 'ART person-years',
      value: formatNumber(final.cumulativePersonYearsOnArt.median),
      detail: 'Cumulative treatment person-years generated by immediate and delayed care engagement.',
    },
    {
      id: 'care-cost',
      label: 'Care cost',
      value: formatBillions(care.median),
      detail: `${formatBillions(care.lower)} to ${formatBillions(care.upper)} interval.`,
    },
    {
      id: 'funding',
      label: 'ADAP benchmark',
      value: formatBillions(final.cumulativeAdapSpendingAvoided),
      detail: 'Deterministic funding comparator from the state funding CSV.',
    },
    {
      id: 'net',
      label: 'Net gap',
      value: formatBillions(net.median),
      detail: 'Downstream care cost minus deterministic ADAP benchmark.',
    },
  ];
}

export function buildReviewCards(final: FinalYearSummary): ReviewCard[] {
  return [
    {
      title: 'Current accounting frame',
      items: [
        { label: 'Comparator', value: 'ADAP spending avoided' },
        { label: 'Net metric', value: 'Care cost minus ADAP' },
      ],
      note: 'This is not a settled payer-perspective conclusion; downstream care may be ADAP/RWHAP-eligible under alternative counterfactuals.',
    },
    {
      title: 'National uncertainty',
      items: [
        { label: 'Median net', value: formatCompactDollars(scenarioMetric(final.cumulativeNetCostVsAdap, 'median').median) },
        {
          label: 'Interval',
          value: `${formatCompactDollars(scenarioMetric(final.cumulativeNetCostVsAdap, 'median').lower)} to ${formatCompactDollars(
            scenarioMetric(final.cumulativeNetCostVsAdap, 'median').upper
          )}`,
        },
        { label: 'Draws above zero', value: formatPercent(final.shareNetCostPositiveVsAdap.median) },
      ],
    },
  ];
}
