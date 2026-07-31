import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCustomSimulationRequestId,
  buildCustomSimulationRunTitle,
  isCanonicalCustomSimulationScenarioKey,
} from '../src/utils/customSimulationRequest.ts';
import {
  normalizeCustomSimulationParameters,
  parseCustomSimulationAction,
} from '../src/utils/customSimulationInput.ts';

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

test('validates canonical scenario keys exactly', () => {
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 't2026-a0-o30-r100'), true);
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 'a0-o30-r100'), false);
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 't2026-a00-o30-r100'), false);
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 't2026-a0-o30-r101'), false);
  assert.equal(isCanonicalCustomSimulationScenarioKey(customSimulation, 't2026-a0-r100-o30'), false);
});
