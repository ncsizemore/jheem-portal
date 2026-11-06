'use client';

import { updateAnalysisQuery } from '@/hooks/useAnalysisQuery';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { GeographicMapProps } from './GeographicMap';
import { useMapPreviewPosition } from './useMapPreviewPosition';
import ExplorerMapPanel from './ExplorerMapPanel';
import {
  getMarkerSize,
  getSuppressionColor,
  SUPPRESSION_BANDS,
} from './mapScales';
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

export default function CityExplorerMap() {
  // City summaries for map display
  const [citySummaries, setCitySummaries] = useState<CitySummaries | null>(
    null,
  );
  const [citySummariesLoading, setCitySummariesLoading] = useState(true);
  const [citySummariesError, setCitySummariesError] = useState<string | null>(
    null,
  );

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
          shortLabel:
            summary?.shortName || city.name.split(',')[0].split('-')[0],
          color: summary
            ? getSuppressionColor(summary.metrics.suppressionRate.value)
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

  const years = [
    ...new Set(
      Object.values(citySummaries?.cities || {}).map(
        (city) => city.metrics.suppressionRate.year,
      ),
    ),
  ];
  return (
    <div className="atlas-explorer">
      <div key="map-mode" className="atlas-layout">
        <ExplorerMapPanel
          id="city-explorer-instructions"
          eyebrow="Ryan White · City study"
          title="Explore local projections"
          description={
            <>
              Compare how interruptions to Ryan White services could affect HIV
              outcomes in {STUDY_CITIES.length} metropolitan areas through 2030.
            </>
          }
          calibrationHref="/ryan-white/calibration"
          status={
            citySummariesLoading || citySummariesError
              ? citySummariesError
                ? 'Map estimates are unavailable. You can still choose a city to explore its results.'
                : 'Loading map estimates… You can choose a city now.'
              : undefined
          }
          legend={
            <>
              <h2 className="atlas-key-title">Viral suppression (%)</h2>
              <p className="atlas-key-note">
                Darker markers indicate higher suppression.
              </p>
              <div
                className="atlas-color-key"
                aria-label="Viral suppression color scale"
              >
                {SUPPRESSION_BANDS.map((band) => (
                  <div key={band.label} aria-label={band.description}>
                    <i style={{ backgroundColor: band.color }} />
                    <span aria-hidden="true">{band.label}</span>
                  </div>
                ))}
              </div>
              {mapLocations.some((city) => !city.color) && (
                <p className="atlas-key-note">
                  Unfilled markers: map estimates unavailable.
                </p>
              )}
              <div className="atlas-size-key">
                <h2 className="atlas-key-title">People with diagnosed HIV</h2>
                <div
                  className="atlas-size-examples"
                  aria-label="Marker diameter uses a logarithmic scale from 5,000 to 50,000 people, capped at both ends"
                >
                  {[5000, 15000, 50000].map((value, index) => (
                    <div key={value}>
                      <i
                        style={{
                          width: getMarkerSize(value),
                          height: getMarkerSize(value),
                        }}
                      />
                      <span>{['≤5,000', '15,000', '≥50,000'][index]}</span>
                    </div>
                  ))}
                </div>
                <p className="atlas-key-note">
                  Size uses a log scale; capped at 50,000.
                </p>
              </div>
            </>
          }
        >
          <label htmlFor="city-explorer-location">
            Choose a metropolitan area
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
          >
            <option value="">Select a city to explore…</option>
            {availableCities.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))}
          </select>
        </ExplorerMapPanel>

        <GeographicMap
          mode="city"
          title="Local HIV epidemics"
          subtitle={`Model estimates${years.length === 1 ? `, ${years[0]}` : ''} · ${STUDY_CITIES.length} metropolitan areas`}
          locations={mapLocations}
          onSelect={selectLocation}
          onPreview={previewLocation}
          onLeave={startHideTimeout}
          onMove={clearPreview}
        />

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
                <div className="atlas-preview">
                  {/* Header - single line */}
                  <h3 className="text-ink mb-3">
                    {summary?.shortName || hoveredCity.name.split(',')[0]},{' '}
                    {hoveredCity.name.split(',').slice(-1)[0]?.trim()}
                  </h3>

                  {/* Current Status (Model Estimates) */}
                  {summary && (
                    <div className="py-2 border-y border-slate-100">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">
                          Model Estimate {summary.metrics.suppressionRate.year}
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
                              style={{ backgroundColor: colors || undefined }}
                            />
                            <span className="text-sm font-semibold text-slate-800">
                              {summary.metrics.suppressionRate.value}
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
                          If services end
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {summary.impact.startYear || 2025}-
                          {summary.impact.targetYear}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Increase in new infections
                        </span>
                        <span className="text-sm font-semibold text-amber-800">
                          +{summary.impact.cessationIncreasePercent}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Click hint */}
                  <div className="atlas-preview-action">
                    <span>Explore projections</span>
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
