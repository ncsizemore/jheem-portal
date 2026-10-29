import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  resultFixtures,
  routeResultArtifacts,
} from '../browser/result-data-fixtures';

test('measure production-build startup with fixed result latency', async ({
  browser,
}, testInfo) => {
  const fixtures = await resultFixtures();
  const base = 'https://d320iym4dtm9lj.cloudfront.net/ryan-white';
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route('https://**/*', (route) => route.abort());
    await routeResultArtifacts(page, base, fixtures.artifacts);
    await page.route(`${base}/results-v1/**`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fallback();
    });
    await page.route(`${base}/city-summaries.json`, (route) =>
      route.fulfill({ json: { cities: {} } }),
    );
    const requests: { path: string; at: number }[] = [];
    let start = 0;
    page.on('request', (request) => {
      if (request.url().includes('/results-v1/'))
        requests.push({
          path: request.url().split('/results-v1/')[1],
          at: Date.now() - start,
        });
    });
    start = Date.now();
    await page.goto('/ryan-white/explorer?loc=C.12580');
    await expect(page.getByTestId('analysis-chart-region')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(page.locator('svg.recharts-surface')).toBeVisible();
    samples.push({
      time_to_ready_ms: Date.now() - start,
      requests,
      resources: await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((e) => e.name.includes('/_next/') && e.name.includes('.js'))
          .map((e) => ({
            name: new URL(e.name).pathname,
            bytes: (e as PerformanceResourceTiming).encodedBodySize,
          })),
      ),
    });
    await context.close();
  }
  const destination =
    process.env.PERF_REPORT || testInfo.outputPath('results-startup.json');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(
    destination,
    JSON.stringify({ result_delay_ms: 150, samples }, null, 2),
  );
  console.log(
    destination,
    samples.map((s) => s.time_to_ready_ms),
  );
});
