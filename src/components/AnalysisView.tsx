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
import NativeSimulationChart from '@/components/NativeSimulationChart';
import { transformPlotData } from '@/utils/transformPlotData';
import type { ModelConfig } from '@/config/model-configs';
import type { PlotDataFile, FacetPanel, ChartDisplayOptions } from '@/types/native-plotting';

// Dynamic import for html2canvas (only loaded when needed)
const loadHtml2Canvas = () => import('html2canvas').then(mod => mod.default);

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

// Generate comprehensive filename for exports
function generateExportFilename(
  locationName: string,
  scenario: string,
  outcome: string,
  statistic: string,
  facet: string,
  extension: 'csv' | 'png'
): string {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  const parts = [
    sanitize(locationName.split(',')[0]),
    sanitize(scenario),
    sanitize(outcome),
    sanitize(statistic.replace('mean.and.interval', 'mean_CI').replace('median.and.interval', 'median_CI').replace('individual.simulation', 'sims')),
  ];

  if (facet && facet !== 'none') {
    parts.push(`by_${sanitize(facet)}`);
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  parts.push(timestamp);

  return `${parts.join('_')}.${extension}`;
}

export default function AnalysisView({
  config,
  locationCode,
  availableLocations,
  onLocationChange,
  onBackToMap,
}: AnalysisViewProps) {
  // Load location data using the config's data URL
  const {
    locationData,
    loading,
    error,
    loadLocation,
    getPlotData,
    getAvailableOptions,
    getOutcomeDisplayName,
  } = useLocationData({ dataUrl: config.dataUrl });

  // Selection state
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('');
  const [selectedFacet, setSelectedFacet] = useState<string>('');

  // Facet dimension toggles
  const [facetDimensions, setFacetDimensions] = useState<{
    age: boolean;
    sex: boolean;
    race: boolean;
    risk: boolean;
  }>({ age: false, sex: false, race: false, risk: false });

  // UI state
  const [showLocationSwitcher, setShowLocationSwitcher] = useState(false);
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const locationSearchInputRef = useRef<HTMLInputElement>(null);
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [showAllFacets, setShowAllFacets] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [exportingPng, setExportingPng] = useState(false);

  // Display options
  const [displayOptions, setDisplayOptions] = useState<ChartDisplayOptions>({
    showConfidenceInterval: true,
    showBaseline: true,
    showObservations: true,
  });

  const FACET_PAGE_SIZE = 9;

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

  // Derive scenario descriptions from config
  const scenarioDescriptions = useMemo(() => {
    return Object.fromEntries(config.scenarios.map(s => [s.id, s.description]));
  }, [config.scenarios]);

  // Derived state
  const options = getAvailableOptions();
  const plotData: PlotDataFile | null = useMemo(() => {
    if (locationData && selectedScenario && selectedOutcome && selectedStatistic && selectedFacet) {
      return getPlotData(selectedScenario, selectedOutcome, selectedStatistic, selectedFacet);
    }
    return null;
  }, [locationData, selectedScenario, selectedOutcome, selectedStatistic, selectedFacet, getPlotData]);

  const chartPanels: FacetPanel[] = useMemo(() => {
    return plotData ? transformPlotData(plotData) : [];
  }, [plotData]);

  const isFaceted = chartPanels.length > 1;

  // Filtered locations for search
  const filteredLocations = useMemo(() => {
    if (!locationSearchTerm.trim()) return availableLocations;
    const searchLower = locationSearchTerm.toLowerCase().trim();
    return availableLocations.filter(loc =>
      loc.name.toLowerCase().includes(searchLower)
    );
  }, [availableLocations, locationSearchTerm]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (showLocationSwitcher) {
      setLocationSearchTerm('');
      setTimeout(() => locationSearchInputRef.current?.focus(), 50);
    }
  }, [showLocationSwitcher]);

  // Compute which facet dimensions are available in the data
  const availableFacetDimensions = useMemo(() => {
    const dims = { age: false, sex: false, race: false, risk: false };
    for (const facet of options.facets) {
      if (facet.includes('age')) dims.age = true;
      if (facet.includes('sex')) dims.sex = true;
      if (facet.includes('race')) dims.race = true;
      if (facet.includes('risk')) dims.risk = true;
    }
    return dims;
  }, [options.facets]);

  // Compute facet key from toggled dimensions
  const computedFacetKey = useMemo(() => {
    const activeDims = Object.entries(facetDimensions)
      .filter(([, active]) => active)
      .map(([dim]) => dim)
      .sort();
    return activeDims.length === 0 ? 'none' : activeDims.join('+');
  }, [facetDimensions]);

  // Sync selectedFacet with computed key
  useEffect(() => {
    if (options.facets.includes(computedFacetKey)) {
      setSelectedFacet(computedFacetKey);
    } else if (computedFacetKey !== 'none' && options.facets.length > 0) {
      setSelectedFacet(options.facets.includes('none') ? 'none' : options.facets[0]);
    }
  }, [computedFacetKey, options.facets]);

  // Toggle handler for facet dimensions
  const toggleFacetDimension = useCallback((dim: 'age' | 'sex' | 'race' | 'risk') => {
    setFacetDimensions(prev => ({ ...prev, [dim]: !prev[dim] }));
    setShowAllFacets(false);
  }, []);

  // Set defaults when location data loads
  useEffect(() => {
    if (locationData) {
      const opts = getAvailableOptions();

      if (opts.scenarios.length && !selectedScenario) {
        // Use first scenario from config that's available in data
        const availableScenario = config.scenarios.find(s => opts.scenarios.includes(s.id));
        setSelectedScenario(availableScenario?.id || opts.scenarios[0]);
      }
      if (opts.outcomes.length && !selectedOutcome) {
        const defaultOutcome = opts.outcomes.includes(config.defaults.outcome)
          ? config.defaults.outcome
          : opts.outcomes[0];
        setSelectedOutcome(defaultOutcome);
      }
      if (opts.statistics.length && !selectedStatistic) {
        const defaultStat = opts.statistics.includes(config.defaults.statistic)
          ? config.defaults.statistic
          : opts.statistics[0];
        setSelectedStatistic(defaultStat);
      }
    }
  }, [locationData, config, getAvailableOptions, selectedScenario, selectedOutcome, selectedStatistic]);

  // CSV export handler
  const handleExportCSV = useCallback(() => {
    if (!chartPanels.length || !currentLocation || !plotData) return;

    const rows: string[] = [];
    const isFacetedData = chartPanels.length > 1;

    const headers = isFacetedData
      ? ['Facet', 'Year', 'Intervention', 'Intervention Lower', 'Intervention Upper', 'Baseline', 'Baseline Lower', 'Baseline Upper']
      : ['Year', 'Intervention', 'Intervention Lower', 'Intervention Upper', 'Baseline', 'Baseline Lower', 'Baseline Upper'];
    rows.push(headers.join(','));

    for (const panel of chartPanels) {
      for (const point of panel.data) {
        const values = isFacetedData
          ? [
              `"${panel.facetLabel}"`,
              point.year,
              point.value ?? '',
              point.lower ?? '',
              point.upper ?? '',
              point.baselineValue ?? '',
              point.baselineLower ?? '',
              point.baselineUpper ?? '',
            ]
          : [
              point.year,
              point.value ?? '',
              point.lower ?? '',
              point.upper ?? '',
              point.baselineValue ?? '',
              point.baselineLower ?? '',
              point.baselineUpper ?? '',
            ];
        rows.push(values.join(','));
      }
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateExportFilename(
      currentLocation.name,
      selectedScenario,
      plotData.metadata.outcome || selectedOutcome,
      selectedStatistic,
      selectedFacet,
      'csv'
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [chartPanels, currentLocation, plotData, selectedOutcome, selectedScenario, selectedStatistic, selectedFacet]);

  // PNG export handler
  const handleExportPNG = useCallback(async () => {
    if (!chartContainerRef.current || !currentLocation || !plotData) return;

    setExportingPng(true);
    try {
      const html2canvas = await loadHtml2Canvas();

      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          return element.tagName === 'STYLE' || element.tagName === 'LINK';
        },
        onclone: (_clonedDoc, element) => {
          const applyComputedStyles = (el: Element) => {
            const computed = getComputedStyle(el);
            const htmlEl = el as HTMLElement;
            htmlEl.style.color = computed.color;
            htmlEl.style.backgroundColor = computed.backgroundColor;
            htmlEl.style.borderColor = computed.borderColor;
          };

          const allElements = element.querySelectorAll('*');
          applyComputedStyles(element);
          allElements.forEach(applyComputedStyles);

          const svgs = element.querySelectorAll('svg');
          svgs.forEach(svg => {
            const rect = svg.getBoundingClientRect();
            svg.setAttribute('width', String(rect.width));
            svg.setAttribute('height', String(rect.height));
          });
        },
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) throw new Error('Failed to create PNG blob');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateExportFilename(
        currentLocation.name,
        selectedScenario,
        plotData.metadata.outcome || selectedOutcome,
        selectedStatistic,
        selectedFacet,
        'png'
      );
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('PNG export failed. Please try again.');
    } finally {
      setExportingPng(false);
    }
  }, [currentLocation, plotData, selectedOutcome, selectedScenario, selectedStatistic, selectedFacet]);

  // Handle location switch
  const handleSwitchLocation = useCallback((loc: Location) => {
    setShowLocationSwitcher(false);
    if (loc.code === locationCode) return;

    // Reset selections for new location
    setSelectedScenario('');
    setSelectedOutcome('');
    setSelectedStatistic('');
    setFacetDimensions({ age: false, sex: false, race: false, risk: false });

    onLocationChange(loc.code);
  }, [locationCode, onLocationChange]);

  // Get available scenarios from data
  const availableScenarios = useMemo(() => {
    return config.scenarios.filter(s => options.scenarios.includes(s.id));
  }, [config.scenarios, options.scenarios]);

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

            {/* Location name - clickable to switch */}
            <div className="relative">
              <button
                onClick={() => setShowLocationSwitcher(!showLocationSwitcher)}
                className="text-left group flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
              >
                <div>
                  <h1 className="font-semibold text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                    {currentLocation?.name.split(',')[0] || locationCode}
                  </h1>
                  {currentLocation?.name.includes(',') && (
                    <p className="text-slate-400 text-xs">
                      {currentLocation.name.split(',').slice(1).join(',').trim()}
                    </p>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${showLocationSwitcher ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Location dropdown */}
              {showLocationSwitcher && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowLocationSwitcher(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50 min-w-[280px]">
                    {/* Search input */}
                    <div className="p-2 border-b border-slate-100">
                      <div className="relative">
                        <svg
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          ref={locationSearchInputRef}
                          type="text"
                          placeholder={`Search ${config.geographyLabelPlural.toLowerCase()}...`}
                          value={locationSearchTerm}
                          onChange={e => setLocationSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {locationSearchTerm && (
                          <button
                            onClick={() => setLocationSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Location list */}
                    <div className="max-h-64 overflow-y-auto">
                      {filteredLocations.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                          <p className="text-sm text-slate-500">No {config.geographyLabelPlural.toLowerCase()} match &quot;{locationSearchTerm}&quot;</p>
                        </div>
                      ) : (
                        filteredLocations.map(loc => (
                          <button
                            key={loc.code}
                            onClick={() => handleSwitchLocation(loc)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between
                              ${loc.code === locationCode ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                          >
                            <span>{loc.name}</span>
                            {loc.code === locationCode && (
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    {/* Footer showing count */}
                    <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50">
                      <p className="text-xs text-slate-400">
                        {filteredLocations.length === availableLocations.length
                          ? `${availableLocations.length} ${config.geographyLabelPlural.toLowerCase()}`
                          : `${filteredLocations.length} of ${availableLocations.length} ${config.geographyLabelPlural.toLowerCase()}`}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
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
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Outcome:</label>
              <select
                value={selectedOutcome}
                onChange={e => setSelectedOutcome(e.target.value)}
                className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {options.outcomes.map(o => (
                  <option key={o} value={o}>{getOutcomeDisplayName(o)}</option>
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
              <div className="flex items-center gap-1">
                {(['age', 'sex', 'race', 'risk'] as const).map(dim => (
                  <button
                    key={dim}
                    onClick={() => toggleFacetDimension(dim)}
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

          {/* Display options popover */}
          <div className="relative">
            <button
              onClick={() => setShowDisplayOptions(!showDisplayOptions)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md transition-colors
                ${showDisplayOptions
                  ? 'bg-slate-200 text-slate-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              title="Display options"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Display</span>
            </button>

            {showDisplayOptions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDisplayOptions(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 min-w-[160px]">
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Show on chart</p>
                  </div>
                  <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={displayOptions.showConfidenceInterval}
                      onChange={e => setDisplayOptions(prev => ({ ...prev, showConfidenceInterval: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    95% CI
                  </label>
                  <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={displayOptions.showBaseline}
                      onChange={e => setDisplayOptions(prev => ({ ...prev, showBaseline: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Baseline
                  </label>
                  <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={displayOptions.showObservations}
                      onChange={e => setDisplayOptions(prev => ({ ...prev, showObservations: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Observed data
                  </label>
                </div>
              </>
            )}
          </div>
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
