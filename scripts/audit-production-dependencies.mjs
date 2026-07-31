import { spawnSync } from 'node:child_process';
import { evaluateProductionAudit } from './lib/production-audit-policy.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const audit = spawnSync(npmCommand, ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
});

if (audit.error) {
  console.error('Failed to run npm audit:', audit.error);
  process.exit(1);
}

if (audit.signal) {
  console.error(`npm audit terminated by signal ${audit.signal}.`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error('npm audit did not return valid JSON.');
  console.error(audit.stderr || audit.stdout);
  process.exit(1);
}

if (report.error || (audit.status !== 0 && !report.vulnerabilities)) {
  console.error('npm audit failed before returning a vulnerability report.');
  console.error(JSON.stringify(report.error ?? report));
  process.exit(1);
}

const { allowed, blocking } = evaluateProductionAudit(report);

if (allowed.length > 0) {
  console.log(`Allowed documented production findings: ${allowed.join(', ')}`);
}

if (blocking.length > 0) {
  console.error(`Blocking production dependency findings: ${blocking.join(', ')}`);
  process.exit(1);
}

console.log('Production dependency audit passed.');
