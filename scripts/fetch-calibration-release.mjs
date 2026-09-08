#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCalibrationRelease } from './lib/calibration-release-fetch.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const defaultDescriptor = path.join(
  repositoryRoot,
  'config/calibration-release-source.json'
);

function usage() {
  return [
    'Usage:',
    '  node scripts/fetch-calibration-release.mjs --output DIR',
    '',
    'Options:',
    '  --descriptor FILE  Override the pinned source descriptor.',
    '  --output DIR       New directory for the verified release assets.',
  ].join('\n');
}

function parseArguments(argv) {
  const result = { descriptor: defaultDescriptor };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--descriptor' || argument === '--output') {
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
  if (!result.output) {
    throw new Error('--output is required');
  }
  return result;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const descriptor = JSON.parse(
    fs.readFileSync(path.resolve(options.descriptor), 'utf8')
  );
  const result = await fetchCalibrationRelease({
    rawDescriptor: descriptor,
    outputDirectory: path.resolve(options.output),
  });
  process.stdout.write(`${JSON.stringify({ status: 'downloaded', ...result })}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n${usage()}\n`);
  process.exit(1);
}
