// City data extracted from JHEEM defaults.yaml with geographic coordinates
// These are the 32 metropolitan areas that have simulation data

export interface CityData {
  code: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  availableScenarios?: string[];
}

// All potential cities from JHEEM simulation data
// Coordinates sourced from geographic centers of metropolitan areas
export const ALL_CITIES: CityData[] = [
  {
    code: "C.12060",
    name: "Atlanta-Sandy Springs-Roswell, GA",
    coordinates: [-84.3880, 33.7490]
  },
  {
    code: "C.12420", 
    name: "Austin-Round Rock, TX",
    coordinates: [-97.7431, 30.2672]
  },
  {
    code: "C.12580",
    name: "Baltimore-Columbia-Towson, MD", 
    coordinates: [-76.6122, 39.2904]
  },
  {
    code: "C.12940",
    name: "Baton Rouge, LA",
    coordinates: [-91.1871, 30.4515]
  },
  {
    code: "C.14460",
    name: "Boston-Cambridge-Newton, MA-NH",
    coordinates: [-71.0589, 42.3601]
  },
  {
    code: "C.16740", 
    name: "Charlotte-Concord-Gastonia, NC-SC",
    coordinates: [-80.8431, 35.2271]
  },
  {
    code: "C.16980",
    name: "Chicago-Naperville-Elgin, IL-IN-WI",
    coordinates: [-87.6298, 41.8781]
  },
  {
    code: "C.17460",
    name: "Cleveland-Elyria, OH",
    coordinates: [-81.6944, 41.4993]
  },
  {
    code: "C.18140",
    name: "Columbus, OH", 
    coordinates: [-82.9988, 39.9612]
  },
  {
    code: "C.19100",
    name: "Dallas-Fort Worth-Arlington, TX",
    coordinates: [-96.7970, 32.7767]
  },
  {
    code: "C.19820",
    name: "Detroit-Warren-Dearborn, MI",
    coordinates: [-83.0458, 42.3314]
  },
  {
    code: "C.26420",
    name: "Houston-The Woodlands-Sugar Land, TX", 
    coordinates: [-95.3698, 29.7604]
  },
  {
    code: "C.26900",
    name: "Indianapolis-Carmel-Anderson, IN",
    coordinates: [-86.1581, 39.7684]
  },
  {
    code: "C.27260",
    name: "Jacksonville, FL",
    coordinates: [-81.6557, 30.3322]
  },
  {
    code: "C.29820",
    name: "Las Vegas-Henderson-Paradise, NV",
    coordinates: [-115.1398, 36.1699]
  },
  {
    code: "C.31080",
    name: "Los Angeles-Long Beach-Anaheim, CA",
    coordinates: [-118.2437, 34.0522]
  },
  {
    code: "C.32820",
    name: "Memphis, TN-MS-AR",
    coordinates: [-90.0490, 35.1495]
  },
  {
    code: "C.33100",
    name: "Miami-Fort Lauderdale-West Palm Beach, FL",
    coordinates: [-80.1918, 25.7617]
  },
  {
    code: "C.35380",
    name: "New Orleans-Metairie, LA",
    coordinates: [-90.0715, 29.9511]
  },
  {
    code: "C.35620",
    name: "New York-Newark-Jersey City, NY-NJ-PA",
    coordinates: [-74.0059, 40.7128]
  },
  {
    code: "C.36740",
    name: "Orlando-Kissimmee-Sanford, FL",
    coordinates: [-81.3792, 28.5383]
  },
  {
    code: "C.37980",
    name: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD",
    coordinates: [-75.1652, 39.9526]
  },
  {
    code: "C.38060", 
    name: "Phoenix-Mesa-Scottsdale, AZ",
    coordinates: [-112.0740, 33.4484]
  },
  {
    code: "C.40140",
    name: "Riverside-San Bernardino-Ontario, CA",
    coordinates: [-117.3961, 33.9533]
  },
  {
    code: "C.40900",
    name: "Sacramento-Roseville-Arden-Arcade, CA",
    coordinates: [-121.4944, 38.5816]
  },
  {
    code: "C.41700",
    name: "San Antonio-New Braunfels, TX",
    coordinates: [-98.4936, 29.4241]
  },
  {
    code: "C.41740",
    name: "San Diego-Carlsbad, CA",
    coordinates: [-117.1611, 32.7157]
  },
  {
    code: "C.41860",
    name: "San Francisco-Oakland-Hayward, CA",
    coordinates: [-122.4194, 37.7749]
  },
  {
    code: "C.42660",
    name: "Seattle-Tacoma-Bellevue, WA",
    coordinates: [-122.3321, 47.6062]
  },
  {
    code: "C.45300",
    name: "Tampa-St. Petersburg-Clearwater, FL",
    coordinates: [-82.4572, 27.9506]
  },
  {
    code: "C.47900",
    name: "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    coordinates: [-77.0369, 38.9072]
  }
];

// Available scenarios that cities might have
export const AVAILABLE_SCENARIOS = [
  'brief_interruption',
  'cessation', 
  'prolonged_interruption'
] as const;

export type ScenarioType = typeof AVAILABLE_SCENARIOS[number];
