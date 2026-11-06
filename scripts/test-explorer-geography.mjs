import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import {
  projectGeography,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '../src/components/maps/geographicProjection.ts';
import {
  ryanWhiteConfig,
  ajphStateLevelConfig,
  croiStateLevelConfig,
  cdcTestingConfig,
} from '../src/config/model-configs.ts';
import { ALL_CITIES } from '../src/data/cities.ts';
import { getStatusMetrics } from '../src/hooks/useStateSummaries.ts';

const geography = JSON.parse(
  await readFile(
    new URL('../src/data/explorer-geography.json', import.meta.url),
    'utf8',
  ),
);
test('display geography is reproducible from the existing boundary source', () => {
  execFileSync(process.execPath, [
    '--import',
    'tsx',
    'scripts/prepare-explorer-geography.ts',
    '--check',
  ]);
});
test('every modeled state and city has valid geographic coverage', () => {
  assert.equal(geography.length, 49);
  assert.equal(new Set(geography.map((state) => state.code)).size, 49);
  for (const config of [
    ajphStateLevelConfig,
    croiStateLevelConfig,
    cdcTestingConfig,
  ]) {
    for (const code of config.locations) {
      const state = geography.find((item) => item.code === code);
      assert.ok(state, `${config.id}: ${code} is missing`);
      assert.match(state.path, /^M[\d.,LZM-]+Z$/);
      assert.ok(state.label[0] >= 0 && state.label[0] <= MAP_WIDTH);
      assert.ok(state.label[1] >= 0 && state.label[1] <= MAP_HEIGHT);
    }
  }
  for (const code of ryanWhiteConfig.locations) {
    const city = ALL_CITIES.find((item) => item.code === code);
    assert.ok(city, code);
    const [x, y] = projectGeography(city.coordinates);
    assert.ok(x >= 0 && x <= MAP_WIDTH && y >= 0 && y <= MAP_HEIGHT, city.name);
    const restored = projectGeography.invert([x, y]);
    assert.ok(
      restored.every(
        (value, i) => Math.abs(value - city.coordinates[i]) < 1e-9,
      ),
      city.name,
    );
  }
});
test('display simplification retains each source polygon and interior ring', async () => {
  const source = JSON.parse(
    await readFile(
      new URL('../public/us-states.json', import.meta.url),
      'utf8',
    ),
  );
  for (const state of geography) {
    const geometry = source.features.find(
      (feature) => feature.properties.NAME === state.name,
    ).geometry;
    const polygons =
      geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.coordinates;
    const rings = polygons.reduce(
      (total, polygon) => total + polygon.length,
      0,
    );
    assert.equal((state.path.match(/M/g) || []).length, rings, state.name);
    assert.equal((state.path.match(/Z/g) || []).length, rings, state.name);
  }
});
test('legacy map summaries retain percentage units without modifying the source', () => {
  const state = {
    metrics: {
      suppressionRate: { value: 73.7, year: 2024 },
      diagnosedPrevalence: { value: 14746, year: 2024 },
    },
  };
  const before = JSON.stringify(state);
  assert.deepEqual(
    getStatusMetrics(state).map(({ value, format }) => ({
      value,
      format,
    })),
    [
      { value: 73.7, format: 'percent' },
      { value: 14746, format: 'count' },
    ],
  );
  assert.equal(JSON.stringify(state), before);
});

test('prepared Albers coordinates agree with the independent D3 projection', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { geoConicEqualArea } = require(
    require.resolve('d3-geo', {
      paths: [require.resolve('react-simple-maps')],
    }),
  );
  const reference = geoConicEqualArea()
    .parallels([29.5, 45.5])
    .rotate([96, 0])
    .center([0, 38])
    .scale(1100)
    .translate([500, 310]);
  for (const city of ALL_CITIES) {
    const point = projectGeography(city.coordinates);
    const expected = reference(city.coordinates);
    point.forEach((value, i) =>
      assert.ok(Math.abs(value - expected[i]) < 1e-9, city.name),
    );
  }
  assert.ok(
    projectGeography([-122.33, 47.61])[1] <
      projectGeography([-118.24, 34.05])[1],
    'north must render above south',
  );
});

test('decorative context has the neighboring countries and all five Great Lakes', async () => {
  const context = JSON.parse(
    await readFile(
      new URL('../src/data/explorer-context.json', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(
    context
      .filter((item) => item.kind === 'lake')
      .map((item) => item.name)
      .sort(),
    [
      'Lake Erie',
      'Lake Huron',
      'Lake Michigan',
      'Lake Ontario',
      'Lake Superior',
    ],
  );
  for (const name of ['Canada', 'Mexico', 'Cuba', 'The Bahamas'])
    assert.ok(context.some((item) => item.name === name));
  for (const item of context) assert.match(item.path, /^M[\d.,LZM-]+Z$/);
});
