// HIV Age Distribution by Sex Data
// Processes sex-stratified JHEEM model outputs (MSM vs Non-MSM)

import sexDataJson from './hiv-age-projections-by-sex.json';
import { YearProjection } from './hiv-age-projections';

// Sex-specific data types
export interface SexYearData {
  year: number;
  age_cohorts: {
    '13-24 years': { median: number; lower: number; upper: number };
    '25-34 years': { median: number; lower: number; upper: number };
    '35-44 years': { median: number; lower: number; upper: number };
    '45-54 years': { median: number; lower: number; upper: number };
    '55+ years': { median: number; lower: number; upper: number };
  };
}

export interface SexData {
  sex: string;
  sex_label: string;
  data: SexYearData[];
}

export interface StateSexData {
  state_code: string;
  state_name: string;
  sex_categories: SexData[];
}

// Sex categories (MSM vs Non-MSM)
export const SEX_CATEGORIES = {
  msm: 'MSM',
  non_msm: 'Non-MSM'
} as const;

export type SexCategory = keyof typeof SEX_CATEGORIES;

// Import and store the full sex data
export const HIV_AGE_PROJECTIONS_BY_SEX = sexDataJson.states as StateSexData[];

// Helper: Get data for specific state and sex
export function getSexDataForState(
  stateCode: string,
  sexCategory: SexCategory
): YearProjection[] | null {
  const stateData = HIV_AGE_PROJECTIONS_BY_SEX.find(
    s => s.state_code === stateCode
  );

  if (!stateData) return null;

  const sexData = stateData.sex_categories.find(s => s.sex === sexCategory);
  if (!sexData) return null;

  // Transform to match YearProjection format
  return sexData.data.map(yearData => ({
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

// Helper: Get all sex data for a state (formatted for charts)
export function getAllSexForState(stateCode: string) {
  const stateData = HIV_AGE_PROJECTIONS_BY_SEX.find(
    s => s.state_code === stateCode
  );

  if (!stateData) return [];

  return stateData.sex_categories.map(sex => ({
    sex: sex.sex as SexCategory,
    sex_label: sex.sex_label,
    data: sex.data.map(yearData => ({
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

// Helper: Get data for multiple states and sex categories (for chart grid)
export function getMultiStateSexData(
  stateCodes: string[],
  sexCategories: SexCategory[]
) {
  const result: Array<{
    state_code: string;
    state_name: string;
    sex: SexCategory;
    sex_label: string;
    data: YearProjection[];
  }> = [];

  stateCodes.forEach(stateCode => {
    const stateData = HIV_AGE_PROJECTIONS_BY_SEX.find(
      s => s.state_code === stateCode
    );

    if (!stateData) return;

    sexCategories.forEach(sexCategory => {
      const sexData = stateData.sex_categories.find(s => s.sex === sexCategory);
      if (!sexData) return;

      result.push({
        state_code: stateData.state_code,
        state_name: stateData.state_name,
        sex: sexCategory,
        sex_label: sexData.sex_label,
        data: sexData.data.map(yearData => ({
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
