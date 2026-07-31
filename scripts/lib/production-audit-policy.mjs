export const allowedProductionAdvisories = new Set([
  'https://github.com/advisories/GHSA-f88m-g3jw-g9cj',
]);

export function evaluateProductionAudit(report) {
  const vulnerabilities = report.vulnerabilities ?? {};

  function isAllowed(name, seen = new Set()) {
    if (seen.has(name)) return false;
    seen.add(name);

    const vulnerability = vulnerabilities[name];
    if (!vulnerability || !Array.isArray(vulnerability.via)) return false;

    if (name === 'sharp') {
      return (
        vulnerability.via.length > 0 &&
        vulnerability.via.every(
          (entry) =>
            typeof entry === 'object' &&
            entry !== null &&
            allowedProductionAdvisories.has(entry.url)
        )
      );
    }

    if (name === 'next') {
      return (
        vulnerability.via.length > 0 &&
        vulnerability.via.every(
          (entry) => typeof entry === 'string' && isAllowed(entry, new Set(seen))
        )
      );
    }

    return false;
  }

  const blocking = [];
  const allowed = [];

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (!['high', 'critical'].includes(vulnerability.severity)) continue;

    if (vulnerability.severity === 'high' && isAllowed(name)) {
      allowed.push(`${name} (${vulnerability.severity})`);
    } else {
      blocking.push(`${name} (${vulnerability.severity})`);
    }
  }

  return { allowed, blocking };
}
