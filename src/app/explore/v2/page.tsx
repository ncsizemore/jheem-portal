'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker } from 'react-map-gl/mapbox';
import { useCityData } from '@/hooks/useCityData';
import NativeSimulationChart from '@/components/NativeSimulationChart';
import { transformPlotData } from '@/utils/transformPlotData';
import { CityData } from '@/data/cities';
import type { PlotDataFile, FacetPanel, ChartDisplayOptions } from '@/types/native-plotting';
import 'mapbox-gl/dist/mapbox-gl.css';

// City summary data types
interface CitySummary {
  name: string;
  shortName: string;
  coordinates: [number, number];
  metrics: {
    diagnosedPrevalence: { value: number; year: number; label: string };
    suppressionRate: { value: number; year: number; label: string };
    incidenceBaseline: { value: number; year: number; label: string };
    incidenceCessation: { value: number; year: number; label: string };
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
  cities: Record<string, CitySummary>;
}

// Available cities with data
const AVAILABLE_CITIES: CityData[] = [
  {
    code: 'C.12580',
    name: 'Baltimore-Columbia-Towson, MD',
    coordinates: [-76.6122, 39.2904],
    availableScenarios: ['cessation', 'brief_interruption', 'prolonged_interruption'],
  },
];

const SCENARIO_LABELS: Record<string, string> = {
  cessation: 'Cessation',
  brief_interruption: 'Brief Interruption',
  prolonged_interruption: 'Prolonged Interruption',
};

const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  cessation: 'Ryan White funding completely stops',
  brief_interruption: 'Funding pauses temporarily (1-2 years)',
  prolonged_interruption: 'Funding pauses for an extended period (3+ years)',
};

function formatOptionLabel(value: string): string {
  return value
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('And', '&');
}

// Get color based on suppression rate (higher = greener)
function getSuppressionColor(rate: number): { ring: string; glow: string; bg: string } {
  if (rate >= 80) return { ring: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)', bg: 'bg-green-500' };
  if (rate >= 70) return { ring: '#84cc16', glow: 'rgba(132, 204, 22, 0.5)', bg: 'bg-lime-500' };
  if (rate >= 60) return { ring: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', bg: 'bg-yellow-500' };
  if (rate >= 50) return { ring: '#f97316', glow: 'rgba(249, 115, 22, 0.5)', bg: 'bg-orange-500' };
  return { ring: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', bg: 'bg-red-500' };
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
  const { cityData, loading, error, loadCity, getPlotData, getAvailableOptions } = useCityData();

  // City summaries for map display
  const [citySummaries, setCitySummaries] = useState<CitySummaries | null>(null);

  // Load city summaries on mount
  useEffect(() => {
    fetch('/data/city-summaries.json')
      .then(res => res.json())
      .then(data => setCitySummaries(data))
      .catch(err => console.error('Failed to load city summaries:', err));
  }, []);

  // View mode: 'map' or 'analysis'
  const [mode, setMode] = useState<'map' | 'analysis'>('map');

  // Map state
  const [viewState, setViewState] = useState({
    longitude: -95.7,
    latitude: 37.1,
    zoom: 4.3,
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

  // Selection state
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('');
  const [selectedFacet, setSelectedFacet] = useState<string>('');

  // City switcher dropdown
  const [showCitySwitcher, setShowCitySwitcher] = useState(false);

  // Display options
  const [displayOptions, setDisplayOptions] = useState<ChartDisplayOptions>({
    showConfidenceInterval: true,
    showBaseline: true,
    showObservations: true,
  });

  // Derived state
  const options = getAvailableOptions();
  const plotData: PlotDataFile | null = useMemo(() => {
    if (cityData && selectedScenario && selectedOutcome && selectedStatistic && selectedFacet) {
      return getPlotData(selectedScenario, selectedOutcome, selectedStatistic, selectedFacet);
    }
    return null;
  }, [cityData, selectedScenario, selectedOutcome, selectedStatistic, selectedFacet, getPlotData]);

  const chartPanels: FacetPanel[] = useMemo(() => {
    return plotData ? transformPlotData(plotData) : [];
  }, [plotData]);

  const isFaceted = chartPanels.length > 1;

  // Handle city selection
  const handleCityClick = useCallback(async (city: CityData) => {
    setSelectedCity(city);
    await loadCity(city.code);
    setMode('analysis');
  }, [loadCity]);

  // Set defaults when city data loads
  useEffect(() => {
    if (cityData && selectedCity) {
      const opts = getAvailableOptions();

      if (selectedCity.availableScenarios?.length && !selectedScenario) {
        setSelectedScenario(selectedCity.availableScenarios[0]);
      }
      if (opts.outcomes.length && !selectedOutcome) {
        setSelectedOutcome(opts.outcomes[0]);
      }
      if (opts.statistics.length && !selectedStatistic) {
        const defaultStat = opts.statistics.includes('mean.and.interval')
          ? 'mean.and.interval'
          : opts.statistics[0];
        setSelectedStatistic(defaultStat);
      }
      if (opts.facets.length && !selectedFacet) {
        const defaultFacet = opts.facets.includes('none') ? 'none' : opts.facets[0];
        setSelectedFacet(defaultFacet);
      }
    }
  }, [cityData, selectedCity, getAvailableOptions, selectedScenario, selectedOutcome, selectedStatistic, selectedFacet]);

  // Return to map (preserves selection state for quick return)
  const handleBackToMap = useCallback(() => {
    setMode('map');
  }, []);

  // Switch city while staying in analysis mode
  const handleSwitchCity = useCallback(async (city: CityData) => {
    setShowCitySwitcher(false);
    if (city.code === selectedCity?.code) return;

    // Reset selections for new city
    setSelectedCity(city);
    setSelectedScenario('');
    setSelectedOutcome('');
    setSelectedStatistic('');
    setSelectedFacet('');

    await loadCity(city.code);
  }, [selectedCity, loadCity]);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900">
      <AnimatePresence mode="wait">
        {/* ===== MAP MODE ===== */}
        {mode === 'map' && (
          <motion.div
            key="map-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
          >
            {AVAILABLE_CITIES.map(city => {
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
                    onMouseEnter={(e) => {
                      cancelHideTimeout();
                      setHoveredCity(city);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                    }}
                    onMouseLeave={() => {
                      startHideTimeout();
                    }}
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

          {/* Info card */}
          <div className="absolute top-4 left-4 max-w-sm">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <h1 className="text-white font-semibold text-lg mb-1">JHEEM Explorer</h1>
              <p className="text-white/70 text-sm mb-3">
                Explore projected HIV outcomes under different Ryan White Program funding scenarios.
              </p>
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span>{AVAILABLE_CITIES.length} {AVAILABLE_CITIES.length === 1 ? 'city' : 'cities'} available</span>
              </div>
            </div>
          </div>

          {/* Prompt */}
          {!loading && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className="bg-white/95 shadow-lg rounded-full px-5 py-2.5 flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <p className="text-slate-700 text-sm font-medium">Click a city to explore outcomes</p>
              </div>
            </div>
          )}

          {/* Hover preview card */}
          {hoveredCity && hoverPosition && (() => {
            const summary = citySummaries?.cities[hoveredCity.code];
            const colors = summary ? getSuppressionColor(summary.metrics.suppressionRate.value) : null;

            // Smart positioning to avoid edge cutoff
            const cardWidth = 280;
            const cardHeight = 220;
            const padding = 20;
            const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

            // Calculate where card would be if centered
            const cardLeft = hoverPosition.x - cardWidth / 2;
            const cardRight = hoverPosition.x + cardWidth / 2;

            // Horizontal positioning
            let leftPos = hoverPosition.x;
            let horizontalShift = '-50%'; // default: centered

            if (cardLeft < padding) {
              // Would overflow left - align card's left edge to padding
              leftPos = padding;
              horizontalShift = '0%';
            } else if (cardRight > windowWidth - padding) {
              // Would overflow right - align card's right edge to window - padding
              leftPos = windowWidth - padding;
              horizontalShift = '-100%';
            }

            // Vertical: flip below if too close to top
            const showBelow = hoverPosition.y < cardHeight + padding + 50;
            const topPos = showBelow ? hoverPosition.y + 35 : hoverPosition.y - 12;
            const verticalShift = showBelow ? '0%' : '-100%';

            return (
              <motion.div
                initial={{ opacity: 0, y: showBelow ? -10 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed z-50"
                style={{
                  left: leftPos,
                  top: topPos,
                  transform: `translate(${horizontalShift}, ${verticalShift})`,
                  cursor: 'pointer'
                }}
                onMouseEnter={cancelHideTimeout}
                onMouseLeave={startHideTimeout}
                onClick={() => hoveredCity && handleCityClick(hoveredCity)}
              >
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[260px] hover:shadow-2xl transition-shadow">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {summary?.shortName || hoveredCity.name.split(',')[0]}
                      </h3>
                      <p className="text-slate-500 text-xs">
                        {hoveredCity.name.split(',').slice(1).join(',').trim()}
                      </p>
                    </div>
                  </div>

                  {/* Metrics */}
                  {summary && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      {/* Suppression rate */}
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
                      {/* Prevalence */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Living with HIV</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {summary.metrics.diagnosedPrevalence.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Impact headline */}
                  {summary && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-amber-800">
                            If funding stops:
                          </p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            +{summary.impact.cessationIncreasePercent}% new cases by {summary.impact.targetYear}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-3 text-center">
                    <span className="text-xs text-blue-600 font-medium">Click to explore projections →</span>
                  </div>
                </div>
                {/* Arrow - points up or down based on card position */}
                {!showBelow ? (
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" />
                ) : (
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45" />
                )}
              </motion.div>
            );
          })()}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-white rounded-lg px-6 py-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-slate-700">Loading city data...</span>
              </div>
            </div>
          )}
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
            className="relative w-full h-full bg-slate-50">
          {/* Main content area */}
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 flex-shrink-0">
              {/* Top row: Location + Scenarios */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Map thumbnail */}
                  <button
                    onClick={handleBackToMap}
                    className="group relative rounded-lg overflow-hidden border-2 border-blue-300 shadow-sm shadow-blue-100 hover:shadow-md hover:shadow-blue-200 hover:border-blue-400 hover:scale-105 transition-all duration-200 flex-shrink-0"
                    title="Back to map"
                  >
                    <div className="w-20 h-12 relative">
                      <Map
                        longitude={selectedCity.coordinates[0]}
                        latitude={selectedCity.coordinates[1]}
                        zoom={6}
                        mapboxAccessToken={MAPBOX_TOKEN}
                        mapStyle="mapbox://styles/mapbox/dark-v11"
                        style={{ width: '100%', height: '100%' }}
                        attributionControl={false}
                        interactive={false}
                      >
                        <Marker
                          longitude={selectedCity.coordinates[0]}
                          latitude={selectedCity.coordinates[1]}
                          anchor="center"
                        >
                          <div className="relative">
                            <div className="absolute inset-0 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75" />
                            <div className="relative w-2 h-2 bg-blue-500 rounded-full border border-white" />
                          </div>
                        </Marker>
                      </Map>
                      <div className="absolute bottom-0.5 left-0.5 bg-black/50 rounded px-1 py-0.5">
                        <span className="text-[8px] font-medium text-white/90">← Map</span>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  </button>

                  {/* City name - clickable to switch */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCitySwitcher(!showCitySwitcher)}
                      className="text-left group flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
                    >
                      <div>
                        <h1 className="font-semibold text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                          {selectedCity.name.split(',')[0]}
                        </h1>
                        <p className="text-slate-400 text-xs">
                          {selectedCity.name.split(',').slice(1).join(',').trim()}
                        </p>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${showCitySwitcher ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* City dropdown */}
                    {showCitySwitcher && (
                      <>
                        {/* Backdrop to close */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowCitySwitcher(false)}
                        />
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[240px]">
                          <div className="px-3 py-2 border-b border-slate-100">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Switch City</p>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {AVAILABLE_CITIES.map(city => (
                              <button
                                key={city.code}
                                onClick={() => handleSwitchCity(city)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between
                                  ${city.code === selectedCity.code ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                              >
                                <span>{city.name}</span>
                                {city.code === selectedCity.code && (
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                          {AVAILABLE_CITIES.length === 1 && (
                            <div className="px-3 py-2 border-t border-slate-100">
                              <p className="text-xs text-slate-400">More cities coming soon</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Scenario tabs */}
                {selectedCity.availableScenarios && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">Scenario:</span>
                    <div className="flex gap-1">
                      {selectedCity.availableScenarios.map(scenario => (
                        <button
                          key={scenario}
                          onClick={() => setSelectedScenario(scenario)}
                          title={SCENARIO_DESCRIPTIONS[scenario] || ''}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all
                            ${selectedScenario === scenario
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                          {SCENARIO_LABELS[scenario] || scenario}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom row: Plot controls */}
              <div className="px-4 py-2 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500">Outcome:</label>
                    <select
                      value={selectedOutcome}
                      onChange={e => setSelectedOutcome(e.target.value)}
                      className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {options.outcomes.map(o => (
                        <option key={o} value={o}>{formatOptionLabel(o)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500">Statistic:</label>
                    <select
                      value={selectedStatistic}
                      onChange={e => setSelectedStatistic(e.target.value)}
                      className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {options.statistics.map(s => (
                        <option key={s} value={s}>{formatOptionLabel(s)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500">Breakdown:</label>
                    <select
                      value={selectedFacet}
                      onChange={e => setSelectedFacet(e.target.value)}
                      className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {options.facets.map(f => (
                        <option key={f} value={f}>{formatOptionLabel(f)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Display toggles */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={displayOptions.showConfidenceInterval}
                      onChange={e => setDisplayOptions(prev => ({ ...prev, showConfidenceInterval: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    95% CI
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={displayOptions.showBaseline}
                      onChange={e => setDisplayOptions(prev => ({ ...prev, showBaseline: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Baseline
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={displayOptions.showObservations}
                      onChange={e => setDisplayOptions(prev => ({ ...prev, showObservations: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Observed
                  </label>
                </div>
              </div>
            </div>

            {/* Chart area */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500">Loading...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-slate-900 font-medium mb-2">Failed to load data</h3>
                    <p className="text-slate-500 text-sm">{error}</p>
                  </div>
                </div>
              ) : chartPanels.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">Select options to view chart</p>
                </div>
              ) : !isFaceted ? (
                /* Single chart - centered, generous size */
                <div className="max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 p-6">
                  <NativeSimulationChart
                    panel={chartPanels[0]}
                    outcomeLabel={plotData?.metadata.outcome_metadata?.display_name || selectedOutcome}
                    units={plotData?.metadata.y_label || ''}
                    displayAsPercent={plotData?.metadata.outcome_metadata?.display_as_percent || false}
                    options={displayOptions}
                    height={500}
                  />
                </div>
              ) : (
                /* Faceted grid - responsive columns */
                <div>
                  <p className="text-sm text-slate-500 mb-4">{chartPanels.length} panels</p>
                  <div className={`grid gap-4 ${
                    chartPanels.length <= 4 ? 'grid-cols-1 lg:grid-cols-2' :
                    chartPanels.length <= 9 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
                    'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                  }`}>
                    {chartPanels.map(panel => (
                      <div key={panel.facetValue} className="bg-white rounded-lg border border-slate-200 p-4">
                        <NativeSimulationChart
                          panel={panel}
                          outcomeLabel={plotData?.metadata.outcome_metadata?.display_name || selectedOutcome}
                          units={plotData?.metadata.y_label || ''}
                          displayAsPercent={plotData?.metadata.outcome_metadata?.display_as_percent || false}
                          options={displayOptions}
                          height={300}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
