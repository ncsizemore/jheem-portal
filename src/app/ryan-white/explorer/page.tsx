'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker } from 'react-map-gl/mapbox';
import { CityData } from '@/data/cities';
import { ryanWhiteConfig } from '@/config/model-configs';
import AnalysisView from '@/components/AnalysisView';
import 'mapbox-gl/dist/mapbox-gl.css';

// Use model config for this explorer instance
const MODEL_CONFIG = ryanWhiteConfig;

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
const ALL_SCENARIOS = MODEL_CONFIG.scenarios.map(s => s.id);

// Get color based on suppression rate using blue-to-orange diverging scale
// Blue = high suppression (good), Orange/Red = low suppression (concerning)
// Thresholds based on actual data range (64-86%)
function getSuppressionColor(rate: number): { ring: string; glow: string; bg: string } {
  if (rate >= 82) return { ring: '#1d4ed8', glow: 'rgba(29, 78, 216, 0.5)', bg: 'bg-blue-700' };   // Excellent
  if (rate >= 77) return { ring: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)', bg: 'bg-blue-500' };  // Very good
  if (rate >= 72) return { ring: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.5)', bg: 'bg-sky-500' };   // Good
  if (rate >= 67) return { ring: '#fbbf24', glow: 'rgba(251, 191, 36, 0.5)', bg: 'bg-amber-400' }; // Moderate
  if (rate >= 64) return { ring: '#f97316', glow: 'rgba(249, 115, 22, 0.5)', bg: 'bg-orange-500' };// Below target
  return { ring: '#dc2626', glow: 'rgba(220, 38, 38, 0.5)', bg: 'bg-red-600' };                    // Needs improvement
}

// Get marker size based on prevalence (larger epidemic = bigger marker)
function getMarkerSize(prevalence: number): number {
  // Scale from 12px (small) to 24px (large) based on prevalence
  // Using log scale since prevalence varies widely
  const minSize = 14;
  const maxSize = 28;
  const minPrev = 5000;
  const maxPrev = 50000;
  const normalized = Math.max(0, Math.min(1, (Math.log(prevalence) - Math.log(minPrev)) / (Math.log(maxPrev) - Math.log(minPrev))));
  return minSize + normalized * (maxSize - minSize);
}

export default function ExploreV2() {
  // City summaries for map display
  const [citySummaries, setCitySummaries] = useState<CitySummaries | null>(null);
  const [citySummariesLoading, setCitySummariesLoading] = useState(true);
  const [citySummariesError, setCitySummariesError] = useState<string | null>(null);

  // Load city summaries on mount
  useEffect(() => {
    const dataUrl = MODEL_CONFIG.dataUrl;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    fetch(`${dataUrl}/${MODEL_CONFIG.summaryFileName}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load city data (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        if (!data?.cities || typeof data.cities !== 'object') {
          throw new Error('Invalid city data format');
        }
        setCitySummaries(data);
        setCitySummariesError(null);
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          setCitySummariesError('Request timed out. Please refresh to try again.');
        } else {
          setCitySummariesError(err instanceof Error ? err.message : 'Failed to load cities');
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setCitySummariesLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // Derive available cities from city summaries (data-driven, no hardcoding)
  const availableCities: CityData[] = useMemo(() => {
    if (!citySummaries?.cities) return [];
    return Object.entries(citySummaries.cities).map(([code, summary]) => ({
      code,
      name: summary.name,
      coordinates: summary.coordinates,
      availableScenarios: ALL_SCENARIOS,
    }));
  }, [citySummaries]);

  // View mode: 'map' or 'analysis'
  const [mode, setMode] = useState<'map' | 'analysis'>('map');

  // Map state - centered based on model config
  const [viewState, setViewState] = useState({
    longitude: MODEL_CONFIG.map.center[0],
    latitude: MODEL_CONFIG.map.center[1],
    zoom: MODEL_CONFIG.map.zoom,
  });

  // Hover state for map
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
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

  // Selected city for analysis mode
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  // Track if instruction panel is collapsed (user must explicitly minimize)
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);

  // Handle city selection from map
  const handleCityClick = useCallback((city: CityData) => {
    setSelectedCity(city);
    setMode('analysis');
  }, []);

  // Memoized marker event handlers (avoids recreating functions on every render)
  const handleMarkerMouseEnter = useCallback((city: CityData, e: React.MouseEvent<HTMLButtonElement>) => {
    cancelHideTimeout();
    setHoveredCity(city);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
  }, [cancelHideTimeout]);

  const handleMarkerMouseLeave = useCallback(() => {
    startHideTimeout();
  }, [startHideTimeout]);

  // Return to map
  const handleBackToMap = useCallback(() => {
    setMode('map');
  }, []);

  // Handle location change from AnalysisView
  const handleLocationChange = useCallback((code: string) => {
    const city = availableCities.find(c => c.code === code);
    if (city) {
      setSelectedCity(city);
    }
  }, [availableCities]);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  return (
    <div className="flex-1 w-full overflow-hidden bg-slate-100 relative">
      <AnimatePresence mode="wait">
        {/* ===== MAP MODE ===== */}
        {mode === 'map' && (
          <motion.div
            key="map-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0">

          {/* Loading state for city summaries */}
          {citySummariesLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-700 text-lg">Loading cities...</p>
              </div>
            </div>
          )}

          {/* Error state for city summaries */}
          {citySummariesError && !citySummariesLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-50">
              <div className="text-center max-w-md px-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-slate-800 text-xl font-bold mb-2">Unable to Load Data</h2>
                <p className="text-slate-500 mb-4">{citySummariesError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
          >
            {availableCities.map(city => {
              const summary = citySummaries?.cities[city.code];
              const suppression = summary?.metrics.suppressionRate.value ?? 75;
              const prevalence = summary?.metrics.diagnosedPrevalence.value ?? 15000;
              const colors = getSuppressionColor(suppression);
              const size = getMarkerSize(prevalence);
              const isActive = selectedCity?.code === city.code || hoveredCity?.code === city.code;

              return (
                <Marker
                  key={city.code}
                  longitude={city.coordinates[0]}
                  latitude={city.coordinates[1]}
                  anchor="center"
                >
                  <button
                    onClick={() => handleCityClick(city)}
                    onMouseEnter={(e) => handleMarkerMouseEnter(city, e)}
                    onMouseLeave={handleMarkerMouseLeave}
                    className="relative transition-transform duration-200 hover:scale-110"
                    style={{ transform: isActive ? 'scale(1.15)' : undefined }}
                  >
                    {/* Outer ring - color by suppression rate */}
                    <div
                      className="rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        width: size,
                        height: size,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: `3px solid ${colors.ring}`,
                        boxShadow: isActive
                          ? `0 0 16px ${colors.glow}, 0 0 24px ${colors.glow}`
                          : `0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)`
                      }}
                    >
                      {/* Inner dot */}
                      <div
                        className="rounded-full"
                        style={{
                          width: size * 0.4,
                          height: size * 0.4,
                          backgroundColor: colors.ring,
                        }}
                      />
                    </div>
                    {/* Pulse animation when hovered */}
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-full animate-ping opacity-30"
                        style={{
                          backgroundColor: colors.ring,
                        }}
                      />
                    )}
                  </button>
                </Marker>
              );
            })}
          </Map>

          {/* Info panel */}
          <div className="absolute top-4 left-4 w-80">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl overflow-hidden shadow-lg">
              {/* Header row - always visible */}
              <button
                onClick={() => setInstructionsCollapsed(prev => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <h1 className="text-slate-800 font-semibold text-sm">
                  {MODEL_CONFIG.name}
                </h1>
                <motion.div
                  animate={{ rotate: instructionsCollapsed ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </motion.div>
              </button>

              {/* Collapsible content */}
              <motion.div
                initial={false}
                animate={{
                  height: instructionsCollapsed ? 0 : 'auto',
                  opacity: instructionsCollapsed ? 0 : 1
                }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-slate-100">
                  {/* How to use */}
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-medium">1</span>
                      </div>
                      <p className="text-slate-600 text-sm">
                        <span className="text-slate-800 font-medium">Hover</span> a city to preview key metrics and projected impact
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-medium">2</span>
                      </div>
                      <p className="text-slate-600 text-sm">
                        <span className="text-slate-800 font-medium">Click</span> to open full analysis with interactive charts
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-medium">3</span>
                      </div>
                      <p className="text-slate-600 text-sm">
                        <span className="text-slate-800 font-medium">Compare</span> scenarios and explore breakdowns by age, sex, and race
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Legend - always visible */}
              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <div className="w-2 h-2 rounded-full bg-sky-500" />
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                  <span>Suppression</span>
                </div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  </div>
                  <span>Population</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hover preview card */}
          {hoveredCity && hoverPosition && (() => {
            const summary = citySummaries?.cities[hoveredCity.code];
            const colors = summary ? getSuppressionColor(summary.metrics.suppressionRate.value) : null;

            // Smart positioning to avoid edge cutoff
            const cardWidth = 280;
            const cardHeight = 220;
            const padding = 16;
            const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

            // Horizontal: calculate ideal centered position, then clamp to viewport
            const idealLeft = hoverPosition.x - cardWidth / 2;
            const clampedLeft = Math.max(
              padding,
              Math.min(idealLeft, windowWidth - cardWidth - padding)
            );

            // Calculate arrow position (where the marker is relative to the card)
            const arrowLeft = hoverPosition.x - clampedLeft;
            // Clamp arrow to stay within card bounds (with some padding)
            const arrowLeftClamped = Math.max(20, Math.min(arrowLeft, cardWidth - 20));

            // Vertical: flip below if too close to top
            const showBelow = hoverPosition.y < cardHeight + padding + 50;
            const topPos = showBelow ? hoverPosition.y + 35 : hoverPosition.y - 12;

            return (
              <motion.div
                initial={{ opacity: 0, y: showBelow ? -10 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed z-50"
                style={{
                  left: clampedLeft,
                  top: topPos,
                  transform: showBelow ? 'translateY(0)' : 'translateY(-100%)',
                  cursor: 'pointer'
                }}
                onMouseEnter={cancelHideTimeout}
                onMouseLeave={startHideTimeout}
                onClick={() => hoveredCity && handleCityClick(hoveredCity)}
              >
                <div className="bg-white/98 backdrop-blur-md border border-slate-200 rounded-xl p-3 min-w-[240px] hover:bg-slate-50 transition-colors shadow-lg">
                  {/* Header - single line */}
                  <h3 className="font-semibold text-slate-800 text-sm mb-2">
                    {summary?.shortName || hoveredCity.name.split(',')[0]}, {hoveredCity.name.split(',').slice(-1)[0]?.trim()}
                  </h3>

                  {/* Current Status (Model Estimates) */}
                  {summary && (
                    <div className="py-2 border-y border-slate-100">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">Model Estimate {summary.metrics.suppressionRate.year}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Viral suppression</span>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: colors?.ring }}
                            />
                            <span className="text-sm font-semibold text-slate-800">
                              {summary.metrics.suppressionRate.value.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">People with HIV</span>
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
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">Cessation Scenario</span>
                        <span className="text-[10px] text-slate-400">by {summary.impact.targetYear}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">New HIV cases</span>
                        <span className="text-sm font-semibold text-amber-600">
                          +{summary.impact.cessationIncreasePercent}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Click hint */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-slate-400 text-xs">
                    <span>Click to explore</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                {/* Arrow - points toward the marker */}
                {!showBelow ? (
                  <div
                    className="absolute -bottom-1.5 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"
                    style={{ left: arrowLeftClamped, transform: 'translateX(-50%)' }}
                  />
                ) : (
                  <div
                    className="absolute -top-1.5 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"
                    style={{ left: arrowLeftClamped, transform: 'translateX(-50%)' }}
                  />
                )}
              </motion.div>
            );
          })()}

        </motion.div>
        )}

        {/* ===== ANALYSIS MODE ===== */}
        {mode === 'analysis' && selectedCity && (
          <motion.div
            key="analysis-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <AnalysisView
              config={MODEL_CONFIG}
              locationCode={selectedCity.code}
              availableLocations={availableCities.map(c => ({ code: c.code, name: c.name }))}
              onLocationChange={handleLocationChange}
              onBackToMap={handleBackToMap}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
