export interface AnalysisExportContext {
  title: string;
  definition: string;
  units: string;
  location: string;
  scenario: string;
  summary: string;
  model: string;
  generated: string;
  timeline: string;
  url: string;
  scope: string;
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportMetadata(c: AnalysisExportContext): string[] {
  return [
    `Outcome: ${c.title}`,
    c.definition,
    `Units: ${c.units}`,
    `Location: ${c.location}`,
    `Scenario: ${c.scenario}`,
    `Summary: ${c.summary}`,
    'Intervals: 2.5th to 97.5th percentiles of simulated estimates (where available).',
    c.timeline,
    `Model: ${c.model}`,
    `Results generated: ${c.generated || 'Not recorded in this release'}`,
    `Scope: ${c.scope}`,
    `Source: ${c.url}`,
    `Exported: ${new Date().toISOString()}`,
  ].filter(Boolean);
}
