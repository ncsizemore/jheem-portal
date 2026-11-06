import { expect, test } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

// Offline diagnostic. External requests are blocked; summaries have a fixed
// 150 ms delay. MAP_VISUAL_DATA optionally supplies previously cached summaries.
test('measure geographic content and completed map rendering', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const report = process.env.MAP_REPORT || '/tmp/jheem-map-profile';
  const cpu = Number(process.env.MAP_CPU || 4);
  const runs = Number(process.env.MAP_RUNS || 3);
  await mkdir(report, { recursive: true });
  const samples = [];
  for (const mode of ['city', 'state']) {
    for (let run = 0; run < runs; run++) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      await page.route('https://**/*', (route) => route.abort());
      await page.route(
        /\/(city|state)-summaries\.json$/,
        async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 150));
          await route.fulfill({
            json: process.env.MAP_VISUAL_DATA
              ? JSON.parse(
                  await readFile(
                    `${process.env.MAP_VISUAL_DATA}/${mode}.json`,
                    'utf8',
                  ),
                )
              : { cities: {}, states: {} },
          });
        },
      );
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      const requests = new Map<
        string,
        {
          path: string;
          start: number;
          end?: number;
          bytes?: number;
          status?: number;
        }
      >();
      await cdp.send('Network.enable');
      cdp.on('Network.requestWillBeSent', (event) => {
        const url = new URL(event.request.url);
        if (url.protocol === 'blob:' || url.protocol === 'data:') return;
        requests.set(event.requestId, {
          path: `${url.hostname}${url.pathname}`,
          start: event.timestamp,
        });
      });
      cdp.on('Network.responseReceived', (event) => {
        const r = requests.get(event.requestId);
        if (r) r.status = event.response.status;
      });
      cdp.on('Network.loadingFinished', (event) => {
        const r = requests.get(event.requestId);
        if (r)
          Object.assign(r, {
            end: event.timestamp,
            bytes: event.encodedDataLength,
          });
      });
      await page.addInitScript(() => {
        const audit = {
          controls: 0,
          canvas: 0,
          ready: 0,
          longTasks: [] as { start: number; duration: number }[],
        };
        Object.assign(window, { mapAudit: audit });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            audit.longTasks.push({
              start: e.startTime,
              duration: e.duration,
            });
        }).observe({ type: 'longtask', buffered: true });
        const frame = () => {
          if (
            !audit.controls &&
            document.querySelector('select[id$="-explorer-location"]')
          )
            audit.controls = performance.now();
          if (
            !audit.canvas &&
            document.querySelector('[data-geographic-map] svg')
          )
            audit.canvas = performance.now();
          if (
            document.querySelector(
              '[data-geographic-map][data-map-ready="true"] svg path',
            )
          ) {
            requestAnimationFrame(() => {
              audit.ready = performance.now();
            });
          } else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      await page.goto(
        mode === 'city'
          ? '/ryan-white/explorer'
          : '/ryan-white-state-level/explorer/ajph',
      );
      await page.waitForFunction(
        () =>
          (window as unknown as { mapAudit: { ready: number } }).mapAudit
            .ready > 0,
        undefined,
        { timeout: 45_000 },
      );
      const audit = await page.evaluate(() => ({
        ...(
          window as unknown as {
            mapAudit: {
              controls: number;
              canvas: number;
              ready: number;
              longTasks: { start: number; duration: number }[];
            };
          }
        ).mapAudit,
      }));
      const first = Math.min(
        ...[...requests.values()].map((r) => r.start),
      );
      samples.push({
        mode,
        run,
        cpu,
        ...audit,
        requests: [...requests.values()].map((r) => ({
          ...r,
          start: (r.start - first) * 1000,
          end: r.end ? (r.end - first) * 1000 : undefined,
        })),
      });
      if (run === 0)
        await page.screenshot({ path: `${report}/${mode}.png` });
      if (run === 0 && process.env.MAP_VISUAL_DATA) {
        await page
          .locator('[data-geographic-map]')
          .getByRole('button', {
            name:
              mode === 'city'
                ? 'Explore Baltimore-Columbia-Towson, MD'
                : 'Explore New York',
            exact: true,
          })
          .focus();
        const preview = page.locator('div.fixed[role="button"]');
        await expect(preview).toBeVisible();
        const rect = (await preview.boundingBox())!;
        expect(rect.x).toBeGreaterThanOrEqual(0);
        const header = (await page.locator('header').boundingBox())!;
        expect(rect.y).toBeGreaterThanOrEqual(header.y + header.height);
        expect(rect.x + rect.width).toBeLessThanOrEqual(1280);
        expect(rect.y + rect.height).toBeLessThanOrEqual(800);
        await page.screenshot({ path: `${report}/${mode}-preview.png` });
      }
      await context.close();
    }
  }
  await writeFile(
    `${report}/timings.json`,
    JSON.stringify(samples, null, 2),
  );
  console.log(
    samples.map(({ mode, run, controls, canvas, ready }) => ({
      mode,
      run,
      controls,
      canvas,
      ready,
    })),
  );
});
