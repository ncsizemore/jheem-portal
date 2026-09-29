import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateProductionAudit } from './lib/production-audit-policy.mjs';

function reportWith(vulnerabilities) {
  return { vulnerabilities };
}

test('blocks high transitive findings reported against both parent and child packages', () => {
  const result = evaluateProductionAudit(
    reportWith({
      next: { severity: 'high', via: ['sharp'] },
      sharp: {
        severity: 'high',
        via: [{ url: 'https://github.com/advisories/GHSA-example' }],
      },
    })
  );

  assert.deepEqual(result.allowed, []);
  assert.deepEqual(result.blocking.sort(), ['next (high)', 'sharp (high)']);
});

test('blocks critical findings', () => {
  const result = evaluateProductionAudit(
    reportWith({
      critical: { severity: 'critical', via: [] },
    })
  );

  assert.deepEqual(result.allowed, []);
  assert.deepEqual(result.blocking, ['critical (critical)']);
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
