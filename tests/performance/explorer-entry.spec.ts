import { test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  resultFixtures,
  routeResultArtifacts,
} from '../browser/result-data-fixtures';

// Offline diagnostic: fixed summary/result latency, no provider/tile requests.
// Map readiness measures usable location selection, not a rendered basemap.
test('compare cold explorer entry paths', async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const fixtures = await resultFixtures();
  const base = 'https://d320iym4dtm9lj.cloudfront.net/ryan-white';
  const samples = [];
  for (const cpu of [1, 4])
    for (const mode of ['result', 'city', 'state']) {
      for (let run = 0; run < 3; run++) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
        });
        const page = await context.newPage();
        await page.route('https://**/*', (r) => r.abort());
        await routeResultArtifacts(page, base, fixtures.artifacts);
        await page.route(`${base}/results-v1/**`, async (r) => {
          await new Promise((resolve) => setTimeout(resolve, 150));
          await r.fallback();
        });
        await page.route(/\/(city|state)-summaries\.json$/, async (r) => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          await r.fulfill({
            json: {
              cities: {},
              states: {
                AL: {
                  name: 'Alabama',
                  impact: { cessationIncreasePercent: 10 },
                },
              },
            },
          });
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
        await page.addInitScript(
          ({ mode }) => {
            const audit = {
              ready: 0,
              longTasks: [] as { start: number; duration: number }[],
            };
            Object.assign(window, { entryAudit: audit });
            new PerformanceObserver((list) => {
              for (const e of list.getEntries())
                audit.longTasks.push({
                  start: e.startTime,
                  duration: e.duration,
                });
            }).observe({ type: 'longtask', buffered: true });
            const frame = () => {
              const chart = document.querySelector(
                '[data-testid="analysis-chart-region"]',
              );
              const select = document.querySelector<HTMLSelectElement>(
                `#${mode}-explorer-location`,
              );
              const usable =
                mode === 'result'
                  ? chart?.getAttribute('aria-busy') === 'false' &&
                    chart.querySelector('.recharts-line-curve')
                  : select &&
                    !select.disabled &&
                    select.options.length > 1 &&
                    (() => {
                      const rect = select.getBoundingClientRect();
                      return (
                        document.elementFromPoint(
                          rect.x + rect.width / 2,
                          rect.y + rect.height / 2,
                        ) === select
                      );
                    })();
              if (usable)
                requestAnimationFrame(() => {
                  audit.ready = performance.now();
                });
              else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
          },
          { mode },
        );
        await page.goto(
          mode === 'state'
            ? '/ryan-white-state-level/explorer/ajph'
            : `/ryan-white/explorer${mode === 'result' ? '?loc=C.12580' : ''}`,
        );
        await page.waitForFunction(
          () =>
            (window as unknown as { entryAudit: { ready: number } }).entryAudit
              .ready > 0,
        );
        samples.push({
          cpu,
          mode,
          run,
          ...(await page.evaluate(() => ({
            ...(window as unknown as { entryAudit: { ready: number } })
              .entryAudit,
            resources: performance.getEntriesByType('resource').map((e) => ({
              path: new URL(e.name).pathname,
              start: e.startTime,
              end: e.startTime + e.duration,
              bytes: (e as PerformanceResourceTiming).encodedBodySize,
            })),
          }))),
        });
        await context.close();
      }
    }
  const destination =
    process.env.ENTRY_REPORT || testInfo.outputPath('entry.json');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(
    destination,
    JSON.stringify(
      { result_delay_ms: 150, summary_delay_ms: 600, samples },
      null,
      2,
    ),
  );
  console.log(samples.map(({ cpu, mode, ready }) => ({ cpu, mode, ready })));
});
