'use client';

/**
 * AnalysisResults - Shared controls + chart/table rendering
 *
 * Extracted from AnalysisView to be reused by both the prerun explorer
 * and the custom simulation page. Provides:
 *   - Outcome/statistic selectors
 *   - Facet dimension toggles
 *   - Chart/table view mode toggle
 *   - CSV and PNG export
 *   - Display options (CI, baseline, observations)
 *   - Single chart, faceted grid, and table rendering
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import NativeSimulationChart from '@/components/NativeSimulationChart';
import DisplayOptionsPopover from '@/components/analysis/DisplayOptionsPopover';
import { exportToCsv } from '@/utils/exportCsv';
import { exportToPng } from '@/utils/exportPng';
import type { PlotDataFile, FacetPanel, ChartDisplayOptions } from '@/types/native-plotting';
import type { FacetDimension, FacetDimensionState } from '@/hooks/useAnalysisState';

function formatOptionLabel(value: string): string {
  return value
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('And', '&');
}

const FACET_PAGE_SIZE = 9;

export interface AnalysisResultsProps {
  // Data
  chartPanels: FacetPanel[];
  plotData: PlotDataFile | null;

  // Selections
  selectedOutcome: string;
  selectedStatistic: string;
  selectedFacet: string;
  facetDimensions: FacetDimensionState;
  availableFacetDimensions: FacetDimensionState;

  // Available options for dropdowns
  availableOutcomes: string[];
  availableStatistics: string[];

  // Callbacks
  setSelectedOutcome: (outcome: string) => void;
  setSelectedStatistic: (statistic: string) => void;
  toggleFacetDimension: (dim: FacetDimension) => void;

  // Display context
  interventionStartYear?: number;
  locationName?: string;
  scenarioLabel?: string;

  /** Map outcome keys to display names (for the dropdown) */
  getOutcomeDisplayName?: (outcome: string) => string;
}

export default function AnalysisResults({
  chartPanels,
  plotData,
  selectedOutcome,
  selectedStatistic,
  selectedFacet,
  facetDimensions,
  availableFacetDimensions,
  availableOutcomes,
  availableStatistics,
  setSelectedOutcome,
  setSelectedStatistic,
  toggleFacetDimension,
  interventionStartYear,
  locationName,
  scenarioLabel,
  getOutcomeDisplayName,
}: AnalysisResultsProps) {
  const [showAllFacets, setShowAllFacets] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [exportingPng, setExportingPng] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [displayOptions, setDisplayOptions] = useState<ChartDisplayOptions>({
    showConfidenceInterval: true,
    showBaseline: true,
    showObservations: true,
  });

  const isFaceted = chartPanels.length > 1;

  const outcomeLabel = useMemo(() => {
    return plotData?.metadata?.outcome_metadata?.display_name || selectedOutcome;
  }, [plotData, selectedOutcome]);

  const units = plotData?.metadata?.y_label || '';
  const displayAsPercent = plotData?.metadata?.outcome_metadata?.display_as_percent || false;

  const displayName = useCallback(
    (outcome: string) => getOutcomeDisplayName?.(outcome) ?? formatOptionLabel(outcome),
    [getOutcomeDisplayName]
  );

  // Export handlers
  const handleExportCSV = useCallback(() => {
    if (!chartPanels.length || !plotData) return;
    exportToCsv({
      panels: chartPanels,
      locationName: locationName || '',
      scenario: scenarioLabel || '',
      scenarioLabel: scenarioLabel || '',
      outcome: plotData.metadata.outcome || selectedOutcome,
      statistic: selectedStatistic,
      facet: selectedFacet,
    });
  }, [chartPanels, plotData, locationName, scenarioLabel, selectedOutcome, selectedStatistic, selectedFacet]);

  const handleExportPNG = useCallback(async () => {
    if (!chartContainerRef.current || !plotData) return;
    setExportingPng(true);
    try {
      await exportToPng({
        containerRef: chartContainerRef,
        locationName: locationName || '',
        scenario: scenarioLabel || '',
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
  }, [plotData, locationName, scenarioLabel, selectedOutcome, selectedStatistic, selectedFacet]);

  return (
    <>
      {/* Controls bar */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Outcome selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Outcome:</label>
            <select
              value={selectedOutcome}
              onChange={e => setSelectedOutcome(e.target.value)}
              className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {availableOutcomes.map(o => (
                <option key={o} value={o}>{displayName(o)}</option>
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
              {availableStatistics.map(s => (
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

        <div className="flex items-center gap-2">
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
        {chartPanels.length === 0 ? (
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
                    <th className="px-4 py-3 text-right font-medium text-slate-700">{scenarioLabel || 'Intervention'}</th>
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
                          {point.value != null ? point.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '\u2014'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500 text-xs">
                          {point.lower != null && point.upper != null
                            ? `${point.lower.toLocaleString(undefined, { maximumFractionDigits: 1 })} \u2013 ${point.upper.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
                            : '\u2014'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-600">
                          {point.baselineValue != null ? point.baselineValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '\u2014'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500 text-xs">
                          {point.baselineLower != null && point.baselineUpper != null
                            ? `${point.baselineLower.toLocaleString(undefined, { maximumFractionDigits: 1 })} \u2013 ${point.baselineUpper.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
                            : '\u2014'}
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
              outcomeLabel={outcomeLabel}
              units={units}
              displayAsPercent={displayAsPercent}
              options={displayOptions}
              height={500}
              interventionStartYear={interventionStartYear}
              locationName={locationName}
              scenarioLabel={scenarioLabel}
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
                    outcomeLabel={outcomeLabel}
                    units={units}
                    displayAsPercent={displayAsPercent}
                    options={displayOptions}
                    height={300}
                    interventionStartYear={interventionStartYear}
                    locationName={locationName}
                    scenarioLabel={scenarioLabel}
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
    </>
  );
}
