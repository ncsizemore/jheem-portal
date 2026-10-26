#!/usr/bin/env -S node --import tsx
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { packResults, sha256 } from './lib/result-data-pack';
import { modelConfigs } from '../src/config/model-configs';
import type { AggregatedLocationData } from '../src/hooks/useCityData';

const args = process.argv.slice(2);
const option = (key: string) => args[args.indexOf(key) + 1];
if (
  !args.includes('--source') ||
  !args.includes('--output') ||
  !args.includes('--model')
) {
  throw new Error(
    'Usage: node --import tsx scripts/prepare-result-data.ts --model ID --source DIR --output DIR',
  );
}
const modelId = option('--model');
const config = modelConfigs[modelId];
if (!config) throw new Error(`Unknown model ${modelId}`);
const sourceDirectory = path.resolve(option('--source'));
const output = path.resolve(option('--output'));
fs.mkdirSync(output, { recursive: true });
const bindings: Record<string, unknown> = {};
const reports: unknown[] = [];
for (const location of config.locations) {
  const input = fs.readFileSync(path.join(sourceDirectory, `${location}.json`));
  const decoded =
    input[0] === 0x1f && input[1] === 0x8b ? gunzipSync(input) : input;
  const data: AggregatedLocationData = JSON.parse(decoded.toString('utf8'));
  if (data.metadata.city !== location)
    throw new Error(`Wrong source location ${location}`);
  const packed = packResults(data, modelId, {
    url: `${config.dataUrl}/${location}.json`,
    sha256: sha256(decoded),
    bytes: decoded.length,
  });
  for (const [relativePath, content] of packed.files) {
    const destination = path.join(output, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) {
      if (!fs.readFileSync(destination).equals(content))
        throw new Error(`Immutable artifact collision: ${relativePath}`);
    } else fs.writeFileSync(destination, content, { flag: 'wx' });
  }
  bindings[location] = packed.ref;
  const defaultRef =
    packed.manifest.data[config.scenarios[0].id]?.[config.defaults.outcome]?.[
      config.defaults.statistic
    ]?.none;
  const report = {
    location,
    source_sha256: packed.manifest.source.sha256,
    source_decoded_bytes: decoded.length,
    source_stored_bytes: input.length,
    plot_count: data.metadata.file_count,
    manifest_decoded_bytes: packed.ref.bytes,
    manifest_gzip_bytes: packed.files.get(packed.ref.path)!.length,
    default_plot_decoded_bytes: defaultRef?.bytes,
    default_plot_gzip_bytes:
      defaultRef && packed.files.get(defaultRef.path)!.length,
    largest_plot_decoded_bytes: Math.max(
      ...Object.values(packed.manifest.data).flatMap((os) =>
        Object.values(os).flatMap((ss) =>
          Object.values(ss).flatMap((fs) =>
            Object.values(fs).map((ref) => ref.bytes),
          ),
        ),
      ),
    ),
    verified: true,
  };
  reports.push(report);
  // Checkpoint only complete, verified locations. Safe to restart after interruption.
  fs.writeFileSync(
    path.join(output, 'binding.json'),
    JSON.stringify({ baseUrl: config.dataUrl, locations: bindings }, null, 2) +
      '\n',
  );
  fs.writeFileSync(
    path.join(output, 'verification.json'),
    JSON.stringify({ model: modelId, locations: reports }, null, 2) + '\n',
  );
  process.stdout.write(JSON.stringify(report) + '\n');
}
