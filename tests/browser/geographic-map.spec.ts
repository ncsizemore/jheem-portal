import { test, expect } from '@playwright/test';
import { ALL_CITIES } from '../../src/data/cities';
import {
  ryanWhiteConfig,
  ajphStateLevelConfig,
  croiStateLevelConfig,
  cdcTestingConfig,
} from '../../src/config/model-configs';
import { STATE_CODE_TO_NAME } from '../../src/data/states';
import {
  resultFixtures,
  routeResultArtifacts,
  stateResultArtifacts,
} from './result-data-fixtures';

const summary = (name: string, coordinates: [number, number] = [-76, 39]) => ({
  name,
  shortName: name.split(',')[0].split('-')[0],
  coordinates,
  metrics: {
    suppressionRate: {
      value: 78,
      year: 2025,
      label: 'Viral suppression',
      format: 'percent',
    },
    diagnosedPrevalence: {
      value: 10000,
      year: 2025,
      label: 'Diagnosed HIV',
      format: 'count',
    },
  },
  impact: {
    cessationIncreasePercent: 45,
    cessationIncreaseAbsolute: 1000,
    startYear: 2025,
    targetYear: 2030,
    headline: '2025-2030',
  },
});
test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', (route) => route.abort());
});

test('city geography works offline, keeps zoom, and opens previews by keyboard', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/mapbox|us-states\.json/.test(request.url()))
      external.push(request.url());
  });
  const cities = ALL_CITIES.filter((city) =>
    ryanWhiteConfig.locations.includes(city.code),
  );
  await page.route('**/city-summaries.json', (route) =>
    route.fulfill({
      json: {
        cities: Object.fromEntries(
          cities.map((city) => [
            city.code,
            summary(city.name, city.coordinates),
          ]),
        ),
      },
    }),
  );
  await routeResultArtifacts(
    page,
    ryanWhiteConfig.dataUrl,
    (await resultFixtures()).artifacts,
  );
  await page.goto('/ryan-white/explorer');
  const map = page.locator('[data-geographic-map]');
  await expect(map.getByRole('button', { name: /^Explore / })).toHaveCount(31);
  const zoom = page.locator('.rsm-zoomable-group');
  const original = await zoom.getAttribute('transform');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(zoom).not.toHaveAttribute('transform', original!);
  const beforePan = await zoom.getAttribute('transform');
  const chicago = await map
    .getByRole('button', {
      name: 'Explore Chicago-Naperville-Elgin, IL-IN-WI',
      exact: true,
    })
    .boundingBox();
  await page.mouse.move(
    chicago!.x + chicago!.width / 2,
    chicago!.y + chicago!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    chicago!.x + chicago!.width / 2 + 40,
    chicago!.y + chicago!.height / 2 + 20,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(zoom).not.toHaveAttribute('transform', beforePan!);
  await expect(page).toHaveURL(/\/ryan-white\/explorer$/);
  const zoomed = await zoom.getAttribute('transform');
  const city = map.getByRole('button', {
    name: 'Explore Atlanta-Sandy Springs-Alpharetta, GA',
    exact: true,
  });
  await city.focus();
  await expect(page.getByText('Increase in new infections')).toBeVisible();
  await expect(page.getByText('45%', { exact: false })).toBeVisible();
  await city.press('Enter');
  await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(zoom).toHaveAttribute('transform', zoomed!);
  await page.getByRole('button', { name: 'Reset map', exact: true }).click();
  await expect(zoom).toHaveAttribute('transform', original!);
  expect(external).toEqual([]);
});

for (const [config, path] of [
  [ajphStateLevelConfig, '/ryan-white-state-level/explorer/ajph'],
  [croiStateLevelConfig, '/ryan-white-state-level/explorer/croi'],
  [cdcTestingConfig, '/cdc-testing/explorer'],
] as const) {
  test(`${config.id} geography selects only modeled states without a map provider`, async ({
    page,
  }) => {
    await page.route('**/state-summaries.json', (route) =>
      route.fulfill({
        json: {
          states: Object.fromEntries(
            config.locations.map((code) => [
              code,
              summary(STATE_CODE_TO_NAME[code]),
            ]),
          ),
        },
      }),
    );
    await routeResultArtifacts(
      page,
      config.dataUrl,
      await stateResultArtifacts(
        config.id,
        config.id === 'ryan-white-state-croi' ? 'MD' : 'AL',
      ),
    );
    await page.goto(path);
    const map = page.locator('[data-geographic-map]');
    await expect(map.getByRole('button', { name: /^Explore / })).toHaveCount(
      config.locations.length,
    );
    const code = config.id === 'ryan-white-state-croi' ? 'MD' : 'AL';
    const state = map.getByRole('button', {
      name: `Explore ${STATE_CODE_TO_NAME[code]}`,
      exact: true,
    });
    await state.focus();
    await expect(
      page
        .locator('div.fixed[role="button"]')
        .getByText('+45%', { exact: true }),
    ).toBeVisible();
    const preview = (await page
      .locator('div.fixed[role="button"]')
      .boundingBox())!;
    const header = (await page.locator('header').boundingBox())!;
    expect(preview.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(preview.y + preview.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    );
    await expect(
      map.getByRole('button', { name: 'Explore Oregon', exact: true }),
    ).toHaveCount(0);
    await state.press('Enter');
    await expect(page.getByLabel('Outcome', { exact: true })).toBeVisible();
    await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
      'aria-busy',
      'false',
    );
  });
}

test('mobile map stays clear of expanded controls and supports touch zoom', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.route('https://**/*', (route) => route.abort());
  await page.route('**/city-summaries.json', (route) =>
    route.fulfill({ json: { cities: {} } }),
  );
  await page.goto('/ryan-white/explorer');
  const map = page.locator('[data-geographic-map]');
  await expect(map.getByRole('button', { name: /^Explore / })).toHaveCount(31);
  const panel = page.locator('[data-map-panel]');
  const toggle = page.locator('[aria-controls="city-explorer-instructions"]');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect
    .poll(async () => {
      const [drawing, controls] = await Promise.all([
        map.locator('svg').boundingBox(),
        panel.boundingBox(),
      ]);
      return drawing!.y >= controls!.y + controls!.height;
    })
    .toBe(true);
  await toggle.click();
  const svg = map.locator('svg');
  // The guide height is measured by ResizeObserver. Start the gesture only
  // after its collapse has put the drawing back inside the visible viewport.
  await expect.poll(async () => {
    const drawing = (await svg.boundingBox())!;
    const controls = (await panel.boundingBox())!;
    return drawing.y >= controls.y + controls.height &&
      drawing.y < controls.y + controls.height + 120 &&
      drawing.y + drawing.height <= page.viewportSize()!.height;
  }).toBe(true);
  const marker = map
    .getByRole('button', {
      name: 'Explore Atlanta-Sandy Springs-Alpharetta, GA',
      exact: true,
    })
    .locator('circle')
    .nth(1);
  // Browser bounds include the circle's stroke. Preserve its physical size,
  // rather than asserting the SVG's stroke-free diameter.
  const markerWidth = (await marker.boundingBox())!.width;
  expect(markerWidth).toBeGreaterThanOrEqual(14);
  expect(markerWidth).toBeLessThan(18);
  const box = (await svg.boundingBox())!;
  const transform = page.locator('.rsm-zoomable-group');
  const before = await transform.getAttribute('transform');
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 30, y, id: 0 },
      { x: x + 30, y, id: 1 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 70, y, id: 0 },
      { x: x + 70, y, id: 1 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(transform).not.toHaveAttribute('transform', before!);
  await expect
    .poll(async () =>
      Math.abs((await marker.boundingBox())!.width - markerWidth),
    )
    .toBeLessThan(0.2);
  await page.screenshot({
    path: test.info().outputPath('mobile-map.png'),
  });
  await context.close();
});

test('atlas labels and controls fit narrow, tablet, and desktop screens', async ({
  page,
}) => {
  const cities = ALL_CITIES.filter((city) =>
    ryanWhiteConfig.locations.includes(city.code),
  );
  await page.route('**/city-summaries.json', (route) =>
    route.fulfill({
      json: {
        cities: Object.fromEntries(
          cities.map((city) => [
            city.code,
            summary(city.name, city.coordinates),
          ]),
        ),
      },
    }),
  );
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/ryan-white/explorer');
    await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
    await expect(page.getByLabel('Choose a metropolitan area')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const drawing = (await page.locator('.atlas-drawing').boundingBox())!;
    const labels = page.locator('.city-label');
    await expect(labels).not.toHaveCount(0);
    for (const label of await labels.all()) {
      const box = (await label.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(drawing.x);
      expect(box.x + box.width).toBeLessThanOrEqual(drawing.x + drawing.width);
    }
    if (width === 320)
      await page.getByRole('button', { name: 'How to read the map' }).click();
    await expect(
      page.getByRole('heading', { name: 'Viral suppression (%)', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Size uses a log scale; capped at 50,000.'),
    ).toBeVisible();
  }
});
