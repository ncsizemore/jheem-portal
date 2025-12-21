/**
 * Hook to load aggregated city data for native plotting
 *
 * Loads the per-city JSON file containing all scenarios/outcomes/statistics/facets
 * and provides methods to extract specific plot data.
 */

import { useState, useCallback } from 'react';
import type { PlotDataFile } from '@/types/native-plotting';

interface AggregatedCityData {
  metadata: {
    city: string;
    city_label: string;
    scenarios: string[];
    outcomes: string[];
    statistics: string[];
    facets: string[];
    generation_time: string;
    file_count: number;
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

interface UseCityDataReturn {
  cityData: AggregatedCityData | null;
  loading: boolean;
  error: string | null;
  loadCity: (cityCode: string) => Promise<void>;
  getPlotData: (
    scenario: string,
    outcome: string,
    statistic: string,
    facet: string
  ) => PlotDataFile | null;
  getAvailableOptions: () => {
    scenarios: string[];
    outcomes: string[];
    statistics: string[];
    facets: string[];
  };
}

// Cache for loaded city data
const cityDataCache = new Map<string, AggregatedCityData>();

export function useCityData(): UseCityDataReturn {
  const [cityData, setCityData] = useState<AggregatedCityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCity = useCallback(async (cityCode: string) => {
    // Check cache first
    if (cityDataCache.has(cityCode)) {
      setCityData(cityDataCache.get(cityCode)!);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In development, load from public directory
      // In production, this would be a CloudFront URL
      const dataUrl = `/data/${cityCode}.json`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(dataUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Data not available for city ${cityCode}`);
        }
        throw new Error(`Failed to load city data: ${response.status}`);
      }

      const data: AggregatedCityData = await response.json();

      // Validate structure
      if (!data.metadata || !data.data) {
        throw new Error('Invalid city data structure');
      }

      // Cache the data
      cityDataCache.set(cityCode, data);
      setCityData(data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Loading timed out. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load city data');
      }
      setCityData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlotData = useCallback(
    (
      scenario: string,
      outcome: string,
      statistic: string,
      facet: string
    ): PlotDataFile | null => {
      if (!cityData) return null;

      try {
        return cityData.data[scenario]?.[outcome]?.[statistic]?.[facet] || null;
      } catch {
        return null;
      }
    },
    [cityData]
  );

  const getAvailableOptions = useCallback(() => {
    if (!cityData) {
      return {
        scenarios: [],
        outcomes: [],
        statistics: [],
        facets: [],
      };
    }

    return {
      scenarios: cityData.metadata.scenarios,
      outcomes: cityData.metadata.outcomes,
      statistics: cityData.metadata.statistics,
      facets: cityData.metadata.facets,
    };
  }, [cityData]);

  return {
    cityData,
    loading,
    error,
    loadCity,
    getPlotData,
    getAvailableOptions,
  };
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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
