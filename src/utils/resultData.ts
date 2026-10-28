import type { PlotDataFile } from '@/types/native-plotting';
import type {
  ResultArtifactRef,
  ResultManifest,
  ResultSelection,
} from '@/types/result-data';

const hashPattern = /^[a-f0-9]{64}$/;
export const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
export const MAX_PLOT_BYTES = 16 * 1024 * 1024;

function check(
  value: unknown,
  message = 'These results could not be verified. Please retry.',
): asserts value {
  if (!value) throw new Error(message);
}
function record(value: unknown): Record<string, unknown> {
  check(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
export function validateResultRef(
  ref: ResultArtifactRef,
  kind: 'plots' | 'manifests',
) {
  check(hashPattern.test(ref.sha256));
  check(ref.path === `results-v1/${kind}/${ref.sha256}.json`);
  check(
    Number.isSafeInteger(ref.bytes) &&
      ref.bytes > 0 &&
      ref.bytes <= (kind === 'plots' ? MAX_PLOT_BYTES : MAX_MANIFEST_BYTES),
  );
}

/** Bound retained decoded payload bytes and entry count; not a JS-heap estimate. */
export class ResultCache<T> {
  private entries = new Map<string, { value: T; bytes: number }>();
  private bytes = 0;
  constructor(
    private maxBytes: number,
    private maxEntries: number,
  ) {}
  /** Read during rendering without changing eviction order. */
  peek(key: string): T | undefined {
    return this.entries.get(key)?.value;
  }
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }
  set(key: string, value: T, bytes: number) {
    const previous = this.entries.get(key);
    if (previous) {
      this.bytes -= previous.bytes;
      this.entries.delete(key);
    }
    if (bytes > this.maxBytes) return;
    this.entries.set(key, { value, bytes });
    this.bytes += bytes;
    while (this.bytes > this.maxBytes || this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value!;
      this.bytes -= this.entries.get(oldest)!.bytes;
      this.entries.delete(oldest);
    }
  }
}

/** Reject oversized streams before parsing and verify bytes against the pinned release. */
export async function fetchResultJson(
  baseUrl: string,
  ref: ResultArtifactRef,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${ref.path}`, {
    signal,
    redirect: 'error',
    headers: { Accept: 'application/json' },
  });
  check(
    response.ok,
    response.status === 404
      ? 'This result is not available. Please retry.'
      : 'Results could not be loaded. Please retry.',
  );
  check(response.body, 'The result was empty. Please retry.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      check(
        length <= ref.bytes,
        'The result size did not match. Please retry.',
      );
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  check(length === ref.bytes, 'The result size did not match. Please retry.');
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const actual = [
    ...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  ]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  check(
    actual === ref.sha256,
    'These results do not match the published release. Please retry.',
  );
  signal.throwIfAborted();
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export function parseResultManifest(
  raw: unknown,
  model: string,
  location: string,
): ResultManifest {
  const manifest = record(raw);
  check(
    manifest.schema_version === 'jheem-results/v1' && manifest.model === model,
  );
  const metadata = record(manifest.metadata);
  check(
    metadata.city === location,
    'These results do not match the selected location. Please retry.',
  );
  for (const key of ['scenarios', 'outcomes', 'statistics', 'facets']) {
    check(
      Array.isArray(metadata[key]) &&
        metadata[key].every((v) => typeof v === 'string'),
    );
  }
  const source = record(manifest.source);
  check(typeof source.sha256 === 'string' && hashPattern.test(source.sha256));
  check(typeof source.url === 'string' && source.url.startsWith('https://'));
  check(Number.isSafeInteger(source.bytes) && (source.bytes as number) > 0);
  const data = record(manifest.data);
  let count = 0;
  for (const [scenario, outcomes] of Object.entries(data)) {
    check((metadata.scenarios as string[]).includes(scenario));
    for (const [outcome, summaries] of Object.entries(record(outcomes))) {
      check((metadata.outcomes as string[]).includes(outcome));
      for (const [summary, facets] of Object.entries(record(summaries))) {
        check((metadata.statistics as string[]).includes(summary));
        for (const [facet, rawRef] of Object.entries(record(facets))) {
          check((metadata.facets as string[]).includes(facet));
          const ref = record(rawRef);
          validateResultRef(ref as unknown as ResultArtifactRef, 'plots');
          check(typeof ref.selectable === 'boolean');
          count++;
        }
      }
    }
  }
  check(count > 0 && count === metadata.file_count);
  check(
    Object.values(record(manifest.outcome_labels)).every(
      (v) => typeof v === 'string',
    ),
  );
  return manifest as unknown as ResultManifest;
}

export function parseResultPlot(
  raw: unknown,
  location: string,
  selection: ResultSelection,
): PlotDataFile {
  const plot = record(raw),
    metadata = record(plot.metadata);
  check(
    metadata.city === location &&
      Object.entries(selection).every(
        ([key, value]) => metadata[key] === value,
      ),
    'These results do not match the selected analysis. Please retry.',
  );
  check(Array.isArray(plot.sim) && plot.sim.length > 0);
  check(Array.isArray(plot.obs) || Object.keys(record(plot.obs)).length === 0);
  return plot as unknown as PlotDataFile;
}
