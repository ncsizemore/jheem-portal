import fs from 'node:fs';
import path from 'node:path';
import {
  sha256Buffer,
  validateSourceDescriptor,
  verifyReleaseDirectory,
} from './calibration-release-consumer.mjs';

function fail(message) {
  throw new Error(`Calibration release fetch failed: ${message}`);
}

function headersForApi(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'jheem-portal-calibration-consumer',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJson(url, { fetchImplementation, token }) {
  const response = await fetchImplementation(url, {
    headers: headersForApi(token),
    redirect: 'follow',
  });
  if (!response.ok) {
    fail(`${url} returned HTTP ${response.status}`);
  }
  try {
    return await response.json();
  } catch (error) {
    fail(`${url} did not return valid JSON (${error.message})`);
  }
}

function repositoryApiPath(repository) {
  const parts = repository.split('/');
  if (parts.length !== 2 || parts.some((part) => !part)) {
    fail(`invalid GitHub repository identity: ${repository}`);
  }
  return parts.map(encodeURIComponent).join('/');
}

function verifyReleaseMetadata(release, descriptor) {
  if (
    release.id !== descriptor.release_id ||
    release.tag_name !== descriptor.tag ||
    release.target_commitish !== descriptor.tag_commit ||
    release.html_url !== descriptor.release_url
  ) {
    fail('GitHub release identity differs from the pinned source descriptor');
  }
  if (release.draft !== false || release.immutable !== true || !release.published_at) {
    fail('GitHub release must be published and immutable');
  }
  if (!Array.isArray(release.assets)) {
    fail('GitHub release assets are missing');
  }

  const expected = new Map(descriptor.assets.map((asset) => [asset.name, asset]));
  const actual = new Map();
  for (const asset of release.assets) {
    if (!asset || typeof asset !== 'object' || typeof asset.name !== 'string') {
      fail('GitHub returned malformed release asset metadata');
    }
    if (actual.has(asset.name)) {
      fail(`GitHub returned duplicate release asset ${asset.name}`);
    }
    actual.set(asset.name, asset);
  }
  if (
    actual.size !== expected.size ||
    [...expected.keys()].some((name) => !actual.has(name))
  ) {
    fail('GitHub release asset set differs from the pinned source descriptor');
  }
  for (const [name, expectedAsset] of expected) {
    const actualAsset = actual.get(name);
    if (
      actualAsset.size !== expectedAsset.size_bytes ||
      actualAsset.digest !== `sha256:${expectedAsset.sha256}` ||
      actualAsset.state !== 'uploaded' ||
      typeof actualAsset.browser_download_url !== 'string'
    ) {
      fail(`GitHub metadata differs from the pinned identity for ${name}`);
    }
  }
  return actual;
}

function verifyTagReference(reference, descriptor) {
  if (
    reference?.ref !== `refs/tags/${descriptor.tag}` ||
    reference?.object?.type !== 'commit' ||
    reference?.object?.sha !== descriptor.tag_commit
  ) {
    fail('GitHub tag reference does not resolve directly to the pinned commit');
  }
}

async function downloadAsset({ asset, expected, outputPath, fetchImplementation }) {
  const response = await fetchImplementation(asset.browser_download_url, {
    headers: { 'User-Agent': 'jheem-portal-calibration-consumer' },
    redirect: 'follow',
  });
  if (!response.ok) {
    fail(`${expected.name} download returned HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== expected.size_bytes) {
    fail(`${expected.name} downloaded size differs from the pinned source descriptor`);
  }
  const digest = sha256Buffer(bytes);
  if (digest !== expected.sha256) {
    fail(`${expected.name} downloaded digest differs from the pinned source descriptor`);
  }
  fs.writeFileSync(outputPath, bytes);
}

export async function fetchCalibrationRelease({
  rawDescriptor,
  outputDirectory,
  apiBaseUrl = 'https://api.github.com',
  token = process.env.GITHUB_TOKEN,
  fetchImplementation = globalThis.fetch,
}) {
  const descriptor = validateSourceDescriptor(rawDescriptor);
  if (typeof fetchImplementation !== 'function') {
    fail('a Fetch API implementation is required');
  }
  if (fs.existsSync(outputDirectory)) {
    fail(`output directory already exists: ${outputDirectory}`);
  }

  const repositoryPath = repositoryApiPath(descriptor.repository);
  const releaseUrl = `${apiBaseUrl}/repos/${repositoryPath}/releases/tags/${encodeURIComponent(descriptor.tag)}`;
  const tagUrl = `${apiBaseUrl}/repos/${repositoryPath}/git/ref/tags/${encodeURIComponent(descriptor.tag)}`;
  const [release, reference] = await Promise.all([
    fetchJson(releaseUrl, { fetchImplementation, token }),
    fetchJson(tagUrl, { fetchImplementation, token }),
  ]);
  const releaseAssets = verifyReleaseMetadata(release, descriptor);
  verifyTagReference(reference, descriptor);

  const parent = path.dirname(path.resolve(outputDirectory));
  fs.mkdirSync(parent, { recursive: true });
  const stagingDirectory = fs.mkdtempSync(
    path.join(parent, `.${path.basename(outputDirectory)}.tmp-`)
  );
  try {
    for (const expected of descriptor.assets) {
      await downloadAsset({
        asset: releaseAssets.get(expected.name),
        expected,
        outputPath: path.join(stagingDirectory, expected.name),
        fetchImplementation,
      });
    }
    verifyReleaseDirectory(stagingDirectory, descriptor);
    fs.renameSync(stagingDirectory, outputDirectory);
    return {
      release: descriptor.tag,
      release_id: descriptor.release_id,
      tag_commit: descriptor.tag_commit,
      immutable: true,
      assets: descriptor.assets.length,
      output: path.resolve(outputDirectory),
    };
  } catch (error) {
    fs.rmSync(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}
