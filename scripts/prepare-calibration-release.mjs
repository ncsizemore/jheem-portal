#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stageCalibrationRelease,
  validateSourceDescriptor,
  verifyReleaseDirectory,
} from './lib/calibration-release-consumer.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const defaultDescriptor = path.join(
  repositoryRoot,
  'config/calibration-release-source.json'
);

function usage() {
  return [
    'Usage:',
    '  node scripts/prepare-calibration-release.mjs --source DIR --output DIR',
    '  node scripts/prepare-calibration-release.mjs --source DIR --verify-only',
    '',
    'Options:',
    '  --descriptor FILE  Override the pinned source descriptor.',
    '  --source DIR       Directory containing the exact downloaded release assets.',
    '  --output DIR       New directory for the validated static delivery tree.',
    '  --verify-only      Verify source assets without extracting them.',
  ].join('\n');
}

function parseArguments(argv) {
  const result = { descriptor: defaultDescriptor, verifyOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--verify-only') {
      result.verifyOnly = true;
    } else if (['--descriptor', '--source', '--output'].includes(argument)) {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${argument} requires a value`);
      }
      result[argument.slice(2)] = value;
      index += 1;
    } else if (argument === '--help' || argument === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!result.source) {
    throw new Error('--source is required');
  }
  if (!result.verifyOnly && !result.output) {
    throw new Error('--output is required unless --verify-only is used');
  }
  if (result.verifyOnly && result.output) {
    throw new Error('--output cannot be combined with --verify-only');
  }
  return result;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const descriptor = validateSourceDescriptor(
    JSON.parse(fs.readFileSync(path.resolve(options.descriptor), 'utf8'))
  );
  const sourceDirectory = path.resolve(options.source);
  if (options.verifyOnly) {
    const { catalog } = verifyReleaseDirectory(sourceDirectory, descriptor);
    process.stdout.write(
      `${JSON.stringify({
        status: 'verified',
        release: descriptor.tag,
        assets: descriptor.assets.length,
        products: catalog.products.length,
      })}\n`
    );
  } else {
    const index = stageCalibrationRelease({
      sourceDirectory,
      outputDirectory: path.resolve(options.output),
      rawDescriptor: descriptor,
    });
    process.stdout.write(
      `${JSON.stringify({
        status: 'staged',
        release: index.release,
        products: index.products.length,
        output: path.resolve(options.output),
      })}\n`
    );
  }
} catch (error) {
  process.stderr.write(`${error.message}\n${usage()}\n`);
  process.exit(1);
}
