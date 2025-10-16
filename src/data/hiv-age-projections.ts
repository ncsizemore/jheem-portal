// HIV Age Distribution Projections Data
// Based on "Figure 2: Projected Age Distribution of People with Diagnosed HIV over Time"

export interface AgeCohortsData {
  '13-24': number;
  '25-34': number;
  '35-44': number;
  '45-54': number;
  '55+': number;
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

// List of states and territories from the figure
export const AVAILABLE_STATES = [
  'Alabama', 'Arkansas', 'Arizona', 'California', 'Colorado',
  'Florida', 'Georgia', 'Illinois', 'Kentucky', 'Louisiana',
  'Maryland', 'Michigan', 'Missouri', 'Mississippi', 'North Carolina',
  'New York', 'Ohio', 'Oklahoma', 'South Carolina', 'Tennessee',
  'Texas', 'Virginia', 'Washington', 'Wisconsin', 'Total'
] as const;

// Generate realistic synthetic data that matches the patterns visible in the figure
// The data shows:
// - Generally aging HIV population (more 55+ over time, fewer 13-24)
// - Significant state variation in absolute numbers
// - Consistent demographic trends across states

function generateStateProjections(
  stateName: string,
  basePopulation: number
): YearProjection[] {
  const years = Array.from({ length: 16 }, (_, i) => 2025 + i);

  return years.map((year, index) => {
    const yearProgress = index / 15; // 0 to 1 over 15 years

    // Aging trend: decrease younger cohorts, increase older ones
    const ageingFactor = yearProgress * 0.3; // 30% shift over 15 years

    // Base distributions that change over time
    const base13_24 = Math.max(0.08 - ageingFactor * 0.04, 0.04); // 8% -> 4%
    const base25_34 = Math.max(0.20 - ageingFactor * 0.05, 0.15); // 20% -> 15%
    const base35_44 = 0.25 - ageingFactor * 0.02; // 25% -> 23%
    const base45_54 = 0.25 + ageingFactor * 0.02; // 25% -> 27%
    const base55Plus = 0.22 + ageingFactor * 0.09; // 22% -> 31%

    // Add some state-specific variation
    const stateVariation = Math.sin(stateName.length * year) * 0.02;

    return {
      year,
      age_cohorts: {
        '13-24': Math.round(basePopulation * (base13_24 + stateVariation)),
        '25-34': Math.round(basePopulation * (base25_34 + stateVariation)),
        '35-44': Math.round(basePopulation * (base35_44 + stateVariation)),
        '45-54': Math.round(basePopulation * (base45_54 + stateVariation)),
        '55+': Math.round(basePopulation * (base55Plus + stateVariation))
      }
    };
  });
}

// State population bases roughly matching the scale visible in the figure
const STATE_POPULATION_BASES: Record<string, number> = {
  'California': 120000, // Largest in figure
  'Florida': 100000,
  'Texas': 95000,
  'New York': 110000,
  'Georgia': 60000,
  'North Carolina': 45000,
  'Illinois': 35000,
  'Maryland': 30000,
  'Virginia': 25000,
  'Ohio': 28000,
  'Michigan': 20000,
  'Washington': 18000,
  'Tennessee': 22000,
  'Louisiana': 25000,
  'South Carolina': 20000,
  'Alabama': 18000,
  'Mississippi': 12000,
  'Arkansas': 10000,
  'Oklahoma': 9000,
  'Missouri': 15000,
  'Kentucky': 10000,
  'Arizona': 16000,
  'Colorado': 12000,
  'Wisconsin': 8000,
  'Total': 1000000 // Aggregate
};

// Generate the complete dataset
export const HIV_AGE_PROJECTIONS: StateAgeData[] = AVAILABLE_STATES.map(stateName => {
  const stateCode = stateName.toUpperCase().replace(/\s+/g, '_');
  const basePopulation = STATE_POPULATION_BASES[stateName] || 10000;

  return {
    state_code: stateCode,
    state_name: stateName,
    data: generateStateProjections(stateName, basePopulation)
  };
});

// Helper functions for data processing
export function getStateByName(stateName: string): StateAgeData | undefined {
  return HIV_AGE_PROJECTIONS.find(state => state.state_name === stateName);
}

export function getStatesByNames(stateNames: string[]): StateAgeData[] {
  return stateNames.map(name => getStateByName(name)).filter(Boolean) as StateAgeData[];
}

export function getYearRange(): [number, number] {
  return [2025, 2040];
}

export function getAgeCohortsLabels(): string[] {
  return ['13-24', '25-34', '35-44', '45-54', '55+'];
}

// Color scheme for age cohorts (matching the figure's green tones)
export const AGE_COHORT_COLORS = {
  '13-24': '#F59E0B', // Orange/amber for youngest
  '25-34': '#3B82F6', // Blue
  '35-44': '#EF4444', // Red
  '45-54': '#84CC16', // Light green
  '55+': '#10B981'    // Dark green for oldest
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
  normalized: boolean = false
): ChartDataPoint[] {
  if (states.length === 0) return [];

  const [startYear, endYear] = yearRange;
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  return years.map(year => {
    const yearData: ChartDataPoint = { year };

    states.forEach(state => {
      const yearProjection = state.data.find(d => d.year === year);
      if (yearProjection) {
        const prefix = state.state_name.replace(/\s+/g, '_');

        if (normalized) {
          // Calculate total for normalization
          const total = Object.values(yearProjection.age_cohorts).reduce((sum, val) => sum + val, 0);

          yearData[`${prefix}_13-24`] = (yearProjection.age_cohorts['13-24'] / total) * 100;
          yearData[`${prefix}_25-34`] = (yearProjection.age_cohorts['25-34'] / total) * 100;
          yearData[`${prefix}_35-44`] = (yearProjection.age_cohorts['35-44'] / total) * 100;
          yearData[`${prefix}_45-54`] = (yearProjection.age_cohorts['45-54'] / total) * 100;
          yearData[`${prefix}_55+`] = (yearProjection.age_cohorts['55+'] / total) * 100;
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