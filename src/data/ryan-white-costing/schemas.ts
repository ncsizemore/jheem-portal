import type {
  RyanWhiteCostingMetadata,
  RyanWhiteCostingSeries,
  RyanWhiteCostingSummary,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireArray(value: unknown, label: string): void {
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
  requireArray(value.states, 'summary.states');
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
