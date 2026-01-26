'use client';

/**
 * State-level choropleth map component
 *
 * Displays Ryan White state-level analysis data on an interactive map.
 * Accepts a ModelConfig to support different analyses (AJPH, CROI, etc.)
 * Data fetched from CloudFront based on config.dataUrl.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Source, Layer, Popup } from 'react-map-gl/mapbox';
import type { MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useStateSummaries, type StateSummary } from '@/hooks/useStateSummaries';
import type { ModelConfig } from '@/config/model-configs';
import AnalysisView from '@/components/AnalysisView';

interface StateChoroplethExplorerProps {
  config: ModelConfig;
}

// Complete US state name to code mapping
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
};

// Color scale for cessation impact (% increase in new HIV cases)
function getImpactColor(percentIncrease: number): string {
  if (percentIncrease >= 100) return '#7f1d1d'; // red-900 - extreme
  if (percentIncrease >= 75) return '#dc2626'; // red-600 - severe
  if (percentIncrease >= 50) return '#ea580c'; // orange-600
  if (percentIncrease >= 40) return '#f97316'; // orange-500
  if (percentIncrease >= 30) return '#fbbf24'; // amber-400
  if (percentIncrease >= 20) return '#84cc16'; // lime-500 - moderate
  return '#22c55e'; // green-500 - lower impact
}

// GeoJSON for US state boundaries
const US_STATES_GEOJSON = '/us-states.json';

export default function StateChoroplethExplorer({ config }: StateChoroplethExplorerProps) {
  const { summaries, loading, error, getStateByName } = useStateSummaries(config.dataUrl);

  const [statesGeoJson, setStatesGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredStateName, setHoveredStateName] = useState<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    state: StateSummary;
  } | null>(null);

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

  // Load GeoJSON on mount
  useEffect(() => {
    fetch(US_STATES_GEOJSON)
      .then(res => res.json())
      .then(data => setStatesGeoJson(data))
      .catch(err => console.error('Failed to load states GeoJSON:', err));
  }, []);

  // Handle mouse move on states layer
  const onMouseMove = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0];
    if (feature?.properties) {
      const stateName = feature.properties.NAME;
      const stateData = getStateByName(stateName);

      if (stateData) {
        setHoveredStateName(stateName);
        setPopupInfo({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          state: stateData
        });
      } else {
        // State not in our dataset - still show hover but no popup
        setHoveredStateName(stateName);
        setPopupInfo(null);
      }
    }
  }, [getStateByName]);

  const onMouseLeave = useCallback(() => {
    setHoveredStateName(null);
    setPopupInfo(null);
  }, []);

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
      return 'rgba(200, 200, 200, 0.3)' as const;
    }

    const colorEntries: string[] = [];

    // Map each state name to its color based on impact
    for (const [stateName, stateCode] of Object.entries(STATE_NAME_TO_CODE)) {
      const stateData = summaries.states[stateCode];
      if (stateData) {
        colorEntries.push(stateName);
        colorEntries.push(getImpactColor(stateData.impact.cessationIncreasePercent));
      }
    }

    if (colorEntries.length === 0) {
      return 'rgba(200, 200, 200, 0.3)' as const;
    }

    return [
      'match',
      ['get', 'NAME'],
      ...colorEntries,
      'rgba(200, 200, 200, 0.3)' // Default for states without data
    ] as unknown as mapboxgl.Expression;
  }, [summaries]);

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

  // Error state
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

  return (
    <div className="relative w-full h-screen">
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
        mapStyle="mapbox://styles/mapbox/light-v11"
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
                  0.9,
                  0.7
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
                  '#1e40af',
                  '#94a3b8'
                ],
                'line-width': [
                  'case',
                  ['==', ['get', 'NAME'], hoveredStateName || ''],
                  2.5,
                  0.5
                ]
              }}
            />
          </Source>
        )}

        {/* Hover popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            offset={15}
          >
            <div className="p-3 min-w-[240px]">
              <h3 className="font-semibold text-slate-800 text-base mb-2">
                {popupInfo.state.name}
              </h3>

              {/* Current Status */}
              <div className="py-2 border-y border-slate-100">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
                  Model Estimate {popupInfo.state.metrics.suppressionRate.year}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Viral suppression</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {popupInfo.state.metrics.suppressionRate.value.toFixed(1)}%
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({popupInfo.state.metrics.suppressionRate.lower.toFixed(1)}–{popupInfo.state.metrics.suppressionRate.upper.toFixed(1)})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">People with HIV</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {popupInfo.state.metrics.diagnosedPrevalence.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Impact */}
              <div className="pt-2">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    If Funding Stops
                  </span>
                  <span className="text-[10px] text-slate-400">by {popupInfo.state.impact.targetYear}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">New HIV cases</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: getImpactColor(popupInfo.state.impact.cessationIncreasePercent) }}
                  >
                    +{popupInfo.state.impact.cessationIncreasePercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-slate-400">Additional cases</span>
                  <span className="text-xs text-slate-600">
                    +{popupInfo.state.impact.cessationIncreaseAbsolute.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-slate-400">Baseline → Cessation</span>
                  <span className="text-xs text-slate-600">
                    {popupInfo.state.metrics.incidenceBaseline.value.toLocaleString()} → {popupInfo.state.metrics.incidenceCessation.value.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Click hint */}
              <div className="mt-2 pt-2 border-t border-slate-100 text-center">
                <span className="text-xs text-slate-400">Click to explore →</span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Info panel */}
      <div className="absolute top-4 left-4 w-72">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg p-4">
          <h1 className="text-slate-800 font-semibold text-sm mb-3">
            Ryan White State-Level Analysis
          </h1>

          <p className="text-slate-600 text-xs mb-4">
            Projected impact of funding cessation on new HIV cases by 2030.
            Hover over a state for details, click to explore.
          </p>

          {/* Legend */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">
              Incidence Increase
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-xs text-slate-600">&lt;20% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84cc16' }} />
              <span className="text-xs text-slate-600">20-30% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }} />
              <span className="text-xs text-slate-600">30-40% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
              <span className="text-xs text-slate-600">40-50% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ea580c' }} />
              <span className="text-xs text-slate-600">50-75% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }} />
              <span className="text-xs text-slate-600">75-100% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7f1d1d' }} />
              <span className="text-xs text-slate-600">&gt;100% increase</span>
            </div>
          </div>

          {/* States with data indicator */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded bg-slate-200" />
              <span>States without data</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {stateCount} states with model projections
            </p>
            {summaries && (
              <p className="text-[10px] text-slate-400">
                Generated: {new Date(summaries.generated).toLocaleDateString()}
              </p>
            )}
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
