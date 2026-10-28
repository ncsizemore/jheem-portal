import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { estimateResultReleaseCost } from './estimate-result-release-cost.mjs';

const prefix = 'portal/ryan-white/results-v1/';
const manifest = `manifests/${'a'.repeat(64)}.json`;
const plot = `plots/${'b'.repeat(64)}.json`;
function stage(t) {
  const staged = fs.mkdtempSync(path.join(os.tmpdir(), 'jheem-release-cost-'));
  t.after(() => fs.rmSync(staged, { recursive: true, force: true }));
  for (const [relative, bytes] of [
    [manifest, 20],
    [plot, 80],
  ]) {
    const file = path.join(staged, 'results-v1', relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.alloc(bytes));
  }
  return staged;
}
const inventoryOf = (entries) => ({
  Prefix: prefix,
  Contents: entries.map(([key, size]) => ({ Key: prefix + key, Size: size })),
});

test('without an inventory, conservatively estimates all staged objects as new', (t) => {
  const result = estimateResultReleaseCost({ staged: stage(t), prefix });
  assert.equal(result.planned_put_requests, 2);
  assert.equal(result.additional_stored_bytes, 100);
  assert.equal(result.estimated_upload_usd_before_credits, 0.00001);
  assert.equal(
    result.estimated_additional_full_month_storage_usd_before_credits,
    (100 / 2 ** 30) * 0.023,
  );
});

test('matching existing immutable keys are skipped; only new files add cost', (t) => {
  const staged = stage(t);
  const result = estimateResultReleaseCost({
    staged,
    prefix,
    inventory: inventoryOf([[manifest, 20]]),
  });
  assert.equal(result.existing_matching_size_objects, 1);
  assert.equal(result.planned_put_requests, 1);
  assert.equal(result.additional_stored_bytes, 80);
  // Filesystem timestamps must not make already published content look new.
  fs.utimesSync(
    path.join(staged, 'results-v1', manifest),
    new Date(),
    new Date(),
  );
  const repeat = estimateResultReleaseCost({
    staged,
    prefix,
    inventory: inventoryOf([
      [manifest, 20],
      [plot, 80],
    ]),
  });
  assert.equal(repeat.planned_put_requests, 0);
  assert.equal(repeat.additional_stored_bytes, 0);
});

test('refuses a possible immutable overwrite or incomplete/wrong inventory', (t) => {
  const staged = stage(t);
  const run = (inventory) =>
    estimateResultReleaseCost({ staged, prefix, inventory });
  assert.throws(
    () => run(inventoryOf([[plot, 79]])),
    /Immutable-object conflict/,
  );
  assert.throws(
    () => run({ ...inventoryOf([]), Prefix: 'portal/cdc-testing/results-v1/' }),
    /prefix does not match/,
  );
  assert.throws(
    () => run({ ...inventoryOf([]), IsTruncated: true }),
    /incomplete/,
  );
  assert.throws(
    () => run({ ...inventoryOf([]), NextToken: 'more' }),
    /incomplete/,
  );
  assert.throws(
    () =>
      run(
        inventoryOf([
          [plot, 80],
          [plot, 80],
        ]),
      ),
    /duplicate/,
  );
  assert.throws(
    () => run(inventoryOf([[plot, -1]])),
    /invalid key or stored size/,
  );
});

test('rejects unexpected files and symlinks rather than undercounting uploads', (t) => {
  const staged = stage(t);
  fs.writeFileSync(
    path.join(staged, 'results-v1', 'plots', 'unhashed.json'),
    '{}',
  );
  assert.throws(
    () => estimateResultReleaseCost({ staged, prefix }),
    /Unexpected staged entry/,
  );
  fs.unlinkSync(path.join(staged, 'results-v1', 'plots', 'unhashed.json'));
  fs.symlinkSync(
    path.join(staged, 'results-v1', plot),
    path.join(staged, 'results-v1', 'plots', `${'c'.repeat(64)}.json`),
  );
  assert.throws(
    () => estimateResultReleaseCost({ staged, prefix }),
    /Unexpected staged entry/,
  );
});
