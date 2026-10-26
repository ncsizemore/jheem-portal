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
  await expect(page.getByText(/Loading results for Atlanta/)).toBeVisible();
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
    page.getByRole('alert').filter({ hasText: 'Failed to load data' }),
  ).toContainText('do not match');
  await page.unroute(manifestUrl);
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
  await expect(page.getByText('Loading selected result…')).toBeVisible();
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
    page.getByTestId('analysis-chart-region').getByRole('alert'),
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
  ["cessation", "Cessation"],
  ["brief_interruption", "Brief Interruption"],
  ["prolonged_interruption", "Prolonged Interruption"],
]) {
  test(`study overview opens the chosen area and ${scenario} even when map summaries fail`, async ({
    page,
  }, testInfo) => {
    await setup(page);
    await page.route(`${base}/city-summaries.json`, (route) =>
      route.fulfill({ status: 503, body: "Unavailable" }),
    );
    await page.goto("/ryan-white");
    if (scenario === "cessation")
      await page.screenshot({
        path: testInfo.outputPath("study-overview-desktop.png"),
        fullPage: true,
      });
    await page
      .getByLabel("Metropolitan area", { exact: true })
      .selectOption("C.12580");
    await page
      .getByLabel("Service interruption", { exact: true })
      .selectOption(scenario);
    await page
      .getByRole("button", { name: "View results", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`loc=C.12580&scenario=${scenario}`),
    );
    await expect(page.getByTestId("analysis-chart-region")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Baltimore",
    );
    await page
      .getByRole("link", { name: "Study overview", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "What happens if Ryan White services stop?",
    );
  });
}

test("study overview supports narrow-screen selection, coverage and return navigation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await setup(page);
  await page.goto("/ryan-white");
  await expect(
    page
      .getByRole("navigation", { name: "Ryan White navigation" })
      .getByRole("link", { name: "Study overview" }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: testInfo.outputPath("study-overview-mobile.png"),
    fullPage: true,
  });
  expect(
    await page
      .getByRole("navigation", { name: "Ryan White navigation" })
      .evaluate(
        (nav) =>
          nav.firstElementChild!.scrollWidth <=
          nav.firstElementChild!.clientWidth,
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "View results", exact: true }).click();
  await expect(page).toHaveURL(/\/ryan-white$/);
  await expect(
    page.getByLabel("Metropolitan area", { exact: true }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Area not listed?" }).click();
  await expect(
    page.getByRole("link", {
      name: "Explore state-level studies",
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByText("View all 31 metropolitan areas", { exact: true })
    .click();
  await expect(page.locator("#coverage li")).toHaveCount(31);
  await page
    .getByRole("link", { name: "Baltimore-Columbia-Towson, MD", exact: true })
    .click();
  await expect(page.getByTestId("analysis-chart-region")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const nav = page.getByRole("navigation", { name: "Ryan White navigation" });
  await expect(nav.getByRole("link", { name: "Study overview" })).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Explore results" }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Study overview" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
