import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import source from '../../src/data/hiv-age-projections-aggregated.json';

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', (route) => route.abort());
});
async function ready(page: import('@playwright/test').Page, count = 2) {
  await expect(page.getByTestId('aging-chart')).toHaveCount(count);
  await expect(
    page.locator('.recharts-bar-rectangle path').first(),
  ).toBeVisible();
}
test('aging selections survive reload and back navigation without route fetches', async ({
  page,
}) => {
  const routeFetches: string[] = [];
  await page.goto('/aging');
  await ready(page);
  page.on('request', (r) => {
    if (r.url().includes('_rsc=')) routeFetches.push(r.url());
  });
  await page.getByRole('button', { name: 'Percentage', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Percentage', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Start year', { exact: true }).selectOption('2030');
  await page.getByLabel('End year', { exact: true }).selectOption('2035');
  await page.goBack();
  await expect(page.getByLabel('End year', { exact: true })).toHaveValue(
    '2040',
  );
  await page.reload();
  await ready(page);
  await expect(page.getByLabel('Start year', { exact: true })).toHaveValue(
    '2030',
  );
  await expect(
    page.getByRole('button', { name: 'Percentage', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    routeFetches.filter((url) => new URL(url).pathname === '/aging'),
  ).toEqual([]);
});
test('aging breakdowns share controls and retain their group selections', async ({
  page,
}) => {
  await page.goto('/aging');
  await ready(page);
  await page
    .getByRole('button', { name: 'Race and ethnicity', exact: true })
    .click();
  await ready(page, 6);
  await page.getByLabel('Other', { exact: true }).uncheck();
  await ready(page, 4);
  await page
    .getByRole('button', { name: 'Transmission category', exact: true })
    .click();
  await ready(page, 4);
  await page.getByLabel('Non-MSM', { exact: true }).uncheck();
  await ready(page, 2);
  await expect(page.getByLabel('MSM', { exact: true })).toBeDisabled();
  await page
    .getByRole('button', { name: 'Race and ethnicity', exact: true })
    .click();
  await ready(page, 4);
  await expect(page.getByLabel('Other', { exact: true })).not.toBeChecked();
  await page.reload();
  await ready(page, 4);
  await page
    .getByRole('button', { name: 'Transmission category', exact: true })
    .click();
  await ready(page, 2);
  await expect(page.getByLabel('Non-MSM', { exact: true })).not.toBeChecked();
});
test('aging empty and combined selections remain explicit and large comparisons are bounded', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/aging');
  await ready(page);
  await page.getByText('Choose states', { exact: false }).click();
  await page
    .getByRole('button', { name: 'Clear selection', exact: true })
    .click();
  await expect(page.getByTestId('aging-chart')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText('Choose at least one state to view projections.'),
  ).toBeVisible();
  await page.getByText('Choose states', { exact: false }).click();
  await page.getByLabel('Combined states', { exact: true }).check();
  await ready(page, 1);
  await expect(
    page.getByRole('heading', { name: 'Combined study states', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Select all locations', exact: true })
    .click();
  await ready(page, 25);
  await page
    .getByRole('button', { name: 'Race and ethnicity', exact: true })
    .click();
  await ready(page, 24);
  await expect(
    page.getByRole('status').filter({ hasText: 'first 8 selected locations' }),
  ).toBeVisible();
  await page.goBack();
  await ready(page, 25);
  await expect(
    page.getByRole('status').filter({ hasText: 'first 8 selected locations' }),
  ).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const png = await readFile((await (await download).path())!);
  expect(png.readUInt32BE(16) * png.readUInt32BE(20)).toBeLessThanOrEqual(
    12_000_000,
  );
  expect(png.readUInt32BE(20)).toBeGreaterThan(3000);
});
test('aging table and CSV keep the full denominator when age groups are hidden', async ({
  page,
}) => {
  await page.goto(
    '/aging?states=CA&years=2030-2030&ages=55%2B&normalized=true',
  );
  await ready(page, 1);
  await page.getByText('View values for California', { exact: true }).click();
  const raw = source.states
    .find((s) => s.state_code === 'CA')!
    .data.find((row) => row.year === 2030)!.age_cohorts;
  const total = Object.values(raw).reduce((sum, x) => sum + x.median, 0);
  const value = ((raw['55+ years'].median / total) * 100).toFixed(1);
  const table = page.getByRole('table', { name: /California/ });
  await expect(
    table.getByRole('cell', { name: `${value}%`, exact: true }),
  ).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const csv = await readFile((await (await download).path())!, 'utf8');
  expect(csv).toBe(`State,Year,Age 55+ (%)\nCalifornia,2030,${value}`);
});
test('aging PNG export produces a complete image in the page security policy', async ({
  page,
}, testInfo) => {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/aging?view=sex&states=CA&sex=msm&years=2030-2035');
    await ready(page, 1);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG' }).click();
    const image = await download;
    const path = testInfo.outputPath(`aging-export-${width}.png`);
    await image.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBeGreaterThan(700);
    expect(bytes.readUInt32BE(20)).toBeGreaterThan(700);
    expect(bytes.length).toBeGreaterThan(15000);
    await expect(
      page.getByRole('status').filter({ hasText: 'Image downloaded.' }),
    ).toBeVisible();
  }
});
test('aging model evidence stays closed until requested and supports narrow-screen controls', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/aging');
  await ready(page);
  await expect(page.getByTestId('aging-evidence')).toHaveCount(0);
  await page
    .getByText('Compare the model with observed data', { exact: true })
    .click();
  await expect(page.getByTestId('aging-evidence')).toBeVisible();
  await page.getByLabel('Model-fit state', { exact: true }).selectOption('TX');
  await page
    .getByLabel('Model-fit outcome', { exact: true })
    .selectOption('diagnoses');
  await page
    .getByLabel('Model-fit age groups', { exact: true })
    .selectOption('all');
  await expect(
    page
      .getByTestId('aging-evidence')
      .getByRole('heading', { name: 'Texas · New Diagnoses', exact: true }),
  ).toHaveCount(6);
  const axes = await page
    .getByTestId('aging-evidence')
    .locator('.recharts-yAxis')
    .allTextContents();
  expect(axes).toHaveLength(6);
  expect(axes.every((axis) => !/[0-9]\.[0-9]{2}/.test(axis))).toBe(true);
  const ticks = await page
    .getByTestId('aging-evidence')
    .locator('.recharts-yAxis')
    .first()
    .locator('.recharts-cartesian-axis-tick-value')
    .allTextContents();
  expect(new Set(ticks).size).toBe(ticks.length);
  await expect(
    page.getByTestId('aging-evidence').locator('.recharts-area-area'),
  ).toHaveCount(6);
  await page
    .getByText('View model-fit values', { exact: true })
    .first()
    .click();
  await expect(
    page.getByTestId('aging-evidence').getByRole('table').first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByTestId('aging-evidence')
    .screenshot({ path: testInfo.outputPath('aging-evidence-320.png') });
});
test('aging layout keeps controls and chart panels inside the viewport', async ({
  page,
}, testInfo) => {
  await page.goto('/aging');
  await ready(page);
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId('aging-chart').first()).toBeVisible();
    const geometry = await page
      .locator(
        '#projections button, #projections select, [data-testid="aging-chart"]',
      )
      .evaluateAll((nodes) =>
        nodes
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: rect.width };
          })
          .filter((r) => r.width),
      );
    expect(geometry.every((r) => r.left >= 0 && r.right <= width + 1)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`aging-${width}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole('button', { name: 'Race and ethnicity', exact: true })
    .click();
  await ready(page, 6);
  await page.screenshot({
    path: testInfo.outputPath('aging-race-320.png'),
    fullPage: true,
  });
});
test('aging initial production scripts defer unused demographic and model-fit data', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.config.metadata?.productionBuild,
    'The script-size budget applies to the production build.',
  );
  await page.goto('/aging');
  await ready(page);
  const scripts = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter(
        (x) => x.name.includes('/_next/static/') && x.name.includes('.js'),
      )
      .map((x) => ({
        name: x.name.split('/').pop(),
        bytes: (x as PerformanceResourceTiming).decodedBodySize,
      })),
  );
  const total = scripts.reduce((sum, item) => sum + item.bytes, 0);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThan(1_600_000);
  const path = testInfo.outputPath('initial-scripts.json');
  await writeFile(path, JSON.stringify({ bytes: total, scripts }, null, 2));
  await testInfo.attach('initial-scripts', {
    path,
    contentType: 'application/json',
  });
});
