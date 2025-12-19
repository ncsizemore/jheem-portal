'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCityData } from '@/hooks/useCityData';
import MapboxCityMap from '@/components/MapboxCityMap';
import ScenarioSelectionPopup from '@/components/ScenarioSelectionPopup';
import CityHoverTooltip from '@/components/CityHoverTooltip';
import NativePlotOverlay from '@/components/NativePlotOverlay';
import NativePlotControls from '@/components/NativePlotControls';
import ErrorBoundary from '@/components/ErrorBoundary';
import { CityData } from '@/data/cities';
import type { PlotDataFile } from '@/types/native-plotting';

// For now, hardcode available cities that have aggregated data
// In production, this would come from the API or a manifest file
const NATIVE_AVAILABLE_CITIES: CityData[] = [
  {
    code: 'C.12580',
    name: 'Baltimore-Columbia-Towson, MD',
    coordinates: [-76.6122, 39.2904],
    availableScenarios: ['cessation', 'brief_interruption', 'prolonged_interruption'],
  },
];

export default function NativeMapExplorer() {
  // City data hook
  const { cityData, loading: cityDataLoading, error: cityDataError, loadCity, getPlotData, getAvailableOptions } = useCityData();

  // Map state
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);
  const [hoveredCityPosition, setHoveredCityPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [showScenarioPopup, setShowScenarioPopup] = useState(false);

  // Plot state
  const [currentScenario, setCurrentScenario] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('');
  const [selectedFacet, setSelectedFacet] = useState<string>('');
  const [plotData, setPlotData] = useState<PlotDataFile | null>(null);
  const [plotTitle, setPlotTitle] = useState<string>('');

  // Get current plot data when selections change
  useEffect(() => {
    if (cityData && currentScenario && selectedOutcome && selectedStatistic && selectedFacet) {
      const data = getPlotData(currentScenario, selectedOutcome, selectedStatistic, selectedFacet);
      setPlotData(data);

      if (data && selectedCity) {
        const cityShortName = selectedCity.name.split(',')[0];
        const outcomeName = data.metadata.outcome_metadata?.display_name || selectedOutcome;
        setPlotTitle(`${outcomeName} - ${cityShortName}`);
      }
    }
  }, [cityData, currentScenario, selectedOutcome, selectedStatistic, selectedFacet, getPlotData, selectedCity]);

  const handleCityHover = useCallback((city: CityData, position: { x: number; y: number }) => {
    setHoveredCity(city);
    setHoveredCityPosition(position);
  }, []);

  const handleCityLeave = useCallback(() => {
    setHoveredCity(null);
    setHoveredCityPosition(null);
  }, []);

  const handleCityClick = useCallback(async (city: CityData) => {
    setSelectedCity(city);

    // Load city data
    await loadCity(city.code);

    // Show scenario popup
    setShowScenarioPopup(true);
  }, [loadCity]);

  const handleScenarioSelect = useCallback(async (city: CityData, scenario: string) => {
    setShowScenarioPopup(false);
    setCurrentScenario(scenario);

    // Get available options from loaded city data
    const options = getAvailableOptions();

    // Set default selections
    if (options.outcomes.length > 0) {
      setSelectedOutcome(options.outcomes[0]);
    }
    if (options.statistics.length > 0) {
      // Prefer mean.and.interval as default
      const defaultStat = options.statistics.includes('mean.and.interval')
        ? 'mean.and.interval'
        : options.statistics[0];
      setSelectedStatistic(defaultStat);
    }
    if (options.facets.length > 0) {
      // Prefer 'none' (unfaceted) as default
      const defaultFacet = options.facets.includes('none')
        ? 'none'
        : options.facets[0];
      setSelectedFacet(defaultFacet);
    }
  }, [getAvailableOptions]);

  const handleSelectionChange = useCallback((type: 'outcome' | 'statistic' | 'facet', value: string) => {
    if (type === 'outcome') setSelectedOutcome(value);
    if (type === 'statistic') setSelectedStatistic(value);
    if (type === 'facet') setSelectedFacet(value);
  }, []);

  const handleCloseScenarioPopup = useCallback(() => {
    setShowScenarioPopup(false);
    setSelectedCity(null);
  }, []);

  const handleClosePlot = useCallback(() => {
    setPlotData(null);
    setPlotTitle('');
    setCurrentScenario('');
    setSelectedOutcome('');
    setSelectedStatistic('');
    setSelectedFacet('');
    setSelectedCity(null);
  }, []);

  const handleBackToSelection = useCallback(() => {
    handleClosePlot();
  }, [handleClosePlot]);

  // Get available options for controls
  const options = getAvailableOptions();

  return (
    <ErrorBoundary>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Native Mode Banner */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            Native Plotting Mode (Testing)
          </div>
        </div>

        {/* Cinematic Map Overlay when plot is active */}
        {plotData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-20 pointer-events-none"
          />
        )}

        {/* Main Map */}
        <ErrorBoundary
          fallback={
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
                <h2 className="text-white font-bold text-xl mb-4">Map Loading Error</h2>
                <p className="text-red-200 mb-4">
                  Unable to load the interactive map. Please check your internet connection.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          }
        >
          <MapboxCityMap
            cities={NATIVE_AVAILABLE_CITIES}
            onCityHover={handleCityHover}
            onCityLeave={handleCityLeave}
            onCityClick={handleCityClick}
            selectedCity={selectedCity}
            hoveredCity={hoveredCity}
            loading={false}
            sidebarOpen={false}
            plotOpen={!!plotData}
          />
        </ErrorBoundary>

        {/* City Data Loading */}
        {cityDataLoading && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-3 text-gray-900">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">Loading city data...</span>
              </div>
            </div>
          </div>
        )}

        {/* City Hover Tooltip */}
        {hoveredCity && hoveredCityPosition && (
          <ErrorBoundary>
            <CityHoverTooltip city={hoveredCity} position={hoveredCityPosition} />
          </ErrorBoundary>
        )}

        {/* Scenario Selection Popup */}
        {showScenarioPopup && !cityDataLoading && (
          <ErrorBoundary>
            <ScenarioSelectionPopup
              city={selectedCity}
              onScenarioSelect={handleScenarioSelect}
              onClose={handleCloseScenarioPopup}
            />
          </ErrorBoundary>
        )}

        {/* City Data Error */}
        {cityDataError && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-medium text-red-800">Data Loading Error</h4>
                  <p className="text-sm text-red-700 mt-1">{cityDataError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Native Plot Display Overlay */}
        <ErrorBoundary
          fallback={
            <div className="fixed inset-4 bg-red-900/20 border border-red-500/30 rounded-3xl p-8 flex items-center justify-center z-[60]">
              <div className="text-center">
                <h3 className="text-white font-bold text-xl mb-4">Plot Display Error</h3>
                <p className="text-red-200 mb-4">
                  Unable to display the analysis plot. The data may be corrupted or incompatible.
                </p>
                <button
                  onClick={handleClosePlot}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Close Plot
                </button>
              </div>
            </div>
          }
        >
          <NativePlotOverlay
            plotData={plotData}
            plotTitle={plotTitle}
            onClose={handleClosePlot}
            onBackToSelection={handleBackToSelection}
          />
        </ErrorBoundary>

        {/* Native Plot Controls */}
        {plotData && selectedCity && currentScenario && (
          <ErrorBoundary>
            <NativePlotControls
              cityName={selectedCity.name.split(',')[0]}
              scenario={currentScenario}
              options={options}
              selectedOutcome={selectedOutcome}
              selectedStatistic={selectedStatistic}
              selectedFacet={selectedFacet}
              onSelectionChange={handleSelectionChange}
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}
