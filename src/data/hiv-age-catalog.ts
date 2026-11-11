// List of states and territories from the figure
export const AVAILABLE_STATES = [
  'Alabama',
  'Arkansas',
  'Arizona',
  'California',
  'Colorado',
  'Florida',
  'Georgia',
  'Illinois',
  'Kentucky',
  'Louisiana',
  'Maryland',
  'Michigan',
  'Missouri',
  'Mississippi',
  'North Carolina',
  'New York',
  'Ohio',
  'Oklahoma',
  'South Carolina',
  'Tennessee',
  'Texas',
  'Virginia',
  'Washington',
  'Wisconsin',
  'Total',
] as const;

// State abbreviations mapping for compact display
export const STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: 'AL',
  Arkansas: 'AR',
  Arizona: 'AZ',
  California: 'CA',
  Colorado: 'CO',
  Florida: 'FL',
  Georgia: 'GA',
  Illinois: 'IL',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maryland: 'MD',
  Michigan: 'MI',
  Missouri: 'MO',
  Mississippi: 'MS',
  'North Carolina': 'NC',
  'New York': 'NY',
  Ohio: 'OH',
  Oklahoma: 'OK',
  'South Carolina': 'SC',
  Tennessee: 'TN',
  Texas: 'TX',
  Virginia: 'VA',
  Washington: 'WA',
  Wisconsin: 'WI',
  Total: 'ALL',
};

// Reverse mapping: Code to Name
export const STATE_CODE_TO_NAME: Record<string, string> = Object.entries(
  STATE_ABBREVIATIONS,
).reduce(
  (acc, [name, code]) => ({ ...acc, [code]: name }),
  {} as Record<string, string>,
);

// Helper: Convert state name to code
export function getStateCode(stateName: string): string {
  // Handle "Total" special case
  if (stateName === 'Total') return 'total';

  // Look up in mapping
  const code = STATE_ABBREVIATIONS[stateName];
  if (code) return code;

  // Fallback: assume it's already a code
  return stateName;
}

// Helper: Convert state code to name
export function getStateName(stateCode: string): string {
  // Handle "total" special case
  if (stateCode === 'total') return 'Total';

  // Look up in reverse mapping
  const name = STATE_CODE_TO_NAME[stateCode.toUpperCase()];
  if (name) return name;

  // Fallback: return the code
  return stateCode;
}

// Helper: Validate if a state code exists
export function isValidStateCode(code: string): boolean {
  return code === 'total' || code.toUpperCase() in STATE_CODE_TO_NAME;
}

// Helper: Validate if a state name exists
export function isValidStateName(name: string): boolean {
  return name === 'Total' || name in STATE_ABBREVIATIONS;
}
