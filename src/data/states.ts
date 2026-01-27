// State data for Ryan White state-level models with geographic coordinates
// Includes all states for both AJPH (11) and CROI (30) analyses

export interface StateData {
  code: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude] - approximate geographic center
  availableScenarios?: string[];
}

// All states with Ryan White state-level simulation data
// Coordinates sourced from approximate geographic centers of states
export const ALL_STATES: StateData[] = [
  { code: 'AL', name: 'Alabama', coordinates: [-86.9023, 32.3182] },
  { code: 'AR', name: 'Arkansas', coordinates: [-92.3731, 34.7465] },
  { code: 'AZ', name: 'Arizona', coordinates: [-111.0937, 34.0489] },
  { code: 'CA', name: 'California', coordinates: [-119.4179, 36.7783] },
  { code: 'CO', name: 'Colorado', coordinates: [-105.3111, 39.0598] },
  { code: 'FL', name: 'Florida', coordinates: [-81.5158, 27.6648] },
  { code: 'GA', name: 'Georgia', coordinates: [-82.9001, 32.1656] },
  { code: 'IL', name: 'Illinois', coordinates: [-89.3985, 40.6331] },
  { code: 'IN', name: 'Indiana', coordinates: [-86.1349, 40.2672] },
  { code: 'KY', name: 'Kentucky', coordinates: [-84.2700, 37.8393] },
  { code: 'LA', name: 'Louisiana', coordinates: [-91.9623, 30.9843] },
  { code: 'MA', name: 'Massachusetts', coordinates: [-71.3824, 42.4072] },
  { code: 'MD', name: 'Maryland', coordinates: [-76.6413, 39.0458] },
  { code: 'MI', name: 'Michigan', coordinates: [-85.6024, 44.3148] },
  { code: 'MN', name: 'Minnesota', coordinates: [-94.6859, 46.7296] },
  { code: 'MO', name: 'Missouri', coordinates: [-91.8318, 37.9643] },
  { code: 'MS', name: 'Mississippi', coordinates: [-89.3985, 32.3547] },
  { code: 'NC', name: 'North Carolina', coordinates: [-79.0193, 35.7596] },
  { code: 'NJ', name: 'New Jersey', coordinates: [-74.4057, 40.0583] },
  { code: 'NV', name: 'Nevada', coordinates: [-116.4194, 38.8026] },
  { code: 'NY', name: 'New York', coordinates: [-75.4999, 43.2994] },
  { code: 'OH', name: 'Ohio', coordinates: [-82.9071, 40.4173] },
  { code: 'OK', name: 'Oklahoma', coordinates: [-97.5164, 35.0078] },
  { code: 'PA', name: 'Pennsylvania', coordinates: [-77.1945, 41.2033] },
  { code: 'SC', name: 'South Carolina', coordinates: [-81.1637, 33.8361] },
  { code: 'TN', name: 'Tennessee', coordinates: [-86.5804, 35.5175] },
  { code: 'TX', name: 'Texas', coordinates: [-99.9018, 31.9686] },
  { code: 'VA', name: 'Virginia', coordinates: [-78.6569, 37.4316] },
  { code: 'WA', name: 'Washington', coordinates: [-120.7401, 47.7511] },
  { code: 'WI', name: 'Wisconsin', coordinates: [-89.6165, 43.7844] },
];

// AJPH scenarios (11 states)
export const AJPH_SCENARIOS = [
  'brief_interruption',
  'cessation',
  'prolonged_interruption',
] as const;

// CROI scenarios (30 states)
export const CROI_SCENARIOS = [
  'cessation',
  'interruption',
  'cessation_conservative',
  'interruption_conservative',
] as const;

// Legacy export for backwards compatibility
export const AVAILABLE_SCENARIOS = AJPH_SCENARIOS;

export type ScenarioType = (typeof AJPH_SCENARIOS)[number] | (typeof CROI_SCENARIOS)[number];
