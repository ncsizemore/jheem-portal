/**
 * Hook to load aggregated location data for native plotting
 *
 * Loads the per-location JSON file containing all scenarios/outcomes/statistics/facets
 * and provides methods to extract specific plot data.
 *
 * Works for both city-level (MSA) and state-level data - just pass the appropriate dataUrl.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PlotDataFile } from '@/types/native-plotting';

export interface AggregatedLocationData {
  metadata: {
    city: string; // location code (e.g., "C.12580" or "AL")
    city_label: string; // display name (e.g., "Atlanta, GA" or "Alabama")
    scenarios: string[];
    outcomes: string[];
    statistics: string[];
    facets: string[];
    generation_time: string;
    file_count: number;
    custom_simulation?: {
      model_id: string;
      intervention_type: string;
      intervention_start_time: number;
      loss_lag_years: number;
      simulation_start_year: number;
      simulation_end_year: number;
      reporting_start_year: number;
      reporting_end_year: number;
      cache_key_prefix?: string;
    };
  };
  data: Record<
    string, // scenario
    Record<
      string, // outcome
      Record<
        string, // statistic
        Record<string, PlotDataFile> // facet -> plot data
      >
    >
  >;
}

// Backward compatibility alias
export type AggregatedCityData = AggregatedLocationData;

export interface UseLocationDataOptions {
  /** Base URL for data files. Defaults to ryan-white CloudFront URL. */
  dataUrl?: string;
}

interface UseLocationDataReturn {
  locationData: AggregatedLocationData | null;
  /** @deprecated Use locationData instead */
  cityData: AggregatedLocationData | null;
  loading: boolean;
  error: string | null;
  loadLocation: (code: string) => Promise<void>;
  /** @deprecated Use loadLocation instead */
  loadCity: (code: string) => Promise<void>;
  getPlotData: (
    scenario: string,
    outcome: string,
    statistic: string,
    facet: string,
  ) => PlotDataFile | null;
  getAvailableOptions: () => {
    scenarios: string[];
    outcomes: string[];
    statistics: string[];
    facets: string[];
  };
  getOutcomeDisplayName: (outcome: string) => string;
}

// Backward compatibility alias
export type UseCityDataReturn = UseLocationDataReturn;

// Cache for loaded location data (keyed by URL + code to support multiple models)
// Keep only the most recently used bundle; a single decoded city can exceed 200 MB.
const locationDataCache = new Map<
  string,
  { data: AggregatedLocationData; expires: number }
>();

// Default CloudFront URL for production data
const DEFAULT_DATA_URL =
  process.env.NEXT_PUBLIC_DATA_URL ||
  'https://d320iym4dtm9lj.cloudfront.net/ryan-white';

/**
 * Hook to load aggregated location data (cities or states)
 *
 * @param options.dataUrl - Base URL for data files (default: ryan-white MSA)
 */
export function useLocationData(
  options: UseLocationDataOptions = {},
): UseLocationDataReturn {
  const dataBaseUrl = options.dataUrl || DEFAULT_DATA_URL;
  const [loaded, setLoaded] = useState<{
    data: AggregatedLocationData;
    baseUrl: string;
  } | null>(null);
  const locationData = loaded?.baseUrl === dataBaseUrl ? loaded.data : null;
  const setLocationData = useCallback(
    (data: AggregatedLocationData | null) => {
      setLoaded(data ? { data, baseUrl: dataBaseUrl } : null);
    },
    [dataBaseUrl],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRequest = useRef<{ id: number; controller?: AbortController }>({
    id: 0,
  });
  useEffect(
    () => () => {
      activeRequest.current.id++;
      activeRequest.current.controller?.abort();
    },
    [],
  );

  const loadLocation = useCallback(
    async (code: string) => {
      activeRequest.current.controller?.abort();
      const id = ++activeRequest.current.id;
      const controller = new AbortController();
      activeRequest.current.controller = controller;
      const current = () => activeRequest.current.id === id;
      const cacheKey = `${dataBaseUrl}:${code}`;
      const cached = locationDataCache.get(cacheKey);
      setError(null);
      if (cached && cached.expires > Date.now()) {
        setLocationData(cached.data);
        setLoading(false);
        return;
      }
      setLoading(true);
      setLocationData(null);
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(
          `${dataBaseUrl}/${encodeURIComponent(code)}.json`,
          {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          },
        );
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'Results are not available for this location.'
              : `Unable to load results (${response.status}).`,
          );
        const data: AggregatedLocationData = await response.json();
        if (!current()) return;
        if (controller.signal.aborted)
          throw new DOMException('Timed out', 'AbortError');
        if (
          data?.metadata?.city !== code ||
          !data.data ||
          !Array.isArray(data.metadata.scenarios) ||
          !Array.isArray(data.metadata.outcomes)
        ) {
          throw new Error(
            'These results do not match the selected location. Please retry.',
          );
        }
        locationDataCache.clear();
        locationDataCache.set(cacheKey, {
          data,
          expires: Date.now() + 5 * 60_000,
        });
        setLocationData(data);
      } catch (err) {
        if (!current()) return;
        setLocationData(null);
        setError(
          err instanceof Error && err.name === 'AbortError'
            ? 'Loading took too long. Please retry.'
            : err instanceof Error
              ? err.message
              : 'Unable to load results. Please retry.',
        );
      } finally {
        clearTimeout(timeoutId);
        if (current()) setLoading(false);
      }
    },
    [dataBaseUrl, setLocationData],
  );

  const getPlotData = useCallback(
    (
      scenario: string,
      outcome: string,
      statistic: string,
      facet: string,
    ): PlotDataFile | null => {
      if (!locationData) return null;

      try {
        return (
          locationData.data[scenario]?.[outcome]?.[statistic]?.[facet] || null
        );
      } catch {
        return null;
      }
    },
    [locationData],
  );

  const getAvailableOptions = useCallback(() => {
    if (!locationData) {
      return {
        scenarios: [],
        outcomes: [],
        statistics: [],
        facets: [],
      };
    }

    return {
      scenarios: locationData.metadata.scenarios,
      outcomes: locationData.metadata.outcomes,
      statistics: locationData.metadata.statistics,
      facets: locationData.metadata.facets,
    };
  }, [locationData]);

  // Extract display name for an outcome from the loaded data
  const getOutcomeDisplayName = useCallback(
    (outcome: string): string => {
      if (!locationData) return formatOptionName(outcome);

      // Try to find a plot with this outcome to get the display name
      const scenarios = Object.keys(locationData.data);
      for (const scenario of scenarios) {
        const outcomeData = locationData.data[scenario]?.[outcome];
        if (outcomeData) {
          const statistics = Object.keys(outcomeData);
          for (const stat of statistics) {
            const facets = Object.keys(outcomeData[stat]);
            for (const facet of facets) {
              const plotData = outcomeData[stat][facet];
              if (plotData?.metadata?.outcome_metadata?.display_name) {
                return plotData.metadata.outcome_metadata.display_name;
              }
            }
          }
        }
      }

      // Fallback to formatted name
      return formatOptionName(outcome);
    },
    [locationData],
  );

  return {
    locationData,
    cityData: locationData, // backward compat
    loading,
    error,
    loadLocation,
    loadCity: loadLocation, // backward compat
    getPlotData,
    getAvailableOptions,
    getOutcomeDisplayName,
  };
}

/**
 * Backward-compatible alias for useLocationData
 * @deprecated Use useLocationData instead
 */
export function useCityData(
  options: UseLocationDataOptions = {},
): UseLocationDataReturn {
  return useLocationData(options);
}

/**
 * Helper to format option names for display
 */
export function formatOptionName(name: string): string {
  // Special case mappings
  const specialCases: Record<string, string> = {
    'mean.and.interval': 'Mean with 95% CI',
    'median.and.interval': 'Median with 95% CI',
    'individual.simulation': 'Individual Simulations',
    'diagnosed.prevalence': 'Diagnosed Prevalence',
    none: 'Total (Unfaceted)',
  };

  if (specialCases[name]) {
    return specialCases[name];
  }

  // General formatting: replace dots/underscores, title case
  return name
    .replace(/\./g, ' ')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
