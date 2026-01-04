'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CityData } from '../data/cities';

interface PlotMetadata {
  outcome: string;
  statistic_type: string;
  facet_choice: string;
  s3_key: string;
  file_size: number;
  created_at: string;
}

interface FloatingPanelProps {
  city: CityData | null;
  onClose: () => void;
  onPlotSelect: (city: CityData, scenario: string, plotMeta: PlotMetadata) => void;
}

export default function FloatingPanel({ city, onClose, onPlotSelect }: FloatingPanelProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [availablePlots, setAvailablePlots] = useState<PlotMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format scenario names for display
  const formatScenarioName = (scenario: string): string => {
    return scenario
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format outcome names for display
  const formatOutcomeName = (outcome: string): string => {
    return outcome
      .replace(/\./g, ' ')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Reset state when city changes
  useEffect(() => {
    if (city) {
      setSelectedScenario('');
      setAvailablePlots([]);
      setError(null);
    }
  }, [city]);

  // Fetch available plots when scenario is selected
  useEffect(() => {
    if (!city || !selectedScenario) {
      setAvailablePlots([]);
      return;
    }

    const fetchPlots = async () => {
      setLoading(true);
      setError(null);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const searchUrl = `${baseUrl}/plots/search?city=${encodeURIComponent(city.code)}&scenario=${encodeURIComponent(selectedScenario)}`;
        
        const response = await fetch(searchUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch plots: ${response.status}`);
        }

        const data = await response.json();
        setAvailablePlots(data.plots || []);

      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching plots:', err);
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch plots');
      } finally {
        setLoading(false);
      }
    };

    fetchPlots();
  }, [city, selectedScenario]);

  if (!city) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                   bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50
                   w-[480px] max-h-[80vh] overflow-hidden z-50"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-1">
                {city.name.split(',')[0]}
              </h2>
              <p className="text-blue-100 text-sm font-medium">
                {city.name.split(',').slice(1).join(',').trim()}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-blue-100 text-xs">
                  {city.availableScenarios?.length || 0} scenarios available
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Scenario Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              Select Ryan White Funding Scenario
            </label>
            <div className="space-y-2">
              {city.availableScenarios?.map((scenario) => (
                <button
                  key={scenario}
                  onClick={() => setSelectedScenario(scenario)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedScenario === scenario
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">
                    {formatScenarioName(scenario)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {scenario === 'brief_interruption' && 'Short-term funding disruption'}
                    {scenario === 'cessation' && 'Complete program termination'}
                    {scenario === 'prolonged_interruption' && 'Extended funding interruption'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Available Plots */}
          {selectedScenario && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Available Analysis Outcomes
              </label>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading available plots...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-medium">Error: {error}</p>
                </div>
              )}

              {!loading && !error && availablePlots.length === 0 && selectedScenario && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm">No plots available for this scenario</p>
                </div>
              )}

              {!loading && availablePlots.length > 0 && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {availablePlots.map((plot, index) => (
                    <button
                      key={`${plot.outcome}-${plot.facet_choice}-${index}`}
                      onClick={() => onPlotSelect(city, selectedScenario, plot)}
                      className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg 
                               hover:border-blue-300 hover:shadow-md transition-all duration-200
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {formatOutcomeName(plot.outcome)}
                          </h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Faceted by: {formatOutcomeName(plot.facet_choice)}</div>
                            <div>Type: {plot.statistic_type.replace(/\./g, ' ')}</div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{Math.round(plot.file_size / 1024)} KB</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Instructions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            {!selectedScenario ? 
              'Select a funding scenario to view available analysis outcomes' :
              'Click on any outcome to view the interactive plot'
            }
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
