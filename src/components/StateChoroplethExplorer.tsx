'use client';

/**
 * State-level choropleth map component
 *
 * Displays Ryan White state-level analysis data on an interactive map.
 * Accepts a ModelConfig to support different analyses (AJPH, CROI, etc.)
 * Data fetched from CloudFront based on config.dataUrl.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import type { MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  useStateSummaries,
  type StateSummary,
  getStatusMetrics,
  getStatusYear,
} from '@/hooks/useStateSummaries';
import type { ModelConfig } from '@/config/model-configs';
import AnalysisView from '@/components/AnalysisView';
import { STATE_NAME_TO_CODE } from '@/data/states';

interface StateChoroplethExplorerProps {
  config: ModelConfig;
}

// Construct model-specific headline for impact metric
// Handles both old format (full headline) and new format (just period)
// TODO: Simplify once all workflows regenerate data with new format
function getImpactHeadline(modelId: string, headlineOrPeriod: string): string {
  // Extract period from either format
  // Old: "Relative increase in new HIV infections if funding stops, 2025-2030"
  // New: "2025-2030"
  const periodMatch = headlineOrPeriod.match(/\d{4}-\d{4}/);
  const period = periodMatch ? periodMatch[0] : headlineOrPeriod;

  const context = modelId === 'cdc-testing'
    ? 'if testing stops'
    : 'if funding stops';
  return `Relative increase in new HIV infections ${context}, ${period}`;
}

// Orange color palette for impact visualization (lightest to darkest)
const IMPACT_COLORS = [
  '#fed7aa', // orange-200 - lowest impact
  '#fdba74', // orange-300
  '#fb923c', // orange-400
  '#f97316', // orange-500
  '#ea580c', // orange-600
  '#c2410c', // orange-700
  '#9a3412', // orange-800
  '#7c2d12', // orange-900 - highest impact
];

// Dynamic color scale based on data range
// Maps value to color palette using linear interpolation within min/max range
function getImpactColor(value: number, min: number, max: number): string {
  if (max === min) return IMPACT_COLORS[Math.floor(IMPACT_COLORS.length / 2)];

  // Normalize to 0-1 range, then map to color index
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const colorIndex = Math.min(
    IMPACT_COLORS.length - 1,
    Math.floor(normalized * IMPACT_COLORS.length)
  );
  return IMPACT_COLORS[colorIndex];
}

// GeoJSON for US state boundaries
const US_STATES_GEOJSON = '/us-states.json';

export default function StateChoroplethExplorer({ config }: StateChoroplethExplorerProps) {
  const { summaries, loading, error, getStateByName } = useStateSummaries(config.dataUrl);

  const [statesGeoJson, setStatesGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [geoJsonError, setGeoJsonError] = useState<string | null>(null);
  const [hoveredStateName, setHoveredStateName] = useState<string | null>(null);
  const [hoveredStateData, setHoveredStateData] = useState<StateSummary | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // UI state
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [viewState, setViewState] = useState({
    longitude: -98.5,
    latitude: 39.8,
    zoom: 3.8,
  });

  // View mode: 'map' or 'analysis'
  const [mode, setMode] = useState<'map' | 'analysis'>('map');

  // Selected state for analysis mode
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);

  // Derive available states from summaries
  const availableStates = useMemo(() => {
    if (!summaries?.states) return [];
    return Object.entries(summaries.states).map(([code, state]) => ({
      code,
      name: state.name,
    }));
  }, [summaries]);

  // Compute impact range for dynamic color scaling
  const impactRange = useMemo(() => {
    if (!summaries?.states) return { min: 0, max: 100 };
    const values = Object.values(summaries.states).map(s => s.impact.cessationIncreasePercent);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [summaries]);

  // Load GeoJSON on mount
  useEffect(() => {
    fetch(US_STATES_GEOJSON)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setStatesGeoJson(data);
        setGeoJsonError(null);
      })
      .catch(err => {
        console.error('Failed to load states GeoJSON:', err);
        setGeoJsonError('Failed to load map boundaries. Please refresh the page.');
      });
  }, []);

  // Hover timeout management (allows moving from map to hover card)
  const startHideTimeout = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredStateName(null);
      setHoveredStateData(null);
      setHoverPosition(null);
    }, 200);
  }, []);

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

  // Handle mouse move on states layer
  const onMouseMove = useCallback((event: MapMouseEvent) => {
    cancelHideTimeout();
    const feature = event.features?.[0];
    if (feature?.properties) {
      const stateName = feature.properties.NAME;
      const stateData = getStateByName(stateName);

      setHoveredStateName(stateName);
      setHoveredStateData(stateData);
      // Track screen position for custom hover card
      setHoverPosition({ x: event.point.x, y: event.point.y });
    }
  }, [getStateByName, cancelHideTimeout]);

  const onMouseLeave = useCallback(() => {
    startHideTimeout();
  }, [startHideTimeout]);

  const onStateClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0];
    const stateName = feature?.properties?.NAME;
    if (stateName) {
      const stateCode = STATE_NAME_TO_CODE[stateName];
      const stateData = getStateByName(stateName);
      if (stateData && stateCode) {
        setSelectedStateCode(stateCode);
        setMode('analysis');
      }
    }
  }, [getStateByName]);

  // Return to map
  const handleBackToMap = useCallback(() => {
    setMode('map');
  }, []);

  // Handle location change from AnalysisView
  const handleLocationChange = useCallback((code: string) => {
    setSelectedStateCode(code);
  }, []);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Build the fill color expression for the choropleth
  const fillColorExpression = useMemo(() => {
    if (!summaries) {
      return 'rgba(200, 200, 200, 0.6)' as const;
    }

    const colorEntries: string[] = [];

    // Map each state name to its color based on impact
    for (const [stateName, stateCode] of Object.entries(STATE_NAME_TO_CODE)) {
      const stateData = summaries.states[stateCode];
      if (stateData) {
        colorEntries.push(stateName);
        colorEntries.push(getImpactColor(stateData.impact.cessationIncreasePercent, impactRange.min, impactRange.max));
      }
    }

    if (colorEntries.length === 0) {
      return 'rgba(200, 200, 200, 0.6)' as const;
    }

    return [
      'match',
      ['get', 'NAME'],
      ...colorEntries,
      'rgba(200, 200, 200, 0.6)' // Default for states without data
    ] as unknown as mapboxgl.Expression;
  }, [summaries, impactRange]);

  // Count states with data
  const stateCount = summaries ? Object.keys(summaries.states).length : 0;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading state data...</p>
        </div>
      </div>
    );
  }

  // Error state - data fetch failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Failed to Load Data</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Error state - GeoJSON failed
  if (geoJsonError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center max-w-md">
          <div className="text-amber-500 text-5xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Map Failed to Load</h2>
          <p className="text-slate-600 mb-4">{geoJsonError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

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
            className="absolute inset-0"
          >
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['state-fills']}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onStateClick}
        cursor={hoveredStateName ? 'pointer' : 'default'}
      >
        {statesGeoJson && (
          <Source id="states" type="geojson" data={statesGeoJson}>
            {/* Fill layer - colored by impact */}
            <Layer
              id="state-fills"
              type="fill"
              paint={{
                'fill-color': fillColorExpression,
                'fill-opacity': [
                  'case',
                  ['==', ['get', 'NAME'], hoveredStateName || ''],
                  0.85,
                  0.65
                ]
              }}
            />
            {/* Border layer */}
            <Layer
              id="state-borders"
              type="line"
              paint={{
                'line-color': [
                  'case',
                  ['==', ['get', 'NAME'], hoveredStateName || ''],
                  '#1e3a5f',
                  '#64748b'
                ],
                'line-width': [
                  'case',
                  ['==', ['get', 'NAME'], hoveredStateName || ''],
                  2,
                  0.75
                ]
              }}
            />
          </Source>
        )}

      </Map>

      {/* Custom hover card */}
      {hoveredStateData && hoverPosition && (() => {
        const state = hoveredStateData;
        const impactColor = getImpactColor(state.impact.cessationIncreasePercent, impactRange.min, impactRange.max);

        // Smart positioning to avoid edge cutoff
        const cardWidth = 260;
        const cardHeight = 200;
        const padding = 16;
        const mapContainer = document.querySelector('.mapboxgl-map');
        const containerWidth = mapContainer?.clientWidth || 1200;

        // Horizontal positioning
        const idealLeft = hoverPosition.x - cardWidth / 2;
        const clampedLeft = Math.max(
          padding,
          Math.min(idealLeft, containerWidth - cardWidth - padding)
        );

        // Arrow position
        const arrowLeft = hoverPosition.x - clampedLeft;
        const arrowLeftClamped = Math.max(20, Math.min(arrowLeft, cardWidth - 20));

        // Vertical: flip below if too close to top
        const showBelow = hoverPosition.y < cardHeight + padding + 50;
        const topPos = showBelow ? hoverPosition.y + 20 : hoverPosition.y - 12;

        const handleCardClick = () => {
          const stateCode = STATE_NAME_TO_CODE[state.name];
          if (stateCode) {
            setSelectedStateCode(stateCode);
            setMode('analysis');
          }
        };

        return (
          <motion.div
            initial={{ opacity: 0, y: showBelow ? -10 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-50 pointer-events-auto"
            style={{
              left: clampedLeft,
              top: topPos,
              transform: showBelow ? 'translateY(0)' : 'translateY(-100%)',
            }}
            onMouseEnter={cancelHideTimeout}
            onMouseLeave={startHideTimeout}
            onClick={handleCardClick}
          >
            <div className="bg-white/98 backdrop-blur-md border border-slate-200 rounded-xl p-3 min-w-[240px] hover:bg-slate-50 transition-colors shadow-lg cursor-pointer">
              {/* Header */}
              <h3 className="font-semibold text-slate-800 text-sm mb-2">
                {state.name}
              </h3>

              {/* Current Status - Dynamic metrics from config */}
              <div className="py-2 border-y border-slate-100">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    Model Estimate {getStatusYear(state)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {getStatusMetrics(state).map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{metric.label}</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {metric.format === 'percent'
                          ? `${metric.value.toFixed(0)}%`
                          : metric.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 max-w-[180px] leading-snug">{getImpactHeadline(config.id, state.impact.headline)}</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: impactColor }}
                    />
                    <span className="text-sm font-semibold" style={{ color: impactColor }}>
                      +{state.impact.cessationIncreasePercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Click hint */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-slate-400 text-xs">
                <span>Click to explore</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Arrow pointing to cursor location */}
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

      {/* Info panel */}
      <div className="absolute top-4 left-4 w-80">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl overflow-hidden shadow-lg">
          {/* Header - always visible, clickable to collapse */}
          <button
            onClick={() => setInstructionsCollapsed(prev => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h1 className="text-slate-800 font-semibold text-sm">
              {config.name}
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

          {/* Collapsible instructions */}
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
              <div className="mt-3 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-medium">1</span>
                  </div>
                  <p className="text-slate-600 text-sm">
                    <span className="text-slate-800 font-medium">Hover</span> a state to preview key metrics and projected impact
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
                    <span className="text-slate-800 font-medium">Compare</span> scenarios and explore breakdowns by demographics
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Legend - always visible, condensed */}
          <div className="px-4 py-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Impact:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fed7aa' }} />
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fb923c' }} />
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ea580c' }} />
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#7c2d12' }} />
                </div>
                <span className="text-slate-400">Low → High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-200" />
                <span>No data</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {stateCount} states with model projections
            </p>
          </div>
        </div>
      </div>
          </motion.div>
        )}

        {/* ===== ANALYSIS MODE ===== */}
        {mode === 'analysis' && selectedStateCode && (
          <motion.div
            key="analysis-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <AnalysisView
              config={config}
              locationCode={selectedStateCode}
              availableLocations={availableStates}
              onLocationChange={handleLocationChange}
              onBackToMap={handleBackToMap}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
