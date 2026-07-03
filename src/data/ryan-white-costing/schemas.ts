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
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
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

function requireFinalYearUncertainty(value: unknown, label: string): void {
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

export function validateRyanWhiteCostingMetadata(value: unknown): RyanWhiteCostingMetadata {
  requireRecord(value, 'metadata');
  requireArray(value.modeledStates, 'metadata.modeledStates');
  requireArray(value.excludedFundingLocations, 'metadata.excludedFundingLocations');
  requireArray(value.assumptions, 'metadata.assumptions');
  requireArray(value.reviewQuestions, 'metadata.reviewQuestions');
  requireRecord(value.horizon, 'metadata.horizon');
  requireNumber(value.horizon.startYear, 'metadata.horizon.startYear');
  requireNumber(value.horizon.endYear, 'metadata.horizon.endYear');
  requireRecord(value.validation, 'metadata.validation');
  requireNumber(value.validation.negativeExcessNewShare, 'metadata.validation.negativeExcessNewShare');

  return value as unknown as RyanWhiteCostingMetadata;
}

export function validateRyanWhiteCostingSummary(value: unknown): RyanWhiteCostingSummary {
  requireRecord(value, 'summary');
  requireRecord(value.national, 'summary.national');
  requireRecord(value.national.finalYear, 'summary.national.finalYear');
  requireFinalYearUncertainty(value.national.finalYear, 'summary.national.finalYear');
  requireArray(value.states, 'summary.states');
  value.states.forEach((state, index) => {
    requireRecord(state, `summary.states[${index}]`);
    requireFinalYearUncertainty(state.finalYear, `summary.states[${index}].finalYear`);
  });
  requireRecord(value.sensitivity, 'summary.sensitivity');
  requireArray(value.sensitivity.costScenarios, 'summary.sensitivity.costScenarios');

  return value as unknown as RyanWhiteCostingSummary;
}

export function validateRyanWhiteCostingSeries(value: unknown): RyanWhiteCostingSeries {
  requireRecord(value, 'series');
  requireArray(value.national, 'series.national');
  requireRecord(value.states, 'series.states');

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
