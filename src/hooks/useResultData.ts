'use client';

import { useEffect, useState, useCallback } from 'react';
import type {
  ResultArtifactRef,
  ResultManifest,
  ResultReleaseBinding,
  ResultSelection,
} from '@/types/result-data';
import type { PlotDataFile } from '@/types/native-plotting';
import {
  fetchResultJson,
  parseResultManifest,
  parseResultPlot,
  ResultCache,
  validateResultRef,
} from '@/utils/resultData';

const manifests = new ResultCache<unknown>(4 * 1024 * 1024, 8);
const plots = new ResultCache<unknown>(16 * 1024 * 1024, 6);

function useArtifact(
  baseUrl: string | undefined,
  ref: ResultArtifactRef | undefined,
  kind: 'plots' | 'manifests',
) {
  const key =
    baseUrl && ref ? `${baseUrl}/${ref.path}:${ref.sha256}:${ref.bytes}` : '';
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: unknown;
    error?: string;
  }>({ key: '' });
  const retry = useCallback(() => setRetryCount((value) => value + 1), []);
  // Only key primitives participate in request lifetime; rebuilt ref objects do not reload data.
  const path = ref?.path,
    hash = ref?.sha256,
    bytes = ref?.bytes;
  useEffect(() => {
    if (!key || !baseUrl || !path || !hash || !bytes) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const cache = kind === 'plots' ? plots : manifests;
    async function load() {
      try {
        const reference = { path: path!, sha256: hash!, bytes: bytes! };
        validateResultRef(reference, kind);
        const cached = cache.get(key);
        if (cached) {
          if (active) setState({ key, data: cached });
          return;
        }
        setState({ key });
        const data = await fetchResultJson(
          baseUrl!,
          reference,
          controller.signal,
        );
        if (!active) return;
        controller.signal.throwIfAborted();
        cache.set(key, data, reference.bytes);
        setState({ key, data });
      } catch (error) {
        if (active)
          setState({
            key,
            error:
              error instanceof Error && error.name === 'AbortError'
                ? 'Loading took too long. Please retry.'
                : error instanceof Error
                  ? error.message
                  : 'Results could not be loaded. Please retry.',
          });
      } finally {
        clearTimeout(timer);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, baseUrl, path, hash, bytes, kind, retryCount]);
  // Hide a previous selection before effects run, including rapid back/forward navigation.
  const current = state.key === key ? state : undefined;
  return {
    data: current?.data,
    error: current?.error,
    loading: !!key && !current?.data && !current?.error,
    retry,
  };
}

export function useResultManifest(
  binding: ResultReleaseBinding | undefined,
  model: string,
  location: string,
) {
  const result = useArtifact(
    binding?.baseUrl,
    binding?.locations[location],
    'manifests',
  );
  let manifest: ResultManifest | null = null;
  let error = result.error;
  if (!binding?.locations[location])
    error = 'Results are not available for this location.';
  if (result.data) {
    try {
      manifest = parseResultManifest(result.data, model, location);
    } catch (caught) {
      error =
        caught instanceof Error
          ? caught.message
          : 'These results could not be verified.';
    }
  }
  return { manifest, error, loading: !error && !manifest, retry: result.retry };
}

export function useResultPlot(
  binding: ResultReleaseBinding | undefined,
  manifest: ResultManifest | null,
  selection: ResultSelection,
) {
  const ref =
    manifest?.data[selection.scenario]?.[selection.outcome]?.[
      selection.statistic
    ]?.[selection.facet];
  const result = useArtifact(
    binding?.baseUrl,
    ref?.selectable ? ref : undefined,
    'plots',
  );
  let plot: PlotDataFile | null = null;
  let error = result.error;
  if (manifest && !ref?.selectable)
    error = 'This combination is not available. Choose another result.';
  if (result.data && manifest) {
    try {
      plot = parseResultPlot(result.data, manifest.metadata.city, selection);
    } catch (caught) {
      error =
        caught instanceof Error
          ? caught.message
          : 'These results could not be verified.';
    }
  }
  return {
    plot,
    error,
    loading: !!manifest && !error && !plot,
    retry: result.retry,
  };
}
