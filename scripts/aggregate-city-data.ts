#!/usr/bin/env npx ts-node
/**
 * Aggregation script: Merges per-combination JSON files into a single per-city file
 *
 * Input: Directory of JSON files like:
 *   - incidence_mean.and.interval_unfaceted.json
 *   - incidence_mean.and.interval_facet_age.json
 *   - testing_individual.simulation_facet_sex.json
 *
 * Output: Single JSON file structured as:
 *   {
 *     metadata: { city, city_label, scenarios, outcomes, ... },
 *     data: {
 *       [scenario]: {
 *         [outcome]: {
 *           [statistic]: {
 *             [facet]: { sim, obs, metadata }
 *           }
 *         }
 *       }
 *     }
 *   }
 *
 * Usage:
 *   npx ts-node scripts/aggregate-city-data.ts <input-dir> <output-file>
 *   npx ts-node scripts/aggregate-city-data.ts public/test-data public/data/C.12580.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface PlotDataFile {
  sim: unknown[] | null;
  obs: unknown[] | Record<string, never>;
  metadata: {
    city: string;
    scenario: string;
    outcome: string;
    statistic: string;
    facet: string;
    y_label: string;
    plot_title: string;
    has_baseline: boolean;
    generation_time: string;
    outcome_metadata?: {
      display_name: string;
      units: string;
      display_as_percent: boolean;
    };
  };
}

interface AggregatedData {
  metadata: {
    city: string;
    city_label: string;
    scenarios: string[];
    outcomes: string[];
    statistics: string[];
    facets: string[];
    generation_time: string;
    file_count: number;
  };
  data: Record<
    string,
    Record<string, Record<string, Record<string, PlotDataFile>>>
  >;
}

function parseFilename(filename: string): {
  outcome: string;
  statistic: string;
  facet: string;
} | null {
  // Pattern: {outcome}_{statistic}_{facet}.json
  // Examples:
  //   incidence_mean.and.interval_unfaceted.json
  //   testing_individual.simulation_facet_age.json
  //   diagnosed.prevalence_mean.and.interval_facet_sex.json

  const match = filename.match(
    /^(.+?)_(mean\.and\.interval|median\.and\.interval|individual\.simulation)_(unfaceted|facet_\w+)\.json$/
  );

  if (!match) return null;

  const [, outcome, statistic, facetPart] = match;
  const facet = facetPart === 'unfaceted' ? 'none' : facetPart.replace('facet_', '');

  return { outcome, statistic, facet };
}

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results;
}

function aggregateCityData(inputDir: string): AggregatedData {
  const files = findJsonFiles(inputDir);

  // Track unique values
  const scenarios = new Set<string>();
  const outcomes = new Set<string>();
  const statistics = new Set<string>();
  const facets = new Set<string>();

  let city = '';
  let cityLabel = '';

  const data: AggregatedData['data'] = {};
  let fileCount = 0;

  for (const filePath of files) {
    // Skip the old complete file if present
    if (filePath.includes('_complete')) continue;

    const content = fs.readFileSync(filePath, 'utf-8');

    let plotData: PlotDataFile;
    try {
      plotData = JSON.parse(content);
    } catch (e) {
      console.warn(`Skipping invalid JSON: ${filePath}`);
      continue;
    }

    // Validate structure
    if (!plotData.metadata?.scenario || !plotData.metadata?.outcome) {
      console.warn(`Skipping file with missing metadata: ${filePath}`);
      continue;
    }

    const { scenario, outcome, statistic, facet } = plotData.metadata;

    // Extract city info from first valid file
    if (!city) {
      city = plotData.metadata.city;
      cityLabel = plotData.metadata.plot_title.split(' (')[0] || city;
    }

    // Track unique values
    scenarios.add(scenario);
    outcomes.add(outcome);
    statistics.add(statistic);
    facets.add(facet);

    // Build nested structure
    if (!data[scenario]) data[scenario] = {};
    if (!data[scenario][outcome]) data[scenario][outcome] = {};
    if (!data[scenario][outcome][statistic]) data[scenario][outcome][statistic] = {};

    data[scenario][outcome][statistic][facet] = plotData;
    fileCount++;

    console.log(`  Processed: ${scenario}/${outcome}/${statistic}/${facet}`);
  }

  return {
    metadata: {
      city,
      city_label: cityLabel,
      scenarios: Array.from(scenarios).sort(),
      outcomes: Array.from(outcomes).sort(),
      statistics: Array.from(statistics).sort(),
      facets: Array.from(facets).sort(),
      generation_time: new Date().toISOString(),
      file_count: fileCount,
    },
    data,
  };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx ts-node scripts/aggregate-city-data.ts <input-dir> <output-file>');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node scripts/aggregate-city-data.ts public/test-data public/data/C.12580.json');
    process.exit(1);
  }

  const [inputDir, outputFile] = args;

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  console.log(`Aggregating data from: ${inputDir}`);
  console.log('');

  const aggregated = aggregateCityData(inputDir);

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(outputFile, JSON.stringify(aggregated, null, 2));

  const stats = fs.statSync(outputFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log('');
  console.log('=== Aggregation Complete ===');
  console.log(`City: ${aggregated.metadata.city} (${aggregated.metadata.city_label})`);
  console.log(`Files processed: ${aggregated.metadata.file_count}`);
  console.log(`Scenarios: ${aggregated.metadata.scenarios.join(', ')}`);
  console.log(`Outcomes: ${aggregated.metadata.outcomes.join(', ')}`);
  console.log(`Statistics: ${aggregated.metadata.statistics.join(', ')}`);
  console.log(`Facets: ${aggregated.metadata.facets.join(', ')}`);
  console.log(`Output: ${outputFile} (${sizeMB} MB)`);
}

main();
