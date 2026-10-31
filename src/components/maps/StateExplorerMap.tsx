'use client';

/**
 * State-level choropleth map component
 *
 * Displays Ryan White state-level analysis data on an interactive map.
 * Accepts a ModelConfig to support different analyses (AJPH, CROI, etc.)
 * Data fetched from CloudFront based on config.dataUrl.
 */

import { updateAnalysisQuery } from '@/hooks/useAnalysisQuery';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Map as MapInstance } from 'mapbox-gl';
import { fitExplorerMap, initializeExplorerMap } from './explorerMapViewport';
const Map = dynamic(
  () => import('react-map-gl/mapbox').then((m) => m.default),
  { ssr: false },
);
const Source = dynamic(
  () => import('react-map-gl/mapbox').then((m) => m.Source),
  { ssr: false },
);
const Layer = dynamic(
  () => import('react-map-gl/mapbox').then((m) => m.Layer),
  { ssr: false },
);
import type { MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  useStateSummaries,
  type StateSummary,
  getStatusMetrics,
  getStatusYear,
} from '@/hooks/useStateSummaries';
import type { ModelConfig } from '@/config/model-configs';
import { STATE_CODE_TO_NAME, STATE_NAME_TO_CODE } from '@/data/states';

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

  const context =
    modelId === 'cdc-testing' ? 'if testing stops' : 'if funding stops';
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
    Math.floor(normalized * IMPACT_COLORS.length),
  );
  return IMPACT_COLORS[colorIndex];
}

// GeoJSON for US state boundaries
const US_STATES_GEOJSON = '/us-states.json';

export default function StateExplorerMap({
  config,
}: StateChoroplethExplorerProps) {
  const calibrationModel =
    config.id === 'ryan-white-state-croi' ? 'croi' : 'ajph';
  const { summaries, loading, error, getStateByName } = useStateSummaries(
    config.dataUrl,
  );

  const [statesGeoJson, setStatesGeoJson] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [geoJsonError, setGeoJsonError] = useState<string | null>(null);
  const [hoveredStateName, setHoveredStateName] = useState<string | null>(null);
  const [hoveredStateData, setHoveredStateData] = useState<StateSummary | null>(
    null,
  );
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // UI state
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 639px)').matches,
  );
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mapRef = useRef<MapInstance | null>(null);

  // Navigation depends on study coverage, not the summary request.
  const availableStates = useMemo(
    () =>
      config.locations
        .map((code) => ({
          code,
          name: STATE_CODE_TO_NAME[code] || code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [config.locations],
  );

  // Compute impact range for dynamic color scaling
  const impactRange = useMemo(() => {
    if (!summaries?.states) return { min: 0, max: 100 };
    const values = Object.values(summaries.states)
      .map((s) => s.impact.cessationIncreasePercent)
      .filter(Number.isFinite);
    if (!values.length) return { min: 0, max: 0 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [summaries]);

  // Load GeoJSON on mount
  useEffect(() => {
    fetch(US_STATES_GEOJSON)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStatesGeoJson(data);
        setGeoJsonError(null);
      })
      .catch((err) => {
        console.error('Failed to load states GeoJSON:', err);
        setGeoJsonError(
          'Failed to load map boundaries. Please refresh the page.',
        );
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
  const onMouseMove = useCallback(
    (event: MapMouseEvent) => {
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
    },
    [getStateByName, cancelHideTimeout],
  );

  const onMouseLeave = useCallback(() => {
    startHideTimeout();
  }, [startHideTimeout]);

  const onStateClick = useCallback(
    (event: MapMouseEvent) => {
      const feature = event.features?.[0];
      const stateName = feature?.properties?.NAME;
      if (stateName) {
        const stateCode = STATE_NAME_TO_CODE[stateName];
        if (stateCode && config.locations.includes(stateCode)) {
          updateAnalysisQuery({ loc: stateCode });
        }
      }
    },
    [config.locations],
  );

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
        colorEntries.push(
          getImpactColor(
            stateData.impact.cessationIncreasePercent,
            impactRange.min,
            impactRange.max,
          ),
        );
      }
    }

    if (colorEntries.length === 0) {
      return 'rgba(200, 200, 200, 0.6)' as const;
    }

    return [
      'match',
      ['get', 'NAME'],
      ...colorEntries,
      'rgba(200, 200, 200, 0.6)', // Default for states without data
    ] as unknown as mapboxgl.Expression;
  }, [summaries, impactRange]);

  // Count states with data
  const stateCount = config.locations.length;

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-100">
      <div key="map-mode" className="absolute inset-0">
        <Map
          initialViewState={{ longitude: -98.5, latitude: 39.8, zoom: 3 }}
          onStyleData={(event) => initializeExplorerMap(event, mapRef)}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/light-v11"
          projection="mercator"
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
                    0.65,
                  ],
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
                    '#64748b',
                  ],
                  'line-width': [
                    'case',
                    ['==', ['get', 'NAME'], hoveredStateName || ''],
                    2,
                    0.75,
                  ],
                }}
              />
            </Source>
          )}
        </Map>

        {/* Custom hover card */}
        {hoveredStateData &&
          hoverPosition &&
          (() => {
            const state = hoveredStateData;
            const impactColor = getImpactColor(
              state.impact.cessationIncreasePercent,
              impactRange.min,
              impactRange.max,
            );

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
              Math.min(idealLeft, containerWidth - cardWidth - padding),
            );

            // Arrow position
            const arrowLeft = hoverPosition.x - clampedLeft;
            const arrowLeftClamped = Math.max(
              20,
              Math.min(arrowLeft, cardWidth - 20),
            );

            // Vertical: flip below if too close to top
            const showBelow = hoverPosition.y < cardHeight + padding + 50;
            const topPos = showBelow
              ? hoverPosition.y + 20
              : hoverPosition.y - 12;

            const handleCardClick = () => {
              const stateCode = STATE_NAME_TO_CODE[state.name];
              if (stateCode) {
                updateAnalysisQuery({ loc: stateCode });
              }
            };

            return (
              <div
                className="absolute z-50 pointer-events-auto"
                style={{
                  left: clampedLeft,
                  top: topPos,
                  transform: showBelow ? 'translateY(0)' : 'translateY(-100%)',
                }}
                onMouseEnter={cancelHideTimeout}
                onMouseLeave={startHideTimeout}
                onClick={handleCardClick}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleCardClick();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Explore ${state.name}`}
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
                        <div
                          key={idx}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs text-slate-500">
                            {metric.label}
                          </span>
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
                      <span className="text-xs text-slate-500 max-w-[180px] leading-snug">
                        {getImpactHeadline(config.id, state.impact.headline)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: impactColor }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{ color: impactColor }}
                        >
                          +{state.impact.cessationIncreasePercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Click hint */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-slate-400 text-xs">
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

                {/* Arrow pointing to cursor location */}
                {!showBelow ? (
                  <div
                    className="absolute -bottom-1.5 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"
                    style={{
                      left: arrowLeftClamped,
                      transform: 'translateX(-50%)',
                    }}
                  />
                ) : (
                  <div
                    className="absolute -top-1.5 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"
                    style={{
                      left: arrowLeftClamped,
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
              </div>
            );
          })()}

        <button
          type="button"
          onClick={() => {
            if (mapRef.current) fitExplorerMap(mapRef.current);
          }}
          className="absolute bottom-8 right-4 rounded border border-rule bg-white px-3 py-2 text-xs text-ink shadow-sm focus-visible:outline-2"
        >
          Reset map
        </button>
        {/* Info panel */}
        <div
          data-map-panel
          className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-auto sm:w-80"
        >
          <div className="bg-white border border-rule rounded-md overflow-hidden shadow-sm">
            {/* Header - always visible, clickable to collapse */}
            <button
              type="button"
              onClick={() => setInstructionsCollapsed((prev) => !prev)}
              aria-expanded={!instructionsCollapsed}
              aria-controls="state-explorer-instructions"
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <h1 className="text-ink font-serif text-xl">
                {config.id === 'cdc-testing'
                  ? 'Explore HIV testing results'
                  : 'Explore Ryan White results'}
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

            {/* Collapsible instructions */}
            <div
              id="state-explorer-instructions"
              hidden={instructionsCollapsed}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-slate-100">
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Compare how changes to{' '}
                  {config.id === 'cdc-testing'
                    ? 'CDC-funded HIV testing'
                    : 'Ryan White services'}{' '}
                  could affect HIV outcomes in {stateCount} states.
                </p>
                {config.calibration && (
                  <Link
                    href={`/ryan-white-state-level/calibration?model=${calibrationModel}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
                  >
                    See how this model fits observed data
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </div>

            {/* A direct selector keeps the map supplementary and gives keyboard
              and touch users a predictable path into the analysis. */}
            <div className="px-4 py-3 border-t border-slate-100">
              <label
                htmlFor="state-explorer-location"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Choose a state
              </label>
              <select
                id="state-explorer-location"
                value=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  updateAnalysisQuery({ loc: event.target.value });
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a state to explore…</option>
                {availableStates.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>

            {(loading || error || geoJsonError) && (
              <p
                role="status"
                className="px-4 py-3 text-xs leading-relaxed text-muted border-t border-rule"
              >
                {error
                  ? 'Map estimates are unavailable. You can still choose a state to explore its results.'
                  : geoJsonError
                    ? 'Map boundaries are unavailable. Choose a state above to explore its results.'
                    : 'Loading map estimates… You can choose a state now.'}
              </p>
            )}
            {/* Legend - always visible, condensed */}
            <div className="px-4 py-2.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    Impact:
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: '#fed7aa' }}
                    />
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: '#fb923c' }}
                    />
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: '#ea580c' }}
                    />
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: '#7c2d12' }}
                    />
                  </div>
                  <span className="text-slate-600 tabular-nums">
                    {summaries
                      ? `${impactRange.min.toFixed(0)}–${impactRange.max.toFixed(0)}%`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-200" />
                  <span>No data</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {summaries
                  ? getImpactHeadline(
                      config.id,
                      Object.values(summaries.states)[0]?.impact.headline || '',
                    )
                  : 'Relative increase in cumulative HIV infections'}
                . {stateCount} states with projections.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
