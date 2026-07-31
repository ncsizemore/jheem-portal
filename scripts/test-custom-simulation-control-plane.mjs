import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCustomSimulationRequestId,
  buildCustomSimulationRunTitle,
  isCanonicalCustomSimulationScenarioKey,
} from '../src/utils/customSimulationRequest.ts';
import {
  CUSTOM_SIMULATION_PARAMETER_MAX,
  CUSTOM_SIMULATION_PARAMETER_MIN,
  CUSTOM_SIMULATION_PARAMETER_STEP,
  normalizeCustomSimulationParameterValue,
  normalizeCustomSimulationParameters,
  parseCustomSimulationAction,
} from '../src/utils/customSimulationInput.ts';
import { selectCustomSimulationProgress } from '../src/utils/customSimulationProgress.ts';

const customSimulation = {
  cacheKeyPrefix: 't2026',
  parameters: [
    { id: 'adap_loss', keyPrefix: 'a', default: 50, label: 'ADAP', unit: '%' },
    { id: 'oahs_loss', keyPrefix: 'o', default: 30, label: 'OAHS', unit: '%' },
    { id: 'other_loss', keyPrefix: 'r', default: 40, label: 'Other', unit: '%' },
  ],
};

test('builds the cross-repository v1 request identity and exact run title', () => {
  const requestId = buildCustomSimulationRequestId(
    'ryan-white-state-croi',
    'AL',
    't2026-a50-o30-r40',
  );
  assert.equal(requestId, 'v1:ryan-white-state-croi:AL:t2026-a50-o30-r40');
  assert.equal(
    buildCustomSimulationRunTitle(requestId),
    'custom-sim: v1:ryan-white-state-croi:AL:t2026-a50-o30-r40',
  );
});

test('treats an omitted action as lookup, never launch', () => {
  assert.equal(parseCustomSimulationAction(undefined), 'lookup');
  assert.equal(parseCustomSimulationAction('lookup'), 'lookup');
  assert.equal(parseCustomSimulationAction('launch'), 'launch');
  assert.equal(parseCustomSimulationAction('run'), null);
});

test('normalizes omitted configured parameters to backend defaults', () => {
  assert.deepEqual(normalizeCustomSimulationParameters(customSimulation, { adap_loss: 25 }), {
    ok: true,
    parameters: { adap_loss: 25, oahs_loss: 30, other_loss: 40 },
  });
});

test('rejects unknown, fractional, and out-of-range parameters', () => {
  assert.equal(normalizeCustomSimulationParameters(customSimulation, { surprise: 1 }).ok, false);
  assert.equal(normalizeCustomSimulationParameters(customSimulation, { adap_loss: 10.5 }).ok, false);
  assert.equal(normalizeCustomSimulationParameters(customSimulation, { adap_loss: 101 }).ok, false);
});

test('shares the whole-percentage parameter contract with URL controls', () => {
  assert.equal(CUSTOM_SIMULATION_PARAMETER_MIN, 0);
  assert.equal(CUSTOM_SIMULATION_PARAMETER_MAX, 100);
  assert.equal(CUSTOM_SIMULATION_PARAMETER_STEP, 1);
  assert.equal(normalizeCustomSimulationParameterValue(1), 1);
  assert.equal(normalizeCustomSimulationParameterValue(2.6), 3);
  assert.equal(normalizeCustomSimulationParameterValue(-5), 0);
  assert.equal(normalizeCustomSimulationParameterValue(105), 100);
  assert.equal(normalizeCustomSimulationParameterValue(Number.NaN), null);
});

test('allows progress to restart with new units when the phase changes', () => {
  assert.deepEqual(
    selectCustomSimulationProgress(
      { phase: 'simulating', percent: 86, simsComplete: 69, simsTotal: 80 },
      { phase: 'extracting', percent: 2, filesComplete: 3, filesTotal: 140 },
      'simulating',
      'extracting',
    ),
    { phase: 'extracting', percent: 2, filesComplete: 3, filesTotal: 140 },
  );
});

test('prevents percentage regression within one progress phase', () => {
  const previous = { phase: 'simulating', percent: 86, simsComplete: 69, simsTotal: 80 };
  assert.equal(
    selectCustomSimulationProgress(
      previous,
      { phase: 'simulating', percent: 80, simsComplete: 64, simsTotal: 80 },
      'simulating',
      'simulating',
    ),
    previous,
  );
});

test('clears stale detail when the workflow advances without new fine-grained progress', () => {
  assert.equal(
    selectCustomSimulationProgress(
      { phase: 'simulating', percent: 100, simsComplete: 80, simsTotal: 80 },
      null,
      'simulating',
      'extracting',
    ),
    null,
  );
});

test('retains accepted detail when a later status poll regresses', () => {
  const previous = { phase: 'extracting', percent: 40, filesComplete: 56, filesTotal: 140 };
  assert.equal(
    selectCustomSimulationProgress(previous, null, 'extracting', 'extracting'),
    previous,
  );
});

test('validates canonical scenario keys exactly', () => {
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 't2026-a0-o30-r100'), true);
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 'a0-o30-r100'), false);
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 't2026-a00-o30-r100'), false);
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 't2026-a0-o30-r101'), false);
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 't2026-a0-r100-o30'), false);
});
