'use client';

/**
 * Shared custom simulation explorer component.
 *
 * Config-driven: accepts a ModelConfig and location list, renders parameter sliders,
 * triggers simulations, and displays results using the shared AnalysisResults component.
 *
 * Used by both MSA and state-level custom simulation pages.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCustomSimulation } from '@/hooks/useCustomSimulation';
import { useAnalysisState } from '@/hooks/useAnalysisState';
import { transformPlotData } from '@/utils/transformPlotData';
import AnalysisResults from '@/components/analysis/AnalysisResults';
import SimulationProgress from '@/components/SimulationProgress';
import type { FacetPanel } from '@/types/native-plotting';
import type { ModelConfig } from '@/config/model-configs';

interface Location {
  code: string;
  name: string;
}

interface CustomSimulationExplorerProps {
  config: ModelConfig;
  locations: Location[];
  basePath: string; // e.g., '/ryan-white/custom' or '/ryan-white-state-level/custom?model=ajph'
  children?: React.ReactNode; // Page header content (title, subtitle)
  locationPlaceholder?: string; // e.g., 'Select a city...' or 'Select a state...'
  modelSelector?: React.ReactNode; // Optional model toggle rendered between header and parameters
}

export default function CustomSimulationExplorer({
  config,
  locations,
  basePath,
  children,
  locationPlaceholder,
  modelSelector,
}: CustomSimulationExplorerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const placeholder = locationPlaceholder ?? `Select a ${config.geographyLabel?.toLowerCase() ?? 'location'}...`;

  // Parameter config
  const paramConfig = useMemo(
    () => config.customSimulation?.parameters ?? [],
    [config.customSimulation?.parameters]
  );

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

  // Build a query string from the current location + parameters. Pure
  // helper shared by updateUrl (router sync) and the share URL display
  // below, so the two can never drift out of sync.
  const buildQueryString = useCallback((loc: string, params: Record<string, number>) => {
    const sp = new URLSearchParams();
    if (loc) sp.set('loc', loc);
    for (const p of paramConfig) {
      const val = params[p.id];
      if (val !== undefined && val !== p.default) {
        sp.set(p.keyPrefix, String(val));
      }
    }
    return sp.toString();
  }, [paramConfig]);

  // Sync state changes back to URL
  const updateUrl = useCallback((loc: string, params: Record<string, number>) => {
    const qs = buildQueryString(loc, params);
    router.replace(`${basePath}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [buildQueryString, router, basePath]);

  // Full absolute share URL, used by the "return to this link later" widget.
  // Origin is captured from window after mount — it's not available during
  // the initial SSR pass, so before hydration we fall back to a path-only
  // string (briefly invisible on the first frame, no flash of wrong content).
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);
  const shareUrl = useMemo(() => {
    const qs = buildQueryString(selectedLocation, parameters);
    return `${origin}${basePath}${qs ? `?${qs}` : ''}`;
  }, [origin, basePath, buildQueryString, selectedLocation, parameters]);

  // Custom simulation hook
  const {
    status: simStatus,
    data: simData,
    error: simError,
    scenarioKey,
    phaseMessage,
    phase,
    startedAt,
    simulationProgress,
    runSimulation,
    reset,
  } = useCustomSimulation();

  // Auto-trigger only if user arrived with URL params (shared link / return visit).
  // Only fire if the URL location is actually one we support — without this check,
  // anyone can craft a link with ?loc=<anything> and a click would trigger a workflow
  // run on page load. The API also rejects bad locations server-side, but bailing here
  // avoids the wasted round trip and the (harmless) error toast.
  const initialUrlHadLoc = useRef(searchParams.get('loc') !== null);
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (!autoTriggered && initialUrlHadLoc.current && selectedLocation && simStatus === 'idle') {
      setAutoTriggered(true);
      const isKnownLocation = locations.some((l) => l.code === selectedLocation);
      if (!isKnownLocation) return;
      runSimulation(config.id, selectedLocation, parameters);
    }
  }, [autoTriggered, selectedLocation, simStatus, runSimulation, parameters, config.id, locations]);

  // Extract available options from loaded data
  // scenarioData is the raw data keyed by scenario > outcome > statistic > facet
  const scenarioData = useMemo(() => {
    if (!simData?.data) return null;
    const scenarios = Object.keys(simData.data);
    return scenarios.length > 0 ? simData.data[scenarios[0]] : null;
  }, [simData]);

  const availableOptions = useMemo(() => {
    if (!simData?.data) return { scenarios: [], outcomes: [], statistics: [], facets: [] };
    const scenarios = Object.keys(simData.data);
    if (!scenarioData) return { scenarios, outcomes: [], statistics: [], facets: [] };
    const outcomes = Object.keys(scenarioData);
    const firstOutcome = scenarioData[outcomes[0]];
    if (!firstOutcome) return { scenarios, outcomes, statistics: [], facets: [] };
    const statistics = Object.keys(firstOutcome);
    const firstStat = firstOutcome[statistics[0]];
    if (!firstStat) return { scenarios, outcomes, statistics, facets: [] };
    const facets = Object.keys(firstStat);
    return { scenarios, outcomes, statistics, facets };
  }, [simData, scenarioData]);

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
    config,
    availableOptions,
    isDataLoaded: !!simData,
    scenarioData,
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
    const emailToSend = notifyByEmail && email.trim() ? email.trim() : undefined;
    runSimulation(config.id, selectedLocation, parameters, emailToSend);
  };

  // Email notification
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [email, setEmail] = useState('');

  const [linkCopied, setLinkCopied] = useState(false);

  const copyLink = useCallback(() => {
    // Prefer the derived shareUrl (guaranteed to match what the user
    // sees in the read-only input); fall back to window.location.href
    // only if origin hasn't been captured yet (first-frame edge case).
    const toCopy = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (!toCopy) return;
    navigator.clipboard.writeText(toCopy).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [shareUrl]);

  const locationName = locations.find((l) => l.code === selectedLocation)?.name ?? '';
  const isRunning = simStatus === 'checking' || simStatus === 'running' || simStatus === 'loading';

  // Human-readable scenario description from parameter values
  const scenarioDescription = useMemo(() => {
    return paramConfig.map((p) => `${p.label} ${parameters[p.id]}${p.unit}`).join(', ');
  }, [paramConfig, parameters]);

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {children}

        {modelSelector}

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
              <option value="">{placeholder}</option>
              {locations.map((loc) => (
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

          {/* Return-later widget: share URL + optional email notification.
              Single row on desktop (URL flex-grows, email collapses on the
              right); stacks on mobile. The framing text is the actual UX
              payload — "you don't have to wait" — with the URL and email
              being the two paths to realizing that promise. */}
          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-2">
              Simulations take 10&ndash;20 minutes. Return to this link later to see your results
              {' '}&mdash; or enter an email and we&rsquo;ll notify you.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {/* URL display + copy */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  aria-label="Shareable link to this configuration"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex-shrink-0 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
                  aria-label="Copy link to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {/* Email toggle — compact label when unchecked, collapses to
                  just a checkmark + input when checked. Keeps the row at a
                  single height regardless of state. */}
              {notifyByEmail ? (
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => setNotifyByEmail(false)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Disable email notification"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 sm:w-64 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap sm:flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => setNotifyByEmail(true)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Email me when ready
                </label>
              )}
            </div>
          </div>

          {/* Run button */}
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
          </div>

          {/* Running — return later info (inside parameter panel) */}
          {isRunning && !simData && (
            <div className="mt-5 pt-5 border-t border-slate-200 text-sm text-slate-500">
              <p>
                Simulations typically take 10-20 minutes. You can close this page and return later.
                {notifyByEmail && email.trim() ? ' We\u2019ll email you when it\u2019s done.' : ''}
              </p>
              <button
                onClick={copyLink}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {linkCopied ? 'Copied!' : 'Copy link to results'}
              </button>
            </div>
          )}

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
              startedAt={startedAt}
              simulationProgress={simulationProgress}
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
              interventionStartYear={config.interventionStartYear}
              locationName={locationName}
              scenarioLabel={activeScenario}
            />
          </div>
        )}
      </div>
    </div>
  );
}
