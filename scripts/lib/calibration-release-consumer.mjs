import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const STAGES = new Set(['ehe', 'ryan-white']);
const FACETS = new Set(['total', 'age', 'race', 'sex']);

function fail(message) {
  throw new Error(`Calibration release validation failed: ${message}`);
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function assertInteger(value, label, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) {
    fail(`${label} must be an integer >= ${minimum}`);
  }
  return value;
}

function assertSha256(value, label) {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    fail(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function assertSafeId(value, label) {
  assertString(value, label);
  if (!SAFE_ID_PATTERN.test(value)) {
    fail(`${label} is not a safe identifier: ${value}`);
  }
  return value;
}

function assertSafeRelativePath(value, label) {
  assertString(value, label);
  if (value.includes('\\') || path.posix.isAbsolute(value)) {
    fail(`${label} must be a POSIX relative path: ${value}`);
  }
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    fail(`${label} contains an unsafe path segment: ${value}`);
  }
  return value;
}

export function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON (${error.message})`);
  }
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertExactStrings(actual, expected, label) {
  const actualSorted = sorted(actual);
  const expectedSorted = sorted(expected);
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail(`${label} mismatch; expected ${expectedSorted.join(', ')}, found ${actualSorted.join(', ')}`);
  }
}

export function validateSourceDescriptor(rawDescriptor) {
  const descriptor = assertObject(rawDescriptor, 'source descriptor');
  if (descriptor.schema_version !== 'jheem-calibration-consumer-source/v1') {
    fail(`unsupported source descriptor schema: ${descriptor.schema_version}`);
  }
  assertString(descriptor.repository, 'source descriptor repository');
  assertInteger(descriptor.release_id, 'source descriptor release_id', 1);
  assertSafeId(descriptor.tag, 'source descriptor tag');
  if (typeof descriptor.tag_commit !== 'string' || !/^[0-9a-f]{40}$/.test(descriptor.tag_commit)) {
    fail('source descriptor tag_commit must be a full lowercase commit SHA');
  }
  assertString(descriptor.release_url, 'source descriptor release_url');
  if (descriptor.immutable !== true) {
    fail('source descriptor must require an immutable release');
  }
  assertSafeRelativePath(descriptor.destination_prefix, 'source descriptor destination_prefix');
  if (!Array.isArray(descriptor.assets) || descriptor.assets.length < 3) {
    fail('source descriptor assets must include checksums, catalog, and at least one bundle');
  }

  const assetNames = new Set();
  for (const [index, rawAsset] of descriptor.assets.entries()) {
    const asset = assertObject(rawAsset, `source descriptor asset ${index}`);
    assertSafeRelativePath(asset.name, `source descriptor asset ${index} name`);
    if (asset.name.includes('/')) {
      fail(`source descriptor asset names must be top-level files: ${asset.name}`);
    }
    if (assetNames.has(asset.name)) {
      fail(`duplicate source descriptor asset: ${asset.name}`);
    }
    assetNames.add(asset.name);
    assertInteger(asset.size_bytes, `source descriptor asset ${asset.name} size_bytes`, 1);
    assertSha256(asset.sha256, `source descriptor asset ${asset.name} sha256`);
  }
  if (!assetNames.has('SHA256SUMS') || !assetNames.has('catalog.json')) {
    fail('source descriptor must include SHA256SUMS and catalog.json');
  }
  for (const name of assetNames) {
    if (name !== 'SHA256SUMS' && name !== 'catalog.json' && !name.endsWith('.tar.gz')) {
      fail(`unsupported source asset: ${name}`);
    }
  }
  return descriptor;
}

function parseChecksumFile(contents, label) {
  const entries = new Map();
  for (const [index, line] of contents.trimEnd().split('\n').entries()) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (!match) {
      fail(`${label} line ${index + 1} is malformed`);
    }
    const [, digest, relativePath] = match;
    assertSafeRelativePath(relativePath, `${label} line ${index + 1} path`);
    if (entries.has(relativePath)) {
      fail(`${label} contains duplicate path ${relativePath}`);
    }
    entries.set(relativePath, digest);
  }
  if (entries.size === 0) {
    fail(`${label} is empty`);
  }
  return entries;
}

function listTopLevelFiles(directory) {
  return fs.readdirSync(directory).map((name) => {
    const filePath = path.join(directory, name);
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile()) {
      fail(`source directory entry must be a regular file: ${name}`);
    }
    return name;
  });
}

function validateCatalog(rawCatalog, descriptor, assetByName) {
  const catalog = assertObject(rawCatalog, 'catalog');
  if (catalog.schema_version !== 'jheem-calibration-release/v1') {
    fail(`unsupported catalog schema: ${catalog.schema_version}`);
  }
  if (catalog.archive_repository !== descriptor.repository || catalog.release !== descriptor.tag) {
    fail('catalog release identity does not match the source descriptor');
  }
  if (!Array.isArray(catalog.products) || catalog.products.length === 0) {
    fail('catalog products must be a non-empty array');
  }

  const bundleNames = [];
  const models = new Set();
  const portalModels = new Set();
  for (const [index, rawProduct] of catalog.products.entries()) {
    const product = assertObject(rawProduct, `catalog product ${index}`);
    assertSafeId(product.model, `catalog product ${index} model`);
    assertSafeId(product.portal_model, `catalog product ${index} portal_model`);
    assertSafeRelativePath(product.bundle, `catalog product ${index} bundle`);
    if (product.bundle.includes('/') || !product.bundle.endsWith('.tar.gz')) {
      fail(`catalog product bundle must be a top-level .tar.gz file: ${product.bundle}`);
    }
    if (product.manifest_path !== 'manifest.json') {
      fail(`catalog product ${product.model} manifest_path must be manifest.json`);
    }
    assertInteger(product.bundle_size_bytes, `${product.model} bundle_size_bytes`, 1);
    assertSha256(product.bundle_sha256, `${product.model} bundle_sha256`);
    assertSha256(product.manifest_sha256, `${product.model} manifest_sha256`);
    assertInteger(product.location_count, `${product.model} location_count`, 1);
    assertInteger(product.artifact_count, `${product.model} artifact_count`, 1);

    const sourceAsset = assetByName.get(product.bundle);
    if (!sourceAsset) {
      fail(`catalog bundle is absent from the source descriptor: ${product.bundle}`);
    }
    if (
      sourceAsset.size_bytes !== product.bundle_size_bytes ||
      sourceAsset.sha256 !== product.bundle_sha256
    ) {
      fail(`catalog bundle identity differs from the source descriptor: ${product.bundle}`);
    }
    if (models.has(product.model) || portalModels.has(product.portal_model)) {
      fail(`catalog contains a duplicate model mapping: ${product.model}/${product.portal_model}`);
    }
    models.add(product.model);
    portalModels.add(product.portal_model);
    bundleNames.push(product.bundle);
  }

  const descriptorBundles = descriptor.assets
    .map((asset) => asset.name)
    .filter((name) => name.endsWith('.tar.gz'));
  assertExactStrings(bundleNames, descriptorBundles, 'catalog bundle set');
  return catalog;
}

export function verifyReleaseDirectory(sourceDirectory, rawDescriptor) {
  const descriptor = validateSourceDescriptor(rawDescriptor);
  const assetByName = new Map(descriptor.assets.map((asset) => [asset.name, asset]));
  assertExactStrings(
    listTopLevelFiles(sourceDirectory),
    descriptor.assets.map((asset) => asset.name),
    'source directory asset set'
  );

  for (const asset of descriptor.assets) {
    const assetPath = path.join(sourceDirectory, asset.name);
    const stat = fs.statSync(assetPath);
    if (stat.size !== asset.size_bytes) {
      fail(`${asset.name} size mismatch; expected ${asset.size_bytes}, found ${stat.size}`);
    }
    const digest = sha256File(assetPath);
    if (digest !== asset.sha256) {
      fail(`${asset.name} digest mismatch; expected ${asset.sha256}, found ${digest}`);
    }
  }

  const outerChecksums = parseChecksumFile(
    fs.readFileSync(path.join(sourceDirectory, 'SHA256SUMS'), 'utf8'),
    'outer SHA256SUMS'
  );
  const expectedOuterNames = descriptor.assets
    .map((asset) => asset.name)
    .filter((name) => name !== 'SHA256SUMS');
  assertExactStrings(outerChecksums.keys(), expectedOuterNames, 'outer SHA256SUMS paths');
  for (const name of expectedOuterNames) {
    if (outerChecksums.get(name) !== assetByName.get(name).sha256) {
      fail(`outer SHA256SUMS digest differs from the source descriptor for ${name}`);
    }
  }

  const catalog = validateCatalog(
    readJson(path.join(sourceDirectory, 'catalog.json'), 'catalog.json'),
    descriptor,
    assetByName
  );
  return { descriptor, catalog };
}

function listArchiveEntries(archivePath) {
  const result = spawnSync('tar', ['-tzf', archivePath], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    fail(`cannot list ${path.basename(archivePath)} (${result.stderr.trim()})`);
  }
  const entries = result.stdout.trimEnd().split('\n').filter(Boolean);
  if (entries.length === 0) {
    fail(`archive is empty: ${path.basename(archivePath)}`);
  }
  const unique = new Set();
  for (const entry of entries) {
    const normalized = entry.endsWith('/') ? entry.slice(0, -1) : entry;
    assertSafeRelativePath(normalized, `${path.basename(archivePath)} member`);
    if (unique.has(normalized)) {
      fail(`archive contains a duplicate member: ${normalized}`);
    }
    unique.add(normalized);
  }
  return unique;
}

function extractArchive(archivePath, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', outputDirectory], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    fail(`cannot extract ${path.basename(archivePath)} (${result.stderr.trim()})`);
  }
}

function listFilesRecursively(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
    const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
    const fullPath = path.join(directory, relativePath);
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      fail(`extracted archive contains a symbolic link: ${relativePath}`);
    }
    if (stat.isDirectory()) {
      files.push(...listFilesRecursively(directory, relativePath));
    } else if (stat.isFile()) {
      files.push(relativePath);
    } else {
      fail(`extracted archive contains a non-regular entry: ${relativePath}`);
    }
  }
  return files;
}

function validateTarget(target, artifactLabel, stageConfig) {
  assertObject(target, `${artifactLabel} target`);
  assertSafeId(target.target_id, `${artifactLabel} target_id`);
  assertString(target.label, `${artifactLabel} target ${target.target_id} label`);
  assertString(target.unit, `${artifactLabel} target ${target.target_id} unit`);
  assertObject(target.availability, `${artifactLabel} target ${target.target_id} availability`);
  assertString(
    target.availability.status,
    `${artifactLabel} target ${target.target_id} availability status`
  );
  if (!Array.isArray(target.panels)) {
    fail(`${artifactLabel} target ${target.target_id} panels must be an array`);
  }
  const isExported = stageConfig.exported_target_ids.includes(target.target_id);
  if (!['available', 'unavailable', 'not_exported'].includes(target.availability.status)) {
    fail(`${artifactLabel} target ${target.target_id} has an unsupported availability status`);
  }
  if (!isExported && target.availability.status !== 'not_exported') {
    fail(`${artifactLabel} target ${target.target_id} must be marked not_exported`);
  }
  if (target.availability.status !== 'available' && target.panels.length !== 0) {
    fail(`${artifactLabel} target ${target.target_id} has panels despite being unavailable`);
  }
  const panelFacets = target.panels.map((panel) => panel.facet);
  if (new Set(panelFacets).size !== panelFacets.length) {
    fail(`${artifactLabel} target ${target.target_id} contains duplicate panel facets`);
  }
  for (const panel of target.panels) {
    assertObject(panel, `${artifactLabel} target ${target.target_id} panel`);
    if (!FACETS.has(panel.facet)) {
      fail(`${artifactLabel} target ${target.target_id} has unsupported facet ${panel.facet}`);
    }
    if (!Array.isArray(panel.posterior) || !Array.isArray(panel.observations)) {
      fail(`${artifactLabel} target ${target.target_id} panel arrays are incomplete`);
    }
    for (const point of panel.posterior) {
      assertObject(point, `${artifactLabel} posterior point`);
      assertInteger(point.year, `${artifactLabel} posterior year`, 1900);
      for (const quantile of ['q025', 'q250', 'q500', 'q750', 'q975']) {
        if (typeof point[quantile] !== 'number' || !Number.isFinite(point[quantile])) {
          fail(`${artifactLabel} posterior ${quantile} must be finite`);
        }
      }
      if (!(point.q025 <= point.q250 && point.q250 <= point.q500 && point.q500 <= point.q750 && point.q750 <= point.q975)) {
        fail(`${artifactLabel} posterior quantiles are not ordered`);
      }
      assertObject(point.stratum, `${artifactLabel} posterior stratum`);
    }
    for (const point of panel.observations) {
      assertObject(point, `${artifactLabel} observation point`);
      assertInteger(point.year, `${artifactLabel} observation year`, 1900);
      if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
        fail(`${artifactLabel} observation value must be finite`);
      }
      assertObject(point.stratum, `${artifactLabel} observation stratum`);
      if (!Array.isArray(point.public_source_ids) || point.public_source_ids.length === 0) {
        fail(`${artifactLabel} observation must identify at least one public source`);
      }
      for (const sourceId of point.public_source_ids) {
        assertString(sourceId, `${artifactLabel} observation public source ID`);
      }
    }
  }
}

function validateArtifact(rawArtifact, { product, manifest, location, stage }) {
  const artifact = assertObject(rawArtifact, `${product.model}/${location.id}/${stage}`);
  const label = `${product.model}/${location.id}/${stage}`;
  if (artifact.schema_version !== 'jheem-calibration/v1') {
    fail(`${label} has unsupported artifact schema ${artifact.schema_version}`);
  }
  if (
    artifact.artifact_id !== `${product.model}:${stage}:${location.id}` ||
    artifact.model !== product.model ||
    artifact.location !== location.id ||
    artifact.stage !== stage
  ) {
    fail(`${label} identity does not match its manifest path`);
  }
  assertObject(artifact.ensemble, `${label} ensemble`);
  if (artifact.ensemble.sample_count !== manifest.stages[stage].sample_count) {
    fail(`${label} sample count differs from the stage manifest`);
  }
  assertObject(artifact.simulation_source, `${label} simulation_source`);
  if (artifact.simulation_source.release !== manifest.stages[stage].simulation_release) {
    fail(`${label} simulation release differs from the stage manifest`);
  }
  if (!Array.isArray(artifact.targets) || artifact.targets.length === 0) {
    fail(`${label} targets must be a non-empty array`);
  }
  const targetIds = artifact.targets.map((target) => target.target_id);
  if (new Set(targetIds).size !== targetIds.length) {
    fail(`${label} contains duplicate target IDs`);
  }
  const stageConfig = manifest.stages[stage];
  assertExactStrings(targetIds, stageConfig.target_ids, `${label} target IDs`);
  for (const target of artifact.targets) {
    validateTarget(target, label, stageConfig);
  }
}

function validateExtractedProduct(productDirectory, product, releaseTag) {
  const internalChecksums = parseChecksumFile(
    fs.readFileSync(path.join(productDirectory, 'SHA256SUMS'), 'utf8'),
    `${product.model} SHA256SUMS`
  );
  assertExactStrings(
    listFilesRecursively(productDirectory),
    ['SHA256SUMS', ...internalChecksums.keys()],
    `${product.model} extracted file set`
  );
  for (const [relativePath, expectedDigest] of internalChecksums) {
    const digest = sha256File(path.join(productDirectory, relativePath));
    if (digest !== expectedDigest) {
      fail(`${product.model}/${relativePath} internal digest mismatch`);
    }
  }

  const manifestPath = path.join(productDirectory, 'manifest.json');
  if (sha256File(manifestPath) !== product.manifest_sha256) {
    fail(`${product.model} manifest digest differs from the release catalog`);
  }
  const manifest = assertObject(readJson(manifestPath, `${product.model} manifest`), 'manifest');
  if (
    manifest.schema_version !== 'jheem-calibration-manifest/v1' ||
    manifest.release !== releaseTag ||
    manifest.model !== product.model ||
    manifest.portal_model !== product.portal_model
  ) {
    fail(`${product.model} manifest release/model identity mismatch`);
  }
  if (
    manifest.locations?.index !== 'locations.json' ||
    manifest.locations?.count !== product.location_count ||
    manifest.locations?.artifact_pattern !== 'locations/{location}/{stage}.json'
  ) {
    fail(`${product.model} manifest location contract mismatch`);
  }
  const stageEntries = Object.entries(assertObject(manifest.stages, `${product.model} stages`));
  if (stageEntries.length !== 2 || stageEntries.some(([stage]) => !STAGES.has(stage))) {
    fail(`${product.model} must contain exactly the ehe and ryan-white stages`);
  }
  for (const [stage, stageConfig] of stageEntries) {
    assertObject(stageConfig, `${product.model} stage ${stage}`);
    assertInteger(stageConfig.sample_count, `${product.model} ${stage} sample_count`, 1);
    assertString(stageConfig.simulation_release, `${product.model} ${stage} simulation_release`);
    if (!Array.isArray(stageConfig.target_ids) || !Array.isArray(stageConfig.exported_target_ids)) {
      fail(`${product.model} ${stage} target lists are incomplete`);
    }
    for (const targetId of [...stageConfig.target_ids, ...stageConfig.exported_target_ids]) {
      assertSafeId(targetId, `${product.model} ${stage} target ID`);
    }
    if (new Set(stageConfig.target_ids).size !== stageConfig.target_ids.length) {
      fail(`${product.model} ${stage} contains duplicate target IDs`);
    }
    if (new Set(stageConfig.exported_target_ids).size !== stageConfig.exported_target_ids.length) {
      fail(`${product.model} ${stage} contains duplicate exported target IDs`);
    }
    if (stageConfig.exported_target_ids.some((targetId) => !stageConfig.target_ids.includes(targetId))) {
      fail(`${product.model} ${stage} exported target IDs are not a subset of target IDs`);
    }
  }

  const coverage = readJson(path.join(productDirectory, 'coverage.json'), `${product.model} coverage`);
  if (
    coverage.schema_version !== 'jheem-calibration-coverage/v1' ||
    coverage.release !== releaseTag ||
    coverage.model !== product.model ||
    coverage.complete !== true ||
    coverage.actual_location_count !== product.location_count ||
    coverage.expected_location_count !== product.location_count ||
    coverage.actual_artifact_count !== product.artifact_count ||
    coverage.expected_artifact_count !== product.artifact_count
  ) {
    fail(`${product.model} coverage is incomplete or differs from the release catalog`);
  }

  const locationIndex = readJson(
    path.join(productDirectory, 'locations.json'),
    `${product.model} locations`
  );
  if (
    locationIndex.schema_version !== 'jheem-calibration-location-index/v1' ||
    locationIndex.release !== releaseTag ||
    locationIndex.model !== product.model ||
    locationIndex.portal_model !== product.portal_model ||
    !Array.isArray(locationIndex.locations) ||
    locationIndex.locations.length !== product.location_count
  ) {
    fail(`${product.model} location index identity or count mismatch`);
  }

  const locationIds = new Set();
  for (const rawLocation of locationIndex.locations) {
    const location = assertObject(rawLocation, `${product.model} location`);
    assertSafeId(location.id, `${product.model} location id`);
    assertString(location.label, `${product.model} location ${location.id} label`);
    if (locationIds.has(location.id)) {
      fail(`${product.model} contains duplicate location ${location.id}`);
    }
    locationIds.add(location.id);
    const artifacts = assertObject(location.artifacts, `${product.model}/${location.id} artifacts`);
    assertExactStrings(Object.keys(artifacts), stageEntries.map(([stage]) => stage), `${product.model}/${location.id} stages`);
    for (const [stage, rawMetadata] of Object.entries(artifacts)) {
      const metadata = assertObject(rawMetadata, `${product.model}/${location.id}/${stage} metadata`);
      const expectedPath = `locations/${location.id}/${stage}.json`;
      if (metadata.path !== expectedPath) {
        fail(`${product.model}/${location.id}/${stage} artifact path mismatch`);
      }
      assertInteger(metadata.size_bytes, `${expectedPath} size_bytes`, 1);
      assertSha256(metadata.sha256, `${expectedPath} sha256`);
      const artifactPath = path.join(productDirectory, expectedPath);
      const stat = fs.statSync(artifactPath);
      if (stat.size !== metadata.size_bytes || sha256File(artifactPath) !== metadata.sha256) {
        fail(`${expectedPath} identity differs from the location index`);
      }
      validateArtifact(readJson(artifactPath, expectedPath), {
        product,
        manifest,
        location,
        stage,
      });
    }
  }

  return {
    model: product.model,
    portal_model: product.portal_model,
    path: `${product.model}/`,
    manifest: `${product.model}/manifest.json`,
    locations: `${product.model}/locations.json`,
    coverage: `${product.model}/coverage.json`,
    location_count: product.location_count,
    artifact_count: product.artifact_count,
    display_facets: ['total', 'age'],
    withheld_facets: ['race', 'sex'],
    stages: Object.fromEntries(
      stageEntries.map(([stage, config]) => [stage, {
        label: config.label,
        sample_count: config.sample_count,
        simulation_release: config.simulation_release,
        target_ids: config.target_ids,
        exported_target_ids: config.exported_target_ids,
      }])
    ),
  };
}

export function stageCalibrationRelease({ sourceDirectory, outputDirectory, rawDescriptor }) {
  const { descriptor, catalog } = verifyReleaseDirectory(sourceDirectory, rawDescriptor);
  if (fs.existsSync(outputDirectory)) {
    fail(`output directory already exists: ${outputDirectory}`);
  }

  const parent = path.dirname(path.resolve(outputDirectory));
  fs.mkdirSync(parent, { recursive: true });
  const stagingDirectory = fs.mkdtempSync(
    path.join(parent, `.${path.basename(outputDirectory)}.tmp-`)
  );
  try {
    fs.copyFileSync(
      path.join(sourceDirectory, 'catalog.json'),
      path.join(stagingDirectory, 'catalog.json')
    );
    const products = [];
    for (const product of catalog.products) {
      const archivePath = path.join(sourceDirectory, product.bundle);
      const archiveEntries = listArchiveEntries(archivePath);
      for (const required of ['SHA256SUMS', 'coverage.json', 'locations.json', 'manifest.json']) {
        if (!archiveEntries.has(required)) {
          fail(`${product.bundle} is missing ${required}`);
        }
      }
      const productDirectory = path.join(stagingDirectory, product.model);
      extractArchive(archivePath, productDirectory);
      products.push(validateExtractedProduct(productDirectory, product, descriptor.tag));
    }

    const portalIndex = {
      schema_version: 'jheem-calibration-portal-index/v1',
      release: descriptor.tag,
      source: {
        repository: descriptor.repository,
        release_id: descriptor.release_id,
        tag: descriptor.tag,
        tag_commit: descriptor.tag_commit,
        immutable: descriptor.immutable,
      },
      destination_prefix: descriptor.destination_prefix,
      products,
    };
    fs.writeFileSync(
      path.join(stagingDirectory, 'index.json'),
      `${JSON.stringify(portalIndex, null, 2)}\n`
    );
    fs.renameSync(stagingDirectory, outputDirectory);
    return portalIndex;
  } catch (error) {
    fs.rmSync(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}
