// HIV Age Distribution Projections Data
// Based on "Figure 2: Projected Age Distribution of People with Diagnosed HIV over Time"
// Now using real JHEEM model outputs!

import realDataAggregated from './hiv-age-projections-aggregated.json';

export interface AgeCohortsData {
  '13-24': number;
  '25-34': number;
  '35-44': number;
  '45-54': number;
  '55+': number;
}

// Internal interface for loaded data (includes CI, will use median for now)
interface AgeCohortsDataWithCI {
  '13-24 years': { median: number; lower: number; upper: number };
  '25-34 years': { median: number; lower: number; upper: number };
  '35-44 years': { median: number; lower: number; upper: number };
  '45-54 years': { median: number; lower: number; upper: number };
  '55+ years': { median: number; lower: number; upper: number };
}

export interface YearProjection {
  year: number;
  age_cohorts: AgeCohortsData;
}

export interface StateAgeData {
  state_code: string;
  state_name: string;
  data: YearProjection[];
}

export * from './hiv-age-catalog';

// Transform real data from JSON to app format (extract median, strip " years" suffix)
// The real data shows the expected aging HIV population pattern:
// - Generally aging HIV population (more 55+ over time, fewer 13-24)
// - Significant state variation in absolute numbers
// - Consistent demographic trends across states
export const HIV_AGE_PROJECTIONS: StateAgeData[] =
  realDataAggregated.states.map((state) => ({
    state_code: state.state_code,
    state_name: state.state_name,
    data: state.data.map((yearData) => ({
      year: yearData.year,
      age_cohorts: {
        '13-24': (yearData.age_cohorts as AgeCohortsDataWithCI)['13-24 years']
          .median,
        '25-34': (yearData.age_cohorts as AgeCohortsDataWithCI)['25-34 years']
          .median,
        '35-44': (yearData.age_cohorts as AgeCohortsDataWithCI)['35-44 years']
          .median,
        '45-54': (yearData.age_cohorts as AgeCohortsDataWithCI)['45-54 years']
          .median,
        '55+': (yearData.age_cohorts as AgeCohortsDataWithCI)['55+ years']
          .median,
      },
    })),
  }));

// Store full data (with CI) for future use when we add CI visualization
export const HIV_AGE_PROJECTIONS_FULL = realDataAggregated.states;

// Helper functions for data processing
export function getStateByName(stateName: string): StateAgeData | undefined {
  return HIV_AGE_PROJECTIONS.find((state) => state.state_name === stateName);
}

export function getStatesByNames(stateNames: string[]): StateAgeData[] {
  return stateNames
    .map((name) => getStateByName(name))
    .filter(Boolean) as StateAgeData[];
}

export function getYearRange(): [number, number] {
  return [2025, 2040];
}

export function getAgeCohortsLabels(): string[] {
  return ['13-24', '25-34', '35-44', '45-54', '55+'];
}

// Ordered age palette: younger groups are lighter, older groups darker.
export const AGE_COHORT_COLORS = {
  '13-24': '#c0d5dc',
  '25-34': '#89b2bd',
  '35-44': '#55909f',
  '45-54': '#2b687d',
  '55+': '#173e56',
} as const;

// Chart data type for transformed data
export interface ChartDataPoint {
  year: number;
  [key: string]: number;
}

// Transform data for Recharts stacked area chart
export function transformDataForChart(
  states: StateAgeData[],
  yearRange: [number, number] = [2025, 2040],
  normalized: boolean = false,
): ChartDataPoint[] {
  if (states.length === 0) return [];

  const [startYear, endYear] = yearRange;
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i,
  );

  return years.map((year) => {
    const yearData: ChartDataPoint = { year };

    states.forEach((state) => {
      const yearProjection = state.data.find((d) => d.year === year);
      if (yearProjection) {
        const prefix = state.state_name.replace(/\s+/g, '_');

        if (normalized) {
          // Calculate total for normalization
          const total = Object.values(yearProjection.age_cohorts).reduce(
            (sum, val) => sum + val,
            0,
          );

          yearData[`${prefix}_13-24`] =
            total > 0 ? (yearProjection.age_cohorts['13-24'] / total) * 100 : 0;
          yearData[`${prefix}_25-34`] =
            total > 0 ? (yearProjection.age_cohorts['25-34'] / total) * 100 : 0;
          yearData[`${prefix}_35-44`] =
            total > 0 ? (yearProjection.age_cohorts['35-44'] / total) * 100 : 0;
          yearData[`${prefix}_45-54`] =
            total > 0 ? (yearProjection.age_cohorts['45-54'] / total) * 100 : 0;
          yearData[`${prefix}_55+`] =
            total > 0 ? (yearProjection.age_cohorts['55+'] / total) * 100 : 0;
        } else {
          yearData[`${prefix}_13-24`] = yearProjection.age_cohorts['13-24'];
          yearData[`${prefix}_25-34`] = yearProjection.age_cohorts['25-34'];
          yearData[`${prefix}_35-44`] = yearProjection.age_cohorts['35-44'];
          yearData[`${prefix}_45-54`] = yearProjection.age_cohorts['45-54'];
          yearData[`${prefix}_55+`] = yearProjection.age_cohorts['55+'];
        }
      }
    });

    return yearData;
  });
}
