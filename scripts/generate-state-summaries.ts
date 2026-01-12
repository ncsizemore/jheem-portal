#!/usr/bin/env npx ts-node
/**
 * Generate state-summaries.json from individual state data files
 *
 * This script extracts key metrics from each state's aggregated data file
 * to create a lightweight summary file for map hover cards.
 *
 * Usage:
 *   # Process all state files in public/data/ (original behavior)
 *   npx tsx scripts/generate-state-summaries.ts
 *
 *   # Single-state mode: extract summary from one state file
 *   npx tsx scripts/generate-state-summaries.ts --single AL public/data/AL.json
 *   # Output: AL-summary.json in current directory
 *
 *   # Combine mode: merge individual summary files into state-summaries.json
 *   npx tsx scripts/generate-state-summaries.ts --combine summaries/AL-summary.json summaries/CA-summary.json ...
 *   # Output: public/data/state-summaries.json
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

function runSingleMode(stateCode: string, inputFile: string) {
  console.log(`Extracting summary for ${stateCode} from ${inputFile}...`);

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const summary = processStateFile(inputFile);
  if (!summary) {
    console.error(`Error: Failed to extract summary for ${stateCode}`);
    process.exit(1);
  }

  const outputFile = `${stateCode}-summary.json`;
  fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
  console.log(`✓ Wrote ${outputFile} (${fs.statSync(outputFile).size} bytes)`);
}

function runCombineMode(summaryFiles: string[]) {
  console.log(`Combining ${summaryFiles.length} summary file(s)...\n`);

  const summaries: StateSummaries = {
    generated: new Date().toISOString(),
    description: 'Summary metrics extracted from JHEEM model projections for map hover cards',
    dataSource: 'JHEEM model output via prepare_plot_local()',
    states: {},
  };

  for (const file of summaryFiles) {
    if (!fs.existsSync(file)) {
      console.warn(`Warning: Summary file not found, skipping: ${file}`);
      continue;
    }

    try {
      const summary: StateSummary = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const stateCode = summary.shortName;
      summaries.states[stateCode] = summary;
      console.log(`  ✓ ${summary.name} (${stateCode})`);
    } catch (err) {
      console.error(`  ✗ Error reading ${file}:`, err);
    }
  }

  // Ensure output directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summaries, null, 2));
  console.log(`\nWrote ${Object.keys(summaries.states).length} state summaries to ${OUTPUT_FILE}`);
}

function runFullMode() {
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

function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--single') {
    // Single-state mode: extract summary from one state file
    const stateCode = args[1];
    const inputFile = args[2];

    if (!stateCode || !inputFile) {
      console.error('Usage: npx tsx scripts/generate-state-summaries.ts --single STATE INPUT_FILE');
      console.error('Example: npx tsx scripts/generate-state-summaries.ts --single AL public/data/AL.json');
      process.exit(1);
    }

    runSingleMode(stateCode, inputFile);
  } else if (args[0] === '--combine') {
    // Combine mode: merge individual summary files
    const summaryFiles = args.slice(1);

    if (summaryFiles.length === 0) {
      console.error('Usage: npx tsx scripts/generate-state-summaries.ts --combine FILE1 FILE2 ...');
      console.error('Example: npx tsx scripts/generate-state-summaries.ts --combine AL-summary.json CA-summary.json');
      process.exit(1);
    }

    runCombineMode(summaryFiles);
  } else if (args.length === 0) {
    // Original behavior: process all state files in DATA_DIR
    runFullMode();
  } else {
    console.error('Unknown arguments:', args);
    console.error('\nUsage:');
    console.error('  npx tsx scripts/generate-state-summaries.ts                    # Process all states');
    console.error('  npx tsx scripts/generate-state-summaries.ts --single AL FILE   # Single state');
    console.error('  npx tsx scripts/generate-state-summaries.ts --combine FILES... # Combine summaries');
    process.exit(1);
  }
}

main();
