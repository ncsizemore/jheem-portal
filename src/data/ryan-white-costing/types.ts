export type CostScenarioId = 'low' | 'median' | 'high';

export type IntervalLevel = 'p025_p975' | 'p05_p95' | 'p25_p75';

export interface QuantileValue {
  median: number;
  lower: number;
  upper: number;
}

export interface ScenarioValues {
  low: QuantileValue;
  median: QuantileValue;
  high: QuantileValue;
}

export interface AnnualCostPoint {
  year: number;
  cumulativeCareCost: ScenarioValues;
  cumulativeAdapSpendingAvoided: number;
  cumulativeTotalRwhapSpendingAvoided: number;
  cumulativeNetCostVsAdap: ScenarioValues;
  cumulativeNetCostVsTotalRwhap: ScenarioValues;
  cumulativeExcessNewDiagnoses: QuantileValue;
  cumulativePersonYearsOnArt: QuantileValue;
  negativeExcessNewShare?: number;
}

export interface FinalYearSummary extends AnnualCostPoint {
  cumulativeNetCostRatioVsAdap: ScenarioValues;
  cumulativeNetCostRatioVsTotalRwhap: ScenarioValues;
  rankByNetCostVsAdap?: number;
  rankByNetCostRatioVsAdap?: number;
}

export interface StateCostingSummary {
  state: string;
  finalYear: FinalYearSummary;
}

export interface RyanWhiteCostingMetadata {
  generatedAt: string;
  sourceRData: string;
  sourceFundingCsv: string;
  horizon: {
    startYear: number;
    endYear: number;
  };
  intervalLevel: IntervalLevel;
  defaultCostScenario: CostScenarioId;
  defaultFocusState: string;
  dollarYear: string;
  fundingAdjustment: {
    applied: boolean;
    description: string;
  };
  modeledStates: string[];
  excludedFundingLocations: string[];
  assumptions: string[];
  deterministicFields: string[];
  modelParameters: {
    reengagementPi: number;
    reengagementLambda: number;
    discountRate: number;
    cd4Weights: Record<string, number>;
    artDrugCosts: Record<CostScenarioId, number>;
    routineCareCost: number;
    immediateStartCareFractionDescription: string;
  };
  validation: {
    totalEqualsStateSum: boolean;
    totalEqualsStateSumMaxAbsDiff: number;
    missingFundingLocations: string[];
    extraFundingLocations: string[];
    negativeExcessNewCount: number;
    negativeExcessNewShare: number;
  };
  reviewQuestions: string[];
}

export interface RyanWhiteCostingSummary {
  national: {
    finalYear: FinalYearSummary;
  };
  states: StateCostingSummary[];
  sensitivity: {
    costScenarios: CostScenarioId[];
    primaryScenario: CostScenarioId;
  };
}

export interface RyanWhiteCostingSeries {
  national: AnnualCostPoint[];
  states: Record<string, AnnualCostPoint[]>;
}
