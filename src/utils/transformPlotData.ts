/**
 * Transform raw plot data from prepare_plot_local into Recharts-ready format
 *
 * The data comes pre-aggregated from simplot, so we just need to:
 * 1. Separate baseline and intervention series
 * 2. Merge them by year into single data points
 * 3. Extract observations into a separate array
 * 4. Handle faceted data (group by facet.by1)
 */

import type {
  PlotDataFile,
  SimDataPoint,
  ObsDataPoint,
  ChartDataPoint,
  ChartObservation,
  FacetPanel,
  SimulationLine,
} from '@/types/native-plotting';

/**
 * Create a composite facet key from all facet.by* columns in a data point.
 * For multi-dimensional faceting (e.g., age+race+sex), combines values with " | ".
 * Example: "13-24 years | Black | MSM"
 */
function getCompositeFacetKey(point: SimDataPoint): string {
  const parts: string[] = [];
  if (point['facet.by1']) parts.push(point['facet.by1']);
  if (point['facet.by2']) parts.push(point['facet.by2']);
  if (point['facet.by3']) parts.push(point['facet.by3']);
  if (point['facet.by4']) parts.push(point['facet.by4']);
  return parts.length > 0 ? parts.join(' | ') : 'unknown';
}

/**
 * Same as getCompositeFacetKey but for observation data points
 */
function getCompositeFacetKeyFromObs(point: ObsDataPoint): string {
  const parts: string[] = [];
  if (point['facet.by1']) parts.push(point['facet.by1']);
  if (point['facet.by2']) parts.push(point['facet.by2']);
  if (point['facet.by3']) parts.push(point['facet.by3']);
  if (point['facet.by4']) parts.push(point['facet.by4']);
  return parts.length > 0 ? parts.join(' | ') : '';
}

/**
 * Transform a single plot data file into chart-ready format
 */
export function transformPlotData(plotData: PlotDataFile): FacetPanel[] {
  const { sim, obs, metadata } = plotData;

  if (!sim || sim.length === 0) {
    return [];
  }

  // Check if this is individual simulation data (has 'sim' column)
  const isIndividualSimulation = metadata.statistic === 'individual.simulation' || sim[0].sim !== undefined;

  // Check if data is faceted
  const isFaceted = metadata.facet !== 'none' && sim[0]['facet.by1'] !== undefined;

  if (!isFaceted) {
    // Unfaceted: single panel with all data
    const panel: FacetPanel = {
      facetValue: 'all',
      facetLabel: 'All',
      data: isIndividualSimulation ? [] : mergeSimulationData(sim),
      observations: transformObservations(obs),
      isIndividualSimulation,
    };

    if (isIndividualSimulation) {
      panel.individualSimulations = transformIndividualSimulations(sim);
    }

    return [panel];
  }

  // Faceted: group by composite facet key (combining all facet.by* columns)
  const facetGroups = new Map<string, SimDataPoint[]>();

  for (const point of sim) {
    const facetValue = getCompositeFacetKey(point);
    if (!facetGroups.has(facetValue)) {
      facetGroups.set(facetValue, []);
    }
    facetGroups.get(facetValue)!.push(point);
  }

  // Group observations by facet too
  const obsArray = transformObservationsRaw(obs);
  const obsByFacet = new Map<string, ChartObservation[]>();

  for (const obsPoint of obsArray) {
    // Match observation facet to sim facet using same composite key logic
    const facetValue = getCompositeFacetKeyFromObs(obsPoint as ObsDataPoint) || 'all';
    if (!obsByFacet.has(facetValue)) {
      obsByFacet.set(facetValue, []);
    }
    obsByFacet.get(facetValue)!.push(obsPoint);
  }

  // Build panels
  const panels: FacetPanel[] = [];

  for (const [facetValue, simPoints] of facetGroups) {
    const panel: FacetPanel = {
      facetValue,
      facetLabel: formatFacetLabel(facetValue),
      data: isIndividualSimulation ? [] : mergeSimulationData(simPoints),
      observations: obsByFacet.get(facetValue) || [],
      isIndividualSimulation,
    };

    if (isIndividualSimulation) {
      panel.individualSimulations = transformIndividualSimulations(simPoints);
    }

    panels.push(panel);
  }

  // Sort panels by facet value for consistent ordering
  panels.sort((a, b) => a.facetValue.localeCompare(b.facetValue));

  return panels;
}

/**
 * Transform individual simulation data into lines grouped by sim ID and simset
 */
function transformIndividualSimulations(simPoints: SimDataPoint[]): SimulationLine[] {
  // Group by simset + sim ID
  const lineGroups = new Map<string, SimulationLine>();

  for (const point of simPoints) {
    const simId = point.sim || 'unknown';
    const simset = point.simset;
    const key = `${simset}_${simId}`;

    if (!lineGroups.has(key)) {
      lineGroups.set(key, {
        simId,
        simset,
        points: [],
      });
    }

    lineGroups.get(key)!.points.push({
      year: point.year,
      value: point.value,
    });
  }

  // Sort points within each line by year
  for (const line of lineGroups.values()) {
    line.points.sort((a, b) => a.year - b.year);
  }

  return Array.from(lineGroups.values());
}

/**
 * Merge baseline and intervention data by year
 */
function mergeSimulationData(simPoints: SimDataPoint[]): ChartDataPoint[] {
  // Group by year
  const byYear = new Map<number, { baseline?: SimDataPoint; intervention?: SimDataPoint }>();

  for (const point of simPoints) {
    const year = point.year;
    if (!byYear.has(year)) {
      byYear.set(year, {});
    }

    const entry = byYear.get(year)!;
    if (point.simset === 'Baseline') {
      entry.baseline = point;
    } else {
      entry.intervention = point;
    }
  }

  // Convert to chart data points
  const result: ChartDataPoint[] = [];

  for (const [year, { baseline, intervention }] of byYear) {
    const chartPoint: ChartDataPoint = { year };

    if (intervention) {
      chartPoint.value = intervention.value;
      chartPoint.lower = intervention['value.lower'];
      chartPoint.upper = intervention['value.upper'];
    }

    if (baseline) {
      chartPoint.baselineValue = baseline.value;
      chartPoint.baselineLower = baseline['value.lower'];
      chartPoint.baselineUpper = baseline['value.upper'];
    }

    result.push(chartPoint);
  }

  // Sort by year
  result.sort((a, b) => a.year - b.year);

  return result;
}

/**
 * Transform observations to chart format
 */
function transformObservations(obs: ObsDataPoint[] | Record<string, never>): ChartObservation[] {
  if (!obs || !Array.isArray(obs) || obs.length === 0) {
    return [];
  }

  return obs.map(o => ({
    year: typeof o.year === 'string' ? parseInt(o.year, 10) : o.year,
    value: o.value,
    source: o.source,
    url: o.data_url,
  }));
}

/**
 * Transform observations keeping facet info
 */
function transformObservationsRaw(obs: ObsDataPoint[] | Record<string, never>): (ChartObservation & { facetBy1?: string })[] {
  if (!obs || !Array.isArray(obs) || obs.length === 0) {
    return [];
  }

  return obs.map(o => ({
    year: typeof o.year === 'string' ? parseInt(o.year, 10) : o.year,
    value: o.value,
    source: o.source,
    url: o.data_url,
    facetBy1: o['facet.by1'],
  }));
}

/**
 * Format facet values for display
 */
function formatFacetLabel(value: string): string {
  const labelMap: Record<string, string> = {
    // Sex
    'female': 'Female',
    'male': 'Male',
    'msm': 'MSM',
    'heterosexual_male': 'Heterosexual Male',
    // Race
    'black': 'Black',
    'hispanic': 'Hispanic',
    'other': 'Other',
    // Age values are already formatted like "13-24 years"
  };

  return labelMap[value] || value;
}

/**
 * Get unique years from chart data (for x-axis domain)
 */
export function getYearRange(data: ChartDataPoint[]): [number, number] {
  if (data.length === 0) return [2010, 2035];

  const years = data.map(d => d.year);
  return [Math.min(...years), Math.max(...years)];
}

/**
 * Get value range from chart data (for y-axis domain)
 */
export function getValueRange(
  data: ChartDataPoint[],
  observations: ChartObservation[],
  includeBaseline: boolean,
  includeCI: boolean,
  individualSimulations?: SimulationLine[]
): [number, number] {
  const values: number[] = [];

  // Handle regular chart data (mean/median)
  for (const d of data) {
    if (d.value !== undefined) values.push(d.value);
    if (includeCI) {
      if (d.lower !== undefined) values.push(d.lower);
      if (d.upper !== undefined) values.push(d.upper);
    }
    if (includeBaseline) {
      if (d.baselineValue !== undefined) values.push(d.baselineValue);
      if (includeCI) {
        if (d.baselineLower !== undefined) values.push(d.baselineLower);
        if (d.baselineUpper !== undefined) values.push(d.baselineUpper);
      }
    }
  }

  // Handle individual simulation data
  if (individualSimulations) {
    for (const line of individualSimulations) {
      // Skip baseline lines if not including baseline
      if (!includeBaseline && line.simset === 'Baseline') continue;
      for (const point of line.points) {
        values.push(point.value);
      }
    }
  }

  for (const o of observations) {
    values.push(o.value);
  }

  if (values.length === 0) return [0, 100];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1;

  return [Math.max(0, min - padding), max + padding];
}
