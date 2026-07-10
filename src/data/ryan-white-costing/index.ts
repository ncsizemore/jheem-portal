import metadataJson from './metadata.json';
import summaryJson from './summary.json';
import {
  validateInDev,
  validateRyanWhiteCostingMetadata,
  validateRyanWhiteCostingSeries,
  validateRyanWhiteCostingSummary,
} from './schemas';
import type {
  CostScenarioId,
  RyanWhiteCostingMetadata,
  RyanWhiteCostingSeries,
  RyanWhiteCostingSummary,
  StateCostingSummary,
} from './types';

export type {
  AnnualCostPoint,
  BaselineContext,
  CostScenarioId,
  FinalYearSummary,
  MechanismPoint,
  PooledFinalYearSummary,
  QuantileCurve,
  QuantileValue,
  RyanWhiteCostingMetadata,
  RyanWhiteCostingSeries,
  RyanWhiteCostingSummary,
  ScenarioQuantileCurves,
  ScenarioShares,
  ScenarioValues,
  StateCostingSummary,
} from './types';

export const ryanWhiteCostingMetadata: RyanWhiteCostingMetadata = validateInDev(
  'metadata',
  metadataJson,
  validateRyanWhiteCostingMetadata
);

export const ryanWhiteCostingSummary: RyanWhiteCostingSummary = validateInDev(
  'summary',
  summaryJson,
  validateRyanWhiteCostingSummary
);

let seriesPromise: Promise<RyanWhiteCostingSeries> | null = null;

export async function fetchRyanWhiteCostingSeries(): Promise<RyanWhiteCostingSeries> {
  if (!seriesPromise) {
    seriesPromise = fetch('/data/ryan-white-costing/series.json')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch Ryan White costing series: ${response.status}`);
        }

        const data = await response.json();
        return validateInDev('series', data, validateRyanWhiteCostingSeries);
      })
      .catch((error) => {
        seriesPromise = null;
        throw error;
      });
  }

  return seriesPromise;
}

export function getRyanWhiteCostingStateSummary(state: string): StateCostingSummary | undefined {
  return ryanWhiteCostingSummary.states.find((item) => item.state === state);
}

export function getRyanWhiteCostingPrimaryScenario(): CostScenarioId {
  return ryanWhiteCostingSummary.sensitivity.primaryScenario;
}
