import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateProductionAudit } from './lib/production-audit-policy.mjs';

const documentedSharpAdvisory = 'https://github.com/advisories/GHSA-f88m-g3jw-g9cj';

function reportWith(vulnerabilities) {
  return { vulnerabilities };
}

function sharpFinding(severity = 'high', url = documentedSharpAdvisory) {
  return {
    severity,
    via: [{ url }],
  };
}

test('allows only the documented high Sharp path through Next', () => {
  const result = evaluateProductionAudit(
    reportWith({
      next: { severity: 'high', via: ['sharp'] },
      sharp: sharpFinding(),
    })
  );

  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.allowed.sort(), ['next (high)', 'sharp (high)']);
});

test('blocks a new Sharp advisory', () => {
  const result = evaluateProductionAudit(
    reportWith({
      next: { severity: 'high', via: ['sharp'] },
      sharp: sharpFinding('high', 'https://github.com/advisories/GHSA-new-finding'),
    })
  );

  assert.deepEqual(result.allowed, []);
  assert.deepEqual(result.blocking.sort(), ['next (high)', 'sharp (high)']);
});

test('blocks the documented advisory if its severity becomes critical', () => {
  const result = evaluateProductionAudit(
    reportWith({
      sharp: sharpFinding('critical'),
    })
  );

  assert.deepEqual(result.allowed, []);
  assert.deepEqual(result.blocking, ['sharp (critical)']);
});

test('blocks unrelated high findings and ignores moderate findings', () => {
  const result = evaluateProductionAudit(
    reportWith({
      unrelated: { severity: 'high', via: [{ url: 'https://example.test/advisory' }] },
      moderate: { severity: 'moderate', via: [{ url: 'https://example.test/moderate' }] },
    })
  );

  assert.deepEqual(result.allowed, []);
  assert.deepEqual(result.blocking, ['unrelated (high)']);
});
