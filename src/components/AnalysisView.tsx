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

import { useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocationData } from '@/hooks/useCityData';
import { useAnalysisState } from '@/hooks/useAnalysisState';
import AnalysisResults from '@/components/analysis/AnalysisResults';
import LocationSwitcher from '@/components/analysis/LocationSwitcher';
import { transformPlotData } from '@/utils/transformPlotData';
import type { ModelConfig } from '@/config/model-configs';
import type { PlotDataFile, FacetPanel } from '@/types/native-plotting';

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
  // Data loading
  const {
    locationData,
    loading,
    error,
    loadLocation,
    getPlotData,
    getAvailableOptions,
    getOutcomeDisplayName,
  } = useLocationData({ dataUrl: config.dataUrl });

  // Get available options for state management
  const availableOptions = getAvailableOptions();

  // Extract first scenario's data for per-outcome facet availability
  const scenarioData = useMemo(() => {
    if (!locationData?.data) return null;
    const scenarios = Object.keys(locationData.data);
    return scenarios.length > 0 ? locationData.data[scenarios[0]] : null;
  }, [locationData]);

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
    resetSelections,
  } = useAnalysisState({
    config,
    availableOptions,
    isDataLoaded: !!locationData,
    scenarioData,
  });

  // Load location data when locationCode changes
  useEffect(() => {
    if (locationCode) {
      loadLocation(locationCode);
    }
  }, [locationCode, loadLocation]);

  // Get current location info
  const currentLocation = useMemo(() => {
    return availableLocations.find(loc => loc.code === locationCode);
  }, [availableLocations, locationCode]);

  // Derive scenario descriptions and labels from config
  const scenarioDescriptions = useMemo(() => {
    return Object.fromEntries(config.scenarios.map(s => [s.id, s.description]));
  }, [config.scenarios]);

  const scenarioLabels = useMemo(() => {
    return Object.fromEntries(config.scenarios.map(s => [s.id, s.label]));
  }, [config.scenarios]);

  // Get plot data
  const plotData: PlotDataFile | null = useMemo(() => {
    if (locationData && selectedScenario && selectedOutcome && selectedStatistic && selectedFacet) {
      return getPlotData(selectedScenario, selectedOutcome, selectedStatistic, selectedFacet);
    }
    return null;
  }, [locationData, selectedScenario, selectedOutcome, selectedStatistic, selectedFacet, getPlotData]);

  // Transform plot data for charts
  const chartPanels: FacetPanel[] = useMemo(() => {
    return plotData ? transformPlotData(plotData) : [];
  }, [plotData]);

  // Get available scenarios from data
  const availableScenarios = useMemo(() => {
    return config.scenarios.filter(s => availableOptions.scenarios.includes(s.id));
  }, [config.scenarios, availableOptions.scenarios]);

  // Handle location switch
  const handleLocationChange = useCallback((loc: Location) => {
    if (loc.code === locationCode) return;
    resetSelections();
    onLocationChange(loc.code);
  }, [locationCode, resetSelections, onLocationChange]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 bg-slate-50 flex flex-col overflow-hidden"
    >
      {/* Header: Location + Scenarios */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to map button */}
            <button
              onClick={onBackToMap}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Back to map"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Map</span>
            </button>

            <div className="w-px h-6 bg-slate-200" />

            {/* Location switcher */}
            <LocationSwitcher
              currentLocation={currentLocation}
              locationCode={locationCode}
              availableLocations={availableLocations}
              geographyLabelPlural={config.geographyLabelPlural}
              onLocationChange={handleLocationChange}
            />
          </div>

          {/* Scenario tabs */}
          {availableScenarios.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">Scenario:</span>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {availableScenarios.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => setSelectedScenario(scenario.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all
                        ${selectedScenario === scenario.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {scenario.label}
                    </button>
                  ))}
                </div>
                {selectedScenario && scenarioDescriptions[selectedScenario] && (
                  <span className="text-xs text-slate-500 italic">
                    {scenarioDescriptions[selectedScenario]}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading / Error / Results */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500">Loading...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
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
      ) : (
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
          locationName={currentLocation?.name}
          scenarioLabel={scenarioLabels[selectedScenario]}
          getOutcomeDisplayName={getOutcomeDisplayName}
        />
      )}
    </motion.div>
  );
}
