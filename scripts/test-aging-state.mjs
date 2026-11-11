import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAgingSelection,
  agingQuery,
  AGES,
} from '../src/lib/aging-state.ts';
import { transformDataForChart } from '../src/data/hiv-age-projections.ts';
const parse = (query) => parseAgingSelection(new URLSearchParams(query));
test('aging URLs reject invalid categories and years, deduplicate states, and retain an intentional empty selection', () => {
  const invalid = parse(
    'view=bad&states=CA,ca,ALL,total,XX&races=toString,__proto__&sex=constructor&years=2025.5-2030',
  );
  assert.deepEqual(invalid.states, ['California', 'Total']);
  assert.deepEqual(invalid.races, ['black', 'hispanic', 'other']);
  assert.deepEqual(invalid.sex, ['msm', 'non_msm']);
  assert.deepEqual(invalid.years, [2025, 2040]);
  assert.equal(invalid.view, 'state');
  assert.deepEqual(parse('states=').states, []);
  assert.deepEqual(parse('years=2040-2025').years, [2025, 2040]);
  assert.deepEqual(parse('ages=55%2B,13-24,unknown,55%2B').ages, [
    '13-24',
    '55+',
  ]);
});
test('aging choices round-trip across all three views and preserve inactive category choices', () => {
  for (const view of ['state', 'race', 'sex']) {
    const selection = parse(
      `view=${view}&states=CA,TX&races=black&sex=non_msm&ages=55%2B&normalized=true&years=2030-2030`,
    );
    assert.deepEqual(parse(agingQuery(selection)), selection);
  }
});
test('oversized comparison links cap panels and report omitted locations', () => {
  const selected = parse(
    'view=race&states=AL,AR,AZ,CA,CO,FL,GA,IL,KY,LA,MD,MI',
  );
  assert.equal(selected.states.length, 8);
  assert.equal(selected.omittedStates, 4);
});
test('percentages use all five groups, preserve count values, and handle a zero population', () => {
  const state = {
    state_code: 'EX',
    state_name: 'Example',
    data: [
      {
        year: 2025,
        age_cohorts: {
          '13-24': 10,
          '25-34': 20,
          '35-44': 30,
          '45-54': 40,
          '55+': 100,
        },
      },
      {
        year: 2026,
        age_cohorts: Object.fromEntries(AGES.map((age) => [age, 0])),
      },
    ],
  };
  const counts = transformDataForChart([state], [2025, 2026], false);
  assert.equal(counts[0]['Example_55+'], 100);
  const shares = transformDataForChart([state], [2025, 2026], true);
  assert.equal(shares[0]['Example_55+'], 50);
  assert.equal(
    AGES.reduce((total, age) => total + shares[0][`Example_${age}`], 0),
    100,
  );
  assert.ok(AGES.every((age) => shares[1][`Example_${age}`] === 0));
});
