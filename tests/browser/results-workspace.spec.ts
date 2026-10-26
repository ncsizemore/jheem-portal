import { expect, test, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { AggregatedLocationData } from '../../src/hooks/useCityData';

const base = 'https://d320iym4dtm9lj.cloudfront.net/ryan-white';
let baltimore: AggregatedLocationData;
test.beforeAll(async () => {
  baltimore = JSON.parse(
    await readFile('tests/fixtures/baltimore-results.json', 'utf8'),
  );
});
const summary = (name: string) => ({
  name,
  shortName: name.split(',')[0],
  coordinates: [-76.61, 39.29],
  metrics: {
    diagnosedPrevalence: {
      value: 10000,
      year: 2025,
      label: 'Diagnosed prevalence',
    },
    suppressionRate: { value: 78, year: 2025, label: 'Suppression' },
    incidenceBaseline: { value: 100, year: 2030, label: 'Baseline incidence' },
    incidenceCessation: {
      value: 200,
      year: 2030,
      label: 'Cessation incidence',
    },
  },
  impact: {
    cessationIncreasePercent: 100,
    cessationIncreaseAbsolute: 100,
    targetYear: 2030,
    headline: '100% higher incidence',
  },
});
function dataFor(code: string) {
  // Second location is a test-only clone with a distinct value sentinel.
  const data = structuredClone(baltimore);
  data.metadata.city = code;
  if (code !== 'C.12580')
    data.data.cessation.incidence['mean.and.interval'].none.sim!.forEach(
      (point) => {
        point.value = 99999;
      },
    );
  return data;
}
async function setup(page: Page) {
  await page.route(`${base}/city-summaries.json`, (route) =>
    route.fulfill({
      json: {
        generated: '2026-03-02',
        cities: {
          'C.12580': summary('Baltimore-Columbia-Towson, MD'),
          'C.12060': summary('Atlanta-Sandy Springs-Alpharetta, GA'),
        },
      },
    }),
  );
  await page.route(`${base}/C.*.json`, (route) =>
    route.fulfill({
      json: dataFor(
        route.request().url().split('/').pop()!.replace('.json', ''),
      ),
    }),
  );
}
async function open(page: Page, query = '') {
  await setup(page);
  await page.goto(`/ryan-white/explorer?loc=C.12580${query}`);
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
}
async function adjust(page: Page) {
  await page.getByText('Adjust analysis', { exact: false }).click();
}

test('all fourteen outcomes have specific explanations and correctly labeled units', async ({
  page,
}) => {
  await open(page);
  const texts = new Set<string>();
  for (const outcome of baltimore.metadata.outcomes) {
    await page.getByLabel('Outcome', { exact: true }).selectOption(outcome);
    const descriptionId = await page
      .getByLabel('Outcome', { exact: true })
      .getAttribute('aria-describedby');
    const text = await page.locator(`[id="${descriptionId}"]`).innerText();
    expect(text.length).toBeGreaterThan(35);
    expect(text).not.toContain('Model estimates for the selected outcome');
    texts.add(text);
  }
  expect(texts.size).toBe(14);
  await page.getByLabel('Outcome', { exact: true }).selectOption('suppression');
  await expect(
    page.getByText(
      'The percentage of people with diagnosed HIV whose virus is suppressed by treatment.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Observed 2019: 68.3%. Source: cdc.hiv', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(
    page.getByRole('table', { name: /Viral suppression/ }),
  ).toBeVisible();
  await expect(page.getByText('Values in %.', { exact: false })).toBeVisible();
});

test('combined breakdowns, summary changes, direct links and history preserve the analysis', async ({
  page,
}) => {
  await open(page);
  await adjust(page);
  await page.getByLabel('Population breakdown').selectOption('sex+risk');
  await expect(page.locator('[data-export-panel]')).toHaveCount(6);
  await page
    .getByLabel('Summarize simulations')
    .selectOption('median.and.interval');
  await expect(page.getByLabel('Population breakdown')).toHaveValue('sex+risk');
  await page
    .getByRole('button', { name: 'Brief Interruption', exact: true })
    .click();
  await expect(page.getByLabel('Population breakdown')).toHaveValue('sex+risk');
  const url = page.url();
  await page.reload();
  await adjust(page);
  await expect(page.getByLabel('Summarize simulations')).toHaveValue(
    'median.and.interval',
  );
  await expect(page.getByLabel('Population breakdown')).toHaveValue('sex+risk');
  await page.getByLabel('Outcome', { exact: true }).selectOption('suppression');
  await expect(
    page.getByRole('status').filter({ hasText: 'breakdown is unavailable' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(url);
  await expect(page.getByLabel('Outcome', { exact: true })).toHaveValue(
    'incidence',
  );
  await expect(page.getByLabel('Population breakdown')).toHaveValue('sex+risk');
});

test('facets share a scale, use short headings, and paginate without rendering every panel', async ({
  page,
}) => {
  await open(page, '&breakdown=age%2Brace');
  await expect(page.locator('[data-export-panel]')).toHaveCount(6);
  const axes = await page
    .locator(
      '[data-export-panel] .recharts-yAxis .recharts-cartesian-axis-tick-value',
    )
    .allTextContents();
  const groups = await page
    .locator('[data-export-panel] .recharts-yAxis')
    .allTextContents();
  expect(axes.length).toBeGreaterThan(5);
  expect(new Set(groups).size).toBe(1);
  const firstTitle = await page
    .locator('[data-export-panel] h3')
    .first()
    .innerText();
  expect(firstTitle).not.toContain('Baltimore');
  expect(firstTitle).not.toContain('black');
  await page.getByRole('button', { name: 'Next groups' }).click();
  expect(
    await page.locator('[data-export-panel] h3').first().innerText(),
  ).not.toBe(firstTitle);
  await page.getByRole('checkbox', { name: 'Separate scales' }).check();
  const separate = await page
    .locator('[data-export-panel] .recharts-yAxis')
    .allTextContents();
  expect(new Set(separate).size).toBeGreaterThan(1);
});

test('PNG is an actual image and CSV retains values, units, release and observed sources', async ({
  page,
}) => {
  await open(page, '&outcome=suppression');
  const pngWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  const png = await pngWait;
  const image = await readFile((await png.path())!);
  expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(image.readUInt32BE(16)).toBe(2000);
  expect(image.readUInt32BE(20)).toBeGreaterThan(700);
  expect(image.length).toBeGreaterThan(20000);
  const csvWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  const csv = await readFile((await (await csvWait).path())!, 'utf8');
  expect(csv).toContain('# Units: %');
  expect(csv).toContain('# Results generated:');
  expect(csv).toContain('Observed');
  expect(csv).toContain('Source URL');
  const point = baltimore.data.cessation.suppression[
    'mean.and.interval'
  ].none.sim!.find(
    (point) => point.simset === 'Cessation' && point.year === 2030,
  )!;
  expect(csv).toContain(
    `2030,Cessation,,${point.value},${point['value.lower']},${point['value.upper']},%`,
  );
  await page.getByText('Observed data and sources', { exact: false }).click();
  await expect(
    page.getByRole('table', { name: /Observed values and sources/ }),
  ).toBeVisible();
});

test('mobile layout and location search work by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole('button', { name: /Baltimore-Columbia-Towson, MD/ })
    .click();
  const search = page.getByRole('combobox', { name: 'Search cities' });
  await search.fill('Atlanta');
  await search.press('Enter');
  await expect(
    page.getByRole('button', { name: /Atlanta-Sandy Springs-Alpharetta, GA/ }),
  ).toBeFocused();
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Display', exact: true }).click();
  await page
    .getByRole('checkbox', { name: '95% uncertainty interval' })
    .press('Escape');
  await expect(
    page.getByRole('button', { name: 'Display', exact: true }),
  ).toBeFocused();
});

test('a slow old location cannot replace a newer cached result', async ({
  page,
}) => {
  await open(page);
  let pending: Route | undefined;
  await page.route(`${base}/C.12060.json`, (route) => {
    pending = route;
  });
  await page
    .getByRole('button', { name: /Baltimore-Columbia-Towson, MD/ })
    .click();
  await page.getByRole('combobox', { name: 'Search cities' }).fill('Atlanta');
  await page.getByRole('combobox', { name: 'Search cities' }).press('Enter');
  await expect(page.getByText(/Loading results for Atlanta/)).toBeVisible();
  await page
    .getByRole('button', {
      name: /Atlanta-Sandy-Springs|Atlanta-Sandy Springs/,
    })
    .click();
  await page.getByRole('combobox', { name: 'Search cities' }).fill('Baltimore');
  await page.getByRole('combobox', { name: 'Search cities' }).press('Enter');
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
  await pending!.fulfill({ json: dataFor('C.12060') }).catch(() => {});
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(
    page.getByRole('table', { name: /modeled results/ }),
  ).not.toContainText('99,999');
  await expect(
    page.getByRole('button', { name: /Baltimore-Columbia-Towson, MD/ }),
  ).toBeVisible();
});

test('mismatched data is rejected and an inline retry recovers', async ({
  page,
}) => {
  await setup(page);
  await page.route(`${base}/C.12580.json`, (route) =>
    route.fulfill({ json: dataFor('C.12060') }),
  );
  await page.goto('/ryan-white/explorer?loc=C.12580');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Failed to load data' }),
  ).toContainText('do not match');
  await page.unroute(`${base}/C.12580.json`);
  await page.getByRole('button', { name: 'Retry loading results' }).click();
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
});

test('state results restore their scenario timeline and selections', async ({
  page,
}) => {
  const stateBase =
    'https://d320iym4dtm9lj.cloudfront.net/ryan-white-state-croi';
  await page.route(`${stateBase}/state-summaries.json`, (route) =>
    route.fulfill({
      json: { generated: '2026-03-02', states: { MD: summary('Maryland') } },
    }),
  );
  await page.route(`${stateBase}/MD.json`, (route) =>
    route.fulfill({ json: dataFor('MD') }),
  );
  await page.goto(
    '/ryan-white-state-level/explorer/croi?loc=MD&outcome=suppression&summary=median.and.interval',
  );
  await expect(page.getByLabel('Outcome', { exact: true })).toHaveValue(
    'suppression',
  );
  await expect(page.getByText(/Services stop in July 2026/)).toBeVisible();
  await adjust(page);
  await expect(page.getByLabel('Summarize simulations')).toHaveValue(
    'median.and.interval',
  );
});

test('cached custom results use the shared definitions without launching compute', async ({
  page,
}) => {
  const actions: string[] = [];
  await page.route('**/api/custom-sim', (route) => {
    actions.push(route.request().postDataJSON().action);
    return route.fulfill({
      json: {
        status: 'cached',
        scenarioKey: 'test-cached',
        dataUrl: `${base}/test-cached.json`,
      },
    });
  });
  const data = structuredClone(baltimore);
  data.data = { custom: data.data.cessation };
  data.metadata.scenarios = ['custom'];
  await page.route(`${base}/test-cached.json`, (route) =>
    route.fulfill({ json: data }),
  );
  await page.goto(
    '/ryan-white/custom?loc=C.12580&outcome=suppression&summary=median.and.interval',
  );
  await expect(page.getByLabel('Outcome', { exact: true })).toHaveValue(
    'suppression',
  );
  await expect(
    page.getByRole('heading', { name: 'Viral suppression', exact: true }),
  ).toBeVisible();
  expect(actions).toEqual(['lookup']);
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(
    page.getByRole('table', { name: /Viral suppression/ }),
  ).toBeVisible();
});
