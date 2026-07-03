import type {
  AnnualCostPoint,
  CostScenarioId,
  FinalYearSummary,
  QuantileCurve,
  RyanWhiteCostingSeries,
  RyanWhiteCostingSummary,
  ScenarioQuantileCurves,
  ScenarioShares,
  ScenarioValues,
  StateCostingSummary,
} from '@/data/ryan-white-costing';
import { STATE_CODE_TO_NAME } from '@/data/states';

export type LocationKey = 'Total' | string;

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

export function formatCompactDollars(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: Math.abs(value) >= 1_000_000_000 ? 1 : 0,
  }).format(value);
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
