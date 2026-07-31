import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCustomSimulationQuery } from '../src/utils/customSimulationUrl.ts';
import { buildCustomSimulationScenarioKey } from '../src/utils/customSimulationScenario.ts';
import { describeScenarioTimeline, formatModelTime } from '../src/utils/modelTimeline.ts';

test('builds a city custom-simulation URL', () => {
  assert.equal(
    mergeCustomSimulationQuery('/ryan-white/custom', 'loc=C.12580&a=55'),
    '/ryan-white/custom?loc=C.12580&a=55'
  );
});

test('preserves the AJPH model when adding a location', () => {
  const href = mergeCustomSimulationQuery(
    '/ryan-white-state-level/custom?model=ajph',
    'loc=AL'
  );
  const parsed = new URL(href, 'https://jheem.org');

  assert.equal(href, '/ryan-white-state-level/custom?model=ajph&loc=AL');
  assert.equal(parsed.searchParams.get('model'), 'ajph');
  assert.equal(parsed.searchParams.get('loc'), 'AL');
});

test('preserves the CROI model and all custom parameters', () => {
  const href = mergeCustomSimulationQuery(
    '/ryan-white-state-level/custom?model=croi',
    'loc=CA&a=65&o=35&r=45'
  );
  const parsed = new URL(href, 'https://jheem.org');

  assert.equal(parsed.searchParams.get('model'), 'croi');
  assert.equal(parsed.searchParams.get('loc'), 'CA');
  assert.equal(parsed.searchParams.get('a'), '65');
  assert.equal(parsed.searchParams.get('o'), '35');
  assert.equal(parsed.searchParams.get('r'), '45');
});

test('returns the base route unchanged when there are no dynamic parameters', () => {
  assert.equal(
    mergeCustomSimulationQuery('/ryan-white-state-level/custom?model=ajph', ''),
    '/ryan-white-state-level/custom?model=ajph'
  );
});

test('preserves legacy parameter-only cache keys when no prefix is configured', () => {
  const scenarioKey = buildCustomSimulationScenarioKey(
    {
      interventionType: 'permanent_cessation',
      timing: {
        interventionStartTime: 2025.5,
        lossLagYears: 0.25,
        simulationStartYear: 2025,
        simulationEndYear: 2035,
        reportingStartYear: 2025,
        reportingEndYear: 2030,
      },
      parameters: [
        { id: 'adap_loss', label: 'ADAP', keyPrefix: 'a', default: 50, unit: '%' },
        { id: 'oahs_loss', label: 'OAHS', keyPrefix: 'o', default: 30, unit: '%' },
      ],
    },
    { adap_loss: 40, oahs_loss: 20 },
  );

  assert.equal(scenarioKey, 'a40-o20');
});

test('prefixes corrected CROI cache keys so stale artifacts cannot be reused', () => {
  const scenarioKey = buildCustomSimulationScenarioKey(
    {
      interventionType: 'permanent_cessation',
      cacheKeyPrefix: 't2026',
      timing: {
        interventionStartTime: 2026.5,
        lossLagYears: 0.25,
        simulationStartYear: 2026,
        simulationEndYear: 2036,
        reportingStartYear: 2026,
        reportingEndYear: 2031,
      },
      parameters: [
        { id: 'adap_loss', label: 'ADAP', keyPrefix: 'a', default: 50, unit: '%' },
        { id: 'oahs_loss', label: 'OAHS', keyPrefix: 'o', default: 30, unit: '%' },
      ],
    },
    { adap_loss: 40, oahs_loss: 20 },
  );

  assert.equal(scenarioKey, 't2026-a40-o20');
});

test('formats fractional model years as calendar months', () => {
  assert.equal(formatModelTime(2025.5), 'July 2025');
  assert.equal(formatModelTime(2025.75), 'October 2025');
  assert.equal(formatModelTime(2029), 'January 2029');
});

test('describes temporary interruption and recovery timing', () => {
  assert.equal(
    describeScenarioTimeline({
      id: 'brief_interruption',
      label: 'Brief Interruption',
      description: '18-month funding gap',
      timeline: {
        serviceInterruptionStartTime: 2025.5,
        suppressionEffectStartTime: 2025.75,
        serviceResumeTime: 2027,
        suppressionRecoveryEndTime: 2028,
      },
    }),
    'Services stop in July 2025. Modeled suppression changes begin in October 2025. ' +
      'Services resume in January 2027. The modeled suppression effect phases out by January 2028.'
  );
});
