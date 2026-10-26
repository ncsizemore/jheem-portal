import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import type { AggregatedLocationData } from '../../src/hooks/useCityData';
import type { ResultManifest } from '../../src/types/result-data';
import releases from '../../src/config/result-data-releases.json';
import type { ResultReleaseBinding } from '../../src/types/result-data';

export const resultBindings = releases as Record<string, ResultReleaseBinding>;
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value));
export async function resultFixtures() {
  const baltimore: AggregatedLocationData = JSON.parse(
    await readFile('tests/fixtures/baltimore-results.json', 'utf8'),
  );
  const cityManifests: Record<string, ResultManifest> = {};
  const artifacts = new Map<string, Buffer>();
  for (const code of ['C.12580', 'C.12060']) {
    const manifest = JSON.parse(
      await readFile(
        `tests/fixtures/result-data/${code}-manifest.json`,
        'utf8',
      ),
    );
    cityManifests[code] = manifest;
    const ref = resultBindings['ryan-white'].locations[code];
    const content = bytes(manifest);
    if (createHash('sha256').update(content).digest('hex') !== ref.sha256)
      throw new Error('Fixture manifest and pinned release differ');
    artifacts.set(ref.path, content);
  }
  for (const outcomes of Object.values(baltimore.data))
    for (const summaries of Object.values(outcomes))
      for (const plots of Object.values(summaries))
        for (const plot of Object.values(plots)) {
          const content = bytes(plot);
          artifacts.set(
            `results-v1/plots/${createHash('sha256').update(content).digest('hex')}.json`,
            content,
          );
        }
  const atlanta = await readFile(
    'tests/fixtures/result-data/atlanta-incidence.json',
  );
  artifacts.set(
    `results-v1/plots/${createHash('sha256').update(atlanta).digest('hex')}.json`,
    atlanta,
  );
  return { baltimore, cityManifests, artifacts };
}

export async function routeResultArtifacts(
  page: Page,
  baseUrl: string,
  artifacts: Map<string, Buffer>,
) {
  await page.route(`${baseUrl}/results-v1/**`, (route) => {
    const path = route
      .request()
      .url()
      .slice(baseUrl.length + 1);
    const body = artifacts.get(path);
    if (!body) throw new Error(`Unexpected result artifact request: ${path}`);
    return route.fulfill({ body, contentType: 'application/json' });
  });
  // Any accidental return to whole-location downloads must fail the browser test.
  await page.route(`${baseUrl}/*.json`, (route) => {
    if (route.request().url().endsWith('-summaries.json'))
      return route.fallback();
    throw new Error(
      'A prerun analysis requested the legacy full-location bundle',
    );
  });
}

export async function stateResultArtifacts(model: string, location: string) {
  const prefix = `tests/fixtures/result-data/${model}-${location}`;
  const manifest = await readFile(`${prefix}-manifest.json`);
  const binding = resultBindings[model];
  const artifacts = new Map<string, Buffer>([
    [binding.locations[location].path, manifest],
  ]);
  const plots: unknown[] = JSON.parse(
    await readFile(`${prefix}-plots.json`, 'utf8'),
  );
  for (const plot of plots) {
    const content = bytes(plot);
    artifacts.set(
      `results-v1/plots/${createHash('sha256').update(content).digest('hex')}.json`,
      content,
    );
  }
  return artifacts;
}
