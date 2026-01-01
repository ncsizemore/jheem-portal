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

// Available cities with data
const AVAILABLE_CITIES: CityData[] = [
  {
    code: 'C.12060',
    name: 'Atlanta-Sandy Springs-Alpharetta, GA',
    coordinates: [-84.388, 33.749],
    availableScenarios: ['cessation', 'brief_interruption', 'prolonged_interruption'],
  },
  {
    code: 'C.12580',
    name: 'Baltimore-Columbia-Towson, MD',
    coordinates: [-76.6122, 39.2904],
    availableScenarios: ['cessation', 'brief_interruption', 'prolonged_interruption'],
  },
  {
    code: 'C.16980',
    name: 'Chicago-Naperville-Elgin, IL-IN-WI',
    coordinates: [-87.6298, 41.8781],
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
    const dataUrl = process.env.NEXT_PUBLIC_DATA_URL || 'https://d320iym4dtm9lj.cloudfront.net/ryan-white';
    fetch(`${dataUrl}/city-summaries.json`)
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

  // Track if user has started exploring (first hover triggers this)
  const [hasStartedExploring, setHasStartedExploring] = useState(false);

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
                      setHasStartedExploring(true);
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

          {/* Info panel */}
          <div className="absolute top-4 left-4 w-80">
            <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
              {/* Header row - always visible */}
              <button
                onClick={() => setHasStartedExploring(prev => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h1 className="text-white font-semibold text-sm">
                  Ryan White Funding Explorer
                </h1>
                <motion.div
                  animate={{ rotate: hasStartedExploring ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </motion.div>
              </button>

              {/* Collapsible content */}
              <motion.div
                initial={false}
                animate={{
                  height: hasStartedExploring ? 0 : 'auto',
                  opacity: hasStartedExploring ? 0 : 1
                }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-white/10">
                  {/* How to use */}
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-400 text-xs font-medium">1</span>
                      </div>
                      <p className="text-white/70 text-sm">
                        <span className="text-white/90 font-medium">Hover</span> a city to preview key metrics and projected impact
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-400 text-xs font-medium">2</span>
                      </div>
                      <p className="text-white/70 text-sm">
                        <span className="text-white/90 font-medium">Click</span> to open full analysis with interactive charts
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-400 text-xs font-medium">3</span>
                      </div>
                      <p className="text-white/70 text-sm">
                        <span className="text-white/90 font-medium">Compare</span> scenarios and explore breakdowns by age, sex, and race
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Legend - always visible */}
              <div className="px-4 py-2.5 border-t border-white/10 flex items-center gap-4 text-xs text-white/50">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <span>Suppression</span>
                </div>
                <div className="w-px h-3 bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
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
                <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 min-w-[240px] hover:bg-slate-800/95 transition-colors">
                  {/* Header - single line */}
                  <h3 className="font-semibold text-white text-sm mb-2">
                    {summary?.shortName || hoveredCity.name.split(',')[0]}, {hoveredCity.name.split(',').slice(-1)[0]?.trim()}
                  </h3>

                  {/* Current Status (Model Estimates) */}
                  {summary && (
                    <div className="py-2 border-y border-white/10">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-white/40">Model Estimate {summary.metrics.suppressionRate.year}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60">Viral suppression</span>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: colors?.ring }}
                            />
                            <span className="text-sm font-semibold text-white">
                              {summary.metrics.suppressionRate.value.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60">People with HIV</span>
                          <span className="text-sm font-semibold text-white">
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
                        <span className="text-[10px] uppercase tracking-wide text-white/40">If Funding Stops</span>
                        <span className="text-[10px] text-white/30">by {summary.impact.targetYear}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">New HIV cases</span>
                        <span className="text-sm font-semibold text-amber-400">
                          +{summary.impact.cessationIncreasePercent}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Click hint */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-center gap-1 text-white/40 text-xs">
                    <span>Click to explore</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                {/* Arrow - points toward the marker */}
                {!showBelow ? (
                  <div
                    className="absolute -bottom-1.5 w-3 h-3 bg-slate-900/95 border-r border-b border-white/10 rotate-45"
                    style={{ left: arrowLeftClamped, transform: 'translateX(-50%)' }}
                  />
                ) : (
                  <div
                    className="absolute -top-1.5 w-3 h-3 bg-slate-900/95 border-l border-t border-white/10 rotate-45"
                    style={{ left: arrowLeftClamped, transform: 'translateX(-50%)' }}
                  />
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
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400">Scenario:</span>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {selectedCity.availableScenarios.map(scenario => (
                          <button
                            key={scenario}
                            onClick={() => setSelectedScenario(scenario)}
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
                      {/* Scenario description */}
                      {selectedScenario && SCENARIO_DESCRIPTIONS[selectedScenario] && (
                        <span className="text-xs text-slate-500 italic">
                          {SCENARIO_DESCRIPTIONS[selectedScenario]}
                        </span>
                      )}
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
