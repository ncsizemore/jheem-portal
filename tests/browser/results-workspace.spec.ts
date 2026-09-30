import { expect, test, type Page } from '@playwright/test';

const citySummaries = {
  generated: '2026-09-30T00:00:00Z',
  cities: {
    'C.12060': {
      name: 'Atlanta-Sandy Springs-Alpharetta, GA',
      shortName: 'Atlanta',
      coordinates: [-84.39, 33.75],
      metrics: {
        diagnosedPrevalence: { value: 40_000, year: 2025, label: 'Diagnosed prevalence' },
        suppressionRate: { value: 78, year: 2025, label: 'Suppression' },
        incidenceBaseline: { value: 2_000, year: 2030, label: 'Baseline incidence' },
        incidenceCessation: { value: 2_400, year: 2030, label: 'Cessation incidence' },
      },
      impact: {
        cessationIncreasePercent: 20,
        cessationIncreaseAbsolute: 400,
        targetYear: 2030,
        headline: '20% higher incidence',
      },
    },
  },
};

function plotData(scenario: string) {
  const displayScenario = scenario === 'cessation'
    ? 'Cessation'
    : scenario === 'brief_interruption'
      ? 'Brief Interruption'
      : 'Prolonged Interruption';
  const sim = [2024, 2025, 2026, 2027].flatMap((year, index) => [
    {
      year,
      value: 1_000 + index * 25,
      simset: 'Baseline',
      outcome: 'incidence',
      'outcome.display.name': 'Incidence',
      'value.lower': 900 + index * 25,
      'value.upper': 1_100 + index * 25,
    },
    {
      year,
      value: 1_000 + index * 100,
      simset: displayScenario,
      outcome: 'incidence',
      'outcome.display.name': 'Incidence',
      'value.lower': 900 + index * 90,
      'value.upper': 1_100 + index * 110,
    },
  ]);

  return {
    sim,
    obs: {},
    metadata: {
      city: 'C.12060',
      scenario,
      outcome: 'incidence',
      statistic: 'mean.and.interval',
      facet: 'none',
      y_label: 'infections',
      plot_title: 'Incidence',
      has_baseline: true,
      generation_time: '2026-09-30T00:00:00Z',
      outcome_metadata: {
        display_name: 'Incidence',
        units: 'infections',
        display_as_percent: false,
      },
    },
  };
}

const scenarioIds = ['cessation', 'brief_interruption', 'prolonged_interruption'];
const locationData = {
  metadata: {
    city: 'C.12060',
    city_label: 'Atlanta-Sandy Springs-Alpharetta, GA',
    scenarios: scenarioIds,
    outcomes: ['incidence'],
    statistics: ['mean.and.interval'],
    facets: ['none'],
    generation_time: '2026-09-30T00:00:00Z',
    file_count: scenarioIds.length,
  },
  data: Object.fromEntries(scenarioIds.map(scenario => [
    scenario,
    { incidence: { 'mean.and.interval': { none: plotData(scenario) } } },
  ])),
};

async function deliverExplorerData(page: Page) {
  await page.route('https://d320iym4dtm9lj.cloudfront.net/ryan-white/city-summaries.json', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(citySummaries),
    }),
  );
  await page.route('https://d320iym4dtm9lj.cloudfront.net/ryan-white/C.12060.json', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(locationData),
    }),
  );
}

test('results use direct exploration controls and a scrollable narrow-screen workspace', async ({ page }) => {
  await deliverExplorerData(page);
  await page.goto('/ryan-white/explorer');
  await page.getByLabel('Choose a city', { exact: true }).selectOption({
    label: 'Atlanta-Sandy Springs-Alpharetta, GA',
  });

  await expect(
    page.getByRole('heading', { name: 'Incidence — Atlanta-Sandy Springs-Alpharetta, GA — Cessation' }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('region', { name: 'Scenario' })).toBeVisible();
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Summary statistic', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Break down by' })).toBeVisible();
  await expect(page.getByText('View and export', { exact: true })).toBeVisible();

  for (const oldLabel of ['1 Location', '2 Scenario', '3 Outcome', '4 Stratification']) {
    await expect(page.getByText(oldLabel, { exact: true })).toHaveCount(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const workspace = page.getByTestId('analysis-view');
  const metrics = await workspace.evaluate(element => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));

  expect(metrics.overflowY).toBe('auto');
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  await expect(page.getByTestId('analysis-chart-region')).toHaveCSS('min-height', '544px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
