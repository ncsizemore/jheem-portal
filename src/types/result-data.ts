import type { AggregatedLocationData } from '@/hooks/useCityData';

/** Hashes and sizes refer to decoded UTF-8 JSON, before HTTP gzip encoding. */
export interface ResultArtifactRef {
  path: string;
  sha256: string;
  bytes: number;
}
export interface ResultPlotRef extends ResultArtifactRef {
  selectable: boolean;
}
export type ResultCatalog = Record<
  string,
  Record<string, Record<string, Record<string, ResultPlotRef>>>
>;
export interface ResultManifest {
  schema_version: 'jheem-results/v1';
  model: string;
  metadata: AggregatedLocationData['metadata'];
  source: { url: string; sha256: string; bytes: number };
  outcome_labels: Record<string, string>;
  data: ResultCatalog;
}
export interface ResultReleaseBinding {
  baseUrl: string;
  locations: Record<string, ResultArtifactRef>;
}
export interface ResultSelection {
  scenario: string;
  outcome: string;
  statistic: string;
  facet: string;
}
