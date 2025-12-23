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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// City coordinates and short names (from src/data/cities.ts)
const CITY_METADATA: Record<string, { shortName: string; coordinates: [number, number] }> = {
  'C.12580': { shortName: 'Baltimore', coordinates: [-76.6122, 39.2904] },
  'C.12060': { shortName: 'Atlanta', coordinates: [-84.388, 33.749] },
  'C.16980': { shortName: 'Chicago', coordinates: [-87.6298, 41.8781] },
  'C.19100': { shortName: 'Dallas', coordinates: [-96.797, 32.7767] },
  'C.19740': { shortName: 'Denver', coordinates: [-104.9903, 39.7392] },
  'C.19820': { shortName: 'Detroit', coordinates: [-83.0458, 42.3314] },
  'C.26420': { shortName: 'Houston', coordinates: [-95.3698, 29.7604] },
  'C.31080': { shortName: 'Los Angeles', coordinates: [-118.2437, 34.0522] },
  'C.33100': { shortName: 'Miami', coordinates: [-80.1918, 25.7617] },
  'C.35620': { shortName: 'New York', coordinates: [-74.006, 40.7128] },
  'C.37980': { shortName: 'Philadelphia', coordinates: [-75.1652, 39.9526] },
  'C.38060': { shortName: 'Phoenix', coordinates: [-112.074, 33.4484] },
  'C.40900': { shortName: 'Sacramento', coordinates: [-121.4944, 38.5816] },
  'C.41700': { shortName: 'San Antonio', coordinates: [-98.4936, 29.4241] },
  'C.41740': { shortName: 'San Diego', coordinates: [-117.1611, 32.7157] },
  'C.41860': { shortName: 'San Francisco', coordinates: [-122.4194, 37.7749] },
  'C.42660': { shortName: 'Seattle', coordinates: [-122.3321, 47.6062] },
  'C.45300': { shortName: 'Tampa', coordinates: [-82.4572, 27.9506] },
  'C.47900': { shortName: 'Washington DC', coordinates: [-77.0369, 38.9072] },
  // Add more cities as data becomes available
};

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

function extractCessationMetric(
  cityData: CityDataFile,
  outcome: string,
  year: number
): { value: number; lower: number; upper: number } | null {
  // For cessation, we need to look at the cessation scenario's intervention values
  const outcomeData = cityData.data['cessation']?.[outcome]?.['mean.and.interval']?.none?.sim;
  if (!outcomeData) return null;

  // Find the non-baseline (intervention) value
  const point = outcomeData.find(
    (d) => d.year === year && d.simset !== 'Baseline'
  );

  if (point) {
    return {
      value: point.value,
      lower: point['value.lower'] ?? point.value,
      upper: point['value.upper'] ?? point.value,
    };
  }
  return null;
}

function processCityFile(filePath: string): CitySummary | null {
  const cityData: CityDataFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const cityCode = cityData.metadata.city;
  const cityLabel = cityData.metadata.city_label;

  // Get metadata for this city
  const meta = CITY_METADATA[cityCode];
  if (!meta) {
    console.warn(`No metadata for city ${cityCode}, using defaults`);
  }

  // Extract current status metrics (model projections for current year)
  const prevalence = extractMetric(cityData, 'diagnosed.prevalence', CURRENT_YEAR);
  const suppression = extractMetric(cityData, 'suppression', CURRENT_YEAR);

  // Extract projection metrics
  const incidenceBaseline = extractMetric(cityData, 'incidence', PROJECTION_YEAR, 'Baseline');
  const incidenceCessation = extractCessationMetric(cityData, 'incidence', PROJECTION_YEAR);

  if (!prevalence || !suppression || !incidenceBaseline || !incidenceCessation) {
    console.warn(`Missing data for ${cityCode}:`, {
      prevalence: !!prevalence,
      suppression: !!suppression,
      incidenceBaseline: !!incidenceBaseline,
      incidenceCessation: !!incidenceCessation,
    });
    return null;
  }

  // Calculate impact
  const cessationIncrease = incidenceCessation.value - incidenceBaseline.value;
  const cessationIncreasePercent = Math.round(
    (cessationIncrease / incidenceBaseline.value) * 100
  );

  return {
    name: cityLabel,
    shortName: meta?.shortName ?? cityLabel.split(',')[0],
    coordinates: meta?.coordinates ?? [0, 0],
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
        value: Math.round(incidenceBaseline.value),
        lower: Math.round(incidenceBaseline.lower),
        upper: Math.round(incidenceBaseline.upper),
        year: PROJECTION_YEAR,
        label: 'Projected new HIV cases (baseline)',
      },
      incidenceCessation: {
        value: Math.round(incidenceCessation.value),
        lower: Math.round(incidenceCessation.lower),
        upper: Math.round(incidenceCessation.upper),
        year: PROJECTION_YEAR,
        label: 'Projected new HIV cases (if funding stops)',
      },
    },
    impact: {
      cessationIncreasePercent,
      cessationIncreaseAbsolute: Math.round(cessationIncrease),
      targetYear: PROJECTION_YEAR,
      headline: `Funding loss could increase new HIV cases ${cessationIncreasePercent}% by ${PROJECTION_YEAR}`,
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
