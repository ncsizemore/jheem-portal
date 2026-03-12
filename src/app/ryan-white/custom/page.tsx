'use client';

/**
 * Custom Simulations page for Ryan White model.
 *
 * Users select a location and adjust parameters, then run a custom simulation.
 * Results are displayed using the shared AnalysisResults component (same controls,
 * chart/table views, and export features as the prerun explorer).
 *
 * State is encoded in URL query params for shareability and leave-and-return:
 *   /ryan-white/custom?loc=C.12580&a=50&o=30&r=40
 *
 * Parameter keys in the URL use the keyPrefix from models.json config.
 */

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ryanWhiteConfig } from '@/config/model-configs';
import { useCustomSimulation } from '@/hooks/useCustomSimulation';
import { useAnalysisState } from '@/hooks/useAnalysisState';
import { transformPlotData } from '@/utils/transformPlotData';
import AnalysisResults from '@/components/analysis/AnalysisResults';
import SimulationProgress from '@/components/SimulationProgress';
import type { FacetPanel } from '@/types/native-plotting';
import { ALL_CITIES } from '@/data/cities';

const MODEL_CONFIG = ryanWhiteConfig;

const LOCATIONS = ALL_CITIES
  .map((c) => ({ code: c.code, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

function CustomSimulationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parameter config
  const paramConfig = MODEL_CONFIG.customSimulation?.parameters ?? [];

  // Initialize state from URL query params (fall back to defaults)
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    return searchParams.get('loc') ?? '';
  });

  const [parameters, setParameters] = useState<Record<string, number>>(() => {
    const values: Record<string, number> = {};
    for (const p of paramConfig) {
      const urlVal = searchParams.get(p.keyPrefix);
      if (urlVal !== null) {
        const num = Number(urlVal);
        values[p.id] = isFinite(num) ? Math.round(Math.min(100, Math.max(0, num))) : p.default;
      } else {
        values[p.id] = p.default;
      }
    }
    return values;
  });

  // Sync state changes back to URL
  const updateUrl = useCallback((loc: string, params: Record<string, number>) => {
    const sp = new URLSearchParams();
    if (loc) sp.set('loc', loc);
    for (const p of paramConfig) {
      const val = params[p.id];
      if (val !== undefined && val !== p.default) {
        sp.set(p.keyPrefix, String(val));
      }
    }
    const qs = sp.toString();
    router.replace(`/ryan-white/custom${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [paramConfig, router]);

  // Custom simulation hook
  const {
    status: simStatus,
    data: simData,
    error: simError,
    scenarioKey,
    phaseMessage,
    phase,
    simulationProgress,
    startedAt,
    runSimulation,
    reset,
  } = useCustomSimulation();

  // Auto-trigger only if user arrived with URL params (shared link / return visit)
  const initialUrlHadLoc = useRef(searchParams.get('loc') !== null);
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (!autoTriggered && initialUrlHadLoc.current && selectedLocation && simStatus === 'idle') {
      setAutoTriggered(true);
      runSimulation(MODEL_CONFIG.id, selectedLocation, parameters);
    }
  }, [autoTriggered, selectedLocation, simStatus, runSimulation, parameters]);

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

  const handleRun = () => {
    if (!selectedLocation) return;
    runSimulation(MODEL_CONFIG.id, selectedLocation, parameters);
  };

  const [linkCopied, setLinkCopied] = useState(false);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, []);

  const locationName = LOCATIONS.find((l) => l.code === selectedLocation)?.name ?? '';
  const isRunning = simStatus === 'checking' || simStatus === 'running' || simStatus === 'loading';

  // Human-readable scenario description from parameter values
  const scenarioDescription = useMemo(() => {
    return paramConfig.map((p) => `${p.label} ${parameters[p.id]}${p.unit}`).join(', ');
  }, [paramConfig, parameters]);

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
                const loc = e.target.value;
                setSelectedLocation(loc);
                updateUrl(loc, parameters);
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
                  onChange={(e) => {
                    const newParams = { ...parameters, [param.id]: Number(e.target.value) };
                    setParameters(newParams);
                    updateUrl(selectedLocation, newParams);
                  }}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>0{param.unit}</span>
                  <span>100{param.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Run button + copy link */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={!selectedLocation || isRunning}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {simStatus === 'checking' ? 'Checking cache...'
                    : simStatus === 'loading' ? 'Loading results...'
                    : 'Simulation running...'}
                </span>
              ) : (
                'Run Simulation'
              )}
            </button>

            {selectedLocation && (
              <button
                onClick={copyLink}
                className="px-4 py-2.5 border border-slate-300 hover:border-slate-400 text-slate-600 font-medium rounded-lg transition-colors text-sm"
              >
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </button>
            )}
          </div>

          {simError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
              <span>{simError}</span>
              <button
                onClick={handleRun}
                className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-md transition-colors text-xs flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Running indicator */}
        {isRunning && !simData && (
          simStatus === 'running' ? (
            <SimulationProgress
              phase={phase}
              phaseMessage={phaseMessage}
              simulationProgress={simulationProgress}
              startedAt={startedAt}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-700 text-lg font-medium">
                  {simStatus === 'checking' ? 'Checking for cached results...' : 'Loading results...'}
                </p>
              </div>
            </div>
          )
        )}

        {/* Results */}
        {simData && chartPanels.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Results header */}
            <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Results: {locationName}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">{scenarioDescription}</p>
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  {scenarioKey}
                </span>
              </div>
            </div>

            {/* Shared controls + chart/table */}
            <AnalysisResults
              chartPanels={chartPanels}
              plotData={plotData}
              selectedOutcome={selectedOutcome}
              selectedStatistic={selectedStatistic}
              selectedFacet={selectedFacet}
              facetDimensions={facetDimensions}
              availableFacetDimensions={availableFacetDimensions}
              availableOutcomes={availableOptions.outcomes}
              availableStatistics={availableOptions.statistics}
              setSelectedOutcome={setSelectedOutcome}
              setSelectedStatistic={setSelectedStatistic}
              toggleFacetDimension={toggleFacetDimension}
              interventionStartYear={MODEL_CONFIG.interventionStartYear}
              locationName={locationName}
              scenarioLabel={activeScenario}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomSimulationPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CustomSimulationContent />
    </Suspense>
  );
}
