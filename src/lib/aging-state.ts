import {
  getStateName,
  getStateCode,
  isValidStateCode,
} from '../data/hiv-age-catalog';

export const RACES = {
  black: 'Black',
  hispanic: 'Hispanic',
  other: 'Other',
} as const;
export const TRANSMISSION = { msm: 'MSM', non_msm: 'Non-MSM' } as const;
export const AGES = ['13-24', '25-34', '35-44', '45-54', '55+'] as const;
export type AgeGroup = (typeof AGES)[number];
export type AgingView = 'state' | 'race' | 'sex';
export interface AgingSelection {
  view: AgingView;
  states: string[];
  races: (keyof typeof RACES)[];
  sex: (keyof typeof TRANSMISSION)[];
  ages: AgeGroup[];
  normalized: boolean;
  years: [number, number];
}
const unique = <T>(items: T[]) => [...new Set(items)];
export function maxStates(
  selection: Pick<AgingSelection, 'view' | 'races' | 'sex'>,
) {
  const groups =
    selection.view === 'race'
      ? selection.races.length
      : selection.view === 'sex'
        ? selection.sex.length
        : 1;
  return Math.floor(25 / Math.max(1, groups));
}
export function parseAgingSelection(params: {
  get(name: string): string | null;
}): AgingSelection & { omittedStates: number } {
  const view = params.get('view');
  const rawStates = params.get('states');
  const states = unique(
    (rawStates ?? '').split(',').filter(isValidStateCode).map(getStateName),
  );
  const races = unique(
    (params.get('races') ?? '')
      .split(',')
      .filter((value): value is keyof typeof RACES =>
        Object.hasOwn(RACES, value),
      ),
  );
  const sex = unique(
    (params.get('sex') ?? '')
      .split(',')
      .filter((value): value is keyof typeof TRANSMISSION =>
        Object.hasOwn(TRANSMISSION, value),
      ),
  );
  const ages = unique(
    (params.get('ages') ?? '')
      .split(',')
      .filter((value): value is AgeGroup =>
        (AGES as readonly string[]).includes(value),
      ),
  );
  const [start, end] = (params.get('years') ?? '').split('-').map(Number);
  const selection: AgingSelection = {
    view: view === 'race' || view === 'sex' ? view : 'state',
    states:
      rawStates === '' ? [] : states.length ? states : ['California', 'Texas'],
    races: races.length ? races : ['black', 'hispanic', 'other'],
    sex: sex.length ? sex : ['msm', 'non_msm'],
    ages: ages.length ? AGES.filter((age) => ages.includes(age)) : [...AGES],
    normalized: params.get('normalized') === 'true',
    years:
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 2025 &&
      end <= 2040 &&
      start <= end
        ? [start, end]
        : [2025, 2040],
  };
  return {
    ...selection,
    states: selection.states.slice(0, maxStates(selection)),
    omittedStates: Math.max(0, selection.states.length - maxStates(selection)),
  };
}
export function agingQuery(selection: AgingSelection): string {
  const params = new URLSearchParams({
    view: selection.view,
    states: selection.states.map(getStateCode).join(','),
    races: selection.races.join(','),
    sex: selection.sex.join(','),
    ages: selection.ages.join(','),
    normalized: String(selection.normalized),
    years: selection.years.join('-'),
  });
  return params.toString();
}
