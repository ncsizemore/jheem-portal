export function evaluateProductionAudit(report) {
  const vulnerabilities = report.vulnerabilities ?? {};

  const blocking = [];

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (!['high', 'critical'].includes(vulnerability.severity)) continue;
    blocking.push(`${name} (${vulnerability.severity})`);
  }

  return { allowed: [], blocking };
}
