#!/usr/bin/env npx ts-node
/**
 * Generate city-summaries.json from individual city data files
 *
 * This script extracts key metrics from each city's aggregated data file
 * to create a lightweight summary file for map hover cards.
 *
 * Usage: npx ts-node scripts/generate-city-summaries.ts
 *
 * Source: public/data/C.{code}.json files
 * Output: public/data/city-summaries.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ALL_CITIES } from '../src/data/cities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build city metadata lookup from the canonical source (cities.ts)
// This is data-driven: coordinates come from ALL_CITIES, shortName derived from full name
const CITY_COORDINATES: Record<string, [number, number]> = {};
for (const city of ALL_CITIES) {
  CITY_COORDINATES[city.code] = city.coordinates;
}

// Derive short name from full city label (e.g., "Atlanta-Sandy Springs-Roswell, GA" -> "Atlanta")
function deriveShortName(cityLabel: string): string {
  // Take the first part before any dash or comma
  const firstPart = cityLabel.split(/[-,]/)[0].trim();
  return firstPart;
}

interface SimDataPoint {
  year: number;
  value: number;
  simset: string;
  outcome: string;
  'outcome.display.name': string;
  'value.lower'?: number;
  'value.upper'?: number;
  stratum?: string;
}

interface CityDataFile {
  metadata: {
    city: string;
    city_label: string;
    scenarios: string[];
    outcomes: string[];
    statistics: string[];
    facets: string[];
    generation_time: string;
  };
  data: Record<string, Record<string, Record<string, Record<string, { sim: SimDataPoint[] | null }>>>>;
}

interface CitySummary {
  name: string;
  shortName: string;
  coordinates: [number, number];
  metrics: {
    diagnosedPrevalence: {
      value: number;
      lower: number;
      upper: number;
      year: number;
      label: string;
      source: 'model';
    };
    suppressionRate: {
      value: number;
      lower: number;
      upper: number;
      year: number;
      label: string;
      source: 'model';
    };
    incidenceBaseline: {
      value: number;
      lower: number;
      upper: number;
      year: number;
      label: string;
    };
    incidenceCessation: {
      value: number;
      lower: number;
      upper: number;
      year: number;
      label: string;
    };
  };
  impact: {
    cessationIncreasePercent: number;
    cessationIncreaseAbsolute: number;
    targetYear: number;
    startYear: number;
    headline: string;
  };
}

interface CitySummaries {
  generated: string;
  description: string;
  dataSource: string;
  cities: Record<string, CitySummary>;
}

// Configuration
const CURRENT_YEAR = 2024;  // Year for "current" status metrics
const PROJECTION_YEAR = 2030;  // Year for impact projections
const INTERVENTION_START_YEAR = 2025;  // MSA paper intervention period start
const INTERVENTION_END_YEAR = 2030;    // MSA paper intervention period end
const DATA_DIR = path.join(__dirname, '../public/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'city-summaries.json');

function extractMetric(
  cityData: CityDataFile,
  outcome: string,
  year: number,
  simset: 'Baseline' | string = 'Baseline'
): { value: number; lower: number; upper: number } | null {
  // Try to find the data - check all scenarios since baseline is shared
  for (const scenario of cityData.metadata.scenarios) {
    const outcomeData = cityData.data[scenario]?.[outcome]?.['mean.and.interval']?.none?.sim;
    if (!outcomeData) continue;

    const point = outcomeData.find(
      (d) => d.year === year && d.simset === simset
    );

    if (point) {
      return {
        value: point.value,
        lower: point['value.lower'] ?? point.value,
        upper: point['value.upper'] ?? point.value,
      };
    }
  }
  return null;
}

/**
 * Extract cumulative (summed) metric over a year range
 * Used for calculating relative increase in infections over the intervention period
 */
function extractCumulativeMetric(
  cityData: CityDataFile,
  outcome: string,
  startYear: number,
  endYear: number,
  simset: 'Baseline' | string
): { value: number; lower: number; upper: number } | null {
  for (const scenario of cityData.metadata.scenarios) {
    const outcomeData = cityData.data[scenario]?.[outcome]?.['mean.and.interval']?.none?.sim;
    if (!outcomeData) continue;

    const points = outcomeData.filter(
      (d) => d.year >= startYear && d.year <= endYear && d.simset === simset
    );

    if (points.length > 0) {
      const value = points.reduce((sum, p) => sum + p.value, 0);
      const lower = points.reduce((sum, p) => sum + (p['value.lower'] ?? p.value), 0);
      const upper = points.reduce((sum, p) => sum + (p['value.upper'] ?? p.value), 0);
      return { value, lower, upper };
    }
  }
  return null;
}

function extractCumulativeCessationMetric(
  cityData: CityDataFile,
  outcome: string,
  startYear: number,
  endYear: number
): { value: number; lower: number; upper: number } | null {
  const outcomeData = cityData.data['cessation']?.[outcome]?.['mean.and.interval']?.none?.sim;
  if (!outcomeData) return null;

  const points = outcomeData.filter(
    (d) => d.year >= startYear && d.year <= endYear && d.simset !== 'Baseline'
  );

  if (points.length > 0) {
    const value = points.reduce((sum, p) => sum + p.value, 0);
    const lower = points.reduce((sum, p) => sum + (p['value.lower'] ?? p.value), 0);
    const upper = points.reduce((sum, p) => sum + (p['value.upper'] ?? p.value), 0);
    return { value, lower, upper };
  }
  return null;
}

function processCityFile(filePath: string): CitySummary | null {
  const cityData: CityDataFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const cityCode = cityData.metadata.city;
  const cityLabel = cityData.metadata.city_label;

  // Get coordinates from canonical source, derive short name from label
  const coordinates = CITY_COORDINATES[cityCode];
  if (!coordinates) {
    console.warn(`No coordinates for city ${cityCode} in cities.ts, skipping`);
    return null;
  }
  const shortName = deriveShortName(cityLabel);

  // Extract current status metrics (model projections for current year)
  const prevalence = extractMetric(cityData, 'diagnosed.prevalence', CURRENT_YEAR);
  const suppression = extractMetric(cityData, 'suppression', CURRENT_YEAR);

  // Extract CUMULATIVE projection metrics over the intervention period
  // This matches the methodology used in the MSA paper (Forster et al.)
  const cumulativeBaseline = extractCumulativeMetric(
    cityData, 'incidence', INTERVENTION_START_YEAR, INTERVENTION_END_YEAR, 'Baseline'
  );
  const cumulativeCessation = extractCumulativeCessationMetric(
    cityData, 'incidence', INTERVENTION_START_YEAR, INTERVENTION_END_YEAR
  );

  if (!prevalence || !suppression || !cumulativeBaseline || !cumulativeCessation) {
    console.warn(`Missing data for ${cityCode}:`, {
      prevalence: !!prevalence,
      suppression: !!suppression,
      cumulativeBaseline: !!cumulativeBaseline,
      cumulativeCessation: !!cumulativeCessation,
    });
    return null;
  }

  // Calculate impact from CUMULATIVE values (matches paper methodology)
  const cessationIncrease = cumulativeCessation.value - cumulativeBaseline.value;
  const cessationIncreasePercent = Math.round(
    (cessationIncrease / cumulativeBaseline.value) * 100
  );

  return {
    name: cityLabel,
    shortName,
    coordinates,
    metrics: {
      diagnosedPrevalence: {
        value: Math.round(prevalence.value),
        lower: Math.round(prevalence.lower),
        upper: Math.round(prevalence.upper),
        year: CURRENT_YEAR,
        label: 'People living with diagnosed HIV',
        source: 'model',
      },
      suppressionRate: {
        value: parseFloat(suppression.value.toFixed(1)),
        lower: parseFloat(suppression.lower.toFixed(1)),
        upper: parseFloat(suppression.upper.toFixed(1)),
        year: CURRENT_YEAR,
        label: 'Viral suppression rate',
        source: 'model',
      },
      incidenceBaseline: {
        value: Math.round(cumulativeBaseline.value),
        lower: Math.round(cumulativeBaseline.lower),
        upper: Math.round(cumulativeBaseline.upper),
        year: PROJECTION_YEAR,
        label: `Cumulative new HIV cases, baseline (${INTERVENTION_START_YEAR}-${INTERVENTION_END_YEAR})`,
      },
      incidenceCessation: {
        value: Math.round(cumulativeCessation.value),
        lower: Math.round(cumulativeCessation.lower),
        upper: Math.round(cumulativeCessation.upper),
        year: PROJECTION_YEAR,
        label: `Cumulative new HIV cases, cessation (${INTERVENTION_START_YEAR}-${INTERVENTION_END_YEAR})`,
      },
    },
    impact: {
      cessationIncreasePercent,
      cessationIncreaseAbsolute: Math.round(cessationIncrease),
      targetYear: INTERVENTION_END_YEAR,
      startYear: INTERVENTION_START_YEAR,
      headline: `Funding loss could increase new HIV cases ${cessationIncreasePercent}% over ${INTERVENTION_START_YEAR}-${INTERVENTION_END_YEAR}`,
    },
  };
}

function main() {
  console.log('Generating city summaries...\n');

  // Find all city data files
  const files = fs.readdirSync(DATA_DIR).filter((f) => /^C\.\d+\.json$/.test(f));
  console.log(`Found ${files.length} city data file(s)\n`);

  const summaries: CitySummaries = {
    generated: new Date().toISOString(),
    description: 'Summary metrics extracted from JHEEM model projections for map hover cards',
    dataSource: 'JHEEM model output via prepare_plot_local()',
    cities: {},
  };

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    console.log(`Processing ${file}...`);

    try {
      const summary = processCityFile(filePath);
      if (summary) {
        const cityCode = file.replace('.json', '');
        summaries.cities[cityCode] = summary;
        console.log(`  ✓ ${summary.shortName}: ${summary.metrics.diagnosedPrevalence.value.toLocaleString()} PLWH, ${summary.metrics.suppressionRate.value}% suppression`);
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err);
    }
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summaries, null, 2));
  console.log(`\nWrote ${Object.keys(summaries.cities).length} city summaries to ${OUTPUT_FILE}`);
}

main();
