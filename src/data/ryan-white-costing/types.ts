export type CostScenarioId = 'low' | 'median' | 'high';

export type IntervalLevel = 'p025_p975' | 'p05_p95' | 'p25_p75';

export interface QuantileValue {
  median: number;
  lower: number;
  upper: number;
}

export interface QuantileCurve {
  p025: number;
  p05: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p975: number;
}

export interface ScenarioValues {
  low: QuantileValue;
  median: QuantileValue;
  high: QuantileValue;
}

export interface ScenarioQuantileCurves {
  low: QuantileCurve;
  median: QuantileCurve;
  high: QuantileCurve;
}

export interface ScenarioShares {
  low: number;
  median: number;
  high: number;
}

export interface MechanismPoint {
  activeOnArtImmediate: number;
  activeOnArtReengaged: number;
  offArtExcess: number;
}

export interface AnnualCostPoint {
  year: number;
  cumulativeCareCost: ScenarioValues;
  cumulativeAdapSpendingAvoided: number;
  cumulativeTotalRwhapSpendingAvoided: number;
  cumulativeNetCostVsAdap: ScenarioValues;
  cumulativeNetCostVsTotalRwhap: ScenarioValues;
  cumulativeExcessNewDiagnoses: QuantileValue;
  cumulativeExcessInfections: QuantileValue;
  cumulativePersonYearsOnArt: QuantileValue;
  negativeExcessDiagnosesShare: number;
  negativeExcessInfectionsShare: number;
  pooledCumulativeCareCost: QuantileValue;
  pooledCumulativeNetCostVsAdap: QuantileValue;
  mechanism: MechanismPoint;
}

export interface FinalYearSummary extends AnnualCostPoint {
  cumulativeNetCostRatioVsAdap: ScenarioValues;
  cumulativeNetCostRatioVsTotalRwhap: ScenarioValues;
  cumulativeNetCostVsAdapQuantiles: ScenarioQuantileCurves;
  cumulativeCareCostQuantiles: ScenarioQuantileCurves;
  shareNetCostPositiveVsAdap: ScenarioShares;
  rankByNetCostVsAdap?: number;
  rankByNetCostRatioVsAdap?: number;
}

export interface PooledFinalYearSummary {
  cumulativeCareCost: QuantileValue;
  cumulativeCareCostQuantiles: QuantileCurve;
  cumulativeNetCostVsAdap: QuantileValue;
  cumulativeNetCostVsAdapQuantiles: QuantileCurve;
  cumulativeNetCostRatioVsAdap: QuantileValue;
  shareNetCostPositiveVsAdap: number;
}

export interface BaselineContext {
  diagnosedPrevalence: number;
  suppression: number;
  viralSuppressionPct: number;
  adapSuppression: number;
  propSuppressedOnAdap: number;
  rwClients: number;
  adapClients: number;
  adapClientShare: number;
  adapSpendingPerClient: number;
  diagnosedHivWeightedUrbanicity: number;
  medicaidExpansion: boolean;
  oahsClients: number;
  testing: number;
  sexualTransmissionRate: number;
  baselineNewDiagnoses: number;
  baselineNewInfections: number;
}

export interface StateCostingSummary {
  state: string;
  finalYear: FinalYearSummary;
  pooledFinalYear: PooledFinalYearSummary;
  baselineContext: BaselineContext;
}

export interface RyanWhiteCostingMetadata {
  dataContractVersion: '2.2.0';
  generatedAt: string;
  sourceArtifacts: {
    rData: ArtifactProvenance;
    fundingCsv: ArtifactProvenance;
    jurisdictionContextCsv: ArtifactProvenance;
    artPriceCsv: ArtifactProvenance;
    generator: ArtifactProvenance;
  };
  analysisSource: {
    repository: string;
    commit: string;
    analysisScript: string;
    supplementScript: string;
    artPriceScript: string;
  };
  horizon: {
    startYear: number;
    endYear: number;
  };
  simulationDraws: number;
  intervalLevel: IntervalLevel;
  defaultCostScenario: CostScenarioId;
  primaryEstimand: 'pooled' | CostScenarioId;
  pooledConvention: {
    description: string;
    nationalTotal: string;
  };
  defaultFocusJurisdiction: string;
  dollarYear: string;
  fundingAdjustment: {
    applied: boolean;
    description: string;
  };
  modeledJurisdictions: string[];
  modeledJurisdictionCount: number;
  excludedFundingLocations: string[];
  outcomeDefinitions: {
    infections: OutcomeDefinition;
    diagnoses: OutcomeDefinition;
    costingCohort: string;
  };
  contextDefinitions: {
    adapSpendingPerClient: string;
    diagnosedHivWeightedUrbanicity: string;
    medicaidExpansion: string;
  };
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
    totalEqualsJurisdictionSum: boolean;
    totalEqualsJurisdictionSumMaxAbsDiff: number;
    incidenceArrayMatchesTotalResults: boolean;
    incidenceArrayMaxAbsDiff: number;
    diagnosisArrayMatchesTotalResults: boolean;
    diagnosisArrayMaxAbsDiff: number;
    missingFundingLocations: string[];
    extraFundingLocations: string[];
    negativeExcessDiagnosesCount: number;
    negativeExcessDiagnosesShare: number;
    negativeExcessInfectionsCount: number;
    negativeExcessInfectionsShare: number;
  };
}

export interface ArtifactProvenance {
  fileName: string;
  sizeBytes: number;
  modifiedAt: string;
  sha256: string;
}

export interface OutcomeDefinition {
  field: string;
  source: string;
  description: string;
}

export interface RyanWhiteCostingSummary {
  national: {
    finalYear: FinalYearSummary;
    pooledFinalYear: PooledFinalYearSummary;
  };
  states: StateCostingSummary[];
  sensitivity: {
    costScenarios: CostScenarioId[];
    primaryScenario: CostScenarioId;
    primaryEstimand: 'pooled' | CostScenarioId;
  };
}

export interface RyanWhiteCostingSeries {
  national: AnnualCostPoint[];
  states: Record<string, AnnualCostPoint[]>;
}
