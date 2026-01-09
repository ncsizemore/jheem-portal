'use client';

/**
 * SAMPLE: State-level choropleth map component
 *
 * Demonstrates choropleth map for state-level Ryan White data.
 * Uses synthetic data since we only did a dry run for state generation.
 *
 * Route: /ryan-white/explorer/state
 */

import { useState, useCallback, useEffect } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl/mapbox';
import type { MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Synthetic state summary data (matches structure from generate-state-summaries.ts)
const SYNTHETIC_STATE_DATA: Record<string, {
  name: string;
  code: string;
  metrics: {
    diagnosedPrevalence: number;
    suppressionRate: number;
    incidenceBaseline: number;
    incidenceCessation: number;
  };
  impact: {
    cessationIncreasePercent: number;
    cessationIncreaseAbsolute: number;
  };
}> = {
  'Alabama': {
    name: 'Alabama', code: 'AL',
    metrics: { diagnosedPrevalence: 15200, suppressionRate: 68.2, incidenceBaseline: 680, incidenceCessation: 920 },
    impact: { cessationIncreasePercent: 35, cessationIncreaseAbsolute: 240 }
  },
  'California': {
    name: 'California', code: 'CA',
    metrics: { diagnosedPrevalence: 142000, suppressionRate: 78.5, incidenceBaseline: 4200, incidenceCessation: 5100 },
    impact: { cessationIncreasePercent: 21, cessationIncreaseAbsolute: 900 }
  },
  'Florida': {
    name: 'Florida', code: 'FL',
    metrics: { diagnosedPrevalence: 125000, suppressionRate: 71.3, incidenceBaseline: 4800, incidenceCessation: 6200 },
    impact: { cessationIncreasePercent: 29, cessationIncreaseAbsolute: 1400 }
  },
  'Georgia': {
    name: 'Georgia', code: 'GA',
    metrics: { diagnosedPrevalence: 58000, suppressionRate: 66.8, incidenceBaseline: 2400, incidenceCessation: 3300 },
    impact: { cessationIncreasePercent: 38, cessationIncreaseAbsolute: 900 }
  },
  'Illinois': {
    name: 'Illinois', code: 'IL',
    metrics: { diagnosedPrevalence: 42000, suppressionRate: 75.2, incidenceBaseline: 1400, incidenceCessation: 1750 },
    impact: { cessationIncreasePercent: 25, cessationIncreaseAbsolute: 350 }
  },
  'Louisiana': {
    name: 'Louisiana', code: 'LA',
    metrics: { diagnosedPrevalence: 22500, suppressionRate: 64.5, incidenceBaseline: 1100, incidenceCessation: 1550 },
    impact: { cessationIncreasePercent: 41, cessationIncreaseAbsolute: 450 }
  },
  'Missouri': {
    name: 'Missouri', code: 'MO',
    metrics: { diagnosedPrevalence: 14800, suppressionRate: 70.1, incidenceBaseline: 580, incidenceCessation: 760 },
    impact: { cessationIncreasePercent: 31, cessationIncreaseAbsolute: 180 }
  },
  'Mississippi': {
    name: 'Mississippi', code: 'MS',
    metrics: { diagnosedPrevalence: 12400, suppressionRate: 62.3, incidenceBaseline: 620, incidenceCessation: 890 },
    impact: { cessationIncreasePercent: 44, cessationIncreaseAbsolute: 270 }
  },
  'New York': {
    name: 'New York', code: 'NY',
    metrics: { diagnosedPrevalence: 118000, suppressionRate: 79.8, incidenceBaseline: 2800, incidenceCessation: 3300 },
    impact: { cessationIncreasePercent: 18, cessationIncreaseAbsolute: 500 }
  },
  'Texas': {
    name: 'Texas', code: 'TX',
    metrics: { diagnosedPrevalence: 98000, suppressionRate: 69.4, incidenceBaseline: 4600, incidenceCessation: 6100 },
    impact: { cessationIncreasePercent: 33, cessationIncreaseAbsolute: 1500 }
  },
  'Wisconsin': {
    name: 'Wisconsin', code: 'WI',
    metrics: { diagnosedPrevalence: 8200, suppressionRate: 76.9, incidenceBaseline: 280, incidenceCessation: 340 },
    impact: { cessationIncreasePercent: 21, cessationIncreaseAbsolute: 60 }
  },
};

// Color scale for cessation impact (% increase in new HIV cases)
function getImpactColor(percentIncrease: number): string {
  if (percentIncrease >= 40) return '#dc2626'; // red-600 - severe
  if (percentIncrease >= 35) return '#ea580c'; // orange-600
  if (percentIncrease >= 30) return '#f97316'; // orange-500
  if (percentIncrease >= 25) return '#fbbf24'; // amber-400
  if (percentIncrease >= 20) return '#84cc16'; // lime-500 - moderate
  return '#22c55e'; // green-500 - lower impact
}

// GeoJSON for US state boundaries
// Source: Eric Celeste (public domain, derived from US Census Bureau TIGER/Line)
// https://eric.clst.org/tech/usgeojson/
//
// Resolution options (scale : file size):
//   - 20m  (1:20,000,000)  : ~1.4MB  ← current, good for country-level view
//   - 5m   (1:5,000,000)   : ~2.5MB
//   - 500k (1:500,000)     : ~2.4MB, most detailed
//
// To swap: download from https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_{resolution}.json
const US_STATES_GEOJSON = '/us-states.json';

export default function StateMapSample() {
  const [statesGeoJson, setStatesGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredStateName, setHoveredStateName] = useState<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    state: typeof SYNTHETIC_STATE_DATA[string];
  } | null>(null);

  const [viewState, setViewState] = useState({
    longitude: -98.5,
    latitude: 39.8,
    zoom: 3.8,
  });

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
      const stateData = SYNTHETIC_STATE_DATA[stateName];

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
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredStateName(null);
    setPopupInfo(null);
  }, []);

  const onStateClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0];
    const stateName = feature?.properties?.NAME;
    if (stateName && SYNTHETIC_STATE_DATA[stateName]) {
      console.log(`Clicked state: ${stateName}`);
      alert(`Would navigate to analysis for ${stateName}`);
    }
  }, []);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Build the fill color expression for the choropleth
  const fillColorExpression: mapboxgl.Expression = [
    'match',
    ['get', 'NAME'],
    // Map each state name to its color based on impact
    ...Object.entries(SYNTHETIC_STATE_DATA).flatMap(([name, data]) => [
      name,
      getImpactColor(data.impact.cessationIncreasePercent)
    ]),
    'rgba(200, 200, 200, 0.3)' // Default for states without data
  ];

  return (
    <div className="relative w-full h-screen">
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
            <div className="p-3 min-w-[220px]">
              <h3 className="font-semibold text-slate-800 text-base mb-2">
                {popupInfo.state.name}
              </h3>

              {/* Current Status */}
              <div className="py-2 border-y border-slate-100">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
                  Model Estimate 2024
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Viral suppression</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {popupInfo.state.metrics.suppressionRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">People with HIV</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {popupInfo.state.metrics.diagnosedPrevalence.toLocaleString()}
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
                  <span className="text-[10px] text-slate-400">by 2030</span>
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
              <span className="text-xs text-slate-600">20-25% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }} />
              <span className="text-xs text-slate-600">25-30% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
              <span className="text-xs text-slate-600">30-35% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ea580c' }} />
              <span className="text-xs text-slate-600">35-40% increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }} />
              <span className="text-xs text-slate-600">&gt;40% increase</span>
            </div>
          </div>

          {/* States with data indicator */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded bg-slate-200" />
              <span>States without data</span>
            </div>
            <p className="text-[10px] text-slate-400 italic mt-2">
              * Sample with synthetic data. 11 states analyzed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
