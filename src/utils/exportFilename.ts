/**
 * Generate comprehensive filename for data exports
 */
export function generateExportFilename(
  locationName: string,
  scenario: string,
  outcome: string,
  statistic: string,
  facet: string,
  extension: 'csv' | 'png'
): string {
  const sanitize = (str: string) =>
    str
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

  const parts = [
    sanitize(locationName.split(',')[0]),
    sanitize(scenario),
    sanitize(outcome),
    sanitize(
      statistic
        .replace('mean.and.interval', 'mean_CI')
        .replace('median.and.interval', 'median_CI')
        .replace('individual.simulation', 'sims')
    ),
  ];

  if (facet && facet !== 'none') {
    parts.push(`by_${sanitize(facet)}`);
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  parts.push(timestamp);

  return `${parts.join('_')}.${extension}`;
}
