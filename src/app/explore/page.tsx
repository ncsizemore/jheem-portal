'use client';

import { useState } from 'react';
import { useAvailableCities } from '../../hooks/useAvailableCities';
import CityMap from '../../components/CityMap';
import FloatingPanel from '../../components/FloatingPanel';
import MapPlotOverlay from '../../components/MapPlotOverlay';
import { CityData } from '../../data/cities';

interface PlotMetadata {
  outcome: string;
  statistic_type: string;
  facet_choice: string;
  s3_key: string;
  file_size: number;
  created_at: string;
}

interface PlotData {
  data: any[];
  layout: any;
}

export default function MapExplorer() {
  const { availableCities, loading, error, totalChecked, totalCities } = useAvailableCities();
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const [plotTitle, setPlotTitle] = useState<string>('');
  const [plotLoading, setPlotLoading] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);

  const handleCitySelect = (city: CityData) => {
    setSelectedCity(city);
    // Close any open plot when selecting a new city
    setPlotData(null);
    setPlotTitle('');
    setPlotError(null);
  };

  const handlePlotSelect = async (city: CityData, scenario: string, plotMeta: PlotMetadata) => {
    setPlotLoading(true);
    setPlotError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const plotUrl = `${baseUrl}/plot?plotKey=${encodeURIComponent(plotMeta.s3_key)}`;
      
      console.log(`📊 Loading plot: ${plotMeta.outcome} for ${city.name} - ${scenario}`);
      
      const response = await fetch(plotUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setPlotData(data);
      
      // Create descriptive title
      const cityShortName = city.name.split(',')[0];
      const scenarioName = scenario
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      const outcomeName = plotMeta.outcome
        .replace(/\./g, ' ')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      setPlotTitle(`${outcomeName} - ${cityShortName} (${scenarioName})`);
      
      // Close the floating panel
      setSelectedCity(null);
      
      console.log('✅ Plot loaded successfully');

    } catch (err) {
      console.error('❌ Error loading plot:', err);
      setPlotError(err instanceof Error ? err.message : 'Failed to load plot');
    } finally {
      setPlotLoading(false);
    }
  };

  const handleClosePanel = () => {
    setSelectedCity(null);
  };

  const handleClosePlot = () => {
    setPlotData(null);
    setPlotTitle('');
    setPlotError(null);
  };

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
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Main Map */}
      <CityMap
        cities={availableCities}
        onCitySelect={handleCitySelect}
        selectedCity={selectedCity}
        loading={loading}
      />

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

      {/* Floating Panel for Plot Selection */}
      <FloatingPanel
        city={selectedCity}
        onClose={handleClosePanel}
        onPlotSelect={handlePlotSelect}
      />

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
      <MapPlotOverlay
        plotData={plotData}
        plotTitle={plotTitle}
        onClose={handleClosePlot}
      />
    </div>
  );
}
