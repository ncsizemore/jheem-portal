/** Reader-facing definitions, based on the EHE and Ryan White outcome specifications.
 * Keep storage keys unchanged. Outcome units remain authoritative in each release.
 */
export interface OutcomeDefinition {
  label: string;
  description: string;
  group: string;
  note?: string;
}
const HIV = 'HIV outcomes';
const PREVENTION = 'Prevention and testing';
const RW = 'Ryan White services';
const CLIENT_NOTE =
  'These are modeled client populations. After a funding interruption, the count does not indicate that funded services continue to be delivered.';
export const OUTCOME_DEFINITIONS: Record<string, OutcomeDefinition> = {
  incidence: {
    label: 'New HIV infections',
    description:
      'The number of new HIV infections each year. An infection may occur before it is diagnosed.',
    group: HIV,
  },
  new: {
    label: 'New HIV diagnoses',
    description:
      'The number of people newly diagnosed with HIV each year, including infections acquired in earlier years.',
    group: HIV,
  },
  'diagnosed.prevalence': {
    label: 'People living with diagnosed HIV',
    description:
      'The modeled number of people living with HIV who have received a diagnosis.',
    group: HIV,
  },
  awareness: {
    label: 'HIV diagnosis awareness',
    description:
      'The percentage of people living with HIV who know their diagnosis.',
    group: HIV,
  },
  suppression: {
    label: 'Viral suppression',
    description:
      'The percentage of people with diagnosed HIV whose virus is suppressed by treatment.',
    group: HIV,
  },
  testing: {
    label: 'HIV testing in the past year',
    description:
      'The modeled percentage of adults tested for HIV in the past year.',
    group: PREVENTION,
    note: 'Testing rates are converted to annual proportions and weighted by the modeled adult population without HIV. Age-group results begin at 18 years.',
  },
  'prep.uptake': {
    label: 'People prescribed PrEP',
    description:
      'The number of people receiving a PrEP prescription in the past year. PrEP (pre-exposure prophylaxis) is medication to prevent HIV.',
    group: PREVENTION,
  },
  'prep.uptake.proportion': {
    label: 'PrEP coverage',
    description:
      'The percentage of people with indications for PrEP who received a prescription in the past year.',
    group: PREVENTION,
  },
  'rw.clients': {
    label: 'Ryan White clients',
    description:
      'The modeled number of people associated with any Ryan White services.',
    group: RW,
    note: CLIENT_NOTE,
  },
  'adap.clients': {
    label: 'ADAP clients',
    description:
      'The modeled number of clients associated with the AIDS Drug Assistance Program (ADAP).',
    group: RW,
    note: CLIENT_NOTE,
  },
  'non.adap.clients': {
    label: 'Clients of other Ryan White services',
    description:
      'The modeled number of clients associated with Ryan White services other than ADAP. These clients may also use ADAP.',
    group: RW,
    note: CLIENT_NOTE,
  },
  'oahs.clients': {
    label: 'Outpatient care clients (OAHS)',
    description:
      'The modeled number of clients associated with Ryan White Outpatient Ambulatory Health Services (OAHS).',
    group: RW,
    note: CLIENT_NOTE,
  },
  'adap.proportion': {
    label: 'ADAP clients relative to other service clients',
    description:
      'ADAP client count divided by the number of clients of other Ryan White services, expressed as a percentage. These service groups can overlap.',
    group: RW,
  },
  'adap.suppression': {
    label: 'Viral suppression among ADAP clients',
    description:
      'The percentage of AIDS Drug Assistance Program (ADAP) clients whose HIV is suppressed by treatment.',
    group: RW,
  },
  'oahs.suppression': {
    label: 'Viral suppression among outpatient care clients',
    description:
      'The percentage of Ryan White Outpatient Ambulatory Health Services (OAHS) clients whose HIV is suppressed by treatment.',
    group: RW,
  },
};

export function getOutcomeDefinition(
  key: string,
  fallback?: string,
): OutcomeDefinition {
  return (
    OUTCOME_DEFINITIONS[key] ?? {
      label: fallback || key.replace(/[._]/g, ' '),
      description:
        'Model estimates for the selected outcome, location, and scenario.',
      group: 'Other outcomes',
    }
  );
}

export const SUMMARY_LABELS: Record<string, string> = {
  'mean.and.interval': 'Average (mean)',
  'median.and.interval': 'Median',
  'individual.simulation': 'Individual simulations',
};
export function summaryDescription(statistic: string, intervals: boolean) {
  const main =
    statistic === 'individual.simulation'
      ? 'Each line shows one model simulation.'
      : statistic === 'median.and.interval'
        ? 'Lines show the median (middle estimate) across model simulations.'
        : 'Lines show the average (mean) across model simulations.';
  return (
    main +
    (intervals && statistic !== 'individual.simulation'
      ? ' Shaded bands show the middle 95% of simulated estimates for each year.'
      : '')
  );
}
