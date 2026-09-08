import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  sha256File,
  stageCalibrationRelease,
  validateSourceDescriptor,
  verifyReleaseDirectory,
} from './lib/calibration-release-consumer.mjs';
import { fetchCalibrationRelease } from './lib/calibration-release-fetch.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function assetIdentity(filePath) {
  return {
    name: path.basename(filePath),
    size_bytes: fs.statSync(filePath).size,
    sha256: sha256File(filePath),
  };
}

function makeArtifact({
  model,
  location,
  stage,
  sampleCount,
  simulationRelease,
  targetId = `${stage}-target`,
}) {
  return {
    schema_version: 'jheem-calibration/v1',
    artifact_id: `${model}:${stage}:${location}`,
    model,
    location,
    stage,
    ensemble: {
      sample_count: sampleCount,
      kind: 'full',
      quantiles: [0.025, 0.25, 0.5, 0.75, 0.975],
    },
    simulation_source: {
      release: simulationRelease,
      filename: `${stage}.Rdata`,
      sha256: '1'.repeat(64),
    },
    targets: [
      {
        target_id: targetId,
        label: `${stage} target`,
        unit: 'people',
        availability: { status: 'available', reason: null },
        panels: [
          {
            facet: 'total',
            posterior: [
              {
                year: 2020,
                stratum: {},
                q025: 1,
                q250: 2,
                q500: 3,
                q750: 4,
                q975: 5,
              },
            ],
            observations: [
              {
                year: 2020,
                stratum: { location },
                value: 3,
                manager_source: 'test',
                manager_ontology: 'test',
                public_source_ids: ['test-source'],
              },
            ],
          },
        ],
      },
    ],
  };
}

function createFixture({ wrongArtifactModel = false, wrongTargetId = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jheem-calibration-consumer-'));
  const source = path.join(root, 'source');
  const productRoot = path.join(root, 'product');
  const model = 'test-model';
  const portalModel = 'test-portal-model';
  const release = 'test-calibration-v1.0.0';
  const location = 'AA';
  fs.mkdirSync(source);

  const stages = {
    ehe: {
      label: 'Epidemic baseline fit',
      sample_count: 1000,
      simulation_release: 'test-ehe-v1.0.0',
      target_ids: ['ehe-target'],
      exported_target_ids: ['ehe-target'],
    },
    'ryan-white': {
      label: 'Ryan White service fit',
      sample_count: 80,
      simulation_release: 'test-rw-v1.0.0',
      target_ids: ['ryan-white-target'],
      exported_target_ids: ['ryan-white-target'],
    },
  };

  const artifactMetadata = {};
  for (const [stage, stageConfig] of Object.entries(stages)) {
    const relativePath = `locations/${location}/${stage}.json`;
    const artifact = makeArtifact({
      model: wrongArtifactModel ? 'wrong-model' : model,
      location,
      stage,
      sampleCount: stageConfig.sample_count,
      simulationRelease: stageConfig.simulation_release,
      targetId: wrongTargetId ? `${stage}-unexpected` : `${stage}-target`,
    });
    writeJson(path.join(productRoot, relativePath), artifact);
    artifactMetadata[stage] = {
      path: relativePath,
      size_bytes: fs.statSync(path.join(productRoot, relativePath)).size,
      sha256: sha256File(path.join(productRoot, relativePath)),
    };
  }

  const manifest = {
    schema_version: 'jheem-calibration-manifest/v1',
    release,
    model,
    portal_model: portalModel,
    locations: {
      artifact_pattern: 'locations/{location}/{stage}.json',
      count: 1,
      index: 'locations.json',
    },
    stages,
  };
  writeJson(path.join(productRoot, 'manifest.json'), manifest);
  writeJson(path.join(productRoot, 'locations.json'), {
    schema_version: 'jheem-calibration-location-index/v1',
    release,
    model,
    portal_model: portalModel,
    locations: [{ id: location, label: 'Test location', artifacts: artifactMetadata }],
  });
  writeJson(path.join(productRoot, 'coverage.json'), {
    schema_version: 'jheem-calibration-coverage/v1',
    release,
    model,
    complete: true,
    expected_location_count: 1,
    actual_location_count: 1,
    expected_artifact_count: 2,
    actual_artifact_count: 2,
    stages: {},
  });

  const internalPaths = [
    'coverage.json',
    'locations.json',
    `locations/${location}/ehe.json`,
    `locations/${location}/ryan-white.json`,
    'manifest.json',
  ];
  fs.writeFileSync(
    path.join(productRoot, 'SHA256SUMS'),
    `${internalPaths
      .map((relativePath) => `${sha256File(path.join(productRoot, relativePath))}  ${relativePath}`)
      .join('\n')}\n`
  );

  const bundleName = 'test-model-test-calibration-v1.0.0.tar.gz';
  const bundlePath = path.join(source, bundleName);
  const archiveMembers = ['SHA256SUMS', ...internalPaths];
  const tarResult = spawnSync('tar', ['-czf', bundlePath, ...archiveMembers], {
    cwd: productRoot,
    encoding: 'utf8',
  });
  assert.equal(tarResult.status, 0, tarResult.stderr);

  const bundle = assetIdentity(bundlePath);
  writeJson(path.join(source, 'catalog.json'), {
    schema_version: 'jheem-calibration-release/v1',
    release,
    archive_repository: 'test/repository',
    products: [
      {
        model,
        portal_model: portalModel,
        bundle: bundleName,
        bundle_sha256: bundle.sha256,
        bundle_size_bytes: bundle.size_bytes,
        manifest_path: 'manifest.json',
        manifest_sha256: sha256File(path.join(productRoot, 'manifest.json')),
        location_count: 1,
        artifact_count: 2,
      },
    ],
  });
  const catalog = assetIdentity(path.join(source, 'catalog.json'));
  fs.writeFileSync(
    path.join(source, 'SHA256SUMS'),
    `${catalog.sha256}  catalog.json\n${bundle.sha256}  ${bundleName}\n`
  );
  const checksums = assetIdentity(path.join(source, 'SHA256SUMS'));
  const descriptor = {
    schema_version: 'jheem-calibration-consumer-source/v1',
    repository: 'test/repository',
    release_id: 1,
    tag: release,
    tag_commit: 'a'.repeat(40),
    release_url: 'https://example.test/release',
    immutable: true,
    destination_prefix: `calibration/${release}`,
    assets: [checksums, catalog, bundle],
  };
  return { root, source, descriptor };
}

function createFixtureFetch(fixture, { immutable = true, tagCommit } = {}) {
  const apiBaseUrl = 'https://api.example.test';
  const assetBaseUrl = 'https://assets.example.test';
  const releaseUrl = `${apiBaseUrl}/repos/test/repository/releases/tags/${fixture.descriptor.tag}`;
  const tagUrl = `${apiBaseUrl}/repos/test/repository/git/ref/tags/${fixture.descriptor.tag}`;
  const jsonResponse = (value) => ({
    ok: true,
    status: 200,
    json: async () => value,
  });

  return {
    apiBaseUrl,
    fetchImplementation: async (url) => {
      if (url === releaseUrl) {
        return jsonResponse({
          id: fixture.descriptor.release_id,
          tag_name: fixture.descriptor.tag,
          target_commitish: fixture.descriptor.tag_commit,
          html_url: fixture.descriptor.release_url,
          draft: false,
          immutable,
          published_at: '2026-01-01T00:00:00Z',
          assets: fixture.descriptor.assets.map((asset) => ({
            name: asset.name,
            size: asset.size_bytes,
            digest: `sha256:${asset.sha256}`,
            state: 'uploaded',
            browser_download_url: `${assetBaseUrl}/${encodeURIComponent(asset.name)}`,
          })),
        });
      }
      if (url === tagUrl) {
        return jsonResponse({
          ref: `refs/tags/${fixture.descriptor.tag}`,
          object: {
            type: 'commit',
            sha: tagCommit ?? fixture.descriptor.tag_commit,
          },
        });
      }
      if (url.startsWith(`${assetBaseUrl}/`)) {
        const name = decodeURIComponent(url.slice(assetBaseUrl.length + 1));
        const expectedNames = new Set(fixture.descriptor.assets.map((asset) => asset.name));
        if (expectedNames.has(name)) {
          const bytes = fs.readFileSync(path.join(fixture.source, name));
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () => bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength
            ),
          };
        }
      }
      return { ok: false, status: 404 };
    },
  };
}

test('production descriptor pins the reviewed immutable release', () => {
  const descriptor = validateSourceDescriptor(
    JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, 'config/calibration-release-source.json'),
        'utf8'
      )
    )
  );
  assert.equal(descriptor.release_id, 383350377);
  assert.equal(descriptor.tag, 'ryan-white-calibration-v1.0.0');
  assert.equal(descriptor.tag_commit, 'af8d3fd12a193c5947b01c203792df89fdacc4d3');
  assert.equal(descriptor.assets.length, 5);
});

test('stages a fully verified release into a versioned static tree', (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const output = path.join(fixture.root, 'output');
  const index = stageCalibrationRelease({
    sourceDirectory: fixture.source,
    outputDirectory: output,
    rawDescriptor: fixture.descriptor,
  });

  assert.equal(index.release, fixture.descriptor.tag);
  assert.deepEqual(index.products[0].display_facets, ['total', 'age']);
  assert.deepEqual(index.products[0].withheld_facets, ['race', 'sex']);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(output, 'index.json'), 'utf8')).source.tag_commit,
    fixture.descriptor.tag_commit
  );
  assert.ok(fs.existsSync(path.join(output, 'test-model/locations/AA/ehe.json')));
});

test('rejects a changed release asset before extraction', (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  fs.appendFileSync(
    path.join(fixture.source, 'test-model-test-calibration-v1.0.0.tar.gz'),
    'tampered'
  );
  assert.throws(
    () => verifyReleaseDirectory(fixture.source, fixture.descriptor),
    /size mismatch/
  );
});

test('rejects unreviewed extra source assets', (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.source, 'extra.json'), '{}\n');
  assert.throws(
    () => verifyReleaseDirectory(fixture.source, fixture.descriptor),
    /source directory asset set mismatch/
  );
});

test('rejects an artifact whose identity differs from its manifest path', (context) => {
  const fixture = createFixture({ wrongArtifactModel: true });
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  assert.throws(
    () =>
      stageCalibrationRelease({
        sourceDirectory: fixture.source,
        outputDirectory: path.join(fixture.root, 'output'),
        rawDescriptor: fixture.descriptor,
      }),
    /identity does not match its manifest path/
  );
});

test('rejects artifact targets that differ from the stage registry', (context) => {
  const fixture = createFixture({ wrongTargetId: true });
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  assert.throws(
    () =>
      stageCalibrationRelease({
        sourceDirectory: fixture.source,
        outputDirectory: path.join(fixture.root, 'output'),
        rawDescriptor: fixture.descriptor,
      }),
    /target IDs mismatch/
  );
});

test('fetches only a published immutable release at the pinned tag commit', async (context) => {
  const fixture = createFixture();
  const fixtureFetch = createFixtureFetch(fixture);
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const output = path.join(fixture.root, 'download');
  const result = await fetchCalibrationRelease({
    rawDescriptor: fixture.descriptor,
    outputDirectory: output,
    ...fixtureFetch,
  });

  assert.equal(result.immutable, true);
  assert.equal(result.tag_commit, fixture.descriptor.tag_commit);
  assert.deepEqual(
    fs.readdirSync(output).sort(),
    fixture.descriptor.assets.map((asset) => asset.name).sort()
  );
});

test('rejects a mutable release before downloading assets', async (context) => {
  const fixture = createFixture();
  const fixtureFetch = createFixtureFetch(fixture, { immutable: false });
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  await assert.rejects(
    fetchCalibrationRelease({
      rawDescriptor: fixture.descriptor,
      outputDirectory: path.join(fixture.root, 'download'),
      ...fixtureFetch,
    }),
    /must be published and immutable/
  );
});

test('rejects a release tag that moved away from the pinned commit', async (context) => {
  const fixture = createFixture();
  const fixtureFetch = createFixtureFetch(fixture, {
    tagCommit: 'b'.repeat(40),
  });
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  await assert.rejects(
    fetchCalibrationRelease({
      rawDescriptor: fixture.descriptor,
      outputDirectory: path.join(fixture.root, 'download'),
      ...fixtureFetch,
    }),
    /tag reference does not resolve directly to the pinned commit/
  );
});
