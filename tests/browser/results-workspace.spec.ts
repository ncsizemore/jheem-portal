import { expect, test, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  resultFixtures,
  routeResultArtifacts,
  resultBindings,
  stateResultArtifacts,
} from './result-data-fixtures';
import type { AggregatedLocationData } from '../../src/hooks/useCityData';

const base = 'https://d320iym4dtm9lj.cloudfront.net/ryan-white';
let baltimore: AggregatedLocationData;
let fixtures: Awaited<ReturnType<typeof resultFixtures>>;
test.beforeAll(async () => {
  fixtures = await resultFixtures();
  baltimore = fixtures.baltimore;
});
test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', (route) => route.abort());
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
  await routeResultArtifacts(page, base, fixtures.artifacts);
}
async function open(page: Page, query = '') {
  await setup(page);
  await page.goto(`/ryan-white/explorer?loc=C.12580${query}`);
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
  await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
    'aria-busy',
    'false',
  );
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
    await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    const descriptionId = await page
      .getByTestId('analysis-chart-region')
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
    page.getByRole('button', {
      name: 'Observed 2019: 68.3%. Source: cdc.hiv',
      exact: true,
    }),
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
  await page.getByLabel('Outcome', { exact: true }).selectOption('awareness');
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
  await page.route(
    `${base}/${resultBindings['ryan-white'].locations['C.12060'].path}`,
    (route) => {
      pending = route;
    },
  );
  await page
    .getByRole('button', { name: /Baltimore-Columbia-Towson, MD/ })
    .click();
  await page.getByRole('combobox', { name: 'Search cities' }).fill('Atlanta');
  await page.getByRole('combobox', { name: 'Search cities' }).press('Enter');
  await expect(
    page.getByText('Updating result…', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('displayed-result-context')).toContainText(
    'Baltimore',
  );
  await expect(page.getByLabel('Outcome', { exact: true })).toBeDisabled();
  await expect(page.locator('svg.recharts-surface')).toBeVisible();
  await page
    .getByRole('button', {
      name: /Atlanta-Sandy-Springs|Atlanta-Sandy Springs/,
    })
    .click();
  await page.getByRole('combobox', { name: 'Search cities' }).fill('Baltimore');
  await page.getByRole('combobox', { name: 'Search cities' }).press('Enter');
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
  await pending!
    .fulfill({ json: fixtures.cityManifests['C.12060'] })
    .catch(() => {});
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  const expected = baltimore.data.cessation.incidence['mean.and.interval'].none
    .sim!.find((point) => point.simset === 'Cessation' && point.year === 2030)!
    .value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  await expect(
    page
      .getByRole('row')
      .filter({
        has: page.getByRole('rowheader', { name: '2030', exact: true }),
      })
      .getByRole('cell')
      .first(),
  ).toHaveText(expected);
  await expect(
    page.getByRole('button', { name: /Baltimore-Columbia-Towson, MD/ }),
  ).toBeVisible();
});

test('mismatched data is rejected and an inline retry recovers', async ({
  page,
}) => {
  await setup(page);
  const manifestUrl = `${base}/${resultBindings['ryan-white'].locations['C.12580'].path}`;
  await page.route(manifestUrl, (route) =>
    route.fulfill({
      body: JSON.stringify(fixtures.cityManifests['C.12580']).replaceAll(
        'C.12580',
        'C.12060',
      ),
      contentType: 'application/json',
    }),
  );
  await page.goto('/ryan-white/explorer?loc=C.12580');
  await expect(
    page.getByTestId('analysis-view').getByRole('alert'),
  ).toContainText('do not match');
  await page.unroute(manifestUrl);
  await page.getByRole('button', { name: 'Retry loading result' }).click();
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
  await routeResultArtifacts(
    page,
    stateBase,
    await stateResultArtifacts('ryan-white-state-croi', 'MD'),
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

test('initial analysis downloads only its small index and selected plot', async ({
  page,
}) => {
  const received: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/results-v1/') && response.ok())
      received.push(response.url());
  });
  await open(page);
  const manifest = fixtures.cityManifests['C.12580'];
  const ref = manifest.data.cessation.incidence['mean.and.interval'].none;
  expect(new Set(received)).toEqual(
    new Set([
      `${base}/${resultBindings['ryan-white'].locations['C.12580'].path}`,
      `${base}/${ref.path}`,
    ]),
  );
  expect(
    resultBindings['ryan-white'].locations['C.12580'].bytes + ref.bytes,
  ).toBeLessThan(250_000);
  const count = received.length;
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(
    page.getByRole('table', { name: /modeled results/ }),
  ).toBeVisible();
  expect(received).toHaveLength(count);
  await page.getByLabel('Outcome', { exact: true }).selectOption('suppression');
  await expect(
    page.getByRole('table', { name: /Viral suppression/ }),
  ).toBeVisible();
  expect(received.at(-1)).toBe(
    `${base}/${manifest.data.cessation.suppression['mean.and.interval'].none.path}`,
  );
  expect(received).toHaveLength(count + 1);
});

test('a late plot cannot overwrite a newer selection and controls remain usable', async ({
  page,
}) => {
  await open(page);
  const ref =
    fixtures.cityManifests['C.12580'].data.cessation.suppression[
      'mean.and.interval'
    ].none;
  let pending: Route | undefined;
  await page.route(`${base}/${ref.path}`, (route) => {
    pending = route;
  });
  await page.getByLabel('Outcome', { exact: true }).selectOption('suppression');
  await expect(
    page.getByText('Updating result…', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'PNG', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Outcome', { exact: true }).selectOption('incidence');
  await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await pending!
    .fulfill({
      body: fixtures.artifacts.get(ref.path),
      contentType: 'application/json',
    })
    .catch(() => {});
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(
    page.getByRole('table', { name: /New HIV infections/ }),
  ).toBeVisible();
  await expect(
    page.getByText('Values in infections.', { exact: false }),
  ).toBeVisible();
});

test('revisiting fourteen outcomes neither fetches again nor flashes a loading state', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/results-v1/plots/'))
      requests.push(request.url());
  });
  await open(page);
  for (const outcome of baltimore.metadata.outcomes) {
    await page.getByLabel('Outcome', { exact: true }).selectOption(outcome);
    await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
      'aria-busy',
      'false',
    );
  }
  const before = requests.length;
  // Record even transitions that disappear before Playwright's next assertion.
  await page.evaluate(() => {
    const region = document.querySelector(
      '[data-testid="analysis-chart-region"]',
    )!;
    region.setAttribute('data-busy-transitions', '0');
    new MutationObserver((records) => {
      const transitions = records.filter(
        (record) => record.oldValue === 'false',
      ).length;
      if (transitions)
        region.setAttribute(
          'data-busy-transitions',
          String(
            Number(region.getAttribute('data-busy-transitions')) + transitions,
          ),
        );
    }).observe(region, {
      attributes: true,
      attributeFilter: ['aria-busy'],
      attributeOldValue: true,
    });
  });
  for (const outcome of baltimore.metadata.outcomes) {
    await page.getByLabel('Outcome', { exact: true }).selectOption(outcome);
    await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
      'aria-busy',
      'false',
    );
  }
  expect(requests).toHaveLength(before);
  await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
    'data-busy-transitions',
    '0',
  );
});

for (const { width, view } of [
  { width: 1280, view: 'chart' },
  { width: 375, view: 'chart' },
  { width: 375, view: 'table' },
]) {
  test(`an uncached selection retains the complete ${view} at ${width}px until replacement is ready`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    const region = page.getByTestId('analysis-chart-region');
    if (view === 'table') {
      await page.getByRole('button', { name: 'Table', exact: true }).click();
      await expect(region.getByRole('table')).toBeVisible();
    }
    const priorMarkup = await region.innerHTML();
    const priorContext = await page
      .getByTestId('displayed-result-context')
      .innerText();
    const readyHeight = await region.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    if (view === 'table') expect(readyHeight).toBeGreaterThan(1000);
    const ref =
      fixtures.cityManifests['C.12580'].data.cessation.suppression[
        'mean.and.interval'
      ].none;
    let pending: Route | undefined;
    await page.route(`${base}/${ref.path}`, (route) => {
      pending = route;
    });
    await page
      .getByLabel('Outcome', { exact: true })
      .selectOption('suppression');
    await expect(region).toHaveAttribute('aria-busy', 'true');
    expect(
      await region.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeGreaterThanOrEqual(readyHeight);
    expect(await region.innerHTML()).toBe(priorMarkup);
    await expect(page.getByTestId('displayed-result-context')).toHaveText(
      priorContext,
    );
    await expect(
      page.getByRole('heading', { name: 'New HIV infections', exact: true }),
    ).toBeAttached();
    await expect(
      page.getByText('Updating result…', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Copy link/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'PNG', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'CSV', exact: true }),
    ).toBeDisabled();
    await page.screenshot({
      path: testInfo.outputPath('continuous-update.png'),
    });
    await pending!.fulfill({
      body: fixtures.artifacts.get(ref.path),
      contentType: 'application/json',
    });
    await expect(region).toHaveAttribute('aria-busy', 'false');
    await expect(
      page.getByRole('heading', { name: 'Viral suppression', exact: true }),
    ).toBeAttached();
    await expect(region).toHaveAttribute(
      'aria-label',
      'Viral suppression results',
    );
    await expect(
      page.getByRole('button', {
        name: view === 'table' ? 'CSV' : 'PNG',
        exact: true,
      }),
    ).toBeEnabled();
    await page.screenshot({
      path: testInfo.outputPath('results-ready.png'),
    });
  });
}

test('a failed plot can be retried without reloading the index or losing selections', async ({
  page,
}) => {
  await setup(page);
  const ref =
    fixtures.cityManifests['C.12580'].data.cessation.suppression[
      'median.and.interval'
    ].none;
  let attempts = 0;
  await page.route(`${base}/${ref.path}`, (route) => {
    attempts++;
    return attempts === 1 ? route.fulfill({ status: 503 }) : route.fallback();
  });
  await page.goto(
    '/ryan-white/explorer?loc=C.12580&outcome=suppression&summary=median.and.interval',
  );
  await expect(
    page.getByTestId('analysis-view').getByRole('alert'),
  ).toContainText('could not be loaded');
  await expect(page.getByLabel('Outcome', { exact: true })).toHaveValue(
    'suppression',
  );
  await page
    .getByRole('button', { name: 'Retry loading result', exact: true })
    .click();
  await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await expect(
    page.getByRole('button', { name: 'PNG', exact: true }),
  ).toBeEnabled();
  await adjust(page);
  await expect(page.getByLabel('Summarize simulations')).toHaveValue(
    'median.and.interval',
  );
  expect(attempts).toBe(2);
});

for (const [model, routePath] of [
  ['ryan-white-state-ajph', '/ryan-white-state-level/explorer/ajph'],
  ['cdc-testing', '/cdc-testing/explorer'],
]) {
  test(`${model} loads its own verified index and default plot`, async ({
    page,
  }) => {
    const baseUrl = resultBindings[model].baseUrl;
    await page.route(`${baseUrl}/state-summaries.json`, (route) =>
      route.fulfill({
        json: { generated: '2026-03-02', states: { AL: summary('Alabama') } },
      }),
    );
    await routeResultArtifacts(
      page,
      baseUrl,
      await stateResultArtifacts(model, 'AL'),
    );
    await page.goto(`${routePath}?loc=AL`);
    await expect(
      page.getByRole('button', { name: 'PNG', exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel('Outcome', { exact: true })).toHaveValue(
      'incidence',
    );
    await page.getByRole('button', { name: 'Table', exact: true }).click();
    await expect(
      page.getByRole('table', { name: /New HIV infections/ }),
    ).toBeVisible();
  });
}

for (const [scenario, label] of [
  ['cessation', 'Cessation'],
  ['brief_interruption', 'Brief Interruption'],
  ['prolonged_interruption', 'Prolonged Interruption'],
]) {
  test(`study overview opens the chosen area and ${scenario} even when map summaries fail`, async ({
    page,
  }, testInfo) => {
    await setup(page);
    await page.route(`${base}/city-summaries.json`, (route) =>
      route.fulfill({ status: 503, body: 'Unavailable' }),
    );
    await page.goto('/ryan-white');
    if (scenario === 'cessation')
      await page.screenshot({
        path: testInfo.outputPath('study-overview-desktop.png'),
        fullPage: true,
      });
    await page
      .getByLabel('Metropolitan area', { exact: true })
      .selectOption('C.12580');
    await page
      .getByLabel('Service interruption', { exact: true })
      .selectOption(scenario);
    await page
      .getByRole('button', { name: 'View results', exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`loc=C.12580&scenario=${scenario}`),
    );
    await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(
      page.getByRole('button', { name: label, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Baltimore',
    );
    await page
      .getByRole('link', { name: 'Study overview', exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'What happens if Ryan White services stop?',
    );
  });
}

test('study overview supports narrow-screen selection, coverage and return navigation', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await setup(page);
  await page.goto('/ryan-white');
  await expect(
    page
      .getByRole('navigation', { name: 'Ryan White navigation' })
      .getByRole('link', { name: 'Study overview' }),
  ).toHaveAttribute('aria-current', 'page');
  await page.screenshot({
    path: testInfo.outputPath('study-overview-mobile.png'),
    fullPage: true,
  });
  expect(
    await page
      .getByRole('navigation', { name: 'Ryan White navigation' })
      .evaluate(
        (nav) =>
          nav.firstElementChild!.scrollWidth <=
          nav.firstElementChild!.clientWidth,
      ),
  ).toBe(true);
  await page.getByRole('button', { name: 'View results', exact: true }).click();
  await expect(page).toHaveURL(/\/ryan-white$/);
  await expect(
    page.getByLabel('Metropolitan area', { exact: true }),
  ).toBeFocused();
  await page.getByRole('link', { name: 'Area not listed?' }).click();
  await expect(
    page.getByRole('link', {
      name: 'Explore state-level studies',
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByText('View all 31 metropolitan areas', { exact: true })
    .click();
  await expect(page.locator('#coverage li')).toHaveCount(31);
  await page
    .getByRole('link', { name: 'Baltimore-Columbia-Towson, MD', exact: true })
    .click();
  await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  const nav = page.getByRole('navigation', { name: 'Ryan White navigation' });
  await expect(nav.getByRole('link', { name: 'Study overview' })).toBeVisible();
  await expect(
    nav.getByRole('link', { name: 'Explore results' }),
  ).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Study overview' }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('a failed replacement preserves its complete previous result through retry', async ({
  page,
}) => {
  await open(page);
  const region = page.getByTestId('analysis-chart-region');
  const previous = await region.innerHTML();
  const ref =
    fixtures.cityManifests['C.12580'].data.cessation.suppression[
      'mean.and.interval'
    ].none;
  let attempts = 0;
  await page.route(`${base}/${ref.path}`, (route) =>
    ++attempts === 1 ? route.fulfill({ status: 503 }) : route.fallback(),
  );
  await page.getByLabel('Outcome', { exact: true }).selectOption('suppression');
  await expect(
    page.getByTestId('analysis-view').getByRole('alert'),
  ).toContainText('could not be loaded');
  expect(await region.innerHTML()).toBe(previous);
  await expect(region).toHaveAttribute(
    'aria-label',
    'New HIV infections results',
  );
  await expect(
    page.getByRole('button', { name: 'CSV', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Retry loading result' }).click();
  await expect(region).toHaveAttribute(
    'aria-label',
    'Viral suppression results',
  );
  await expect(
    page.getByRole('button', { name: 'PNG', exact: true }),
  ).toBeEnabled();
  expect(attempts).toBe(2);
});

test('default plot and index load concurrently without exposing an unverified plot', async ({
  page,
}) => {
  await setup(page);
  let pendingIndex: Route | undefined;
  const manifestRef = resultBindings['ryan-white'].locations['C.12580'];
  const plotRef =
    fixtures.cityManifests['C.12580'].data.cessation.incidence[
      'mean.and.interval'
    ].none;
  const loaded: string[] = [];
  page.on('response', (response) => loaded.push(response.url()));
  await page.route(`${base}/${manifestRef.path}`, (route) => {
    pendingIndex = route;
  });
  await page.goto('/ryan-white/explorer?loc=C.12580');
  await expect
    .poll(() => loaded.includes(`${base}/${plotRef.path}`))
    .toBe(true);
  await expect(page.locator('svg.recharts-surface')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'PNG', exact: true }),
  ).toBeDisabled();
  await pendingIndex!.fulfill({
    body: fixtures.artifacts.get(manifestRef.path),
    contentType: 'application/json',
  });
  await expect(page.locator('svg.recharts-surface')).toBeVisible();
  expect(
    loaded.filter((url) => url === `${base}/${plotRef.path}`),
  ).toHaveLength(1);
});

for (const [model, routePath, location] of [
  ['ryan-white', '/ryan-white/explorer', 'C.12580'],
  ['ryan-white-state-ajph', '/ryan-white-state-level/explorer/ajph', 'AL'],
  ['ryan-white-state-croi', '/ryan-white-state-level/explorer/croi', 'MD'],
  ['cdc-testing', '/cdc-testing/explorer', 'AL'],
]) {
  test(`${model} direct results never request map data`, async ({ page }) => {
    const unwanted: string[] = [];
    await page.route('https://**/*', (route) => route.abort());
    await page.route(/summaries\.json|us-states\.json|mapbox/, (route) => {
      unwanted.push(route.request().url());
      return route.abort();
    });
    const artifacts =
      model === 'ryan-white'
        ? fixtures.artifacts
        : await stateResultArtifacts(model, location);
    await routeResultArtifacts(page, resultBindings[model].baseUrl, artifacts);
    await page.goto(`${routePath}?loc=${location}`);
    await expect(
      page.getByRole('button', { name: 'PNG', exact: true }),
    ).toBeEnabled();
    await expect(page.locator('svg.recharts-surface')).toBeVisible();
    expect(unwanted).toEqual([]);
  });
}

test('a nondefault direct result fetches no speculative default plot', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/results-v1/plots/'))
      requested.push(request.url());
  });
  await open(page, '&outcome=suppression');
  expect(requested).toEqual([
    `${base}/${fixtures.cityManifests['C.12580'].data.cessation.suppression['mean.and.interval'].none.path}`,
  ]);
});

test('map navigation and browser history still work after a direct result', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page).not.toHaveURL(/loc=/);
  await expect(
    page
      .locator('select')
      .filter({ has: page.locator('option[value="C.12580"]') }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await expect(page.getByTestId('displayed-result-context')).toContainText(
    'Baltimore',
  );
});

test('scenario changes retain their own labels, timeline, and table until ready', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  const region = page.getByTestId('analysis-chart-region');
  const previous = await region.innerHTML();
  const ref =
    fixtures.cityManifests['C.12580'].data.brief_interruption.incidence[
      'mean.and.interval'
    ].none;
  let pending: Route | undefined;
  await page.route(`${base}/${ref.path}`, (route) => {
    pending = route;
  });
  await page
    .getByRole('button', { name: 'Brief Interruption', exact: true })
    .click();
  await expect(region).toHaveAttribute('aria-busy', 'true');
  expect(await region.innerHTML()).toBe(previous);
  await expect(page.getByTestId('displayed-result-context')).toContainText(
    'Cessation',
  );
  await expect(page.getByTestId('displayed-result-context')).not.toContainText(
    'Brief Interruption',
  );
  await pending!.fulfill({
    body: fixtures.artifacts.get(ref.path),
    contentType: 'application/json',
  });
  await expect(region).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByTestId('displayed-result-context')).toContainText(
    'Brief Interruption',
  );
  await expect(
    region.getByRole('columnheader', { name: /Brief Interruption/ }).first(),
  ).toBeVisible();
});

test('a failed location index keeps the old figure, then retries the requested location', async ({
  page,
}) => {
  await open(page);
  const ref = resultBindings['ryan-white'].locations['C.12060'];
  let attempts = 0;
  await page.route(`${base}/${ref.path}`, (route) =>
    ++attempts === 1 ? route.fulfill({ status: 503 }) : route.fallback(),
  );
  await page
    .getByRole('button', { name: /Baltimore-Columbia-Towson, MD/ })
    .click();
  await page.getByRole('combobox', { name: 'Search cities' }).fill('Atlanta');
  await page.getByRole('combobox', { name: 'Search cities' }).press('Enter');
  await expect(
    page.getByTestId('analysis-view').getByRole('alert'),
  ).toContainText('could not be loaded');
  await expect(page.getByTestId('displayed-result-context')).toContainText(
    'Baltimore',
  );
  await expect(page.locator('svg.recharts-surface')).toBeVisible();
  await expect(page.getByLabel('Outcome', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry loading result' }).click();
  await expect(page.getByTestId('displayed-result-context')).toContainText(
    'Atlanta',
  );
  await expect(page.getByLabel('Outcome', { exact: true })).toBeEnabled();
  expect(attempts).toBe(2);
});

for (const stateMap of [false, true]) {
  test(`${stateMap ? 'state' : 'city'} map keeps its controls and layout across result navigation`, async ({
    page,
  }) => {
    let summaries = 0;
    let boundaries = 0;
    page.on('request', (request) => {
      if (request.url().includes('-summaries.json')) summaries++;
      if (request.url().endsWith('/us-states.json')) boundaries++;
    });
    if (stateMap) {
      const model = 'ryan-white-state-ajph';
      const stateBase = resultBindings[model].baseUrl;
      await routeResultArtifacts(
        page,
        stateBase,
        await stateResultArtifacts(model, 'AL'),
      );
      await page.route(`${stateBase}/state-summaries.json`, (route) =>
        route.fulfill({
          json: { generated: '2026-03-02', states: { AL: summary('Alabama') } },
        }),
      );
      await page.goto('/ryan-white-state-level/explorer/ajph?loc=AL');
      await expect(
        page.getByRole('button', { name: 'PNG', exact: true }),
      ).toBeEnabled();
    } else await open(page);
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    const instructions = page.locator(
      `button[aria-controls="${stateMap ? 'state' : 'city'}-explorer-instructions"]`,
    );
    await expect(instructions).toHaveAttribute('aria-expanded', 'true');
    // React Strict Mode can start/abort an extra mount request in dev.
    // Returning to the existing map must add none.
    const initialSummaries = summaries;
    const initialBoundaries = boundaries;
    expect(initialSummaries).toBeGreaterThan(0);
    if (stateMap) expect(initialBoundaries).toBeGreaterThan(0);
    await instructions.click();
    const location = stateMap ? 'AL' : 'C.12580';
    await page
      .locator('select')
      .filter({ has: page.locator(`option[value="${location}"]`) })
      .selectOption(location);
    await expect(
      page.getByRole('button', { name: 'PNG', exact: true }),
    ).toBeEnabled();
    await page.setViewportSize({ width: 920, height: 800 });
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await expect(instructions).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible();
    const canvas = await page.locator('.mapboxgl-canvas').boundingBox();
    expect(canvas?.width).toBeGreaterThanOrEqual(900);
    expect(canvas?.height).toBeGreaterThan(400);
    expect(summaries).toBe(initialSummaries);
    expect(boundaries).toBe(initialBoundaries);
  });
}

test('whole-population plot changes keep a chart present on every animation frame', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('svg.recharts-surface')).toBeVisible();
  await page.evaluate(() => {
    const frames: boolean[] = [];
    Object.assign(window, { resultFrames: frames });
    const sample = () => {
      frames.push(
        Boolean(
          document.querySelector(
            '[data-testid="analysis-chart-region"] svg.recharts-surface .recharts-line-curve',
          ),
        ),
      );
      if (frames.length < 45) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByLabel('Outcome', { exact: true }).selectOption('suppression');
  await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
    'aria-label',
    'Viral suppression results',
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { resultFrames: boolean[] }).resultFrames
            .length,
      ),
    )
    .toBe(45);
  expect(
    await page.evaluate(() =>
      (window as unknown as { resultFrames: boolean[] }).resultFrames.every(
        Boolean,
      ),
    ),
  ).toBe(true);
});
