/**
 * Sync model configuration from jheem-backend's models.json
 *
 * This script fetches the canonical configuration from jheem-backend and generates
 * the portal's model-configs.ts file, ensuring a single source of truth.
 *
 * Usage:
 *   npx tsx scripts/sync-config.ts
 *
 * Environment variables:
 *   JHEEM_CONFIG_PATH - Local path to models.json (for local development)
 *                       If not set, fetches from GitHub main branch
 *
 * Example:
 *   # Use GitHub (default, for CI/production)
 *   npx tsx scripts/sync-config.ts
 *
 *   # Use local file (for development)
 *   JHEEM_CONFIG_PATH=/path/to/jheem-backend/.github/config/models.json npx tsx scripts/sync-config.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_URL =
  'https://raw.githubusercontent.com/ncsizemore/jheem-backend/master/.github/config/models.json';

const OUTPUT_PATH = path.join(__dirname, '../src/config/model-configs.ts');

// Model ID mapping: models.json key → portal key (for backwards compatibility)
const MODEL_ID_MAP: Record<string, string> = {
  'ryan-white-msa': 'ryan-white',
};

// Models to skip (placeholders, not ready for portal)
const SKIP_MODELS = new Set<string>();


interface SourceScenario {
  id: string;
  label: string;
  description: string;
  filePatterns?: string[];
}

interface SourceModel {
  _status?: string;
  displayName: string;
  shortName: string;
  description?: string;
  geographyType: 'city' | 'state';
  geographyLabel: string;
  geographyLabelPlural: string;
  scenarios: SourceScenario[];
  facetDimensions: string[];
  defaults: {
    outcome: string;
    statistic: string;
  };
  map: {
    center: [number, number];
    zoom: number;
  };
  interventionStartYear: number;
  output: {
    cloudfrontUrl: string;
    summaryFile: string;
  };
}

interface SourceConfig {
  _meta?: unknown;
  _infrastructure?: unknown;
  [key: string]: unknown;
}

function toVariableName(modelId: string): string {
  // Convert model ID to camelCase variable name
  // ryan-white → ryanWhiteConfig
  // ryan-white-state-ajph → ajphStateLevelConfig (special case)
  // ryan-white-state-croi → croiStateLevelConfig (special case)
  // cdc-testing → cdcTestingConfig

  const specialCases: Record<string, string> = {
    'ryan-white': 'ryanWhiteConfig',
    'ryan-white-state-ajph': 'ajphStateLevelConfig',
    'ryan-white-state-croi': 'croiStateLevelConfig',
    'cdc-testing': 'cdcTestingConfig',
  };

  if (specialCases[modelId]) {
    return specialCases[modelId];
  }

  // Default: convert kebab-case to camelCase and append Config
  const camel = modelId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return camel + 'Config';
}

function generateScenarioCode(scenario: SourceScenario): string {
  return `    {
      id: '${scenario.id}',
      label: '${scenario.label}',
      description: '${scenario.description.replace(/'/g, "\\'")}',
    }`;
}

function generateModelCode(modelId: string, model: SourceModel): string {
  const varName = toVariableName(modelId);

  if (!model.scenarios) {
    throw new Error(`Model ${modelId} has no scenarios defined`);
  }

  const scenarios = model.scenarios.map(generateScenarioCode).join(',\n');
  const facetDims = model.facetDimensions || ['age', 'sex', 'race', 'risk'];

  return `export const ${varName}: ModelConfig = {
  id: '${modelId}',
  name: '${model.displayName}',
  shortName: '${model.shortName}',

  geographyType: '${model.geographyType}',
  geographyLabel: '${model.geographyLabel}',
  geographyLabelPlural: '${model.geographyLabelPlural}',

  dataUrl: '${model.output.cloudfrontUrl}',
  summaryFileName: '${model.output.summaryFile}',

  scenarios: [
${scenarios},
  ],

  defaults: {
    outcome: '${model.defaults.outcome}',
    statistic: '${model.defaults.statistic}',
  },

  facetDimensions: [${facetDims.map((d) => `'${d}'`).join(', ')}],

  map: {
    center: [${model.map.center[0]}, ${model.map.center[1]}],
    zoom: ${model.map.zoom},
  },

  interventionStartYear: ${model.interventionStartYear},
};`;
}

async function fetchConfig(): Promise<SourceConfig> {
  const localPath = process.env.JHEEM_CONFIG_PATH;

  if (localPath) {
    console.log(`📂 Reading from local file: ${localPath}`);
    const content = fs.readFileSync(localPath, 'utf-8');
    return JSON.parse(content);
  }

  console.log(`🌐 Fetching from GitHub: ${GITHUB_URL}`);
  const response = await fetch(GITHUB_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function generateFile(config: SourceConfig): string {
  const models: Array<{ id: string; model: SourceModel }> = [];

  // Extract models (skip special keys and placeholder models)
  for (const [key, value] of Object.entries(config)) {
    if (key.startsWith('_') || key.startsWith('$')) continue;
    if (SKIP_MODELS.has(key)) continue;

    const model = value as SourceModel;
    if (model._status === 'placeholder') {
      console.log(`⏭️  Skipping placeholder: ${key}`);
      continue;
    }

    // Map the model ID if needed
    const portalId = MODEL_ID_MAP[key] || key;
    models.push({ id: portalId, model });
  }

  // Generate code
  const modelCode = models.map(({ id, model }) => generateModelCode(id, model)).join('\n\n');

  const registryEntries = models
    .map(({ id }) => {
      const varName = toVariableName(id);
      return `  '${id}': ${varName},`;
    })
    .join('\n');

  return `/**
 * Model configuration for the native explorer
 *
 * ⚠️  AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 *
 * This file is generated by scripts/sync-config.ts from:
 * https://github.com/ncsizemore/jheem-backend/blob/master/.github/config/models.json
 *
 * To update, run: npx tsx scripts/sync-config.ts
 * Generated: ${new Date().toISOString()}
 */

export interface ScenarioConfig {
  id: string;
  label: string;
  description: string;
}

export interface ModelConfig {
  // Basic info
  id: string;
  name: string;
  shortName: string;

  // Geography
  geographyType: 'city' | 'state';
  geographyLabel: string;
  geographyLabelPlural: string;

  // Data source
  dataUrl: string;
  summaryFileName: string;

  // Scenarios
  scenarios: ScenarioConfig[];

  // Default selections
  defaults: {
    outcome: string;
    statistic: string;
  };

  // Available facet dimensions for this model
  facetDimensions: ('age' | 'sex' | 'race' | 'risk')[];

  // Map settings
  map: {
    center: [number, number];
    zoom: number;
  };

  // Timeline settings
  interventionStartYear: number;
}

// =============================================================================
// MODEL CONFIGURATIONS
// =============================================================================

${modelCode}

// =============================================================================
// CONFIG REGISTRY
// =============================================================================

export const modelConfigs: Record<string, ModelConfig> = {
${registryEntries}
};

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigs[modelId];
}
`;
}

async function main() {
  console.log('🔄 Syncing model configuration...\n');

  try {
    const config = await fetchConfig();
    const output = generateFile(config);

    fs.writeFileSync(OUTPUT_PATH, output);
    console.log(`\n✅ Generated ${OUTPUT_PATH}`);

    // Show what was generated
    const modelCount = (output.match(/export const \w+Config: ModelConfig/g) || []).length;
    console.log(`   ${modelCount} models configured`);
  } catch (error) {
    console.error('❌ Failed to sync config:', error);
    process.exit(1);
  }
}

main();
