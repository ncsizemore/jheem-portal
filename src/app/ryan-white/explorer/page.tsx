'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker } from 'react-map-gl/mapbox';
import { useCityData } from '@/hooks/useCityData';
import NativeSimulationChart from '@/components/NativeSimulationChart';
import { transformPlotData } from '@/utils/transformPlotData';
import { CityData } from '@/data/cities';
import type { PlotDataFile, FacetPanel, ChartDisplayOptions } from '@/types/native-plotting';
import { ryanWhiteConfig } from '@/config/model-configs';
import 'mapbox-gl/dist/mapbox-gl.css';

// Use model config for this explorer instance
const MODEL_CONFIG = ryanWhiteConfig;

// Dynamic import for html2canvas (only loaded when needed)
const loadHtml2Canvas = () => import('html2canvas').then(mod => mod.default);

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

// Derive scenario data from config
const ALL_SCENARIOS = MODEL_CONFIG.scenarios.map(s => s.id);
const SCENARIO_LABELS: Record<string, string> = Object.fromEntries(
  MODEL_CONFIG.scenarios.map(s => [s.id, s.label])
);
const SCENARIO_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  MODEL_CONFIG.scenarios.map(s => [s.id, s.description])
);

function formatOptionLabel(value: string): string {
  return value
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('And', '&');
}

// Generate comprehensive filename for exports
function generateExportFilename(
  cityName: string,
  scenario: string,
  outcome: string,
  statistic: string,
  facet: string,
  extension: 'csv' | 'png'
): string {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  const parts = [
    sanitize(cityName.split(',')[0]),
    sanitize(scenario),
    sanitize(outcome),
    sanitize(statistic.replace('mean.and.interval', 'mean_CI').replace('median.and.interval', 'median_CI').replace('individual.simulation', 'sims')),
  ];

  // Add facet breakdown if not "none"
  if (facet && facet !== 'none') {
    parts.push(`by_${sanitize(facet)}`);
  }

  // Add timestamp
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  parts.push(timestamp);

  return `${parts.join('_')}.${extension}`;
}

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
  const { cityData, loading, error, loadCity, getPlotData, getAvailableOptions, getOutcomeDisplayName } = useCityData();

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

  // Selection state
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('');
  const [selectedFacet, setSelectedFacet] = useState<string>('');

  // Facet dimension toggles (derive facet key from active dimensions)
  const [facetDimensions, setFacetDimensions] = useState<{
    age: boolean;
    sex: boolean;
    race: boolean;
    risk: boolean;
  }>({ age: false, sex: false, race: false, risk: false });

  // City switcher dropdown
  const [showCitySwitcher, setShowCitySwitcher] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const citySearchInputRef = useRef<HTMLInputElement>(null);

  // Track if instruction panel is collapsed (user must explicitly minimize)
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);

  // Display options popover
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);

  // Facet pagination
  const [showAllFacets, setShowAllFacets] = useState(false);
  const FACET_PAGE_SIZE = 9;

  // View mode (chart vs table)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Chart container ref for PNG export
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [exportingPng, setExportingPng] = useState(false);

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

  // Filtered cities for search
  const filteredCities = useMemo(() => {
    if (!citySearchTerm.trim()) return availableCities;
    const searchLower = citySearchTerm.toLowerCase().trim();
    return availableCities.filter(city =>
      city.name.toLowerCase().includes(searchLower)
    );
  }, [availableCities, citySearchTerm]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (showCitySwitcher) {
      setCitySearchTerm('');
      // Small delay to ensure DOM is ready
      setTimeout(() => citySearchInputRef.current?.focus(), 50);
    }
  }, [showCitySwitcher]);

  // Compute which facet dimensions are available in the data
  const availableFacetDimensions = useMemo(() => {
    const dims = { age: false, sex: false, race: false, risk: false };
    for (const facet of options.facets) {
      if (facet.includes('age')) dims.age = true;
      if (facet.includes('sex')) dims.sex = true;
      if (facet.includes('race')) dims.race = true;
      if (facet.includes('risk')) dims.risk = true;
    }
    return dims;
  }, [options.facets]);

  // Compute facet key from toggled dimensions
  const computedFacetKey = useMemo(() => {
    const activeDims = Object.entries(facetDimensions)
      .filter(([, active]) => active)
      .map(([dim]) => dim)
      .sort(); // Alphabetical to match data format: age+race+sex+risk
    return activeDims.length === 0 ? 'none' : activeDims.join('+');
  }, [facetDimensions]);

  // Sync selectedFacet with computed key (only if it exists in available options)
  useEffect(() => {
    if (options.facets.includes(computedFacetKey)) {
      setSelectedFacet(computedFacetKey);
    } else if (computedFacetKey !== 'none' && options.facets.length > 0) {
      // Fallback: find closest match or use 'none'
      setSelectedFacet(options.facets.includes('none') ? 'none' : options.facets[0]);
    }
  }, [computedFacetKey, options.facets]);

  // Toggle handler for facet dimensions
  const toggleFacetDimension = useCallback((dim: 'age' | 'sex' | 'race' | 'risk') => {
    setFacetDimensions(prev => ({ ...prev, [dim]: !prev[dim] }));
    setShowAllFacets(false); // Reset pagination when changing facets
  }, []);

  // CSV export handler
  const handleExportCSV = useCallback(() => {
    if (!chartPanels.length || !selectedCity || !plotData) return;

    const rows: string[] = [];
    const isFacetedData = chartPanels.length > 1;

    // Header row
    const headers = isFacetedData
      ? ['Facet', 'Year', 'Intervention', 'Intervention Lower', 'Intervention Upper', 'Baseline', 'Baseline Lower', 'Baseline Upper']
      : ['Year', 'Intervention', 'Intervention Lower', 'Intervention Upper', 'Baseline', 'Baseline Lower', 'Baseline Upper'];
    rows.push(headers.join(','));

    // Data rows
    for (const panel of chartPanels) {
      for (const point of panel.data) {
        const values = isFacetedData
          ? [
              `"${panel.facetLabel}"`,
              point.year,
              point.value ?? '',
              point.lower ?? '',
              point.upper ?? '',
              point.baselineValue ?? '',
              point.baselineLower ?? '',
              point.baselineUpper ?? '',
            ]
          : [
              point.year,
              point.value ?? '',
              point.lower ?? '',
              point.upper ?? '',
              point.baselineValue ?? '',
              point.baselineLower ?? '',
              point.baselineUpper ?? '',
            ];
        rows.push(values.join(','));
      }
    }

    // Create and download file
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateExportFilename(
      selectedCity.name,
      selectedScenario,
      plotData.metadata.outcome || selectedOutcome,
      selectedStatistic,
      selectedFacet,
      'csv'
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [chartPanels, selectedCity, plotData, selectedOutcome, selectedScenario, selectedStatistic, selectedFacet]);

  // PNG export handler
  const handleExportPNG = useCallback(async () => {
    if (!chartContainerRef.current || !selectedCity || !plotData) {
      console.warn('PNG export: missing ref or data');
      return;
    }

    setExportingPng(true);
    try {
      const html2canvas = await loadHtml2Canvas();

      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        // Ignore CSS parsing errors from modern color functions
        ignoreElements: (element) => {
          return element.tagName === 'STYLE' || element.tagName === 'LINK';
        },
        onclone: (_clonedDoc, element) => {
          // Apply computed styles inline to avoid CSS parsing issues with lab()/oklch()
          const applyComputedStyles = (el: Element) => {
            const computed = getComputedStyle(el);
            const htmlEl = el as HTMLElement;
            // Only set essential visual properties
            htmlEl.style.color = computed.color;
            htmlEl.style.backgroundColor = computed.backgroundColor;
            htmlEl.style.borderColor = computed.borderColor;
          };

          // Apply to all elements in the cloned container
          const allElements = element.querySelectorAll('*');
          applyComputedStyles(element);
          allElements.forEach(applyComputedStyles);

          // Ensure SVGs are properly sized
          const svgs = element.querySelectorAll('svg');
          svgs.forEach(svg => {
            const rect = svg.getBoundingClientRect();
            svg.setAttribute('width', String(rect.width));
            svg.setAttribute('height', String(rect.height));
          });
        },
      });

      // Convert to blob for more reliable download
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) {
        throw new Error('Failed to create PNG blob');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateExportFilename(
        selectedCity.name,
        selectedScenario,
        plotData.metadata.outcome || selectedOutcome,
        selectedStatistic,
        selectedFacet,
        'png'
      );
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('PNG export failed. Please try again.');
    } finally {
      setExportingPng(false);
    }
  }, [selectedCity, plotData, selectedOutcome, selectedScenario, selectedStatistic, selectedFacet]);

  // Handle city selection
  const handleCityClick = useCallback(async (city: CityData) => {
    setSelectedCity(city);
    await loadCity(city.code);
    setMode('analysis');
  }, [loadCity]);

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

  // Set defaults when city data loads
  useEffect(() => {
    if (cityData && selectedCity) {
      const opts = getAvailableOptions();

      if (selectedCity.availableScenarios?.length && !selectedScenario) {
        setSelectedScenario(selectedCity.availableScenarios[0]);
      }
      if (opts.outcomes.length && !selectedOutcome) {
        // Default to incidence if available, otherwise first outcome
        const defaultOutcome = opts.outcomes.includes('incidence')
          ? 'incidence'
          : opts.outcomes[0];
        setSelectedOutcome(defaultOutcome);
      }
      if (opts.statistics.length && !selectedStatistic) {
        const defaultStat = opts.statistics.includes('mean.and.interval')
          ? 'mean.and.interval'
          : opts.statistics[0];
        setSelectedStatistic(defaultStat);
      }
      // Note: selectedFacet is now controlled by facetDimensions toggles
      // Default is 'none' (all toggles off)
    }
  }, [cityData, selectedCity, getAvailableOptions, selectedScenario, selectedOutcome, selectedStatistic]);

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
    setFacetDimensions({ age: false, sex: false, race: false, risk: false });

    await loadCity(city.code);
  }, [selectedCity, loadCity]);

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
            className="absolute inset-0 bg-slate-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 flex-shrink-0">
              {/* Top row: Location + Scenarios */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Back to map button */}
                  <button
                    onClick={handleBackToMap}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Back to map"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Map</span>
                  </button>

                  <div className="w-px h-6 bg-slate-200" />

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
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50 min-w-[280px]">
                          {/* Search input */}
                          <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                              <svg
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <input
                                ref={citySearchInputRef}
                                type="text"
                                placeholder="Search cities..."
                                value={citySearchTerm}
                                onChange={e => setCitySearchTerm(e.target.value)}
                                className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                              {citySearchTerm && (
                                <button
                                  onClick={() => setCitySearchTerm('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          {/* City list */}
                          <div className="max-h-64 overflow-y-auto">
                            {filteredCities.length === 0 ? (
                              <div className="px-3 py-4 text-center">
                                <p className="text-sm text-slate-500">No cities match &quot;{citySearchTerm}&quot;</p>
                              </div>
                            ) : (
                              filteredCities.map(city => (
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
                              ))
                            )}
                          </div>
                          {/* Footer showing count */}
                          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400">
                              {filteredCities.length === availableCities.length
                                ? `${availableCities.length} cities`
                                : `${filteredCities.length} of ${availableCities.length} cities`}
                            </p>
                          </div>
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
                        <option key={o} value={o}>{getOutcomeDisplayName(o)}</option>
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
                    <div className="flex items-center gap-1">
                      {(['age', 'sex', 'race', 'risk'] as const).map(dim => (
                        <button
                          key={dim}
                          onClick={() => toggleFacetDimension(dim)}
                          disabled={!availableFacetDimensions[dim]}
                          className={`px-2.5 py-1 text-sm font-medium rounded-md transition-all capitalize
                            ${facetDimensions[dim]
                              ? 'bg-blue-600 text-white'
                              : availableFacetDimensions[dim]
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            }`}
                          title={!availableFacetDimensions[dim] ? `${dim} breakdown not available` : undefined}
                        >
                          {dim}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* View mode toggle */}
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-sm transition-colors
                      ${viewMode === 'chart'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span>Chart</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-sm transition-colors
                      ${viewMode === 'table'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Table</span>
                  </button>
                </div>

                {/* Export buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleExportCSV}
                    disabled={!chartPanels.length}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export as CSV"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={handleExportPNG}
                    disabled={!chartPanels.length || viewMode === 'table' || exportingPng}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={viewMode === 'table' ? 'Switch to chart view to export PNG' : 'Export as PNG'}
                  >
                    {exportingPng ? (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span>PNG</span>
                  </button>
                </div>

                {/* Display options popover */}
                <div className="relative">
                  <button
                    onClick={() => setShowDisplayOptions(!showDisplayOptions)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md transition-colors
                      ${showDisplayOptions
                        ? 'bg-slate-200 text-slate-700'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                    title="Display options"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Display</span>
                  </button>

                  {showDisplayOptions && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDisplayOptions(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 min-w-[160px]">
                        <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Show on chart</p>
                        </div>
                        <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={displayOptions.showConfidenceInterval}
                            onChange={e => setDisplayOptions(prev => ({ ...prev, showConfidenceInterval: e.target.checked }))}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          95% CI
                        </label>
                        <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={displayOptions.showBaseline}
                            onChange={e => setDisplayOptions(prev => ({ ...prev, showBaseline: e.target.checked }))}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Baseline
                        </label>
                        <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={displayOptions.showObservations}
                            onChange={e => setDisplayOptions(prev => ({ ...prev, showObservations: e.target.checked }))}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Observed data
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Chart/Table area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
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
                  <p className="text-slate-500">Select options to view data</p>
                </div>
              ) : viewMode === 'table' ? (
                /* Table view */
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {isFaceted && <th className="px-4 py-3 text-left font-medium text-slate-700">Group</th>}
                          <th className="px-4 py-3 text-left font-medium text-slate-700">Year</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-700">Intervention</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-700">95% CI</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-700">Baseline</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-700">95% CI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {chartPanels.flatMap((panel, panelIdx) =>
                          panel.data.map((point, pointIdx) => (
                            <tr
                              key={`${panel.facetValue}-${point.year}`}
                              className={panelIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                            >
                              {isFaceted && pointIdx === 0 && (
                                <td
                                  className="px-4 py-2 text-slate-700 font-medium align-top"
                                  rowSpan={panel.data.length}
                                >
                                  {panel.facetLabel}
                                </td>
                              )}
                              <td className="px-4 py-2 text-slate-600">{point.year}</td>
                              <td className="px-4 py-2 text-right text-slate-900 font-medium">
                                {point.value != null ? point.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-slate-500 text-xs">
                                {point.lower != null && point.upper != null
                                  ? `${point.lower.toLocaleString(undefined, { maximumFractionDigits: 1 })} – ${point.upper.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
                                  : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-slate-600">
                                {point.baselineValue != null ? point.baselineValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-slate-500 text-xs">
                                {point.baselineLower != null && point.baselineUpper != null
                                  ? `${point.baselineLower.toLocaleString(undefined, { maximumFractionDigits: 1 })} – ${point.baselineUpper.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
                                  : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                    {chartPanels.reduce((acc, p) => acc + p.data.length, 0)} rows
                    {isFaceted && ` across ${chartPanels.length} groups`}
                  </div>
                </div>
              ) : !isFaceted ? (
                /* Single chart - centered, generous size */
                <div ref={chartContainerRef} className="max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 p-6">
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
                /* Faceted grid - responsive columns with pagination */
                <div ref={chartContainerRef}>
                  {/* Header with count and expand/collapse */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-500">
                      {chartPanels.length > FACET_PAGE_SIZE && !showAllFacets
                        ? `Showing ${FACET_PAGE_SIZE} of ${chartPanels.length} panels`
                        : `${chartPanels.length} panels`}
                    </p>
                    {chartPanels.length > FACET_PAGE_SIZE && (
                      <button
                        onClick={() => setShowAllFacets(!showAllFacets)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        {showAllFacets ? (
                          <>
                            <span>Show fewer</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Show all {chartPanels.length}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className={`grid gap-4 ${
                    chartPanels.length <= 4 ? 'grid-cols-1 lg:grid-cols-2' :
                    chartPanels.length <= 9 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
                    'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                  }`}>
                    {(showAllFacets ? chartPanels : chartPanels.slice(0, FACET_PAGE_SIZE)).map(panel => (
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
                  {/* Bottom expand button when collapsed and there are more */}
                  {chartPanels.length > FACET_PAGE_SIZE && !showAllFacets && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowAllFacets(true)}
                        className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg transition-colors"
                      >
                        Show all {chartPanels.length} panels
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
