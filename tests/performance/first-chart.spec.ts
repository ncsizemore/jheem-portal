import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  resultFixtures,
  routeResultArtifacts,
} from '../browser/result-data-fixtures';

// Fixed local data latency keeps this diagnostic independent of CDN/cache state.
// CPU throttling is a repeatable comparison, not a measurement of a real phone.
test('profile first readable chart', async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const fixtures = await resultFixtures();
  const base = 'https://d320iym4dtm9lj.cloudfront.net/ryan-white';
  const destination =
    process.env.CHART_REPORT_DIR || testInfo.outputPath('first-chart');
  const cpu = Number(process.env.CHART_CPU || 4);
  const runs = Number(process.env.CHART_RUNS || 5);
  await mkdir(destination, { recursive: true });
  const samples = [];
  for (const selection of ['default', 'observations', 'facets']) {
    for (let run = 0; run < runs; run++) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      await page.route('https://**/*', (route) => route.abort());
      await routeResultArtifacts(page, base, fixtures.artifacts);
      await page.route(`${base}/results-v1/**`, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        await route.fallback();
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      const profile = process.env.PROFILE_CHART === '1' && run === 0;
      if (profile) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
        await cdp.send('Profiler.start');
      }
      await page.addInitScript(() => {
        const audit = {
          ready: 0,
          controls: 0,
          svg: 0,
          longTasks: [] as { start: number; duration: number }[],
        };
        Object.assign(window, { chartAudit: audit });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            audit.longTasks.push({
              start: entry.startTime,
              duration: entry.duration,
            });
        }).observe({ type: 'longtask', buffered: true });
        const frame = () => {
          const region = document.querySelector(
            '[data-testid="analysis-chart-region"]',
          );
          if (
            !audit.controls &&
            document.querySelector('[data-testid="analysis-view"]')
          )
            audit.controls = performance.now();
          if (!audit.svg && region?.querySelector('svg.recharts-surface'))
            audit.svg = performance.now();
          const panels = region?.querySelectorAll('[data-export-panel]');
          if (
            region?.getAttribute('aria-busy') === 'false' &&
            panels?.length &&
            [...panels].every((panel) =>
              panel.querySelector('.recharts-line-curve'),
            )
          ) {
            requestAnimationFrame(() => {
              audit.ready = performance.now();
            });
          } else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      const query =
        selection === 'observations'
          ? '&outcome=suppression'
          : selection === 'facets'
            ? '&breakdown=sex%2Brisk'
            : '';
      await page.goto(`/ryan-white/explorer?loc=C.12580${query}`);
      await page.waitForFunction(
        () =>
          (window as unknown as { chartAudit: { ready: number } })
            .chartAudit.ready > 0,
      );
      await expect(
        page.getByRole('button', { name: 'PNG', exact: true }),
      ).toBeEnabled();
      if (run === 0) {
        await writeFile(
          `${destination}/${selection}-geometry.json`,
          JSON.stringify(
            await page
              .locator('[data-export-panel]')
              .evaluateAll((panels) =>
                panels.map((panel) => ({
                  title: panel.getAttribute('data-export-panel'),
                  bands: [...panel.querySelectorAll('.recharts-area-area')]
                    .filter((node) =>
                      node.getAttribute('fill')?.startsWith('url('),
                    )
                    .map((node) => node.getAttribute('d')),
                  lines: [
                    ...panel.querySelectorAll('.recharts-line-curve'),
                  ].map((node) => node.getAttribute('d')),
                  ticks: [
                    ...panel.querySelectorAll(
                      '.recharts-cartesian-axis-tick',
                    ),
                  ].map((node) => ({
                    text: node.textContent,
                    line: node.querySelector('line')?.outerHTML,
                  })),
                  observations: [
                    ...panel.querySelectorAll('[aria-label^="Observed "]'),
                  ].map((node) => ({
                    label: node.getAttribute('aria-label'),
                    x: node.getAttribute('cx'),
                    y: node.getAttribute('cy'),
                  })),
                })),
              ),
            null,
            2,
          ),
        );
      }
      if (profile) {
        const result = await cdp.send('Profiler.stop');
        await writeFile(
          `${destination}/${selection}.cpuprofile`,
          JSON.stringify(result.profile),
        );
      }
      samples.push({
        selection,
        run,
        ...(await page.evaluate(() => ({
          ...(window as unknown as { chartAudit: object }).chartAudit,
          resources: performance
            .getEntriesByType('resource')
            .map((entry) => ({
              path: new URL(entry.name).pathname,
              start: entry.startTime,
              end: entry.startTime + entry.duration,
              bytes: (entry as PerformanceResourceTiming).encodedBodySize,
            })),
        }))),
      });
      await context.close();
    }
  }
  await writeFile(
    `${destination}/timings.json`,
    JSON.stringify({ cpu, result_delay_ms: 150, samples }, null, 2),
  );
  console.log(
    samples.map(({ selection, run, ...sample }) => ({
      selection,
      run,
      ...Object.fromEntries(
        Object.entries(sample).filter(([key]) =>
          ['ready', 'controls', 'svg'].includes(key),
        ),
      ),
    })),
  );
});
