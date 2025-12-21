/**
 * Type definitions for native plotting with pre-aggregated data from prepare_plot_local
 *
 * New approach: Data is already aggregated by simplot's prepare_plot_local()
 * Each JSON file contains one scenario/outcome/statistic/facet combination
 */

// === Per-file data structure (what prepare_plot_local returns) ===

export interface SimDataPoint {
  year: number;
  value: number;
  simset: string;  // "Baseline" or intervention label (e.g., "Cessation")
  outcome: string;
  'outcome.display.name': string;
  'value.lower'?: number;  // Present for mean.and.interval / median.and.interval
  'value.upper'?: number;
  // Multi-dimensional faceting - each dimension gets its own column
  'facet.by1'?: string;  // First facet dimension (e.g., "13-24 years" for age)
  'facet.by2'?: string;  // Second facet dimension (e.g., "black" for race)
  'facet.by3'?: string;  // Third facet dimension (e.g., "msm" for sex)
  'facet.by4'?: string;  // Fourth facet dimension (e.g., "idu" for risk)
  stratum?: string;
  sim?: string;  // Present for individual.simulation - identifies each simulation run (e.g., "1", "2", ...)
}

export interface ObsDataPoint {
  year: number | string;
  value: number;
  source: string;
  outcome: string;
  'outcome.display.name': string;
  data_url?: string;
  // Multi-dimensional faceting
  'facet.by1'?: string;
  'facet.by2'?: string;
  'facet.by3'?: string;
  'facet.by4'?: string;
  stratum?: string;
}

export interface PlotMetadata {
  city: string;
  scenario: string;
  outcome: string;
  statistic: string;  // "mean.and.interval" | "median.and.interval" | "individual.simulation"
  facet: string;  // "none" | "sex" | "age" | "race"
  y_label: string;
  plot_title: string;
  has_baseline: boolean;
  generation_time: string;
  outcome_metadata?: {
    display_name: string;
    units: string;
    display_as_percent: boolean;
  };
}

// Single plot data file structure
export interface PlotDataFile {
  sim: SimDataPoint[] | null;
  obs: ObsDataPoint[] | Record<string, never>;  // Can be empty object {}
  metadata: PlotMetadata;
}

// === Chart display types ===

export interface ChartDisplayOptions {
  showConfidenceInterval: boolean;
  showBaseline: boolean;
  showObservations: boolean;
}

// Processed data point for Recharts (after separating baseline/intervention)
export interface ChartDataPoint {
  year: number;
  value?: number;           // Intervention value
  lower?: number;           // Intervention lower CI
  upper?: number;           // Intervention upper CI
  baselineValue?: number;
  baselineLower?: number;
  baselineUpper?: number;
}

// Observation point for scatter plot
export interface ChartObservation {
  year: number;
  value: number;
  source: string;
  url?: string;
}

// Individual simulation line data (for individual.simulation statistic)
export interface SimulationLine {
  simId: string;      // Simulation identifier (e.g., "1", "2", ...)
  simset: string;     // "Baseline" or intervention label
  points: { year: number; value: number }[];
}

// Facet panel data
export interface FacetPanel {
  facetValue: string;  // e.g., "male", "female", "all"
  facetLabel: string;  // Display label
  data: ChartDataPoint[];
  observations: ChartObservation[];
  // For individual.simulation statistic - array of individual simulation lines
  individualSimulations?: SimulationLine[];
  isIndividualSimulation?: boolean;
}

// === Utility types ===

export type StatisticType = 'mean.and.interval' | 'median.and.interval' | 'individual.simulation';
export type FacetDimension = 'none' | 'age' | 'sex' | 'race';

// === Legacy types (kept for backwards compatibility, can be removed later) ===

export interface OutcomeMetadata {
  id: string;
  display_name: string;
  units: string;
  display_as_percent: boolean;
  corresponding_observed_outcome: string | 'NULL';
}

export interface DimensionMetadata {
  values: string[];
  label: string;
}

export interface CityMetadata {
  city: string;
  city_label: string;
  scenarios: string[];
  outcomes: Record<string, OutcomeMetadata>;
  dimensions: {
    age: DimensionMetadata;
    sex: DimensionMetadata;
    race: DimensionMetadata;
  };
  generation_timestamp: string;
}

// Legacy types - these were for the old aggregation approach
export interface DataPoint {
  year: number;
  value: number;
  lower: number;
  upper: number;
}

export interface AggregatedDataPoint {
  year: number;
  value: number;
  lower: number;
  upper: number;
  baselineValue?: number;
  baselineLower?: number;
  baselineUpper?: number;
}

export interface ObservationPoint {
  year: string | number;
  value: number;
  url?: string;
  source?: string;
  age?: string;
  sex?: string;
  race?: string;
}

export interface FacetedChartData {
  facetLabel: string;
  facetKey: string;
  data: AggregatedDataPoint[];
  observations?: ObservationPoint[];
}

// Legacy CityData type (from old extraction approach)
export interface OutcomeData {
  metadata: {
    display_name: string;
    units: string;
    display_as_percent: boolean;
    axis_name: string;
  };
  data: Record<string, DataPoint[]>;
}

export interface SimulationPhase {
  [outcome: string]: OutcomeData;
}

export interface ScenarioData {
  baseline: SimulationPhase;
  intervention: SimulationPhase;
}

export type ObservationGranularity = 'year' | 'year_age' | 'year_sex' | 'year_race';
export type GranularityData = Record<string, ObservationPoint[]> | ObservationPoint[];

export interface ObservationOutcome {
  metadata: {
    simset_outcome: string;
    data_manager_outcome: string;
    display_name: string;
    units: string;
    display_as_percent: boolean;
    available_granularities: ObservationGranularity[];
  };
  data: Partial<Record<ObservationGranularity, GranularityData>>;
}

export interface CityData {
  metadata: CityMetadata;
  simulations: Record<string, ScenarioData>;
  observations: Record<string, ObservationOutcome>;
  export_info?: {
    extraction_script: string;
    extraction_timestamp: string;
  };
}
