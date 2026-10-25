import type { FacetPanel } from '@/types/native-plotting';
import type { AnalysisExportContext } from './analysisExport';
import { downloadBlob, exportMetadata } from './analysisExport';
import { generateExportFilename } from './exportFilename';
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function buildResultsCsv(
  panels: FacetPanel[],
  context: AnalysisExportContext,
): string {
  const rows: unknown[][] = [
    [
      'Group',
      'Year',
      'Series',
      'Simulation',
      'Value',
      'Lower 95%',
      'Upper 95%',
      'Units',
      'Source',
      'Source URL',
    ],
  ];
  for (const panel of panels) {
    for (const point of panel.data) {
      if (point.value != null)
        rows.push([
          panel.facetLabel,
          point.year,
          context.scenario,
          '',
          point.value,
          point.lower,
          point.upper,
          context.units,
          'Model',
          context.url,
        ]);
      if (point.baselineValue != null)
        rows.push([
          panel.facetLabel,
          point.year,
          'Baseline',
          '',
          point.baselineValue,
          point.baselineLower,
          point.baselineUpper,
          context.units,
          'Model',
          context.url,
        ]);
    }
    for (const line of panel.individualSimulations ?? []) {
      for (const point of line.points)
        rows.push([
          panel.facetLabel,
          point.year,
          line.simset,
          line.simId,
          point.value,
          '',
          '',
          context.units,
          'Model',
          context.url,
        ]);
    }
    for (const obs of panel.observations)
      rows.push([
        panel.facetLabel,
        obs.year,
        'Observed',
        '',
        obs.value,
        '',
        '',
        context.units,
        obs.source,
        obs.url,
      ]);
  }
  return (
    exportMetadata(context)
      .map((line) => `# ${line.replace(/[\r\n]+/g, ' ')}`)
      .join('\n') +
    '\n' +
    rows.map((row) => row.map(csvCell).join(',')).join('\n')
  );
}
export function exportToCsv(o: {
  panels: FacetPanel[];
  locationName: string;
  scenario: string;
  outcome: string;
  statistic: string;
  facet: string;
  context: AnalysisExportContext;
}) {
  downloadBlob(
    new Blob([buildResultsCsv(o.panels, o.context)], {
      type: 'text/csv;charset=utf-8;',
    }),
    generateExportFilename(
      o.locationName,
      o.scenario,
      o.outcome,
      o.statistic,
      o.facet,
      'csv',
    ),
  );
}
