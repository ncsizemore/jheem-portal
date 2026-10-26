import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canonicalFacet,
  getFacetChoices,
  resolveFacet,
} from '../src/utils/analysisFacets.ts';
import { transformPlotData, getValueRange } from '../src/utils/transformPlotData.ts';
import { buildResultsCsv } from '../src/utils/exportCsv.ts';
import { OUTCOME_DEFINITIONS } from '../src/utils/outcomeDefinitions.ts';
const release = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/baltimore-results.json', import.meta.url),
  ),
);

test('every released outcome has a definition and published values survive transformation', () => {
  for (const [scenario, outcomes] of Object.entries(release.data)) {
    for (const [outcome, summaries] of Object.entries(outcomes)) {
      assert.ok(OUTCOME_DEFINITIONS[outcome], `Missing ${outcome}`);
      for (const [summary, plots] of Object.entries(summaries)) {
        const plot = plots.none;
        const panel = transformPlotData(plot)[0];
        for (const row of plot.sim) {
          const transformed = panel.data.find(
            (point) => point.year === row.year,
          );
          const baseline = row.simset === 'Baseline';
          assert.equal(
            transformed[baseline ? 'baselineValue' : 'value'],
            row.value,
            `${scenario}/${outcome}/${summary}/${row.year}`,
          );
          assert.equal(
            transformed[baseline ? 'baselineLower' : 'lower'],
            row['value.lower'],
          );
          assert.equal(
            transformed[baseline ? 'baselineUpper' : 'upper'],
            row['value.upper'],
          );
        }
      }
    }
  }
});
test('facet order is independent of storage order and falsely labeled dimension files are excluded', () => {
  const plots = release.data.cessation.incidence['mean.and.interval'];
  const choices = getFacetChoices(plots);
  assert.equal(canonicalFacet('risk+sex'), 'sex+risk');
  assert.equal(resolveFacet('risk+sex', choices), 'sex+risk');
  assert.ok(choices.some((choice) => choice.key === 'age+race'));
  const malformed = { ...plots, 'age+race+sex': plots.age };
  assert.ok(
    !getFacetChoices(malformed).some((choice) => choice.key === 'age+race+sex'),
  );
});
test('CSV includes observations and individual simulations, preserving quotes and bounds', () => {
  const panels = transformPlotData(
    release.data.cessation.suppression['mean.and.interval'].none,
  );
  const context = {
    title: 'Viral suppression',
    definition: 'Among diagnosed people',
    units: '%',
    location: 'Baltimore',
    scenario: 'Cessation',
    summary: 'Mean',
    model: 'Ryan White',
    generated: '2026-03-02',
    timeline: '',
    url: 'https://jheem.org/ryan-white/explorer?loc=C.12580',
    scope: 'All groups',
  };
  panels[0].observations.push({
    year: 2020,
    value: 12.5,
    source: 'Source, "quoted"',
    url: 'https://example.org',
  });
  const csv = buildResultsCsv(panels, context);
  assert.ok(csv.includes('"Source, ""quoted"""'));
  assert.ok(csv.includes('# Units: %'));
  assert.ok(csv.includes('2030,Cessation,,47.1301,11.7388,76.0206,%'));
  const individual = buildResultsCsv(
    [
      {
        facetLabel: 'All',
        data: [],
        observations: [],
        individualSimulations: [
          {
            simset: 'Cessation',
            simId: '42',
            points: [{ year: 2030, value: 123 }],
          },
        ],
      },
    ],
    context,
  );
  assert.ok(individual.includes('All,2030,Cessation,42,123'));
});
test('percentage scales use 0–100 while retaining values above 100', () => {
  assert.deepEqual(
    getValueRange([{ year: 2030, value: 80, upper: 95 }], [], false, true, undefined, true),
    [0, 100]
  );
  assert.ok(
    getValueRange([{ year: 2030, value: 120, upper: 135 }], [], false, true, undefined, true)[1] >= 135
  );
});
