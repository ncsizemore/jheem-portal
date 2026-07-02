import type {
  AnnualCostPoint,
  CostScenarioId,
  FinalYearSummary,
  RyanWhiteCostingSeries,
  RyanWhiteCostingSummary,
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
  excessDiagnoses: number;
  artPersonYears: number;
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

export type MapMetric = 'netCost' | 'netRatio' | 'careCost' | 'excessDiagnoses';

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
    label: 'Net cost',
    description: 'Care cost minus ADAP benchmark',
    format: formatCompactDollars,
  },
  {
    id: 'netRatio',
    label: 'Net ratio',
    description: 'Net cost divided by ADAP benchmark',
    format: formatRatio,
  },
  {
    id: 'careCost',
    label: 'Care cost',
    description: 'Downstream HIV care cost',
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
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
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
