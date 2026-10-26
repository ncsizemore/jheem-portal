import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { packResults, sha256 } from './lib/result-data-pack.ts';
import {
  ResultCache,
  fetchResultJson,
  parseResultManifest,
  parseResultPlot,
  validateResultRef,
} from '../src/utils/resultData.ts';
const source = fs.readFileSync('tests/fixtures/baltimore-results.json');
const original = JSON.parse(source);
const packed = packResults(original, 'ryan-white', {
  url: 'https://example.org/C.12580.json',
  sha256: sha256(source),
  bytes: source.length,
});

test('every compressed plot round-trips without changing any scientific or metadata field', () => {
  let count = 0;
  for (const [scenario, outcomes] of Object.entries(original.data))
    for (const [outcome, summaries] of Object.entries(outcomes))
      for (const [statistic, facets] of Object.entries(summaries))
        for (const [facet, plot] of Object.entries(facets)) {
          const ref = packed.manifest.data[scenario][outcome][statistic][facet];
          const bytes = gunzipSync(packed.files.get(ref.path));
          assert.equal(bytes.length, ref.bytes);
          assert.equal(sha256(bytes), ref.sha256);
          assert.deepEqual(JSON.parse(bytes), plot);
          count++;
        }
  assert.equal(count, original.metadata.file_count);
  assert.deepEqual(packed.manifest.metadata, original.metadata);
  assert.ok(
    packed.manifest.data.cessation.incidence['mean.and.interval'].none.bytes <
      10000,
  );
});

test('the catalogue preserves valid combinations and rejects mislabeled or mismatched data', () => {
  assert.ok(
    packed.manifest.data.cessation.incidence['mean.and.interval']['sex+risk']
      .selectable,
  );
  const badSource = structuredClone(original);
  badSource.data.cessation.incidence['mean.and.interval'].none.metadata.city =
    'C.12060';
  assert.throws(
    () => packResults(badSource, 'ryan-white', packed.manifest.source),
    /identity mismatch/,
  );
  assert.throws(() =>
    parseResultManifest(packed.manifest, 'other-model', 'C.12580'),
  );
  assert.throws(
    () => parseResultManifest(packed.manifest, 'ryan-white', 'C.12060'),
    /selected location/,
  );
  const ref =
    packed.manifest.data.cessation.incidence['mean.and.interval'].none;
  assert.throws(() =>
    validateResultRef({ ...ref, path: '../../escape.json' }, 'plots'),
  );
  assert.throws(
    () =>
      parseResultPlot(
        original.data.cessation.incidence['mean.and.interval'].none,
        'C.12580',
        {
          scenario: 'cessation',
          outcome: 'suppression',
          statistic: 'mean.and.interval',
          facet: 'none',
        },
      ),
    /selected analysis/,
  );
});

test('verified reader rejects corruption and oversized streams before using the result', async () => {
  const realFetch = globalThis.fetch;
  const bytes = Buffer.from('{"value":1}');
  const ref = {
    path: `results-v1/plots/${sha256(bytes)}.json`,
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
  const read = () =>
    fetchResultJson('https://example.org', ref, new AbortController().signal);
  try {
    globalThis.fetch = async () => new Response(bytes);
    assert.deepEqual(await read(), { value: 1 });
    globalThis.fetch = async () => new Response('{"value":2}');
    await assert.rejects(read(), /published release/);
    globalThis.fetch = async () => new Response(Buffer.alloc(bytes.length + 1));
    await assert.rejects(read(), /size did not match/);
    globalThis.fetch = async () => new Response(bytes.subarray(1));
    await assert.rejects(read(), /size did not match/);
    globalThis.fetch = async () => new Response('', { status: 404 });
    await assert.rejects(read(), /not available/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('plot retention is bounded by both decoded size and recency', () => {
  const cache = new ResultCache(10, 2);
  cache.set('a', { value: 1 }, 4);
  cache.set('b', { value: 2 }, 4);
  assert.deepEqual(cache.get('a'), { value: 1 });
  cache.set('c', { value: 3 }, 4);
  assert.equal(cache.get('b'), undefined);
  cache.set('d', { value: 4 }, 8);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('c'), undefined);
  cache.set('oversized', {}, 11);
  assert.equal(cache.get('oversized'), undefined);
  assert.deepEqual(cache.get('d'), { value: 4 });
});

test('every configured prerun location has a pinned immutable manifest', async () => {
  const { modelConfigs } = await import('../src/config/model-configs.ts');
  const bindings = JSON.parse(
    fs.readFileSync('src/config/result-data-releases.json'),
  );
  assert.deepEqual(
    Object.keys(bindings).sort(),
    Object.keys(modelConfigs).sort(),
  );
  for (const [model, config] of Object.entries(modelConfigs)) {
    assert.equal(bindings[model].baseUrl, config.dataUrl);
    assert.deepEqual(
      Object.keys(bindings[model].locations).sort(),
      [...config.locations].sort(),
    );
    for (const ref of Object.values(bindings[model].locations))
      validateResultRef(ref, 'manifests');
  }
});
