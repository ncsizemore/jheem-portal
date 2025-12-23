'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker } from 'react-map-gl/mapbox';
import { useCityData } from '@/hooks/useCityData';
import NativeSimulationChart from '@/components/NativeSimulationChart';
import { transformPlotData } from '@/utils/transformPlotData';
import { CityData } from '@/data/cities';
import type { PlotDataFile, FacetPanel, ChartDisplayOptions } from '@/types/native-plotting';
import 'mapbox-gl/dist/mapbox-gl.css';

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

export default function ExploreV2() {
  const { cityData, loading, error, loadCity, getPlotData, getAvailableOptions } = useCityData();

  // View mode: 'map' or 'analysis'
  const [mode, setMode] = useState<'map' | 'analysis'>('map');

  // Map state
  const [viewState, setViewState] = useState({
    longitude: -95.7,
    latitude: 37.1,
    zoom: 4.3,
  });

  // Selection state
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('');
  const [selectedFacet, setSelectedFacet] = useState<string>('');

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
            {AVAILABLE_CITIES.map(city => (
              <Marker
                key={city.code}
                longitude={city.coordinates[0]}
                latitude={city.coordinates[1]}
                anchor="center"
              >
                <button
                  onClick={() => handleCityClick(city)}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200
                    ${selectedCity?.code === city.code
                      ? 'bg-blue-500 border-white scale-125'
                      : 'bg-blue-500/80 border-white/60 hover:bg-blue-400 hover:border-white hover:scale-110'
                    }`}
                  style={{
                    boxShadow: selectedCity?.code === city.code
                      ? '0 0 12px rgba(59, 130, 246, 0.8)'
                      : '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                />
              </Marker>
            ))}
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

                  {/* City name */}
                  <div>
                    <h1 className="font-semibold text-slate-900 text-lg leading-tight">
                      {selectedCity.name.split(',')[0]}
                    </h1>
                    <p className="text-slate-400 text-xs">
                      {selectedCity.name.split(',').slice(1).join(',').trim()}
                    </p>
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
