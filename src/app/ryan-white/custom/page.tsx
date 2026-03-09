'use client';

/**
 * Custom Simulations page for Ryan White model.
 *
 * Users select a location and adjust parameters, then run a custom simulation.
 * Results are displayed using the same chart components as the prerun explorer.
 */

import { useState, useMemo } from 'react';
import { ryanWhiteConfig } from '@/config/model-configs';
import { useCustomSimulation } from '@/hooks/useCustomSimulation';
import { useAnalysisState } from '@/hooks/useAnalysisState';
import { transformPlotData } from '@/utils/transformPlotData';
import NativeSimulationChart from '@/components/NativeSimulationChart';
import type { ChartDisplayOptions, FacetPanel } from '@/types/native-plotting';
import { ALL_CITIES } from '@/data/cities';

const MODEL_CONFIG = ryanWhiteConfig;

const LOCATIONS = ALL_CITIES
  .map((c) => ({ code: c.code, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

function formatOptionLabel(value: string): string {
  return value
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('And', '&');
}

const FACET_PAGE_SIZE = 9;

export default function CustomSimulationPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  // Parameter state from model config
  const paramConfig = MODEL_CONFIG.customSimulation?.parameters ?? [];
  const [parameters, setParameters] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const p of paramConfig) {
      defaults[p.id] = p.default;
    }
    return defaults;
  });

  // Custom simulation hook
  const {
    status: simStatus,
    data: simData,
    error: simError,
    scenarioKey,
    runSimulation,
    reset,
  } = useCustomSimulation();

  // Extract available options from loaded data
  const availableOptions = useMemo(() => {
    if (!simData?.data) return { scenarios: [], outcomes: [], statistics: [], facets: [] };
    const scenarios = Object.keys(simData.data);
    const firstScenario = simData.data[scenarios[0]];
    if (!firstScenario) return { scenarios, outcomes: [], statistics: [], facets: [] };
    const outcomes = Object.keys(firstScenario);
    const firstOutcome = firstScenario[outcomes[0]];
    if (!firstOutcome) return { scenarios, outcomes, statistics: [], facets: [] };
    const statistics = Object.keys(firstOutcome);
    const firstStat = firstOutcome[statistics[0]];
    if (!firstStat) return { scenarios, outcomes, statistics, facets: [] };
    const facets = Object.keys(firstStat);
    return { scenarios, outcomes, statistics, facets };
  }, [simData]);

  // Analysis state
  const {
    selectedOutcome,
    selectedStatistic,
    selectedFacet,
    facetDimensions,
    availableFacetDimensions,
    setSelectedOutcome,
    setSelectedStatistic,
    toggleFacetDimension,
  } = useAnalysisState({
    config: MODEL_CONFIG,
    availableOptions,
    isDataLoaded: !!simData,
  });

  const [displayOptions] = useState<ChartDisplayOptions>({
    showConfidenceInterval: true,
    showBaseline: true,
    showObservations: true,
  });

  const [showAllFacets, setShowAllFacets] = useState(false);

  // Use first scenario key from the data (custom sims have exactly one)
  const activeScenario = availableOptions.scenarios[0] ?? '';

  // Get plot data
  const plotData = useMemo(() => {
    if (!simData?.data || !activeScenario || !selectedOutcome || !selectedStatistic || !selectedFacet) {
      return null;
    }
    return simData.data[activeScenario]?.[selectedOutcome]?.[selectedStatistic]?.[selectedFacet] ?? null;
  }, [simData, activeScenario, selectedOutcome, selectedStatistic, selectedFacet]);

  // Transform for chart
  const chartPanels: FacetPanel[] = useMemo(() => {
    return plotData ? transformPlotData(plotData) : [];
  }, [plotData]);

  const isFaceted = chartPanels.length > 1;

  const handleRun = () => {
    if (!selectedLocation) return;
    runSimulation(MODEL_CONFIG.id, selectedLocation, parameters);
  };

  const locationName = LOCATIONS.find((l) => l.code === selectedLocation)?.name ?? '';
  const isRunning = simStatus === 'checking' || simStatus === 'running' || simStatus === 'loading';

  const outcomeLabel = plotData?.metadata?.outcome_metadata?.display_name || selectedOutcome;
  const units = plotData?.metadata?.outcome_metadata?.units || '';
  const displayAsPercent = plotData?.metadata?.outcome_metadata?.display_as_percent || false;

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Custom Simulations</h1>
          <p className="text-slate-500 mt-1">
            Explore custom Ryan White funding scenarios by adjusting suppression loss parameters.
          </p>
        </div>

        {/* Parameter Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Simulation Parameters
          </h2>

          {/* Location */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                reset();
              }}
              className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a city...</option>
              {LOCATIONS.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Parameter sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {paramConfig.map((param) => (
              <div key={param.id}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-600">{param.label}</label>
                  <span className="text-sm font-semibold text-slate-800">
                    {parameters[param.id]}{param.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={parameters[param.id]}
                  onChange={(e) => setParameters((prev) => ({ ...prev, [param.id]: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>0{param.unit}</span>
                  <span>100{param.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={!selectedLocation || isRunning}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {simStatus === 'checking' ? 'Checking cache...'
                  : simStatus === 'running' ? 'Simulation running...'
                  : 'Loading results...'}
              </span>
            ) : (
              'Run Simulation'
            )}
          </button>

          {simError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {simError}
            </div>
          )}
        </div>

        {/* Running indicator */}
        {isRunning && !simData && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-700 text-lg font-medium">
                {simStatus === 'checking' ? 'Checking for cached results...'
                  : simStatus === 'running' ? 'Running simulation...'
                  : 'Loading results...'}
              </p>
              {simStatus === 'running' && (
                <p className="text-slate-400 text-sm mt-2">
                  This typically takes 5-10 minutes. You can leave this page open.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {simData && chartPanels.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header + controls */}
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Results: {locationName}
                </h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  {scenarioKey}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {availableOptions.outcomes.map((o) => (
                    <option key={o} value={o}>{formatOptionLabel(o)}</option>
                  ))}
                </select>

                <select
                  value={selectedStatistic}
                  onChange={(e) => setSelectedStatistic(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {availableOptions.statistics.map((s) => (
                    <option key={s} value={s}>{formatOptionLabel(s)}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  {MODEL_CONFIG.facetDimensions.map((dim) => (
                    <button
                      key={dim}
                      onClick={() => toggleFacetDimension(dim)}
                      disabled={!availableFacetDimensions[dim]}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                        facetDimensions[dim]
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : availableFacetDimensions[dim]
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                      }`}
                    >
                      {dim}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart(s) */}
            <div className="p-6">
              {!isFaceted ? (
                <div className="max-w-4xl mx-auto">
                  <NativeSimulationChart
                    panel={chartPanels[0]}
                    outcomeLabel={outcomeLabel}
                    units={units}
                    displayAsPercent={displayAsPercent}
                    options={displayOptions}
                    interventionStartYear={MODEL_CONFIG.interventionStartYear}
                    locationName={locationName}
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(showAllFacets ? chartPanels : chartPanels.slice(0, FACET_PAGE_SIZE)).map((panel) => (
                      <div key={panel.facetValue} className="bg-white rounded-lg border border-slate-200 p-4">
                        <NativeSimulationChart
                          panel={panel}
                          outcomeLabel={outcomeLabel}
                          units={units}
                          displayAsPercent={displayAsPercent}
                          options={displayOptions}
                          height={250}
                          interventionStartYear={MODEL_CONFIG.interventionStartYear}
                          locationName={locationName}
                        />
                      </div>
                    ))}
                  </div>
                  {chartPanels.length > FACET_PAGE_SIZE && !showAllFacets && (
                    <div className="text-center mt-4">
                      <button
                        onClick={() => setShowAllFacets(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Show all {chartPanels.length} panels
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
