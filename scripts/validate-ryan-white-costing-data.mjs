import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const metadata = readJson(path.join(repoRoot, 'src/data/ryan-white-costing/metadata.json'));
const summary = readJson(path.join(repoRoot, 'src/data/ryan-white-costing/summary.json'));
const series = readJson(path.join(repoRoot, 'public/data/ryan-white-costing/series.json'));

const scenarios = ['low', 'median', 'high'];
const expectedYears = range(metadata.horizon.startYear, metadata.horizon.endYear);

assert(metadata.dataContractVersion === '2.2.0', 'unexpected data contract version');
assert(metadata.primaryEstimand === 'pooled', 'pooled results are not the primary estimand');
assert(summary.sensitivity.primaryEstimand === 'pooled', 'summary primary estimand is not pooled');
assert(metadata.simulationDraws === 1000, 'expected 1,000 simulation draws');
assert(
  metadata.modeledJurisdictionCount === metadata.modeledJurisdictions.length,
  'modeled jurisdiction count does not match its list'
);
assert(new Set(metadata.modeledJurisdictions).size === metadata.modeledJurisdictions.length, 'duplicate jurisdiction');
assert(metadata.modeledJurisdictions.includes('DC'), 'DC is missing from modeled jurisdictions');
assert(metadata.excludedFundingLocations.length === 0, 'a funding location is unexpectedly excluded');

for (const [label, artifact] of Object.entries(metadata.sourceArtifacts)) {
  assert(!path.isAbsolute(artifact.fileName), `${label} provenance exposes an absolute path`);
  assert(/^[0-9a-f]{64}$/.test(artifact.sha256), `${label} has an invalid SHA-256`);
}
assert(
  metadata.sourceArtifacts.generator.sha256 === sha256File(path.join(repoRoot, 'scripts/generate-ryan-white-costing-data.R')),
  'generator provenance hash does not match the checked-in exporter'
);
assert(
  metadata.sourceArtifacts.jurisdictionContextCsv.sha256 ===
    sha256File(path.join(repoRoot, 'scripts/data/ryan-white-costing-jurisdiction-context.csv')),
  'jurisdiction context provenance hash does not match the checked-in CSV'
);
assert(
  metadata.sourceArtifacts.artPriceCsv.sha256 ===
    sha256File(path.join(repoRoot, 'scripts/data/ryan-white-costing-art-price-tiers.csv')),
  'ART price provenance hash does not match the checked-in CSV'
);
assert(
  metadata.sourceArtifacts.fundingCsv.sha256 ===
    sha256File(path.join(repoRoot, 'scripts/data/ryan-white-costing-funding.csv')),
  'funding provenance hash does not match the checked-in CSV'
);

const validation = metadata.validation;
assert(validation.totalEqualsJurisdictionSum, 'RData Total does not equal the jurisdiction sum');
assert(validation.totalEqualsJurisdictionSumMaxAbsDiff <= 1e-6, 'RData Total closure exceeds tolerance');
assert(validation.incidenceArrayMatchesTotalResults, 'total.incidence disagrees with total.results incidence');
assert(validation.diagnosisArrayMatchesTotalResults, 'total.new disagrees with total.results new diagnoses');
assert(validation.missingFundingLocations.length === 0, 'modeled jurisdictions are missing funding data');
assert(validation.extraFundingLocations.length === 0, 'funding data contains unmodeled locations');

const summaryJurisdictions = summary.states.map((item) => item.state);
const seriesJurisdictions = Object.keys(series.states);
assertSameSet(summaryJurisdictions, metadata.modeledJurisdictions, 'summary jurisdictions');
assertSameSet(seriesJurisdictions, metadata.modeledJurisdictions, 'series jurisdictions');
assert(summary.states.length === metadata.modeledJurisdictionCount, 'summary jurisdiction count mismatch');

validateSeries('national', series.national, summary.national.finalYear);
for (const jurisdiction of summary.states) {
  validateSeries(jurisdiction.state, series.states[jurisdiction.state], jurisdiction.finalYear);
  const transmissionRate = jurisdiction.baselineContext.sexualTransmissionRate;
  assert(
    Number.isFinite(transmissionRate) && transmissionRate >= 0 && transmissionRate < 100,
    `${jurisdiction.state} transmission rate is outside a plausible derived-rate range`
  );
  assert(
    Number.isFinite(jurisdiction.baselineContext.baselineNewInfections),
    `${jurisdiction.state} baseline infections are missing`
  );
  assert(
    Number.isFinite(jurisdiction.baselineContext.adapSpendingPerClient) &&
      jurisdiction.baselineContext.adapSpendingPerClient > 0,
    `${jurisdiction.state} ADAP spending per client is invalid`
  );
  assert(
    Number.isFinite(jurisdiction.baselineContext.diagnosedHivWeightedUrbanicity) &&
      jurisdiction.baselineContext.diagnosedHivWeightedUrbanicity >= 0 &&
      jurisdiction.baselineContext.diagnosedHivWeightedUrbanicity <= 1,
    `${jurisdiction.state} urbanicity is outside 0-1`
  );
  assert(
    typeof jurisdiction.baselineContext.medicaidExpansion === 'boolean',
    `${jurisdiction.state} Medicaid expansion status is invalid`
  );
  validatePooledFinal(jurisdiction.pooledFinalYear, jurisdiction.finalYear, jurisdiction.state);
}

const nationalFinal = summary.national.finalYear;
validatePooledFinal(summary.national.pooledFinalYear, nationalFinal, 'national');
assert(
  nationalFinal.cumulativeExcessInfections.median !== nationalFinal.cumulativeExcessNewDiagnoses.median,
  'national infections and diagnoses are incorrectly identical'
);

for (const [index, nationalPoint] of series.national.entries()) {
  const jurisdictionAdap = summary.states.reduce(
    (sum, jurisdiction) => sum + series.states[jurisdiction.state][index].cumulativeAdapSpendingAvoided,
    0
  );
  assertNear(
    nationalPoint.cumulativeAdapSpendingAvoided,
    jurisdictionAdap,
    metadata.modeledJurisdictionCount,
    `national ADAP funding does not sum at ${nationalPoint.year}`
  );
}

console.log(
  [
    `Ryan White costing data contract ${metadata.dataContractVersion} validated`,
    `${metadata.modeledJurisdictionCount} modeled jurisdictions including DC`,
    `${expectedYears.length} annual points`,
    `${formatNumber(nationalFinal.cumulativeExcessInfections.median)} excess infections`,
    `${formatNumber(nationalFinal.cumulativeExcessNewDiagnoses.median)} excess diagnoses`,
  ].join(' | ')
);

function validateSeries(label, points, finalSummary) {
  assert(Array.isArray(points), `${label} series is missing`);
  assert(points.length === expectedYears.length, `${label} series length mismatch`);
  assert(
    points.every((point, index) => point.year === expectedYears[index]),
    `${label} series years are not contiguous`
  );

  for (const point of points) {
    validateQuantile(point.cumulativeExcessInfections, `${label} ${point.year} infections`);
    validateQuantile(point.cumulativeExcessNewDiagnoses, `${label} ${point.year} diagnoses`);
    assert('negativeExcessNewShare' in point === false, `${label} retains ambiguous negativeExcessNewShare`);

    for (const scenario of scenarios) {
      const care = point.cumulativeCareCost[scenario];
      const net = point.cumulativeNetCostVsAdap[scenario];
      validateQuantile(care, `${label} ${point.year} ${scenario} care`);
      validateQuantile(net, `${label} ${point.year} ${scenario} net`);
      for (const quantile of ['lower', 'median', 'upper']) {
        assertNear(
          care[quantile] - point.cumulativeAdapSpendingAvoided,
          net[quantile],
          1,
          `${label} ${point.year} ${scenario} ${quantile} net-cost identity failed`
        );
      }
    }
    validateQuantile(point.pooledCumulativeCareCost, `${label} ${point.year} pooled care`);
    validateQuantile(point.pooledCumulativeNetCostVsAdap, `${label} ${point.year} pooled net`);
  }

  const finalPoint = points.at(-1);
  assert(finalPoint.year === finalSummary.year, `${label} final year mismatch`);
  assertDeepEqual(
    finalPoint.cumulativeExcessInfections,
    finalSummary.cumulativeExcessInfections,
    `${label} final infections differ between series and summary`
  );
  assertDeepEqual(
    finalPoint.cumulativeExcessNewDiagnoses,
    finalSummary.cumulativeExcessNewDiagnoses,
    `${label} final diagnoses differ between series and summary`
  );

  for (const scenario of scenarios) {
    const grossPerDollar = finalSummary.cumulativeCareCost[scenario].median /
      finalSummary.cumulativeAdapSpendingAvoided;
    const netPerDollar = finalSummary.cumulativeNetCostRatioVsAdap[scenario].median;
    assertNear(grossPerDollar, netPerDollar + 1, 0.002, `${label} ${scenario} gross/net ratio identity failed`);
  }
}

function validatePooledFinal(pooled, final, label) {
  validateQuantile(pooled.cumulativeCareCost, `${label} pooled care`);
  validateQuantile(pooled.cumulativeNetCostVsAdap, `${label} pooled net`);
  validateQuantile(pooled.cumulativeNetCostRatioVsAdap, `${label} pooled ratio`);
  assert(
    pooled.shareNetCostPositiveVsAdap >= 0 && pooled.shareNetCostPositiveVsAdap <= 1,
    `${label} pooled positive share is outside 0-1`
  );
  const expectedRatio = pooled.cumulativeNetCostVsAdap.median / final.cumulativeAdapSpendingAvoided;
  assertNear(
    pooled.cumulativeNetCostRatioVsAdap.median,
    expectedRatio,
    0.002,
    `${label} pooled net ratio identity failed`
  );
}

function validateQuantile(value, label) {
  assert(Number.isFinite(value.lower), `${label} lower is not finite`);
  assert(Number.isFinite(value.median), `${label} median is not finite`);
  assert(Number.isFinite(value.upper), `${label} upper is not finite`);
  assert(value.lower <= value.median && value.median <= value.upper, `${label} quantiles are out of order`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNear(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: ${actual} vs ${expected} (tolerance ${tolerance})`);
  }
}

function assertSameSet(actual, expected, label) {
  assert(actual.length === expected.length, `${label} length mismatch`);
  const actualSet = new Set(actual);
  assert(expected.every((item) => actualSet.has(item)), `${label} members mismatch`);
}

function assertDeepEqual(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}
