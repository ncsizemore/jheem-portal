/**
 * Export chart panel data to CSV
 */
import type { FacetPanel } from '@/types/native-plotting';
import { generateExportFilename } from './exportFilename';

export interface CsvExportOptions {
  panels: FacetPanel[];
  locationName: string;
  scenario: string;
  outcome: string;
  statistic: string;
  facet: string;
}

export function exportToCsv({
  panels,
  locationName,
  scenario,
  outcome,
  statistic,
  facet,
}: CsvExportOptions): void {
  if (!panels.length) return;

  const rows: string[] = [];
  const isFaceted = panels.length > 1;

  // Header row
  const headers = isFaceted
    ? ['Facet', 'Year', 'Intervention', 'Intervention Lower', 'Intervention Upper', 'Baseline', 'Baseline Lower', 'Baseline Upper']
    : ['Year', 'Intervention', 'Intervention Lower', 'Intervention Upper', 'Baseline', 'Baseline Lower', 'Baseline Upper'];
  rows.push(headers.join(','));

  // Data rows
  for (const panel of panels) {
    for (const point of panel.data) {
      const values = isFaceted
        ? [
            `"${panel.facetLabel}"`,
            point.year,
            point.value ?? '',
            point.lower ?? '',
            point.upper ?? '',
            point.baselineValue ?? '',
            point.baselineLower ?? '',
            point.baselineUpper ?? '',
          ]
        : [
            point.year,
            point.value ?? '',
            point.lower ?? '',
            point.upper ?? '',
            point.baselineValue ?? '',
            point.baselineLower ?? '',
            point.baselineUpper ?? '',
          ];
      rows.push(values.join(','));
    }
  }

  // Create and download file
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateExportFilename(locationName, scenario, outcome, statistic, facet, 'csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
