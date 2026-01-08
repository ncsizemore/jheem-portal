#!/usr/bin/env npx ts-node
/**
 * Generate state-summaries.json from individual state data files
 *
 * This script extracts key metrics from each state's aggregated data file
 * to create a lightweight summary file for map hover cards.
 *
 * Usage: npx ts-node scripts/generate-state-summaries.ts
 *
 * Source: public/data/{STATE}.json files (e.g., AL.json, CA.json)
 * Output: public/data/state-summaries.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ALL_STATES } from '../src/data/states.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build state metadata lookup from the canonical source (states.ts)
const STATE_COORDINATES: Record<string, [number, number]> = {};
const STATE_NAMES: Record<string, string> = {};
for (const state of ALL_STATES) {
  STATE_COORDINATES[state.code] = state.coordinates;
  STATE_NAMES[state.code] = state.name;
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

interface StateDataFile {
  metadata: {
    city: string; // Actually state code in this context
    city_label: string; // Actually state name
    scenarios: string[];
    outcomes: string[];
    statistics: string[];
    facets: string[];
    generation_time: string;
  };
  data: Record<string, Record<string, Record<string, Record<string, { sim: SimDataPoint[] | null }>>>>;
}

interface StateSummary {
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

interface StateSummaries {
  generated: string;
  description: string;
  dataSource: string;
  states: Record<string, StateSummary>;
}

// Configuration
const CURRENT_YEAR = 2024;  // Year for "current" status metrics
const PROJECTION_YEAR = 2030;  // Year for impact projections
const DATA_DIR = path.join(__dirname, '../public/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'state-summaries.json');

function extractMetric(
  stateData: StateDataFile,
  outcome: string,
  year: number,
  simset: 'Baseline' | string = 'Baseline'
): { value: number; lower: number; upper: number } | null {
  // Try to find the data - check all scenarios since baseline is shared
  for (const scenario of stateData.metadata.scenarios) {
    const outcomeData = stateData.data[scenario]?.[outcome]?.['mean.and.interval']?.none?.sim;
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
  stateData: StateDataFile,
  outcome: string,
  year: number
): { value: number; lower: number; upper: number } | null {
  // For cessation, we need to look at the cessation scenario's intervention values
  const outcomeData = stateData.data['cessation']?.[outcome]?.['mean.and.interval']?.none?.sim;
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

function processStateFile(filePath: string): StateSummary | null {
  const stateData: StateDataFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const stateCode = stateData.metadata.city; // Field is named 'city' but contains state code
  const stateLabel = stateData.metadata.city_label;

  // Get coordinates from canonical source
  const coordinates = STATE_COORDINATES[stateCode];
  if (!coordinates) {
    console.warn(`No coordinates for state ${stateCode} in states.ts, skipping`);
    return null;
  }

  // Use canonical name or fall back to label from data
  const stateName = STATE_NAMES[stateCode] || stateLabel;

  // Extract current status metrics (model projections for current year)
  const prevalence = extractMetric(stateData, 'diagnosed.prevalence', CURRENT_YEAR);
  const suppression = extractMetric(stateData, 'suppression', CURRENT_YEAR);

  // Extract projection metrics
  const incidenceBaseline = extractMetric(stateData, 'incidence', PROJECTION_YEAR, 'Baseline');
  const incidenceCessation = extractCessationMetric(stateData, 'incidence', PROJECTION_YEAR);

  if (!prevalence || !suppression || !incidenceBaseline || !incidenceCessation) {
    console.warn(`Missing data for ${stateCode}:`, {
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
    name: stateName,
    shortName: stateCode, // For states, short name is just the code
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
  console.log('Generating state summaries...\n');

  // Find all state data files (2-letter codes)
  const files = fs.readdirSync(DATA_DIR).filter((f) => /^[A-Z]{2}\.json$/.test(f));
  console.log(`Found ${files.length} state data file(s)\n`);

  const summaries: StateSummaries = {
    generated: new Date().toISOString(),
    description: 'Summary metrics extracted from JHEEM model projections for map hover cards',
    dataSource: 'JHEEM model output via prepare_plot_local()',
    states: {},
  };

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    console.log(`Processing ${file}...`);

    try {
      const summary = processStateFile(filePath);
      if (summary) {
        const stateCode = file.replace('.json', '');
        summaries.states[stateCode] = summary;
        console.log(`  ✓ ${summary.name}: ${summary.metrics.diagnosedPrevalence.value.toLocaleString()} PLWH, ${summary.metrics.suppressionRate.value}% suppression`);
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err);
    }
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summaries, null, 2));
  console.log(`\nWrote ${Object.keys(summaries.states).length} state summaries to ${OUTPUT_FILE}`);
}

main();
