'use client';

/**
 * AnalysisView - Reusable analysis UI for location-based model data
 *
 * Displays interactive charts/tables with controls for:
 * - Scenario selection
 * - Outcome selection
 * - Statistic type (mean, median)
 * - Facet breakdown (age, sex, race, risk)
 * - CSV/PNG export
 *
 * Used by both MSA (city) and state-level explorers.
 */

import { useCallback, useMemo } from 'react';
import { useResultManifest, useResultPlot } from '@/hooks/useResultData';
import { getResultEntryPlot } from '@/config/result-entry-plots';
import { resultDataReleases } from '@/config/result-data-releases';
import {
  useAnalysisState,
  type AvailableOptions,
} from '@/hooks/useAnalysisState';
import AnalysisResults from '@/components/analysis/AnalysisResults';
import LocationSwitcher from '@/components/analysis/LocationSwitcher';
import { transformPlotData } from '@/utils/transformPlotData';
import type { ModelConfig } from '@/config/model-configs';
import type { FacetPanel } from '@/types/native-plotting';

export interface Location {
  code: string;
  name: string;
}

export interface AnalysisViewProps {
  config: ModelConfig;
  locationCode: string;
  availableLocations: Location[];
  onLocationChange: (code: string) => void;
  onBackToMap: () => void;
}

export default function AnalysisView({
  config,
  locationCode,
  availableLocations,
  onLocationChange,
  onBackToMap,
}: AnalysisViewProps) {
  const binding = resultDataReleases[config.id];
  const manifestResult = useResultManifest(binding, config.id, locationCode);
  const manifest = manifestResult.manifest;
  const availableOptions: AvailableOptions = manifest?.metadata ?? {
    scenarios: [],
    outcomes: [],
    statistics: [],
    facets: [],
  };

  // Selection state (extracted hook)
  const {
    selectedScenario,
    selectedOutcome,
    selectedStatistic,
    selectedFacet,
    facetDimensions,
    availableFacetDimensions,
    setSelectedScenario,
    setSelectedOutcome,
    setSelectedStatistic,
    toggleFacetDimension,
    facetChoices,
    setSelectedFacet,
    selectionNotice,
    availableOutcomes,
    availableStatistics,
  } = useAnalysisState({
    config,
    availableOptions,
    isDataLoaded: !!manifest,
    catalog: manifest?.data,
  });

  const requestedSelection = {
    scenario: selectedScenario,
    outcome: selectedOutcome,
    statistic: selectedStatistic,
    facet: selectedFacet,
  };
  const plotResult = useResultPlot(
    binding,
    manifest,
    requestedSelection,
    getResultEntryPlot(binding, config.id, locationCode, requestedSelection),
  );
  const plotData = plotResult.plot;
  const error = manifestResult.error;
  const loading = !error && manifestResult.loading;
  const retry = () => {
    manifestResult.retry();
    plotResult.retry();
  };
  const getOutcomeDisplayName = (outcome: string) =>
    manifest?.outcome_labels[outcome] || outcome;

  // Get current location info
  const currentLocation = useMemo(() => {
    return availableLocations.find((loc) => loc.code === locationCode);
  }, [availableLocations, locationCode]);

  // Derive scenario descriptions and labels from config
  const scenarioDescriptions = useMemo(() => {
    return Object.fromEntries(
      config.scenarios.map((s) => [s.id, s.description]),
    );
  }, [config.scenarios]);

  const scenarioLabels = useMemo(() => {
    return Object.fromEntries(config.scenarios.map((s) => [s.id, s.label]));
  }, [config.scenarios]);

  // Transform plot data for charts
  const chartPanels: FacetPanel[] = useMemo(() => {
    return plotData ? transformPlotData(plotData) : [];
  }, [plotData]);

  // Get available scenarios from data
  const availableScenarios = useMemo(() => {
    return config.scenarios.filter(
      (s) => !manifest || availableOptions.scenarios.includes(s.id),
    );
  }, [config.scenarios, availableOptions.scenarios, manifest]);

  // Handle location switch
  const handleLocationChange = useCallback(
    (loc: Location) => {
      if (loc.code === locationCode) return;
      onLocationChange(loc.code);
    },
    [locationCode, onLocationChange],
  );

  return (
    <div
      data-testid="analysis-view"
      className="absolute inset-0 bg-white flex flex-col overflow-y-auto text-ink"
    >
      <h1 className="sr-only">
        {config.name} results for {currentLocation?.name || locationCode}
      </h1>
      {/* Analysis context: location + scenario */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 sm:px-8 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.5fr)] lg:items-center lg:gap-6">
          <div className="flex min-w-0 items-center gap-2">
            {/* Back to map button */}
            <button
              type="button"
              onClick={onBackToMap}
              className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Back to map"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Map</span>
            </button>

            <div
              className="hidden sm:block w-px h-6 bg-slate-200"
              aria-hidden="true"
            />

            {/* Location switcher */}
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Location
              </span>
              <LocationSwitcher
                currentLocation={currentLocation}
                locationCode={locationCode}
                availableLocations={availableLocations}
                geographyLabelPlural={config.geographyLabelPlural}
                onLocationChange={handleLocationChange}
              />
            </div>
          </div>

          {/* Scenario tabs */}
          {availableScenarios.length > 0 && (
            <section
              className="min-w-0 lg:border-l lg:border-slate-200 lg:pl-4"
              aria-labelledby="analysis-scenario-label"
            >
              <span
                id="analysis-scenario-label"
                className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Scenario
              </span>
              <select
                aria-label="Scenario"
                disabled={!manifest}
                value={selectedScenario}
                onChange={(event) => setSelectedScenario(event.target.value)}
                className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 text-sm text-ink sm:hidden"
              >
                {availableScenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
              <div className="mt-1 grid min-w-0 gap-1.5 xl:grid-cols-[max-content_minmax(0,1fr)] xl:items-center">
                <div
                  className="hidden flex-wrap gap-1 sm:flex"
                  role="group"
                  aria-labelledby="analysis-scenario-label"
                >
                  {availableScenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      aria-pressed={selectedScenario === scenario.id}
                      disabled={!manifest}
                      onClick={() => setSelectedScenario(scenario.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
                        ${
                          selectedScenario === scenario.id
                            ? 'bg-ink text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {scenario.label}
                    </button>
                  ))}
                </div>
                {selectedScenario && scenarioDescriptions[selectedScenario] && (
                  <p className="min-w-0 text-xs leading-5 text-slate-500">
                    <span className="font-medium text-slate-700">
                      {scenarioDescriptions[selectedScenario]}
                    </span>
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <AnalysisResults
        loading={loading || plotResult.loading}
        controlsDisabled={!manifest}
        loadingMessage={
          loading
            ? `Loading results for ${currentLocation?.name || locationCode}…`
            : undefined
        }
        loadError={error || plotResult.error}
        onRetry={retry}
        chartPanels={chartPanels}
        plotData={plotData}
        selectedOutcome={selectedOutcome}
        selectedStatistic={selectedStatistic}
        selectedFacet={selectedFacet}
        facetDimensions={facetDimensions}
        availableFacetDimensions={availableFacetDimensions}
        availableOutcomes={manifest ? availableOutcomes : [selectedOutcome]}
        availableStatistics={
          manifest ? availableStatistics : [selectedStatistic]
        }
        setSelectedOutcome={setSelectedOutcome}
        setSelectedStatistic={setSelectedStatistic}
        toggleFacetDimension={toggleFacetDimension}
        facetChoices={
          manifest
            ? facetChoices
            : [
                {
                  key: selectedFacet,
                  label:
                    selectedFacet === 'none'
                      ? 'Whole population'
                      : selectedFacet,
                },
              ]
        }
        setSelectedFacet={setSelectedFacet}
        selectionNotice={selectionNotice}
        modelName={config.name}
        modelId={config.id}
        timeline={
          config.scenarios.find((s) => s.id === selectedScenario)?.timeline
        }
        scenarioDescription={scenarioDescriptions[selectedScenario]}
        interventionStartYear={config.interventionStartYear}
        locationName={currentLocation?.name}
        scenarioLabel={scenarioLabels[selectedScenario]}
        getOutcomeDisplayName={getOutcomeDisplayName}
      />
    </div>
  );
}
