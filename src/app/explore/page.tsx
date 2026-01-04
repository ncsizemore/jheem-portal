'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAvailableCities } from '../../hooks/useAvailableCities';
import MapboxCityMap from '../../components/MapboxCityMap';
import ScenarioSelectionPopup from '../../components/ScenarioSelectionPopup';
import CityHoverTooltip from '../../components/CityHoverTooltip';
import MapPlotOverlay from '../../components/MapPlotOverlay';
import PlotVariationControls from '../../components/PlotVariationControls';
import ErrorBoundary from '../../components/ErrorBoundary';
import { CityData } from '../../data/cities';


interface PlotData {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}

interface PlotMetadata {
  outcome: string;
  statistic_type: string;
  facet_choice: string;
  s3_key: string;
  file_size: number;
  created_at: string;
}

export default function MapExplorer() {
  const { availableCities, loading, error, totalChecked, totalCities } = useAvailableCities();
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);
  const [hoveredCityPosition, setHoveredCityPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [showScenarioPopup, setShowScenarioPopup] = useState(false);
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const [plotTitle, setPlotTitle] = useState<string>('');
  const [plotLoading, setPlotLoading] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);
  const [currentPlotMeta, setCurrentPlotMeta] = useState<PlotMetadata | null>(null);
  const [currentScenario, setCurrentScenario] = useState<string>('');

  const handleCityHover = useCallback((city: CityData, position: { x: number; y: number }) => {
    setHoveredCity(city);
    setHoveredCityPosition(position);
  }, []);

  const handleCityLeave = useCallback(() => {
    setHoveredCity(null);
    setHoveredCityPosition(null);
  }, []);

  const handleCityClick = useCallback((city: CityData) => {
    setSelectedCity(city);
    setShowScenarioPopup(true);
    // Close any open plot when clicking new city
    if (plotData) {
      setPlotData(null);
      setPlotTitle('');
      setPlotError(null);
      setCurrentPlotMeta(null);
      setCurrentScenario('');
    }
  }, [plotData]);

  const loadPlot = useCallback(async (city: CityData, scenario: string, plotMeta: PlotMetadata) => {
    setPlotLoading(true);
    setPlotError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        throw new Error('API base URL not configured');
      }
      
      const plotUrl = `${baseUrl}/plot?plotKey=${encodeURIComponent(plotMeta.s3_key)}`;
      
      
      // Add timeout for plot loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for plots
      
      const plotResponse = await fetch(plotUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!plotResponse.ok) {
        const errorText = await plotResponse.text();
        
        if (plotResponse.status === 404) {
          throw new Error('Plot data not found. It may have been moved or deleted.');
        } else if (plotResponse.status >= 500) {
          throw new Error('Server error occurred while loading plot. Please try again later.');
        } else {
          throw new Error(`Failed to load plot: ${plotResponse.status} - ${errorText}`);
        }
      }

      const plotData = await plotResponse.json();
      
      // Validate plot data structure
      if (!plotData || typeof plotData !== 'object') {
        throw new Error('Invalid plot data format received');
      }
      
      if (!plotData.data || !Array.isArray(plotData.data)) {
        throw new Error('Plot data is missing required data array');
      }
      
      if (!plotData.layout || typeof plotData.layout !== 'object') {
        throw new Error('Plot data is missing required layout configuration');
      }
      
      setPlotData(plotData);
      setCurrentPlotMeta(plotMeta);
      
      // Create descriptive title
      const cityShortName = city.name.split(',')[0];
      const scenarioName = scenario
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      const outcomeName = plotMeta.outcome
        .replace(/\./g, ' ')
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      setPlotTitle(`${outcomeName} - ${cityShortName} (${scenarioName})`);

    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading plot:', err);
      }

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setPlotError('Plot loading timed out. Please try a smaller plot or check your connection.');
        } else {
          setPlotError(err.message);
        }
      } else {
        setPlotError('Failed to load plot');
      }
    } finally {
      setPlotLoading(false);
    }
  }, []);

  const handleScenarioSelect = useCallback(async (city: CityData, scenario: string) => {
    setShowScenarioPopup(false);
    setCurrentScenario(scenario);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        throw new Error('API base URL not configured');
      }
      
      const searchUrl = `${baseUrl}/plots/search?city=${encodeURIComponent(city.code)}&scenario=${encodeURIComponent(scenario)}`;
      
      
      // Add timeout for scenario search
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 404) {
          throw new Error('No plots found for this city and scenario combination.');
        } else if (response.status >= 500) {
          throw new Error('Server error occurred while searching for plots. Please try again later.');
        } else {
          throw new Error(`Failed to fetch plots: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format when searching for plots');
      }
      

      if (data.plots && Array.isArray(data.plots) && data.plots.length > 0) {
        // Validate first plot structure
        const defaultPlot = data.plots[0];
        if (!defaultPlot.s3_key || !defaultPlot.outcome) {
          throw new Error('Invalid plot data structure received');
        }
        
        await loadPlot(city, scenario, defaultPlot);
      } else {
        throw new Error('No plots available for this city/scenario combination');
      }

    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading scenario data:', err);
      }

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setPlotError('Search timed out. Please check your connection and try again.');
        } else {
          setPlotError(err.message);
        }
      } else {
        setPlotError('Failed to load analysis data');
      }
    }
  }, [loadPlot]);

  const handlePlotVariationChange = useCallback(async (plotMeta: PlotMetadata) => {
    if (selectedCity) {
      await loadPlot(selectedCity, currentScenario, plotMeta);
    }
  }, [selectedCity, currentScenario, loadPlot]);

  const handleCloseScenarioPopup = useCallback(() => {
    setShowScenarioPopup(false);
    setSelectedCity(null);
  }, []);

  const handleClosePlot = useCallback(() => {
    setPlotData(null);
    setPlotTitle('');
    setPlotError(null);
    setCurrentPlotMeta(null);
    setCurrentScenario('');
    setSelectedCity(null);
  }, []);

  const handleBackToSelection = useCallback(() => {
    // TODO: In future, this could reopen scenario selection for the same city
    // For now, just close the plot entirely
    handleClosePlot();
  }, [handleClosePlot]);

  // Show error state if discovery failed
  if (error) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-white font-bold text-xl mb-4">Discovery Error</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative h-screen w-screen overflow-hidden">
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
            cities={availableCities}
            onCityHover={handleCityHover}
            onCityLeave={handleCityLeave}
            onCityClick={handleCityClick}
            selectedCity={selectedCity}
            hoveredCity={hoveredCity}
            loading={loading}
            sidebarOpen={false}
            plotOpen={!!plotData}
          />
        </ErrorBoundary>

        {/* Discovery Progress (shown during initial loading) */}
        {loading && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-3 text-gray-900">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">
                  Loading cities... {totalChecked}/{totalCities}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* City Hover Tooltip */}
        {hoveredCity && hoveredCityPosition && (
          <ErrorBoundary>
            <CityHoverTooltip
              city={hoveredCity}
              position={hoveredCityPosition}
            />
          </ErrorBoundary>
        )}

        {/* Scenario Selection Popup */}
        {showScenarioPopup && (
          <ErrorBoundary>
            <ScenarioSelectionPopup
              city={selectedCity}
              onScenarioSelect={handleScenarioSelect}
              onClose={handleCloseScenarioPopup}
            />
          </ErrorBoundary>
        )}

        {/* Plot Loading Overlay */}
        {plotLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <div>
                  <h3 className="font-semibold text-gray-900">Loading Plot</h3>
                  <p className="text-sm text-gray-600">Retrieving analysis data...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plot Error */}
        {plotError && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-medium text-red-800">Plot Loading Error</h4>
                  <p className="text-sm text-red-700 mt-1">{plotError}</p>
                </div>
                <button
                  onClick={() => setPlotError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plot Display Overlay */}
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
          <MapPlotOverlay
            plotData={plotData}
            plotTitle={plotTitle}
            onClose={handleClosePlot}
            onBackToSelection={handleBackToSelection}
          />
        </ErrorBoundary>

        {/* Plot Variation Controls */}
        {plotData && selectedCity && currentPlotMeta && currentScenario && (
          <ErrorBoundary>
            <PlotVariationControls
              city={selectedCity}
              scenario={currentScenario}
              currentPlot={currentPlotMeta}
              onPlotChange={handlePlotVariationChange}
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}
