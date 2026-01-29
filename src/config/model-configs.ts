/**
 * Model configuration for the native explorer
 *
 * Each model (Ryan White, CDC Testing, State Level, etc.) has its own config
 * that defines scenarios, labels, data sources, and display settings.
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
  geographyLabel: string;        // "City" or "State"
  geographyLabelPlural: string;  // "Cities" or "States"

  // Data source
  dataUrl: string;
  summaryFileName: string;       // e.g., "city-summaries.json" or "state-summaries.json"

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
    center: [number, number];  // [longitude, latitude]
    zoom: number;
  };

  // Timeline settings
  interventionStartYear: number;  // Year when intervention/cessation begins
}

// =============================================================================
// RYAN WHITE CONFIG
// =============================================================================

export const ryanWhiteConfig: ModelConfig = {
  id: 'ryan-white',
  name: 'Ryan White Funding Explorer',
  shortName: 'Ryan White',

  geographyType: 'city',
  geographyLabel: 'City',
  geographyLabelPlural: 'Cities',

  dataUrl: process.env.NEXT_PUBLIC_DATA_URL || 'https://d320iym4dtm9lj.cloudfront.net/ryan-white',
  summaryFileName: 'city-summaries.json',

  scenarios: [
    {
      id: 'cessation',
      label: 'Cessation',
      description: 'Permanent end to Ryan White funding',
    },
    {
      id: 'brief_interruption',
      label: 'Brief Interruption',
      description: '18-month funding gap, then services resume',
    },
    {
      id: 'prolonged_interruption',
      label: 'Prolonged Interruption',
      description: '42-month funding gap, then services resume',
    },
  ],

  defaults: {
    outcome: 'incidence',
    statistic: 'mean.and.interval',
  },

  facetDimensions: ['age', 'sex', 'race', 'risk'],

  map: {
    center: [-96.5, 38.5],
    zoom: 4.1,
  },

  interventionStartYear: 2025,
};

// =============================================================================
// CDC TESTING CONFIG (placeholder - to be configured when transitioning)
// =============================================================================

export const cdcTestingConfig: ModelConfig = {
  id: 'cdc-testing',
  name: 'CDC Testing Model Explorer',
  shortName: 'CDC Testing',

  geographyType: 'city',
  geographyLabel: 'City',
  geographyLabelPlural: 'Cities',

  dataUrl: 'https://d320iym4dtm9lj.cloudfront.net/cdc-testing', // TODO: Update when data is ready
  summaryFileName: 'city-summaries.json',

  scenarios: [
    // TODO: Configure actual CDC Testing scenarios
    {
      id: 'baseline',
      label: 'Baseline',
      description: 'Current testing levels continue',
    },
    {
      id: 'increased_testing',
      label: 'Increased Testing',
      description: 'Expanded testing program',
    },
  ],

  defaults: {
    outcome: 'diagnoses',
    statistic: 'mean.and.interval',
  },

  facetDimensions: ['age', 'sex', 'race', 'risk'],

  map: {
    center: [-96.5, 38.5],
    zoom: 4.1,
  },

  interventionStartYear: 2025,  // Placeholder - update when CDC Testing is configured
};

// =============================================================================
// RYAN WHITE STATE LEVEL - AJPH (11 states, 2025 paper)
// =============================================================================

export const ajphStateLevelConfig: ModelConfig = {
  id: 'ryan-white-state-ajph',
  name: 'Ryan White State Analysis (AJPH)',
  shortName: 'AJPH (11 States)',

  geographyType: 'state',
  geographyLabel: 'State',
  geographyLabelPlural: 'States',

  dataUrl: 'https://d320iym4dtm9lj.cloudfront.net/ryan-white-state',
  summaryFileName: 'state-summaries.json',

  scenarios: [
    {
      id: 'cessation',
      label: 'Cessation',
      description: 'Permanent end to Ryan White funding',
    },
    {
      id: 'brief_interruption',
      label: 'Brief Interruption',
      description: '18-month funding gap, then services resume',
    },
    {
      id: 'prolonged_interruption',
      label: 'Prolonged Interruption',
      description: '42-month funding gap, then services resume',
    },
  ],

  defaults: {
    outcome: 'incidence',
    statistic: 'mean.and.interval',
  },

  facetDimensions: ['age', 'sex', 'race', 'risk'],

  map: {
    center: [-96.5, 38.5],
    zoom: 4.1,
  },

  interventionStartYear: 2025,
};

// =============================================================================
// RYAN WHITE STATE LEVEL - CROI (30 states, 2026 conference)
// =============================================================================

export const croiStateLevelConfig: ModelConfig = {
  id: 'ryan-white-state-croi',
  name: 'Ryan White State Analysis (CROI)',
  shortName: 'CROI (30 States)',

  geographyType: 'state',
  geographyLabel: 'State',
  geographyLabelPlural: 'States',

  dataUrl: 'https://d320iym4dtm9lj.cloudfront.net/ryan-white-state-croi',
  summaryFileName: 'state-summaries.json',

  scenarios: [
    {
      id: 'cessation',
      label: 'Cessation',
      description: 'Permanent end to Ryan White funding starting 2026',
    },
    {
      id: 'interruption',
      label: 'Interruption',
      description: '2.5-year funding gap (2026-2028), then services resume',
    },
    {
      id: 'cessation_conservative',
      label: 'Cessation (Conservative)',
      description: 'Permanent cessation with conservative impact assumptions',
    },
    {
      id: 'interruption_conservative',
      label: 'Interruption (Conservative)',
      description: '2.5-year gap with conservative impact assumptions',
    },
  ],

  defaults: {
    outcome: 'incidence',
    statistic: 'mean.and.interval',
  },

  facetDimensions: ['age', 'sex', 'race', 'risk'],

  map: {
    center: [-96.5, 38.5],
    zoom: 4.1,
  },

  interventionStartYear: 2026,  // CROI analysis starts intervention in 2026
};

// Legacy alias for backwards compatibility
export const ryanWhiteStateLevelConfig = ajphStateLevelConfig;

// =============================================================================
// CONFIG REGISTRY
// =============================================================================

export const modelConfigs: Record<string, ModelConfig> = {
  'ryan-white': ryanWhiteConfig,
  'cdc-testing': cdcTestingConfig,
  'ryan-white-state-ajph': ajphStateLevelConfig,
  'ryan-white-state-croi': croiStateLevelConfig,
  // Legacy alias
  'ryan-white-state-level': ryanWhiteStateLevelConfig,
};

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigs[modelId];
}
