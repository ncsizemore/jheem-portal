/**
 * Calibration Data Types and Utilities
 *
 * This module provides typed access to model calibration data for the
 * HIV Age Projections tool. The data compares model simulations against
 * CDC surveillance data from 2010-2021.
 */

import calibrationDataJson from './calibration-data.json';

// Age categories used in the calibration data
export type AgeCategory = '13-24 years' | '25-34 years' | '35-44 years' | '45-54 years' | '55+ years';

// Outcome types
export type CalibrationOutcome = 'prevalence' | 'diagnoses';

// State codes available in calibration data
export const CALIBRATION_STATES = [
  'AL', 'AR', 'AZ', 'CA', 'CO', 'FL', 'GA', 'IL', 'KY', 'LA',
  'MD', 'MI', 'MO', 'MS', 'NC', 'NY', 'OH', 'OK', 'SC', 'TN',
  'TX', 'VA', 'WA', 'WI'
] as const;

export type CalibrationStateCode = typeof CALIBRATION_STATES[number];

// State code to name mapping
export const STATE_NAMES: Record<CalibrationStateCode, string> = {
  AL: 'Alabama', AR: 'Arkansas', AZ: 'Arizona', CA: 'California',
  CO: 'Colorado', FL: 'Florida', GA: 'Georgia', IL: 'Illinois',
  KY: 'Kentucky', LA: 'Louisiana', MD: 'Maryland', MI: 'Michigan',
  MO: 'Missouri', MS: 'Mississippi', NC: 'North Carolina', NY: 'New York',
  OH: 'Ohio', OK: 'Oklahoma', SC: 'South Carolina', TN: 'Tennessee',
  TX: 'Texas', VA: 'Virginia', WA: 'Washington', WI: 'Wisconsin'
};

// Simulation data row (from model)
interface SimulationRowByAge {
  year: number;
  age: AgeCategory;
  location: CalibrationStateCode;
  lower: number;
  median: number;
  upper: number;
  lowermid: number;
  uppermid: number;
  mean: number;
}

interface SimulationRowByTotal {
  year: number;
  location: CalibrationStateCode;
  lower: number;
  median: number;
  upper: number;
  lowermid: number;
  uppermid: number;
  mean: number;
}

// Observed data row (CDC surveillance)
interface ObservedRowByAge {
  year: number;
  location: CalibrationStateCode;
  age: AgeCategory;
  source: string;
  value: number;
}

interface ObservedRowByTotal {
  year: number;
  location: CalibrationStateCode;
  source: string;
  value: number;
}

// Full data structure
interface CalibrationData {
  prevalence: {
    simulation: {
      by_age: SimulationRowByAge[];
      by_total: SimulationRowByTotal[];
    };
    observed: {
      by_age: ObservedRowByAge[];
      by_total: ObservedRowByTotal[];
    };
  };
  diagnoses: {
    simulation: {
      by_age: SimulationRowByAge[];
      by_total: SimulationRowByTotal[];
    };
    observed: {
      by_age: ObservedRowByAge[];
      by_total: ObservedRowByTotal[];
    };
  };
}

// Type assertion for the imported JSON
const calibrationData = calibrationDataJson as CalibrationData;

// Chart-ready data point for time series
export interface CalibrationChartPoint {
  year: number;
  mean: number;
  lower: number;
  upper: number;
  observed?: number;
}

/**
 * Get calibration data for a specific state and outcome combination.
 * Returns data formatted for use in a time series chart.
 */
export function getCalibrationData(
  stateCode: CalibrationStateCode,
  outcome: CalibrationOutcome,
  ageCategory: AgeCategory | 'total' = 'total'
): CalibrationChartPoint[] {
  const outcomeData = calibrationData[outcome];

  // Get simulation data
  let simData: { year: number; mean: number; lower: number; upper: number }[];
  if (ageCategory === 'total') {
    simData = outcomeData.simulation.by_total
      .filter(row => row.location === stateCode)
      .map(row => ({
        year: row.year,
        mean: row.mean,
        lower: row.lower,
        upper: row.upper
      }));
  } else {
    simData = outcomeData.simulation.by_age
      .filter(row => row.location === stateCode && row.age === ageCategory)
      .map(row => ({
        year: row.year,
        mean: row.mean,
        lower: row.lower,
        upper: row.upper
      }));
  }

  // Get observed data
  let obsData: Map<number, number>;
  if (ageCategory === 'total') {
    obsData = new Map(
      outcomeData.observed.by_total
        .filter(row => row.location === stateCode)
        .map(row => [row.year, row.value])
    );
  } else {
    obsData = new Map(
      outcomeData.observed.by_age
        .filter(row => row.location === stateCode && row.age === ageCategory)
        .map(row => [row.year, row.value])
    );
  }

  // Combine simulation and observed data
  return simData.map(sim => ({
    ...sim,
    observed: obsData.get(sim.year)
  }));
}

/**
 * Get all age categories
 */
export const AGE_CATEGORIES: AgeCategory[] = [
  '13-24 years',
  '25-34 years',
  '35-44 years',
  '45-54 years',
  '55+ years'
];

/**
 * Get display labels for age categories
 */
export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  '13-24 years': '13-24',
  '25-34 years': '25-34',
  '35-44 years': '35-44',
  '45-54 years': '45-54',
  '55+ years': '55+'
};

/**
 * Get display labels for outcomes
 */
export const OUTCOME_LABELS: Record<CalibrationOutcome, string> = {
  prevalence: 'Diagnosed Prevalence',
  diagnoses: 'New Diagnoses'
};

// Export the raw data for advanced use cases
export { calibrationData };
