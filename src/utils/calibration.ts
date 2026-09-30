// Browser-side reader for the immutable jheem-calibration/v1 delivery contract.
export type Stage = 'ehe' | 'ryan-white';
export type Facet = 'total' | 'age';
export interface Binding {
  release: string; manifestUrl: string; manifestSha256: string;
  locationIndexUrl: string; locationIndexSha256: string; displayFacets: Facet[];
}
export interface StageInfo { label: string; sample_count: number; simulation_release: string; target_ids: string[] }
export interface Manifest {
  schema_version: string; release: string; model: string; portal_model: string;
  stages: Record<Stage, StageInfo>;
}
export interface ArtifactRef { path: string; size_bytes: number; sha256: string }
export interface Location { id: string; label: string; artifacts: Record<Stage, ArtifactRef> }
export interface Metadata { manifest: Manifest; locations: Location[] }
export interface Posterior { year: number; stratum: Record<string, string>; q025: number; q250: number; q500: number; q750: number; q975: number }
export interface Observation { year: number; stratum: Record<string, string>; value: number; public_source_ids: string[]; manager_source: string; manager_ontology: string }
export interface Panel { facet: string; posterior: Posterior[]; observations: Observation[] }
export interface Target {
  target_id: string; label: string; unit: string; public_panel: string;
  observation_location_binding: string; observation_provenance_confidence: string;
  likelihood_year_window: { from_year: number; to_year: number | null };
  availability: { status: string; reason: string | null }; panels: Panel[];
}
export interface Artifact {
  model: string; location: string; stage: Stage; ensemble: { sample_count: number };
  simulation_source: { release: string; sha256: string }; targets: Target[];
}

function check(value: unknown, message = 'The calibration file has an unsupported format.'): asserts value {
  if (!value) throw new Error(message);
}
function object(value: unknown): Record<string, unknown> {
  check(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function array(value: unknown): unknown[] { check(Array.isArray(value)); return value; }
function string(value: unknown): string { check(typeof value === 'string' && value.length > 0); return value; }
function finite(value: unknown): number { check(typeof value === 'number' && Number.isFinite(value)); return value; }
function strings(value: unknown) { return array(value).map(string); }
function exact(a: string[], b: string[]) { check(JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())); }
const digestPattern = /^[a-f0-9]{64}$/;

export async function verifiedJson(url: string, hash: string, signal?: AbortSignal, size?: number): Promise<unknown> {
  check(digestPattern.test(hash));
  let response: Response;
  try { response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000), redirect: 'error' }); }
  catch { throw new Error('Calibration data could not be loaded. Check your connection and try again.'); }
  check(response.ok, 'Calibration data could not be loaded. Please try again.');
  const bytes = await response.arrayBuffer();
  check(bytes.byteLength <= 8 * 1024 * 1024 && (size === undefined || bytes.byteLength === size), 'The calibration file size did not match. No results are shown.');
  const actual = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  check(actual === hash, 'The calibration file could not be verified. No results are shown.');
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function parseMetadata(rawManifest: unknown, rawIndex: unknown, binding: Binding, modelId: string, expectedLocations: string[]): Metadata {
  const manifest = object(rawManifest), index = object(rawIndex);
  check(manifest.schema_version === 'jheem-calibration-manifest/v1' && index.schema_version === 'jheem-calibration-location-index/v1');
  check(manifest.release === binding.release && index.release === binding.release);
  check(manifest.portal_model === modelId && index.portal_model === modelId && index.model === manifest.model);
  string(manifest.model);
  const stages = object(manifest.stages);
  exact(Object.keys(stages), ['ehe', 'ryan-white']);
  for (const stage of Object.values(stages)) {
    const info = object(stage);
    string(info.label); string(info.simulation_release); strings(info.target_ids);
    check(Number.isInteger(info.sample_count) && finite(info.sample_count) > 0);
  }
  const locations = array(index.locations).map((raw) => {
    const location = object(raw);
    const id = string(location.id); string(location.label);
    check(/^[A-Za-z0-9._-]+$/.test(id));
    const refs = object(location.artifacts);
    exact(Object.keys(refs), ['ehe', 'ryan-white']);
    for (const [stage, rawRef] of Object.entries(refs)) {
      const ref = object(rawRef);
      check(ref.path === `locations/${id}/${stage}.json`);
      check(digestPattern.test(string(ref.sha256)) && Number.isInteger(ref.size_bytes) && finite(ref.size_bytes) > 0);
    }
    return location as unknown as Location;
  });
  exact(locations.map(l => l.id), expectedLocations);
  return { manifest: manifest as unknown as Manifest, locations };
}

export async function loadMetadata(binding: Binding, id: string, locations: string[], signal: AbortSignal) {
  const [manifest, index] = await Promise.all([
    verifiedJson(binding.manifestUrl, binding.manifestSha256, signal),
    verifiedJson(binding.locationIndexUrl, binding.locationIndexSha256, signal),
  ]);
  return parseMetadata(manifest, index, binding, id, locations);
}

export function parseArtifact(raw: unknown, manifest: Manifest, location: string, stage: Stage): Artifact {
  const artifact = object(raw);
  check(artifact.schema_version === 'jheem-calibration/v1');
  check(artifact.model === manifest.model && artifact.location === location && artifact.stage === stage);
  check(artifact.artifact_id === `${manifest.model}:${stage}:${location}`);
  check(object(artifact.ensemble).sample_count === manifest.stages[stage].sample_count);
  check(object(artifact.simulation_source).release === manifest.stages[stage].simulation_release);
  check(digestPattern.test(string(object(artifact.simulation_source).sha256)));
  const targets = array(artifact.targets);
  exact(targets.map(t => string(object(t).target_id)), manifest.stages[stage].target_ids);
  for (const rawTarget of targets) {
    const target = object(rawTarget);
    for (const field of ['label', 'unit', 'public_panel', 'observation_location_binding', 'observation_provenance_confidence']) string(target[field]);
    const window = object(target.likelihood_year_window);
    finite(window.from_year); if (window.to_year !== null) finite(window.to_year);
    const availability = object(target.availability);
    check(['available', 'unavailable', 'not_exported'].includes(string(availability.status)));
    check(availability.reason === null || typeof availability.reason === 'string');
    const panels = array(target.panels);
    check(availability.status === 'available' || panels.length === 0);
    const facets = panels.map(p => string(object(p).facet));
    check(new Set(facets).size === facets.length && facets.every(f => ['total', 'age', 'race', 'sex'].includes(f)));
    for (const rawPanel of panels) {
      const panel = object(rawPanel);
      for (const [series, observed] of [['posterior', false], ['observations', true]] as const) {
        for (const rawPoint of array(panel[series])) {
          const point = object(rawPoint); finite(point.year);
          const stratum = object(point.stratum);
          Object.values(stratum).forEach(string);
          if (observed) { finite(point.value); check(strings(point.public_source_ids).length > 0); string(point.manager_source); string(point.manager_ontology); }
          else {
            const values = ['q025','q250','q500','q750','q975'].map(k => finite(point[k]));
            check(values.every((value, i) => i === 0 || value >= values[i - 1]));
          }
        }
      }
    }
  }
  return artifact as unknown as Artifact;
}

// Keep posterior strata separate from the observed location dimension. Never average nested observations.
export function selectSeries(target: Target, facet: Facet, age: string) {
  const panel = target.panels.find(p => p.facet === facet);
  const window = target.likelihood_year_window;
  const inWindow = (year: number) => year >= window.from_year && (window.to_year === null || year <= window.to_year);
  const observations = (panel?.observations ?? []).filter(p => inWindow(p.year) && (facet === 'total' || p.stratum.age === age));
  const years = observations.map(p => p.year);
  const start = Math.min(...years), end = Math.max(...years);
  const posterior = (panel?.posterior ?? []).filter(p => p.year >= start && p.year <= end && (facet === 'total' || p.stratum.age === age)).sort((a,b) => a.year-b.year);
  return { observations, posterior };
}

export function formatValue(value: number, unit: string) {
  if (unit.includes('proportion')) return `${(value * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  return value.toLocaleString('en-US', { maximumFractionDigits: unit === 'people' ? 0 : 3 });
}

export function observationSource(point: Observation) {
  const labels: Record<string, string> = {
    'cdc.hiv': 'CDC HIV data',
    'cdc.aggregated.county': 'CDC county aggregates',
    'cdc.surveillance.reports': 'CDC surveillance reports',
    'cdc.aggregated.proportion': 'CDC aggregated proportions',
    'prep.cdc.aggregated.county': 'CDC PrEP county aggregates',
    'prep.aidsvu.aggregated.county': 'AIDSVu PrEP county aggregates',
    'brfss': 'BRFSS survey data',
    'aidsvu': 'AIDSVu data',
    'cdc.prep': 'CDC PrEP data',
    'ryan.white.program': 'Ryan White program data',
    'nastad.adap': 'NASTAD ADAP data',
  };
  return labels[point.manager_source] ?? point.manager_source.replaceAll('.', ' ');
}
