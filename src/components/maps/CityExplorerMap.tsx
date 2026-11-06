'use client';

import { updateAnalysisQuery } from '@/hooks/useAnalysisQuery';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { GeographicMapProps } from './GeographicMap';
import { useMapPreviewPosition } from './useMapPreviewPosition';
const GeographicMap = dynamic(() => import('./GeographicMap'), {
  ssr: false,
});
import { ALL_CITIES, CityData } from '@/data/cities';
import { ryanWhiteConfig } from '@/config/model-configs';

// Use model config for this explorer instance
const MODEL_CONFIG = ryanWhiteConfig;
const STUDY_CITIES = ALL_CITIES.filter((city) =>
  MODEL_CONFIG.locations.includes(city.code),
);

// City summary data types
interface MetricValue {
  value: number;
  lower?: number;
  upper?: number;
  year: number;
  label: string;
  source?: 'model' | 'observed';
}

interface CitySummary {
  name: string;
  shortName: string;
  coordinates: [number, number];
  metrics: {
    diagnosedPrevalence: MetricValue;
    suppressionRate: MetricValue;
    incidenceBaseline: MetricValue;
    incidenceCessation: MetricValue;
  };
  impact: {
    cessationIncreasePercent: number;
    cessationIncreaseAbsolute: number;
    targetYear: number;
    startYear?: number;
    headline: string;
  };
}

interface CitySummaries {
  generated: string;
  description?: string;
  dataSource?: string;
  cities: Record<string, CitySummary>;
}

// Derive scenario IDs from config for city data
const ALL_SCENARIOS = MODEL_CONFIG.scenarios.map((s) => s.id);

// Get color based on suppression rate using blue-to-orange diverging scale
// Blue = high suppression (good), Orange/Red = low suppression (concerning)
// Thresholds based on actual data range (64-86%)
function getSuppressionColor(rate: number): {
  ring: string;
  glow: string;
  bg: string;
} {
  if (rate >= 82)
    return {
      ring: '#1d4ed8',
      glow: 'rgba(29, 78, 216, 0.5)',
      bg: 'bg-blue-700',
    }; // Excellent
  if (rate >= 77)
    return {
      ring: '#3b82f6',
      glow: 'rgba(59, 130, 246, 0.5)',
      bg: 'bg-blue-500',
    }; // Very good
  if (rate >= 72)
    return {
      ring: '#0ea5e9',
      glow: 'rgba(14, 165, 233, 0.5)',
      bg: 'bg-sky-500',
    }; // Good
  if (rate >= 67)
    return {
      ring: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.5)',
      bg: 'bg-amber-400',
    }; // Moderate
  if (rate >= 64)
    return {
      ring: '#f97316',
      glow: 'rgba(249, 115, 22, 0.5)',
      bg: 'bg-orange-500',
    }; // Below target
  return {
    ring: '#dc2626',
    glow: 'rgba(220, 38, 38, 0.5)',
    bg: 'bg-red-600',
  }; // Needs improvement
}

// Get marker size based on prevalence (larger epidemic = bigger marker)
function getMarkerSize(prevalence: number): number {
  // Scale from 12px (small) to 24px (large) based on prevalence
  // Using log scale since prevalence varies widely
  const minSize = 14;
  const maxSize = 28;
  const minPrev = 5000;
  const maxPrev = 50000;
  const normalized = Math.max(
    0,
    Math.min(
      1,
      (Math.log(prevalence) - Math.log(minPrev)) /
        (Math.log(maxPrev) - Math.log(minPrev)),
    ),
  );
  return minSize + normalized * (maxSize - minSize);
}

export default function CityExplorerMap() {
  // City summaries for map display
  const [citySummaries, setCitySummaries] = useState<CitySummaries | null>(
    null,
  );
  const [citySummariesLoading, setCitySummariesLoading] = useState(true);
  const [citySummariesError, setCitySummariesError] = useState<
    string | null
  >(null);

  // Load city summaries on mount
  useEffect(() => {
    let active = true;
    const dataUrl = MODEL_CONFIG.dataUrl;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    fetch(`${dataUrl}/${MODEL_CONFIG.summaryFileName}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load city data (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.cities || typeof data.cities !== 'object') {
          throw new Error('Invalid city data format');
        }
        if (!active) return;
        setCitySummaries(data);
        setCitySummariesError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (err.name === 'AbortError') {
          setCitySummariesError(
            'Request timed out. Please refresh to try again.',
          );
        } else {
          setCitySummariesError(
            err instanceof Error ? err.message : 'Failed to load cities',
          );
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (active) setCitySummariesLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // Map coverage follows the model configuration, with summary labels when available.
  const availableCities: CityData[] = useMemo(() => {
    return STUDY_CITIES.map((city) => ({
      ...city,
      name: citySummaries?.cities[city.code]?.name ?? city.name,
      coordinates:
        citySummaries?.cities[city.code]?.coordinates ?? city.coordinates,
      availableScenarios: ALL_SCENARIOS,
    }));
  }, [citySummaries]);

  // Hover state for map
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const previewPlacement = useMapPreviewPosition(hoverPosition, 280);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear hover with delay (allows moving from dot to card)
  const startHideTimeout = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCity(null);
      setHoverPosition(null);
    }, 200);
  }, []);

  // Cancel any pending hide
  const cancelHideTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Selected city for analysis mode

  // Track if instruction panel is collapsed (user must explicitly minimize)
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 639px)').matches,
  );

  // Handle city selection from map
  const handleCityClick = useCallback((city: CityData) => {
    updateAnalysisQuery({ loc: city.code });
  }, []);

  const mapLocations = useMemo(
    () =>
      availableCities.map((city) => {
        const summary = citySummaries?.cities[city.code];
        return {
          ...city,
          color: summary
            ? getSuppressionColor(summary.metrics.suppressionRate.value)
                .ring
            : undefined,
          size: summary
            ? getMarkerSize(summary.metrics.diagnosedPrevalence.value)
            : 14,
        };
      }),
    [availableCities, citySummaries],
  );
  const previewLocation: GeographicMapProps['onPreview'] = useCallback(
    (code, position) => {
      cancelHideTimeout();
      setHoveredCity(
        availableCities.find((city) => city.code === code) || null,
      );
      setHoverPosition(position);
    },
    [availableCities, cancelHideTimeout],
  );
  const selectLocation = useCallback(
    (code: string) => updateAnalysisQuery({ loc: code }),
    [],
  );
  const clearPreview = useCallback(() => {
    cancelHideTimeout();
    setHoveredCity(null);
    setHoverPosition(null);
  }, [cancelHideTimeout]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-100">
      <div key="map-mode" className="absolute inset-0">
        <GeographicMap
          mode="city"
          locations={mapLocations}
          onSelect={selectLocation}
          onPreview={previewLocation}
          onLeave={startHideTimeout}
          onMove={clearPreview}
        />

        {/* Info panel */}
        <div
          data-map-panel
          className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-auto sm:w-80"
        >
          <div className="bg-white border border-rule rounded-md overflow-hidden shadow-sm">
            {/* Header row - always visible */}
            <button
              type="button"
              onClick={() => setInstructionsCollapsed((prev) => !prev)}
              aria-expanded={!instructionsCollapsed}
              aria-controls="city-explorer-instructions"
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <h1 className="text-ink font-serif text-xl">
                Explore Ryan White results
              </h1>
              <div className={instructionsCollapsed ? '' : 'rotate-180'}>
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </div>
            </button>

            {/* Collapsible content */}
            <div
              id="city-explorer-instructions"
              hidden={instructionsCollapsed}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-slate-100">
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Compare how interruptions to Ryan White services could
                  affect HIV outcomes in {STUDY_CITIES.length} metropolitan
                  areas through 2030.
                </p>
                <Link
                  href="/ryan-white/calibration"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
                >
                  See how this model fits observed data
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100">
              <label
                htmlFor="city-explorer-location"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Choose a city
              </label>
              <select
                id="city-explorer-location"
                value=""
                onChange={(event) => {
                  const city = availableCities.find(
                    (item) => item.code === event.target.value,
                  );
                  if (city) handleCityClick(city);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a city to explore…</option>
                {availableCities.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {(citySummariesLoading || citySummariesError) && (
              <p
                role="status"
                className="px-4 py-3 text-xs leading-relaxed text-muted border-t border-rule"
              >
                {citySummariesError
                  ? 'Map estimates are unavailable. You can still choose a city to explore its results.'
                  : 'Loading map estimates… You can choose a city now.'}
              </p>
            )}
            <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Viral suppression</span>
                <span className="text-[10px] text-muted">
                  Model estimates
                </span>
              </div>
              <div
                className="mt-2 flex h-1.5 overflow-hidden rounded-sm"
                aria-hidden="true"
              >
                {[
                  '#dc2626',
                  '#f97316',
                  '#fbbf24',
                  '#0ea5e9',
                  '#3b82f6',
                  '#1d4ed8',
                ].map((color) => (
                  <span
                    key={color}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
                <span>&lt;64%</span>
                <span>≥82%</span>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Marker size: people with diagnosed HIV
              </p>
            </div>
          </div>
        </div>

        {/* Hover preview card */}
        {hoveredCity &&
          hoverPosition &&
          (() => {
            const summary = citySummaries?.cities[hoveredCity.code];
            const colors = summary
              ? getSuppressionColor(summary.metrics.suppressionRate.value)
              : null;

            return (
              <div
                className="fixed z-50"
                ref={previewPlacement.ref}
                style={previewPlacement.style}
                onMouseEnter={cancelHideTimeout}
                onMouseLeave={startHideTimeout}
                onClick={() => hoveredCity && handleCityClick(hoveredCity)}
                onKeyDown={(event) => {
                  if (
                    (event.key === 'Enter' || event.key === ' ') &&
                    hoveredCity
                  ) {
                    event.preventDefault();
                    handleCityClick(hoveredCity);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Explore ${hoveredCity.name}`}
              >
                <div className="bg-white/98  border border-slate-200 rounded-md p-3 hover:bg-slate-50 transition-colors shadow-md">
                  {/* Header - single line */}
                  <h3 className="font-semibold text-slate-800 text-sm mb-2">
                    {summary?.shortName || hoveredCity.name.split(',')[0]},{' '}
                    {hoveredCity.name.split(',').slice(-1)[0]?.trim()}
                  </h3>

                  {/* Current Status (Model Estimates) */}
                  {summary && (
                    <div className="py-2 border-y border-slate-100">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">
                          Model Estimate{' '}
                          {summary.metrics.suppressionRate.year}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Viral suppression
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: colors?.ring }}
                            />
                            <span className="text-sm font-semibold text-slate-800">
                              {summary.metrics.suppressionRate.value.toFixed(
                                0,
                              )}
                              %
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            People with diagnosed HIV
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {summary.metrics.diagnosedPrevalence.value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Impact Projection */}
                  {summary && (
                    <div className="pt-2">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">
                          Cessation Scenario
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {summary.impact.startYear || 2025}-
                          {summary.impact.targetYear}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Cumulative new infections
                        </span>
                        <span className="text-sm font-semibold text-amber-800">
                          +{summary.impact.cessationIncreasePercent}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Click hint */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-slate-500 text-xs">
                    <span>Click to explore</span>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
