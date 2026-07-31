/**
 * Sync model configuration from jheem-backend's models.json
 *
 * This script fetches the canonical configuration from jheem-backend and generates
 * the portal's model-configs.ts file, ensuring a single source of truth.
 *
 * Usage:
 *   npm run sync-config
 *
 * Environment variables:
 *   JHEEM_CONFIG_PATH - Local path to models.json (for local development)
 *                       If not set, fetches the immutable GitHub revision in
 *                       config/backend-model-config-source.json
 *   JHEEM_CONFIG_REF  - Optional Git ref override for deliberate local testing
 *
 * Example:
 *   # Use the pinned GitHub revision (default)
 *   npm run sync-config
 *
 *   # Verify the committed generated file without rewriting it
 *   npm run verify-config
 *
 *   # Use local file (for development)
 *   JHEEM_CONFIG_PATH=/path/to/jheem-backend/.github/config/models.json npm run sync-config
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '../src/config/model-configs.ts');
const SOURCE_DESCRIPTOR_PATH = path.join(
  __dirname,
  '../config/backend-model-config-source.json'
);

interface SourceDescriptor {
  repository: string;
  ref: string;
  path: string;
}

function loadSourceDescriptor(): SourceDescriptor {
  const descriptor = JSON.parse(
    fs.readFileSync(SOURCE_DESCRIPTOR_PATH, 'utf-8')
  ) as SourceDescriptor;

  if (!descriptor.repository || !descriptor.ref || !descriptor.path) {
    throw new Error(
      `Incomplete backend config source descriptor: ${SOURCE_DESCRIPTOR_PATH}`
    );
  }

  if (!/^[0-9a-f]{40}$/i.test(descriptor.ref)) {
    throw new Error(
      'Backend config source ref must be a full immutable Git commit SHA.'
    );
  }

  return {
    ...descriptor,
    ref: process.env.JHEEM_CONFIG_REF || descriptor.ref,
  };
}

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
  timeline?: {
    serviceInterruptionStartTime: number;
    suppressionEffectStartTime: number;
    serviceResumeTime?: number;
    suppressionRecoveryEndTime?: number;
  };
  filePatterns?: string[];
}

interface SourceCustomSimParameter {
  id: string;
  envVar: string;
  label: string;
  keyPrefix: string;
  default: number;
  unit: string;
}

interface SourceCustomSimulationTiming {
  interventionStartTime: number;
  lossLagYears: number;
  simulationStartYear: number;
  simulationEndYear: number;
  reportingStartYear: number;
  reportingEndYear: number;
}

interface SourceCustomSimulation {
  simulationScript: string;
  interventionType?: string;
  timing?: SourceCustomSimulationTiming;
  cacheKeyPrefix?: string;
  parameters: SourceCustomSimParameter[];
  facets: string[];
  statistics: string[];
}

interface SourceModel {
  _status?: string;
  displayName: string;
  shortName: string;
  description?: string;
  geographyType: 'city' | 'state';
  geographyLabel: string;
  geographyLabelPlural: string;
  locations: {
    test: string[];
    full: string[];
  };
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
  customSimulation?: SourceCustomSimulation;
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
  const timelineCode = scenario.timeline
    ? `\n      timeline: ${JSON.stringify(scenario.timeline)},`
    : '';
  return `    {
      id: '${scenario.id}',
      label: '${scenario.label}',
      description: '${scenario.description.replace(/'/g, "\\'")}',${timelineCode}
    }`;
}

function generateModelCode(modelId: string, model: SourceModel): string {
  const varName = toVariableName(modelId);

  if (!model.scenarios) {
    throw new Error(`Model ${modelId} has no scenarios defined`);
  }

  const scenarios = model.scenarios.map(generateScenarioCode).join(',\n');
  const facetDims = model.facetDimensions || ['age', 'sex', 'race', 'risk'];

  // Generate custom simulation config if present
  let customSimCode = '';
  if (model.customSimulation) {
    const params = model.customSimulation.parameters
      .map(
        (p) =>
          `      { id: '${p.id}', label: '${p.label}', keyPrefix: '${p.keyPrefix}', default: ${p.default}, unit: '${p.unit}' }`
      )
      .join(',\n');

    const interventionTypeCode = model.customSimulation.interventionType
      ? `    interventionType: '${model.customSimulation.interventionType}',\n`
      : '';
    const timingCode = model.customSimulation.timing
      ? `    timing: ${JSON.stringify(model.customSimulation.timing)},\n`
      : '';
    const cacheKeyPrefixCode = model.customSimulation.cacheKeyPrefix
      ? `    cacheKeyPrefix: '${model.customSimulation.cacheKeyPrefix}',\n`
      : '';

    customSimCode = `

  customSimulation: {
${interventionTypeCode}${timingCode}${cacheKeyPrefixCode}    parameters: [
${params},
    ],
  },`;
  }

  const locationsList = model.locations?.full || [];
  const locationsCode = locationsList.map((l) => `'${l}'`).join(', ');

  return `export const ${varName}: ModelConfig = {
  id: '${modelId}',
  name: '${model.displayName}',
  shortName: '${model.shortName}',
  description: '${(model.description ?? '').replace(/'/g, "\\'")}',

  geographyType: '${model.geographyType}',
  geographyLabel: '${model.geographyLabel}',
  geographyLabelPlural: '${model.geographyLabelPlural}',

  locations: [${locationsCode}],

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

  interventionStartYear: ${model.interventionStartYear},${customSimCode}
};`;
}

interface FetchedConfig {
  config: SourceConfig;
  sourceLabel: string;
}

async function fetchConfig(): Promise<FetchedConfig> {
  const localPath = process.env.JHEEM_CONFIG_PATH;

  if (localPath) {
    console.log(`📂 Reading from local file: ${localPath}`);
    const content = fs.readFileSync(localPath, 'utf-8');
    return {
      config: JSON.parse(content),
      sourceLabel: `local file ${path.resolve(localPath)}`,
    };
  }

  const source = loadSourceDescriptor();
  const rawUrl = `https://raw.githubusercontent.com/${source.repository}/${source.ref}/${source.path}`;
  const apiUrl = `https://api.github.com/repos/${source.repository}/contents/${source.path}?ref=${encodeURIComponent(source.ref)}`;
  const sourceLabel = `https://github.com/${source.repository}/blob/${source.ref}/${source.path}`;

  // Prefer the authenticated Contents API when a token is available
  // (works for both public and private repos). Fall back to the
  // unauthenticated raw URL only if no token is set, which is the local
  // dev case for a public repo.
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    console.log(`🌐 Fetching pinned config from GitHub API: ${sourceLabel}`);
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        // The "raw" media type returns the file body directly instead
        // of the metadata-wrapped JSON.
        Accept: 'application/vnd.github.raw',
        'User-Agent': 'jheem-portal-sync-config',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch config (API): ${response.status} ${response.statusText}`);
    }
    return { config: await response.json(), sourceLabel };
  }

  console.log(`🌐 Fetching pinned config from GitHub: ${sourceLabel}`);
  const response = await fetch(rawUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
  }
  return { config: await response.json(), sourceLabel };
}

function generateFile(config: SourceConfig, sourceLabel: string): string {
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
 * This file is generated by scripts/sync-config.ts from the immutable source:
 * ${sourceLabel}
 *
 * To update, run: npm run sync-config
 */

export interface ScenarioConfig {
  id: string;
  label: string;
  description: string;
  timeline?: {
    serviceInterruptionStartTime: number;
    suppressionEffectStartTime: number;
    serviceResumeTime?: number;
    suppressionRecoveryEndTime?: number;
  };
}

export interface CustomSimParameter {
  id: string;
  label: string;
  keyPrefix: string;
  default: number;
  unit: string;
}

export interface CustomSimulationConfig {
  interventionType?: string;
  timing?: {
    interventionStartTime: number;
    lossLagYears: number;
    simulationStartYear: number;
    simulationEndYear: number;
    reportingStartYear: number;
    reportingEndYear: number;
  };
  cacheKeyPrefix?: string;
  parameters: CustomSimParameter[];
}

export interface ModelConfig {
  // Basic info
  id: string;
  name: string;
  shortName: string;
  description: string;

  // Geography
  geographyType: 'city' | 'state';
  geographyLabel: string;
  geographyLabelPlural: string;

  // Locations (from models.json full list)
  locations: string[];

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

  // Custom simulation support (if model supports user-specified parameters)
  customSimulation?: CustomSimulationConfig;
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
    const checkOnly = process.argv.includes('--check');
    const { config, sourceLabel } = await fetchConfig();
    const output = generateFile(config, sourceLabel);

    if (checkOnly) {
      if (!fs.existsSync(OUTPUT_PATH)) {
        throw new Error(`Generated config is missing: ${OUTPUT_PATH}`);
      }

      const committedOutput = fs.readFileSync(OUTPUT_PATH, 'utf-8');
      if (committedOutput !== output) {
        throw new Error(
          'Generated model config is stale. Run npm run sync-config and commit the result.'
        );
      }

      console.log(`✅ Verified ${OUTPUT_PATH}`);
      return;
    }

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

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
