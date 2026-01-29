/**
 * Hook to load state summary data for the choropleth map
 *
 * Fetches lightweight summary data from CloudFront for hover cards.
 * For full state data (charts/analysis), use a separate hook.
 */

import { useState, useEffect } from 'react';
import { STATE_NAME_TO_CODE } from '@/data/states';

// Matches output of generate-state-summaries.ts
export interface StateSummary {
  name: string;
  shortName: string;
  coordinates: [number, number];
  metrics: {
    diagnosedPrevalence: {
      value: number;
      lower: number;
      upper: number;
      year: number;
      label: string;
      source: 'model';
    };
    suppressionRate: {
      value: number;
      lower: number;
      upper: number;
      year: number;
      label: string;
      source: 'model';
    };
    incidenceBaseline: {
      value: number;
      lower: number;
      upper: number;
      year: number;
      label: string;
    };
    incidenceCessation: {
      value: number;
      lower: number;
      upper: number;
      year: number;
      label: string;
    };
  };
  impact: {
    cessationIncreasePercent: number;
    cessationIncreaseAbsolute: number;
    targetYear: number;
    headline: string;
  };
}

export interface StateSummaries {
  generated: string;
  description: string;
  dataSource: string;
  states: Record<string, StateSummary>;
}

interface UseStateSummariesReturn {
  summaries: StateSummaries | null;
  loading: boolean;
  error: string | null;
  getStateByCode: (code: string) => StateSummary | null;
  getStateByName: (name: string) => StateSummary | null;
}

// Default CloudFront URL for state-level data (AJPH 11-state)
const DEFAULT_DATA_URL =
  process.env.NEXT_PUBLIC_STATE_DATA_URL ||
  'https://d320iym4dtm9lj.cloudfront.net/ryan-white-state';

// Cache per data URL - allows different analyses to be cached separately
const summariesCache: Record<string, StateSummaries> = {};

export function useStateSummaries(dataUrl?: string): UseStateSummariesReturn {
  const effectiveUrl = dataUrl || DEFAULT_DATA_URL;
  const cached = summariesCache[effectiveUrl];

  const [summaries, setSummaries] = useState<StateSummaries | null>(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use cache if available for this URL
    if (summariesCache[effectiveUrl]) {
      setSummaries(summariesCache[effectiveUrl]);
      setLoading(false);
      return;
    }

    const fetchSummaries = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${effectiveUrl}/state-summaries.json`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to load state summaries: ${response.status}`);
        }

        const data: StateSummaries = await response.json();

        // Validate structure
        if (!data.states || typeof data.states !== 'object') {
          throw new Error('Invalid state summaries structure');
        }

        summariesCache[effectiveUrl] = data;
        setSummaries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load state summaries');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [effectiveUrl]);

  const getStateByCode = (code: string): StateSummary | null => {
    return summaries?.states[code] || null;
  };

  const getStateByName = (name: string): StateSummary | null => {
    const code = STATE_NAME_TO_CODE[name];
    if (!code) return null;
    return summaries?.states[code] || null;
  };

  return {
    summaries,
    loading,
    error,
    getStateByCode,
    getStateByName,
  };
}
