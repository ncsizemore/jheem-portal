import type {
  RyanWhiteCostingMetadata,
  RyanWhiteCostingSeries,
  RyanWhiteCostingSummary,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function requireRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireNumber(value: unknown, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function requireString(value: unknown, label: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requireBoolean(value: unknown, label: string): void {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
}

function requireStringArray(value: unknown, label: string): asserts value is string[] {
  requireArray(value, label);
  value.forEach((item, index) => requireString(item, `${label}[${index}]`));
}

const COST_SCENARIOS = ['low', 'median', 'high'] as const;

function requireQuantileValue(value: unknown, label: string): asserts value is Record<string, number> {
  requireRecord(value, label);
  requireNumber(value.median, `${label}.median`);
  requireNumber(value.lower, `${label}.lower`);
  requireNumber(value.upper, `${label}.upper`);
}

function requireScenarioValues(value: unknown, label: string): asserts value is Record<string, Record<string, number>> {
  requireRecord(value, label);
  for (const scenario of COST_SCENARIOS) {
    requireQuantileValue(value[scenario], `${label}.${scenario}`);
  }
}

function requireQuantileCurve(value: unknown, label: string): asserts value is Record<string, number> {
  requireRecord(value, label);
  for (const key of ['p025', 'p05', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p975']) {
    requireNumber(value[key], `${label}.${key}`);
  }
}

function requireScenarioQuantileCurves(value: unknown, label: string): asserts value is Record<string, Record<string, number>> {
  requireRecord(value, label);
  for (const scenario of COST_SCENARIOS) {
    requireQuantileCurve(value[scenario], `${label}.${scenario}`);
  }
}

function requireScenarioShares(value: unknown, label: string): asserts value is Record<string, number> {
  requireRecord(value, label);
  for (const scenario of COST_SCENARIOS) {
    requireNumber(value[scenario], `${label}.${scenario}`);
  }
}

function assertConsistentQuantiles(
  value: Record<string, unknown>,
  scenarioValuesField: string,
  curveField: string,
  label: string
): void {
  const scenarioValues = value[scenarioValuesField];
  const curves = value[curveField];
  requireScenarioValues(scenarioValues, `${label}.${scenarioValuesField}`);
  requireScenarioQuantileCurves(curves, `${label}.${curveField}`);

  for (const scenario of COST_SCENARIOS) {
    const summary = scenarioValues[scenario];
    const curve = curves[scenario] as Record<string, number>;
    const checks = [
      ['lower', 'p025'],
      ['median', 'p50'],
      ['upper', 'p975'],
    ] as const;

    for (const [summaryKey, curveKey] of checks) {
      if (summary[summaryKey] !== curve[curveKey]) {
        throw new Error(
          `${label}.${scenarioValuesField}.${scenario}.${summaryKey} must match ${curveField}.${scenario}.${curveKey}`
        );
      }
    }
  }
}

function requirePooledFinalYear(value: unknown, label: string): void {
  requireRecord(value, label);
  requireQuantileValue(value.cumulativeCareCost, `${label}.cumulativeCareCost`);
  requireQuantileCurve(value.cumulativeCareCostQuantiles, `${label}.cumulativeCareCostQuantiles`);
  requireQuantileValue(value.cumulativeNetCostVsAdap, `${label}.cumulativeNetCostVsAdap`);
  requireQuantileCurve(value.cumulativeNetCostVsAdapQuantiles, `${label}.cumulativeNetCostVsAdapQuantiles`);
  requireQuantileValue(value.cumulativeNetCostRatioVsAdap, `${label}.cumulativeNetCostRatioVsAdap`);
  requireNumber(value.shareNetCostPositiveVsAdap, `${label}.shareNetCostPositiveVsAdap`);
}

function requireMechanism(value: unknown, label: string): void {
  requireRecord(value, label);
  requireNumber(value.activeOnArtImmediate, `${label}.activeOnArtImmediate`);
  requireNumber(value.activeOnArtReengaged, `${label}.activeOnArtReengaged`);
  requireNumber(value.offArtExcess, `${label}.offArtExcess`);
}

function requireAnnualCostPoint(value: unknown, label: string): void {
  requireRecord(value, label);
  requireNumber(value.year, `${label}.year`);
  requireScenarioValues(value.cumulativeCareCost, `${label}.cumulativeCareCost`);
  requireNumber(value.cumulativeAdapSpendingAvoided, `${label}.cumulativeAdapSpendingAvoided`);
  requireNumber(value.cumulativeTotalRwhapSpendingAvoided, `${label}.cumulativeTotalRwhapSpendingAvoided`);
  requireScenarioValues(value.cumulativeNetCostVsAdap, `${label}.cumulativeNetCostVsAdap`);
  requireScenarioValues(value.cumulativeNetCostVsTotalRwhap, `${label}.cumulativeNetCostVsTotalRwhap`);
  requireQuantileValue(value.cumulativeExcessNewDiagnoses, `${label}.cumulativeExcessNewDiagnoses`);
  requireQuantileValue(value.cumulativeExcessInfections, `${label}.cumulativeExcessInfections`);
  requireQuantileValue(value.cumulativePersonYearsOnArt, `${label}.cumulativePersonYearsOnArt`);
  requireNumber(value.negativeExcessDiagnosesShare, `${label}.negativeExcessDiagnosesShare`);
  requireNumber(value.negativeExcessInfectionsShare, `${label}.negativeExcessInfectionsShare`);
  requireQuantileValue(value.pooledCumulativeCareCost, `${label}.pooledCumulativeCareCost`);
  requireQuantileValue(value.pooledCumulativeNetCostVsAdap, `${label}.pooledCumulativeNetCostVsAdap`);
  requireMechanism(value.mechanism, `${label}.mechanism`);
}

function requireBaselineContext(value: unknown, label: string): void {
  requireRecord(value, label);
  for (const key of [
    'diagnosedPrevalence',
    'suppression',
    'viralSuppressionPct',
    'adapSuppression',
    'propSuppressedOnAdap',
    'rwClients',
    'adapClients',
    'adapClientShare',
    'oahsClients',
    'testing',
    'sexualTransmissionRate',
    'baselineNewDiagnoses',
    'baselineNewInfections',
  ]) {
    requireNumber(value[key], `${label}.${key}`);
  }
}

function requireFinalYearUncertainty(value: unknown, label: string): void {
  requireAnnualCostPoint(value, label);
  requireRecord(value, label);
  requireScenarioQuantileCurves(
    value.cumulativeNetCostVsAdapQuantiles,
    `${label}.cumulativeNetCostVsAdapQuantiles`
  );
  requireScenarioQuantileCurves(
    value.cumulativeCareCostQuantiles,
    `${label}.cumulativeCareCostQuantiles`
  );
  requireScenarioShares(value.shareNetCostPositiveVsAdap, `${label}.shareNetCostPositiveVsAdap`);
  assertConsistentQuantiles(value, 'cumulativeNetCostVsAdap', 'cumulativeNetCostVsAdapQuantiles', label);
  assertConsistentQuantiles(value, 'cumulativeCareCost', 'cumulativeCareCostQuantiles', label);
}

function requireArtifactProvenance(value: unknown, label: string): void {
  requireRecord(value, label);
  requireString(value.fileName, `${label}.fileName`);
  requireNumber(value.sizeBytes, `${label}.sizeBytes`);
  requireString(value.modifiedAt, `${label}.modifiedAt`);
  requireString(value.sha256, `${label}.sha256`);
  if (!/^[0-9a-f]{64}$/.test(value.sha256 as string)) {
    throw new Error(`${label}.sha256 must be a lowercase SHA-256 digest`);
  }
}

function requireOutcomeDefinition(value: unknown, label: string): void {
  requireRecord(value, label);
  requireString(value.field, `${label}.field`);
  requireString(value.source, `${label}.source`);
  requireString(value.description, `${label}.description`);
}

export function validateRyanWhiteCostingMetadata(value: unknown): RyanWhiteCostingMetadata {
  requireRecord(value, 'metadata');
  if (value.dataContractVersion !== '2.0.0') {
    throw new Error('metadata.dataContractVersion must be 2.0.0');
  }
  requireString(value.generatedAt, 'metadata.generatedAt');
  requireRecord(value.sourceArtifacts, 'metadata.sourceArtifacts');
  requireArtifactProvenance(value.sourceArtifacts.rData, 'metadata.sourceArtifacts.rData');
  requireArtifactProvenance(value.sourceArtifacts.fundingCsv, 'metadata.sourceArtifacts.fundingCsv');
  requireArtifactProvenance(value.sourceArtifacts.generator, 'metadata.sourceArtifacts.generator');
  requireStringArray(value.modeledJurisdictions, 'metadata.modeledJurisdictions');
  requireNumber(value.modeledJurisdictionCount, 'metadata.modeledJurisdictionCount');
  requireStringArray(value.excludedFundingLocations, 'metadata.excludedFundingLocations');
  requireStringArray(value.assumptions, 'metadata.assumptions');
  requireRecord(value.horizon, 'metadata.horizon');
  requireNumber(value.horizon.startYear, 'metadata.horizon.startYear');
  requireNumber(value.horizon.endYear, 'metadata.horizon.endYear');
  requireNumber(value.simulationDraws, 'metadata.simulationDraws');
  requireRecord(value.outcomeDefinitions, 'metadata.outcomeDefinitions');
  requireOutcomeDefinition(value.outcomeDefinitions.infections, 'metadata.outcomeDefinitions.infections');
  requireOutcomeDefinition(value.outcomeDefinitions.diagnoses, 'metadata.outcomeDefinitions.diagnoses');
  requireString(value.outcomeDefinitions.costingCohort, 'metadata.outcomeDefinitions.costingCohort');
  requireRecord(value.validation, 'metadata.validation');
  requireBoolean(value.validation.totalEqualsJurisdictionSum, 'metadata.validation.totalEqualsJurisdictionSum');
  requireNumber(
    value.validation.totalEqualsJurisdictionSumMaxAbsDiff,
    'metadata.validation.totalEqualsJurisdictionSumMaxAbsDiff'
  );
  requireBoolean(
    value.validation.incidenceArrayMatchesTotalResults,
    'metadata.validation.incidenceArrayMatchesTotalResults'
  );
  requireNumber(value.validation.incidenceArrayMaxAbsDiff, 'metadata.validation.incidenceArrayMaxAbsDiff');
  requireBoolean(
    value.validation.diagnosisArrayMatchesTotalResults,
    'metadata.validation.diagnosisArrayMatchesTotalResults'
  );
  requireNumber(value.validation.diagnosisArrayMaxAbsDiff, 'metadata.validation.diagnosisArrayMaxAbsDiff');
  requireNumber(value.validation.mechanismClosureMaxAbsDiff, 'metadata.validation.mechanismClosureMaxAbsDiff');
  requireStringArray(value.validation.missingFundingLocations, 'metadata.validation.missingFundingLocations');
  requireStringArray(value.validation.extraFundingLocations, 'metadata.validation.extraFundingLocations');
  requireNumber(value.validation.negativeExcessDiagnosesCount, 'metadata.validation.negativeExcessDiagnosesCount');
  requireNumber(value.validation.negativeExcessDiagnosesShare, 'metadata.validation.negativeExcessDiagnosesShare');
  requireNumber(value.validation.negativeExcessInfectionsCount, 'metadata.validation.negativeExcessInfectionsCount');
  requireNumber(value.validation.negativeExcessInfectionsShare, 'metadata.validation.negativeExcessInfectionsShare');

  return value as unknown as RyanWhiteCostingMetadata;
}

export function validateRyanWhiteCostingSummary(value: unknown): RyanWhiteCostingSummary {
  requireRecord(value, 'summary');
  requireRecord(value.national, 'summary.national');
  requireFinalYearUncertainty(value.national.finalYear, 'summary.national.finalYear');
  requirePooledFinalYear(value.national.pooledFinalYear, 'summary.national.pooledFinalYear');
  requireArray(value.states, 'summary.states');
  value.states.forEach((state, index) => {
    requireRecord(state, `summary.states[${index}]`);
    requireString(state.state, `summary.states[${index}].state`);
    requireFinalYearUncertainty(state.finalYear, `summary.states[${index}].finalYear`);
    requirePooledFinalYear(state.pooledFinalYear, `summary.states[${index}].pooledFinalYear`);
    requireBaselineContext(state.baselineContext, `summary.states[${index}].baselineContext`);
  });
  requireRecord(value.sensitivity, 'summary.sensitivity');
  requireArray(value.sensitivity.costScenarios, 'summary.sensitivity.costScenarios');

  return value as unknown as RyanWhiteCostingSummary;
}

export function validateRyanWhiteCostingSeries(value: unknown): RyanWhiteCostingSeries {
  requireRecord(value, 'series');
  requireArray(value.national, 'series.national');
  requireRecord(value.states, 'series.states');
  value.national.forEach((point, index) => requireAnnualCostPoint(point, `series.national[${index}]`));
  Object.entries(value.states).forEach(([state, points]) => {
    requireArray(points, `series.states.${state}`);
    points.forEach((point, index) => requireAnnualCostPoint(point, `series.states.${state}[${index}]`));
  });

  return value as unknown as RyanWhiteCostingSeries;
}

export function validateInDev<T>(label: string, value: unknown, validator: (value: unknown) => T): T {
  if (process.env.NODE_ENV !== 'development') {
    return value as T;
  }

  try {
    return validator(value);
  } catch (error) {
    throw new Error(`Invalid Ryan White costing ${label}: ${(error as Error).message}`);
  }
}
