// State data for Ryan White state-level model with geographic coordinates
// These are the 11 states that have simulation data

export interface StateData {
  code: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude] - approximate geographic center
  availableScenarios?: string[];
}

// All states with Ryan White state-level simulation data
// Coordinates sourced from approximate geographic centers of states
export const ALL_STATES: StateData[] = [
  {
    code: "AL",
    name: "Alabama",
    coordinates: [-86.9023, 32.3182]
  },
  {
    code: "CA",
    name: "California",
    coordinates: [-119.4179, 36.7783]
  },
  {
    code: "FL",
    name: "Florida",
    coordinates: [-81.5158, 27.6648]
  },
  {
    code: "GA",
    name: "Georgia",
    coordinates: [-82.9001, 32.1656]
  },
  {
    code: "IL",
    name: "Illinois",
    coordinates: [-89.3985, 40.6331]
  },
  {
    code: "LA",
    name: "Louisiana",
    coordinates: [-91.9623, 30.9843]
  },
  {
    code: "MO",
    name: "Missouri",
    coordinates: [-91.8318, 37.9643]
  },
  {
    code: "MS",
    name: "Mississippi",
    coordinates: [-89.3985, 32.3547]
  },
  {
    code: "NY",
    name: "New York",
    coordinates: [-75.4999, 43.2994]
  },
  {
    code: "TX",
    name: "Texas",
    coordinates: [-99.9018, 31.9686]
  },
  {
    code: "WI",
    name: "Wisconsin",
    coordinates: [-89.6165, 43.7844]
  }
];

// Available scenarios that states might have
export const AVAILABLE_SCENARIOS = [
  'brief_interruption',
  'cessation',
  'prolonged_interruption'
] as const;

export type ScenarioType = typeof AVAILABLE_SCENARIOS[number];
