// HIV Age Distribution by Race Data
// Processes race-stratified JHEEM model outputs

import raceDataJson from './hiv-age-projections-by-race.json';
import { YearProjection } from './hiv-age-projections';

// Race-specific data types
export interface RaceYearData {
  year: number;
  age_cohorts: {
    '13-24 years': { median: number; lower: number; upper: number };
    '25-34 years': { median: number; lower: number; upper: number };
    '35-44 years': { median: number; lower: number; upper: number };
    '45-54 years': { median: number; lower: number; upper: number };
    '55+ years': { median: number; lower: number; upper: number };
  };
}

export interface RaceData {
  race: string;
  race_label: string;
  data: RaceYearData[];
}

export interface StateRaceData {
  state_code: string;
  state_name: string;
  races: RaceData[];
}

// Race categories (from metadata)
export const RACE_CATEGORIES = {
  black: 'Black',
  hispanic: 'Hispanic',
  other: 'Other'
} as const;

export type RaceCategory = keyof typeof RACE_CATEGORIES;

// Import and store the full race data
export const HIV_AGE_PROJECTIONS_BY_RACE = raceDataJson.states as StateRaceData[];

// Helper: Get data for specific state and race
export function getRaceDataForState(
  stateCode: string,
  raceCategory: RaceCategory
): YearProjection[] | null {
  const stateData = HIV_AGE_PROJECTIONS_BY_RACE.find(
    s => s.state_code === stateCode
  );

  if (!stateData) return null;

  const raceData = stateData.races.find(r => r.race === raceCategory);
  if (!raceData) return null;

  // Transform to match YearProjection format
  return raceData.data.map(yearData => ({
    year: yearData.year,
    age_cohorts: {
      '13-24': yearData.age_cohorts['13-24 years'].median,
      '25-34': yearData.age_cohorts['25-34 years'].median,
      '35-44': yearData.age_cohorts['35-44 years'].median,
      '45-54': yearData.age_cohorts['45-54 years'].median,
      '55+': yearData.age_cohorts['55+ years'].median,
    }
  }));
}

// Helper: Get all race data for a state (formatted for charts)
export function getAllRacesForState(stateCode: string) {
  const stateData = HIV_AGE_PROJECTIONS_BY_RACE.find(
    s => s.state_code === stateCode
  );

  if (!stateData) return [];

  return stateData.races.map(race => ({
    race: race.race as RaceCategory,
    race_label: race.race_label,
    data: race.data.map(yearData => ({
      year: yearData.year,
      age_cohorts: {
        '13-24': yearData.age_cohorts['13-24 years'].median,
        '25-34': yearData.age_cohorts['25-34 years'].median,
        '35-44': yearData.age_cohorts['35-44 years'].median,
        '45-54': yearData.age_cohorts['45-54 years'].median,
        '55+': yearData.age_cohorts['55+ years'].median,
      }
    }))
  }));
}

// Helper: Get data for multiple states and races (for chart grid)
export function getMultiStateRaceData(
  stateCodes: string[],
  races: RaceCategory[]
) {
  const result: Array<{
    state_code: string;
    state_name: string;
    race: RaceCategory;
    race_label: string;
    data: YearProjection[];
  }> = [];

  stateCodes.forEach(stateCode => {
    const stateData = HIV_AGE_PROJECTIONS_BY_RACE.find(
      s => s.state_code === stateCode
    );

    if (!stateData) return;

    races.forEach(raceCategory => {
      const raceData = stateData.races.find(r => r.race === raceCategory);
      if (!raceData) return;

      result.push({
        state_code: stateData.state_code,
        state_name: stateData.state_name,
        race: raceCategory,
        race_label: raceData.race_label,
        data: raceData.data.map(yearData => ({
          year: yearData.year,
          age_cohorts: {
            '13-24': yearData.age_cohorts['13-24 years'].median,
            '25-34': yearData.age_cohorts['25-34 years'].median,
            '35-44': yearData.age_cohorts['35-44 years'].median,
            '45-54': yearData.age_cohorts['45-54 years'].median,
            '55+': yearData.age_cohorts['55+ years'].median,
          }
        }))
      });
    });
  });

  return result;
}
