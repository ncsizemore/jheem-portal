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

function plotData(scenario: string, statistic = 'mean.and.interval') {
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
      statistic,
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
    statistics: ['mean.and.interval', 'median.and.interval'],
    facets: ['none'],
    generation_time: '2026-09-30T00:00:00Z',
    file_count: scenarioIds.length,
  },
  data: Object.fromEntries(scenarioIds.map(scenario => [
    scenario,
    { incidence: {
      'mean.and.interval': { none: plotData(scenario) },
      'median.and.interval': { none: plotData(scenario, 'median.and.interval') },
    } },
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

test('results use compact controls and one scrollable workspace', async ({ page }) => {
  await deliverExplorerData(page);
  await page.goto('/ryan-white/explorer');
  await page.getByLabel('Choose a city', { exact: true }).selectOption({
    label: 'Atlanta-Sandy Springs-Alpharetta, GA',
  });

  await expect(
    page.getByRole('heading', { name: 'New HIV infections — Atlanta-Sandy Springs-Alpharetta, GA — Cessation' }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('region', { name: 'Scenario' })).toBeVisible();
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Summarize simulations', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Break down by' })).toBeVisible();
  await expect(page.getByText('View and export', { exact: true })).toBeVisible();

  for (const oldLabel of ['1 Location', '2 Scenario', '3 Outcome', '4 Stratification']) {
    await expect(page.getByText(oldLabel, { exact: true })).toHaveCount(0);
  }

  const workspace = page.getByTestId('analysis-view');
  const chartRegion = page.getByTestId('analysis-chart-region');
  const desktopMetrics = await workspace.evaluate(element => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));

  expect(desktopMetrics.overflowY).toBe('auto');
  expect(desktopMetrics.scrollHeight).toBeGreaterThan(desktopMetrics.clientHeight);
  await expect(chartRegion).toHaveCSS('overflow-y', 'visible');

  await chartRegion.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => workspace.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await chartRegion.evaluate(element => element.scrollTop)).toBe(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await workspace.evaluate(element => element.scrollTop = 0);
  const metrics = await workspace.evaluate(element => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));

  expect(metrics.overflowY).toBe('auto');
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  await expect(chartRegion).toHaveCSS('min-height', '544px');
  await expect(chartRegion).toHaveCSS('overflow-y', 'visible');
  const actionRowTops = await Promise.all([
    page.getByRole('button', { name: 'Chart', exact: true }).evaluate(element => element.getBoundingClientRect().top),
    page.getByRole('button', { name: 'Display', exact: true }).evaluate(element => element.getBoundingClientRect().top),
  ]);
  expect(Math.abs(actionRowTops[0] - actionRowTops[1])).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});


test('chart explanations and accessible legend follow the displayed results', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await deliverExplorerData(page);
  await page.goto('/ryan-white/explorer');
  await page.getByLabel('Choose a city', { exact: true }).selectOption('C.12060');

  const summary = page.getByLabel('Summarize simulations', { exact: true });
  await expect(summary).toHaveValue('mean.and.interval');
  await expect(page.getByText('Shaded bands show the middle 95%', { exact: false })).toBeVisible();
  const legend = page.getByRole('list', { name: 'Chart legend' });
  await expect(legend.getByText('Cessation', { exact: true })).toBeVisible();
  await expect(legend.getByText('Baseline', { exact: true })).toBeVisible();
  await expect(legend.getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /legend icon/ })).toHaveCount(0);

  await summary.selectOption('median.and.interval');
  await expect(page.getByText('Lines show the median (middle estimate)', { exact: false })).toBeVisible();
  await expect(page.getByText('Lines show the average (mean)', { exact: false })).toHaveCount(0);

  // Operate the disclosure by keyboard and return focus when it closes.
  const display = page.getByRole('button', { name: 'Display', exact: true });
  await display.press('Enter');
  await display.press('Tab');
  const interval = page.getByRole('checkbox', { name: '95% uncertainty interval' });
  await expect(interval).toBeFocused();
  await interval.press('Space');
  await page.getByRole('checkbox', { name: 'Baseline', exact: true }).uncheck();
  await interval.press('Escape');
  await expect(display).toBeFocused();
  await expect(display).toHaveAttribute('aria-expanded', 'false');
  await expect(legend.getByText('Baseline', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Shaded bands show', { exact: false })).toHaveCount(0);

  // The panel stays within a narrow viewport even when actions wrap to two rows.
  await page.setViewportSize({ width: 354, height: 844 });
  await display.click();
  const panel = page.getByRole('group', { name: 'Chart display options' });
  const panelBounds = await panel.boundingBox();
  expect(panelBounds).not.toBeNull();
  expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
  expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(354);
  await interval.press('Escape');
  // Explicit dark text must remain on the white controls under dark OS appearance.
  for (const label of ['Outcome', 'Summarize simulations']) {
    const colors = await page.getByLabel(label, { exact: true }).evaluate(element => {
      const style = getComputedStyle(element);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      context.fillStyle = style.color;
      context.fillRect(0, 0, 1, 1);
      return { rgb: Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3), background: style.backgroundColor };
    });
    const channels = colors.rgb.map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    expect(colors.background).toBe('rgb(255, 255, 255)');
    expect(1.05 / (luminance + 0.05)).toBeGreaterThanOrEqual(4.5);
  }

  // Chart display choices must not discard the underlying table values/bounds.
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(5);
  await expect(table.getByRole('row').nth(1)).toHaveText('20241,000900 – 1,1001,000900 – 1,100');
  await expect(table.getByRole('columnheader', { name: '95% interval', exact: true })).toHaveCount(2);
  await expect(page.getByText('Values in infections.', { exact: false })).toBeVisible();
});
