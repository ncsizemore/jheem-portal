#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Planning assumptions verified against AWS US East (N. Virginia) S3 Standard
// pricing on 2026-10-26. Recheck before publishing; these are not account rates.
export const rates = {
  region: 'us-east-1',
  currency: 'USD',
  verified_on: '2026-10-26',
  put_per_1000: 0.005,
  storage_per_gib_month: 0.023,
};

const filenamePattern = /^[a-f0-9]{64}\.json$/;
const prefixPattern = /^portal\/[a-z0-9-]+\/results-v1\/$/;
const fail = (message) => {
  throw new Error(message);
};

/** Offline estimate only. Existing keys/sizes do not prove remote integrity. */
export function estimateResultReleaseCost({ staged, prefix, inventory }) {
  if (!prefixPattern.test(prefix))
    fail('Use the exact portal/<model-prefix>/results-v1/ prefix.');
  const remote = new Map();
  if (inventory !== undefined) {
    if (!inventory || inventory.Prefix !== prefix)
      fail('Inventory prefix does not match the planned destination.');
    if (
      inventory.IsTruncated ||
      inventory.NextContinuationToken ||
      inventory.NextToken
    )
      fail(
        'Inventory is incomplete. Use the complete, automatically paginated AWS CLI output.',
      );
    if (inventory.Contents !== undefined && !Array.isArray(inventory.Contents))
      fail('Inventory Contents must be an array.');
    for (const entry of inventory.Contents || []) {
      if (
        !entry ||
        typeof entry.Key !== 'string' ||
        !entry.Key.startsWith(prefix) ||
        !Number.isSafeInteger(entry.Size) ||
        entry.Size < 0
      )
        fail('Inventory contains an invalid key or stored size.');
      if (remote.has(entry.Key))
        fail(`Inventory contains a duplicate key: ${entry.Key}`);
      remote.set(entry.Key, entry.Size);
    }
  }

  const root = path.join(staged, 'results-v1');
  const kinds = fs.readdirSync(root, { withFileTypes: true });
  if (
    kinds.length !== 2 ||
    kinds.some(
      (entry) =>
        !entry.isDirectory() || !['manifests', 'plots'].includes(entry.name),
    )
  )
    fail(
      'Staged results-v1 must contain only manifests/ and plots/ directories.',
    );
  let objects = 0,
    storedBytes = 0,
    existing = 0,
    newObjects = 0,
    newBytes = 0;
  for (const kind of kinds) {
    const files = fs.readdirSync(path.join(root, kind.name), {
      withFileTypes: true,
    });
    if (!files.length) fail(`Staged ${kind.name}/ is empty.`);
    for (const file of files) {
      if (!file.isFile() || !filenamePattern.test(file.name))
        fail(`Unexpected staged entry: ${kind.name}/${file.name}`);
      const size = fs.statSync(path.join(root, kind.name, file.name)).size;
      if (!Number.isSafeInteger(size) || size <= 0)
        fail(`Invalid staged size: ${kind.name}/${file.name}`);
      const key = `${prefix}${kind.name}/${file.name}`;
      objects++;
      storedBytes += size;
      if (remote.has(key)) {
        if (remote.get(key) !== size)
          fail(
            `Immutable-object conflict: ${key} has a different stored size. Investigate; do not overwrite it.`,
          );
        existing++;
      } else {
        newObjects++;
        newBytes += size;
      }
    }
  }
  if (!Number.isSafeInteger(storedBytes))
    fail('Stored byte total exceeds the supported integer range.');
  return {
    schema_version: 'jheem-result-release-cost/v1',
    destination_prefix: prefix,
    basis:
      inventory === undefined
        ? 'all staged objects assumed new; no inventory supplied'
        : 'saved inventory; skip existing keys with matching stored size',
    staged_objects: objects,
    staged_stored_bytes: storedBytes,
    existing_matching_size_objects: existing,
    planned_put_requests: newObjects,
    additional_stored_bytes: newBytes,
    estimated_upload_usd_before_credits:
      (newObjects / 1000) * rates.put_per_1000,
    estimated_additional_full_month_storage_usd_before_credits:
      (newBytes / 2 ** 30) * rates.storage_per_gib_month,
    rates,
    assumptions: [
      'Uses prepared, content-addressed gzip files; does not validate scientific data or remote content hashes/headers.',
      'One successful PUT per new object; unchanged objects are skipped. Retries or timestamp-based reuploads increase requests.',
      'Saved inventory must be complete, for the correct prefix, and recent enough for the release. This tool makes no AWS calls.',
      'Gross US East S3 Standard estimates; no free-tier allowances, credits, or discounts assumed.',
      'Storage is incremental for a full month. Excludes existing data, request verification, LIST/GET, transfer, versioning, other services and taxes.',
      'Not a spending cap or full AWS bill. Normal portal deployments do not require republishing these artifacts.',
    ],
  };
}

function main() {
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i],
      value = args[i + 1];
    if (
      !['--staged', '--prefix', '--inventory'].includes(key) ||
      !value ||
      value.startsWith('--') ||
      options[key]
    )
      fail(
        'Usage: node scripts/estimate-result-release-cost.mjs --staged DIR --prefix portal/MODEL/results-v1/ [--inventory S3-LIST.json]',
      );
    options[key] = value;
  }
  if (!options['--staged'] || !options['--prefix'])
    fail(
      'Usage: node scripts/estimate-result-release-cost.mjs --staged DIR --prefix portal/MODEL/results-v1/ [--inventory S3-LIST.json]',
    );
  const estimate = estimateResultReleaseCost({
    staged: options['--staged'],
    prefix: options['--prefix'],
    inventory: options['--inventory']
      ? JSON.parse(fs.readFileSync(options['--inventory'], 'utf8'))
      : undefined,
  });
  console.log(JSON.stringify(estimate, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
