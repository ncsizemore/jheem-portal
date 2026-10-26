#!/usr/bin/env -S node --import tsx
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { modelConfigs } from '../src/config/model-configs';
import releases from '../src/config/result-data-releases.json';
import type {
  ResultArtifactRef,
  ResultReleaseBinding,
} from '../src/types/result-data';
import { parseResultManifest, parseResultPlot } from '../src/utils/resultData';

async function main() {
  const args = process.argv.slice(2);
  const option = (key: string) => args[args.indexOf(key) + 1];
  if (
    !['--model', '--staged', '--inventory'].every((key) => args.includes(key))
  ) {
    throw new Error(
      'Usage: node --import tsx scripts/verify-result-delivery.ts --model ID --staged DIR --inventory S3-LIST.json',
    );
  }
  const model = option('--model');
  const config = modelConfigs[model];
  const binding = (releases as Record<string, ResultReleaseBinding>)[model];
  if (!config || !binding) throw new Error('Unknown result model');
  const staged = path.resolve(option('--staged'));
  const prefix = `portal/${new URL(binding.baseUrl).pathname.slice(1)}/`;
  const inventory = JSON.parse(fs.readFileSync(option('--inventory'), 'utf8'));
  const remoteSizes = new Map<string, number>(
    inventory.Contents.map((entry: { Key: string; Size: number }) => [
      entry.Key,
      entry.Size,
    ]),
  );
  let objects = 0;
  for (const kind of ['plots', 'manifests']) {
    for (const filename of fs.readdirSync(
      path.join(staged, 'results-v1', kind),
    )) {
      const relative = `results-v1/${kind}/${filename}`;
      if (
        remoteSizes.get(prefix + relative) !==
        fs.statSync(path.join(staged, relative)).size
      )
        throw new Error(`Missing or wrong-sized uploaded object: ${relative}`);
      objects++;
    }
  }
  async function read(ref: ResultArtifactRef) {
    const response = await fetch(`${binding.baseUrl}/${ref.path}`, {
      headers: { Origin: 'https://jheem.org', 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(60_000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error(`CDN response ${response.status}: ${ref.path}`);
    const cors = response.headers.get('access-control-allow-origin');
    if (cors !== '*' && cors !== 'https://jheem.org')
      throw new Error(`Missing CORS: ${ref.path}`);
    if (response.headers.get('content-encoding') !== 'gzip')
      throw new Error(`Missing gzip: ${ref.path}`);
    if (!response.headers.get('cache-control')?.includes('immutable'))
      throw new Error(`Missing immutable cache policy: ${ref.path}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (
      bytes.length !== ref.bytes ||
      createHash('sha256').update(bytes).digest('hex') !== ref.sha256
    )
      throw new Error(`CDN integrity mismatch: ${ref.path}`);
    return JSON.parse(bytes.toString('utf8'));
  }
  const verified: string[] = [];
  const locations = [...config.locations];
  // Keep verification traffic bounded. Every location's index and default plot
  // are checked over the public CDN; inventory covers every uploaded object.
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (;;) {
        const location = locations.shift();
        if (!location) return;
        const manifest = parseResultManifest(
          await read(binding.locations[location]),
          model,
          location,
        );
        const selection = {
          scenario: config.scenarios[0].id,
          outcome: config.defaults.outcome,
          statistic: config.defaults.statistic,
          facet: 'none',
        };
        const ref =
          manifest.data[selection.scenario][selection.outcome][
            selection.statistic
          ][selection.facet];
        parseResultPlot(await read(ref), location, selection);
        verified.push(location);
      }
    }),
  );
  console.log(
    JSON.stringify({
      model,
      objects,
      locations: verified.sort(),
      status: 'verified',
      checked: [
        'all uploaded object sizes',
        'all location index and default plot hashes',
        'CORS',
        'gzip',
        'immutable caching',
      ],
    }),
  );
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
