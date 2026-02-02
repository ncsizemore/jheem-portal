#!/usr/bin/env npx ts-node
/**
 * Generate state-summaries.json from individual state data files
 *
 * This script extracts key metrics from each state's aggregated data file
 * to create a lightweight summary file for map hover cards.
 *
 * IMPORTANT: This script is designed for use in GitHub Actions workflows.
 * The two-step approach (--single then --combine) allows passing tiny summary
 * artifacts (~1KB each) between jobs instead of downloading full state JSONs
 * from S3, which would incur egress costs.
 *
 * Usage:
 *   # Step 1: Extract summary from one state (run per-state in generate job)
 *   npx tsx scripts/generate-state-summaries.ts --single AL public/data/AL.json
 *   # Output: AL-summary.json in current directory (~1KB)
 *
 *   # Step 2: Combine summaries (run once in finalize job)
 *   npx tsx scripts/generate-state-summaries.ts --combine AL-summary.json CA-summary.json ...
 *   # Output: public/data/state-summaries.json
 *
 * For local development, run --single for each state file, then --combine:
 *   for f in public/data/[A-Z][A-Z].json; do
 *     npx tsx scripts/generate-state-summaries.ts --single $(basename $f .json) $f
 *   done
 *   npx tsx scripts/generate-state-summaries.ts --combine *-summary.json
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
    startYear?: number;
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
const DEFAULT_START_YEAR = 2026;  // Default intervention start year
const DEFAULT_END_YEAR = 2031;    // Default projection end year (5-year window)
const DATA_DIR = path.join(__dirname, '../public/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'state-summaries.json');

// Will be set from CLI args
let INTERVENTION_START_YEAR = DEFAULT_START_YEAR;
let INTERVENTION_END_YEAR = DEFAULT_END_YEAR;

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

/**
 * Extract cumulative (summed) metric over a year range
 * Used for calculating relative increase in infections over the intervention period
 */
function extractCumulativeMetric(
  stateData: StateDataFile,
  outcome: string,
  startYear: number,
  endYear: number,
  simset: 'Baseline' | string
): { value: number; lower: number; upper: number } | null {
  // Try to find the data - check all scenarios since baseline is shared
  for (const scenario of stateData.metadata.scenarios) {
    const outcomeData = stateData.data[scenario]?.[outcome]?.['mean.and.interval']?.none?.sim;
    if (!outcomeData) continue;

    // Filter to the year range and simset
    const points = outcomeData.filter(
      (d) => d.year >= startYear && d.year <= endYear && d.simset === simset
    );

    if (points.length > 0) {
      // Sum values across years
      const value = points.reduce((sum, p) => sum + p.value, 0);
      const lower = points.reduce((sum, p) => sum + (p['value.lower'] ?? p.value), 0);
      const upper = points.reduce((sum, p) => sum + (p['value.upper'] ?? p.value), 0);

      return { value, lower, upper };
    }
  }
  return null;
}

/**
 * Extract cumulative cessation metric over a year range
 */
function extractCumulativeCessationMetric(
  stateData: StateDataFile,
  outcome: string,
  startYear: number,
  endYear: number
): { value: number; lower: number; upper: number } | null {
  const outcomeData = stateData.data['cessation']?.[outcome]?.['mean.and.interval']?.none?.sim;
  if (!outcomeData) return null;

  // Filter to year range and non-baseline (intervention) values
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

  // Extract CUMULATIVE projection metrics over the intervention period
  // This matches the methodology used in AJPH/CROI papers
  const cumulativeBaseline = extractCumulativeMetric(
    stateData, 'incidence', INTERVENTION_START_YEAR, INTERVENTION_END_YEAR, 'Baseline'
  );
  const cumulativeCessation = extractCumulativeCessationMetric(
    stateData, 'incidence', INTERVENTION_START_YEAR, INTERVENTION_END_YEAR
  );

  if (!prevalence || !suppression || !cumulativeBaseline || !cumulativeCessation) {
    console.warn(`Missing data for ${stateCode}:`, {
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
        value: Math.round(cumulativeBaseline.value),
        lower: Math.round(cumulativeBaseline.lower),
        upper: Math.round(cumulativeBaseline.upper),
        year: INTERVENTION_END_YEAR,
        label: `Cumulative new HIV infections (baseline, ${INTERVENTION_START_YEAR}-${INTERVENTION_END_YEAR})`,
      },
      incidenceCessation: {
        value: Math.round(cumulativeCessation.value),
        lower: Math.round(cumulativeCessation.lower),
        upper: Math.round(cumulativeCessation.upper),
        year: INTERVENTION_END_YEAR,
        label: `Cumulative new HIV infections (if funding stops, ${INTERVENTION_START_YEAR}-${INTERVENTION_END_YEAR})`,
      },
    },
    impact: {
      cessationIncreasePercent,
      cessationIncreaseAbsolute: Math.round(cessationIncrease),
      targetYear: INTERVENTION_END_YEAR,
      startYear: INTERVENTION_START_YEAR,
      headline: `Relative increase in new HIV infections if funding stops, ${INTERVENTION_START_YEAR}-${INTERVENTION_END_YEAR}`,
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

function printUsage() {
  console.error('Usage:');
  console.error('  npx tsx scripts/generate-state-summaries.ts --single STATE FILE [--start-year YEAR] [--end-year YEAR]');
  console.error('  npx tsx scripts/generate-state-summaries.ts --combine FILE1 FILE2 ...');
  console.error('');
  console.error('Options:');
  console.error('  --start-year YEAR  Intervention start year (default: 2026)');
  console.error('  --end-year YEAR    Projection end year (default: 2031)');
  console.error('');
  console.error('Examples:');
  console.error('  # CROI (2026-2031)');
  console.error('  npx tsx scripts/generate-state-summaries.ts --single AL public/data/AL.json --start-year 2026 --end-year 2031');
  console.error('');
  console.error('  # AJPH (2025-2030)');
  console.error('  npx tsx scripts/generate-state-summaries.ts --single AL public/data/AL.json --start-year 2025 --end-year 2030');
  console.error('');
  console.error('  npx tsx scripts/generate-state-summaries.ts --combine AL-summary.json CA-summary.json');
  console.error('');
  console.error('See script header for workflow usage pattern.');
}

function parseYearArgs(args: string[]): void {
  const startYearIdx = args.indexOf('--start-year');
  if (startYearIdx !== -1 && args[startYearIdx + 1]) {
    INTERVENTION_START_YEAR = parseInt(args[startYearIdx + 1], 10);
  }

  const endYearIdx = args.indexOf('--end-year');
  if (endYearIdx !== -1 && args[endYearIdx + 1]) {
    INTERVENTION_END_YEAR = parseInt(args[endYearIdx + 1], 10);
  }

  console.log(`Using intervention period: ${INTERVENTION_START_YEAR}-${INTERVENTION_END_YEAR}`);
}

function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--single') {
    // Single-state mode: extract summary from one state file
    const stateCode = args[1];
    const inputFile = args[2];

    if (!stateCode || !inputFile) {
      console.error('Usage: npx tsx scripts/generate-state-summaries.ts --single STATE INPUT_FILE [--start-year YEAR] [--end-year YEAR]');
      console.error('Example: npx tsx scripts/generate-state-summaries.ts --single AL public/data/AL.json --start-year 2026 --end-year 2031');
      process.exit(1);
    }

    // Parse optional year arguments
    parseYearArgs(args);

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
  } else {
    if (args.length > 0) {
      console.error('Unknown arguments:', args);
      console.error('');
    }
    printUsage();
    process.exit(1);
  }
}

main();
