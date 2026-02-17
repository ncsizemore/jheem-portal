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

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocationData } from '@/hooks/useCityData';
import { useAnalysisState } from '@/hooks/useAnalysisState';
import NativeSimulationChart from '@/components/NativeSimulationChart';
import LocationSwitcher from '@/components/analysis/LocationSwitcher';
import DisplayOptionsPopover from '@/components/analysis/DisplayOptionsPopover';
import { transformPlotData } from '@/utils/transformPlotData';
import { exportToCsv } from '@/utils/exportCsv';
import { exportToPng } from '@/utils/exportPng';
import type { ModelConfig } from '@/config/model-configs';
import type { PlotDataFile, FacetPanel, ChartDisplayOptions } from '@/types/native-plotting';

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

function formatOptionLabel(value: string): string {
  return value
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('And', '&');
}

const FACET_PAGE_SIZE = 9;

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
  });

  // UI state
  const [showAllFacets, setShowAllFacets] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [exportingPng, setExportingPng] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Display options
  const [displayOptions, setDisplayOptions] = useState<ChartDisplayOptions>({
    showConfidenceInterval: true,
    showBaseline: true,
    showObservations: true,
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

  const isFaceted = chartPanels.length > 1;

  // Get available scenarios from data
  const availableScenarios = useMemo(() => {
    return config.scenarios.filter(s => availableOptions.scenarios.includes(s.id));
  }, [config.scenarios, availableOptions.scenarios]);

  // Handle location switch
  const handleLocationChange = useCallback((loc: Location) => {
    if (loc.code === locationCode) return;
    resetSelections();
    setShowAllFacets(false);
    onLocationChange(loc.code);
  }, [locationCode, resetSelections, onLocationChange]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    if (!chartPanels.length || !currentLocation || !plotData) return;
    exportToCsv({
      panels: chartPanels,
      locationName: currentLocation.name,
      scenario: selectedScenario,
      outcome: plotData.metadata.outcome || selectedOutcome,
      statistic: selectedStatistic,
      facet: selectedFacet,
    });
  }, [chartPanels, currentLocation, plotData, selectedScenario, selectedOutcome, selectedStatistic, selectedFacet]);

  const handleExportPNG = useCallback(async () => {
    if (!chartContainerRef.current || !currentLocation || !plotData) return;
    setExportingPng(true);
    try {
      await exportToPng({
        containerRef: chartContainerRef,
        locationName: currentLocation.name,
        scenario: selectedScenario,
        outcome: plotData.metadata.outcome || selectedOutcome,
        statistic: selectedStatistic,
        facet: selectedFacet,
      });
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('PNG export failed. Please try again.');
    } finally {
      setExportingPng(false);
    }
  }, [currentLocation, plotData, selectedScenario, selectedOutcome, selectedStatistic, selectedFacet]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 bg-slate-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0">
        {/* Top row: Location + Scenarios */}
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

        {/* Bottom row: Plot controls */}
        <div className="px-4 py-2 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Outcome selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Outcome:</label>
              <select
                value={selectedOutcome}
                onChange={e => setSelectedOutcome(e.target.value)}
                className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableOptions.outcomes.map(o => (
                  <option key={o} value={o}>{getOutcomeDisplayName(o)}</option>
                ))}
              </select>
            </div>

            {/* Statistic selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Statistic:</label>
              <select
                value={selectedStatistic}
                onChange={e => setSelectedStatistic(e.target.value)}
                className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableOptions.statistics.map(s => (
                  <option key={s} value={s}>{formatOptionLabel(s)}</option>
                ))}
              </select>
            </div>

            {/* Facet dimension toggles */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Breakdown:</label>
              <div className="flex items-center gap-1">
                {(['age', 'sex', 'race', 'risk'] as const).map(dim => (
                  <button
                    key={dim}
                    onClick={() => {
                      toggleFacetDimension(dim);
                      setShowAllFacets(false);
                    }}
                    disabled={!availableFacetDimensions[dim]}
                    className={`px-2.5 py-1 text-sm font-medium rounded-md transition-all capitalize
                      ${facetDimensions[dim]
                        ? 'bg-blue-600 text-white'
                        : availableFacetDimensions[dim]
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      }`}
                    title={!availableFacetDimensions[dim] ? `${dim} breakdown not available` : undefined}
                  >
                    {dim}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1 px-2.5 py-1 text-sm transition-colors
                ${viewMode === 'chart'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span>Chart</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 text-sm transition-colors
                ${viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Table</span>
            </button>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              disabled={!chartPanels.length}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export as CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportPNG}
              disabled={!chartPanels.length || viewMode === 'table' || exportingPng}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={viewMode === 'table' ? 'Switch to chart view to export PNG' : 'Export as PNG'}
            >
              {exportingPng ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              <span>PNG</span>
            </button>
          </div>

          {/* Display options */}
          <DisplayOptionsPopover
            options={displayOptions}
            onChange={setDisplayOptions}
          />
        </div>
      </div>

      {/* Chart/Table area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
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
            <p className="text-slate-500">Select options to view data</p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table view */
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {isFaceted && <th className="px-4 py-3 text-left font-medium text-slate-700">Group</th>}
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Year</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Intervention</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">95% CI</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Baseline</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">95% CI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chartPanels.flatMap((panel, panelIdx) =>
                    panel.data.map((point, pointIdx) => (
                      <tr
                        key={`${panel.facetValue}-${point.year}`}
                        className={panelIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                      >
                        {isFaceted && pointIdx === 0 && (
                          <td
                            className="px-4 py-2 text-slate-700 font-medium align-top"
                            rowSpan={panel.data.length}
                          >
                            {panel.facetLabel}
                          </td>
                        )}
                        <td className="px-4 py-2 text-slate-600">{point.year}</td>
                        <td className="px-4 py-2 text-right text-slate-900 font-medium">
                          {point.value != null ? point.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500 text-xs">
                          {point.lower != null && point.upper != null
                            ? `${point.lower.toLocaleString(undefined, { maximumFractionDigits: 1 })} – ${point.upper.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-600">
                          {point.baselineValue != null ? point.baselineValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500 text-xs">
                          {point.baselineLower != null && point.baselineUpper != null
                            ? `${point.baselineLower.toLocaleString(undefined, { maximumFractionDigits: 1 })} – ${point.baselineUpper.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
              {chartPanels.reduce((acc, p) => acc + p.data.length, 0)} rows
              {isFaceted && ` across ${chartPanels.length} groups`}
            </div>
          </div>
        ) : !isFaceted ? (
          /* Single chart */
          <div ref={chartContainerRef} className="max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 p-6">
            <NativeSimulationChart
              panel={chartPanels[0]}
              outcomeLabel={plotData?.metadata.outcome_metadata?.display_name || selectedOutcome}
              units={plotData?.metadata.y_label || ''}
              displayAsPercent={plotData?.metadata.outcome_metadata?.display_as_percent || false}
              options={displayOptions}
              height={500}
              interventionStartYear={config.interventionStartYear}
              locationName={currentLocation?.name}
              scenarioLabel={scenarioLabels[selectedScenario]}
            />
          </div>
        ) : (
          /* Faceted grid */
          <div ref={chartContainerRef}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                {chartPanels.length > FACET_PAGE_SIZE && !showAllFacets
                  ? `Showing ${FACET_PAGE_SIZE} of ${chartPanels.length} panels`
                  : `${chartPanels.length} panels`}
              </p>
              {chartPanels.length > FACET_PAGE_SIZE && (
                <button
                  onClick={() => setShowAllFacets(!showAllFacets)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  {showAllFacets ? (
                    <>
                      <span>Show fewer</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Show all {chartPanels.length}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className={`grid gap-4 ${
              chartPanels.length <= 4 ? 'grid-cols-1 lg:grid-cols-2' :
              chartPanels.length <= 9 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
              'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
            }`}>
              {(showAllFacets ? chartPanels : chartPanels.slice(0, FACET_PAGE_SIZE)).map(panel => (
                <div key={panel.facetValue} className="bg-white rounded-lg border border-slate-200 p-4">
                  <NativeSimulationChart
                    panel={panel}
                    outcomeLabel={plotData?.metadata.outcome_metadata?.display_name || selectedOutcome}
                    units={plotData?.metadata.y_label || ''}
                    displayAsPercent={plotData?.metadata.outcome_metadata?.display_as_percent || false}
                    options={displayOptions}
                    height={300}
                    interventionStartYear={config.interventionStartYear}
                    locationName={currentLocation?.name}
                    scenarioLabel={scenarioLabels[selectedScenario]}
                  />
                </div>
              ))}
            </div>
            {chartPanels.length > FACET_PAGE_SIZE && !showAllFacets && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllFacets(true)}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg transition-colors"
                >
                  Show all {chartPanels.length} panels
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
