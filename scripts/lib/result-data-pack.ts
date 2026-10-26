import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { deepStrictEqual } from 'node:assert';
import type { AggregatedLocationData } from '../../src/hooks/useCityData';
import type {
  ResultArtifactRef,
  ResultManifest,
} from '../../src/types/result-data';
import { getFacetChoices } from '../../src/utils/analysisFacets';
import {
  validateResultRef,
  parseResultManifest,
} from '../../src/utils/resultData';

export const sha256 = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex');

/** Repackage only: all plot properties, ordering, observations and values survive. */
export function packResults(
  data: AggregatedLocationData,
  model: string,
  source: ResultManifest['source'],
) {
  const files = new Map<string, Buffer>();
  const manifest: ResultManifest = {
    schema_version: 'jheem-results/v1',
    model,
    metadata: data.metadata,
    source,
    outcome_labels: {},
    data: {},
  };
  function store(
    value: unknown,
    kind: 'plots' | 'manifests',
  ): ResultArtifactRef {
    const bytes = Buffer.from(JSON.stringify(value));
    const hash = sha256(bytes);
    const ref = {
      path: `results-v1/${kind}/${hash}.json`,
      sha256: hash,
      bytes: bytes.length,
    };
    validateResultRef(ref, kind);
    const compressed = gzipSync(bytes);
    // Validate the exact artifact that will be uploaded, not a parallel in-memory copy.
    deepStrictEqual(JSON.parse(gunzipSync(compressed).toString('utf8')), value);
    files.set(ref.path, compressed);
    return ref;
  }
  for (const [scenario, outcomes] of Object.entries(data.data)) {
    manifest.data[scenario] = {};
    for (const [outcome, summaries] of Object.entries(outcomes)) {
      manifest.data[scenario][outcome] = {};
      for (const [statistic, plots] of Object.entries(summaries)) {
        const selectable = new Set(
          getFacetChoices(plots).map((choice) => choice.key),
        );
        manifest.data[scenario][outcome][statistic] = {};
        for (const [facet, plot] of Object.entries(plots)) {
          for (const [key, value] of Object.entries({
            city: data.metadata.city,
            scenario,
            outcome,
            statistic,
            facet,
          })) {
            if (plot.metadata[key as keyof typeof plot.metadata] !== value)
              throw new Error(
                `Plot identity mismatch: ${data.metadata.city}/${scenario}/${outcome}/${statistic}/${facet}: ${key}`,
              );
          }
          manifest.data[scenario][outcome][statistic][facet] = {
            ...store(plot, 'plots'),
            selectable: selectable.has(facet),
          };
          manifest.outcome_labels[outcome] ||=
            plot.metadata.outcome_metadata?.display_name || outcome;
        }
      }
    }
  }
  parseResultManifest(manifest, model, data.metadata.city);
  const ref = store(manifest, 'manifests');
  return { manifest, ref, files };
}
