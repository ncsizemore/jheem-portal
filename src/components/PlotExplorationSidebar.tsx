'use client';

import { useState, useEffect, memo, useCallback } from 'react';
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

interface PlotExplorationSidebarProps {
  city: CityData | null;
  onClose: () => void;
  onPlotSelect: (city: CityData, scenario: string, plotMeta: PlotMetadata) => void;
  onMultiPlotSelect?: (city: CityData, scenario: string, plots: PlotMetadata[]) => void;
}

interface PlotHierarchy {
  [outcome: string]: {
    [statisticType: string]: PlotMetadata[];
  };
}

const PlotExplorationSidebar = memo(function PlotExplorationSidebar({ 
  city, 
  onClose, 
  onPlotSelect, 
  onMultiPlotSelect 
}: PlotExplorationSidebarProps) {
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [selectedStatistic, setSelectedStatistic] = useState<string | null>(null);
  const [plotsByScenario, setPlotsByScenario] = useState<{[key: string]: PlotHierarchy}>({});
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});

  // Format names for display - memoized for performance
  const formatScenarioName = useCallback((scenario: string): string => {
    return scenario
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const formatOutcomeName = useCallback((outcome: string): string => {
    return outcome
      .replace(/\./g, ' ')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const getOutcomeDescription = useCallback((outcome: string): string => {
    const descriptions: {[key: string]: string} = {
      'incidence': 'New HIV infections over time',
      'diagnosed_prevalence': 'Number of people diagnosed with HIV',
      'proportion_in_care': 'Percentage receiving HIV care',
      'proportion_suppressed': 'Percentage with suppressed viral load',
      'adap_proportion': 'ADAP program utilization rates'
    };
    return descriptions[outcome] || 'Analysis outcome data';
  }, []);

  const getStatisticDescription = useCallback((statType: string): string => {
    if (statType.includes('count')) return 'Absolute numbers';
    if (statType.includes('rate')) return 'Rates per population';
    if (statType.includes('proportion')) return 'Percentage breakdown';
    return 'Statistical measure';
  }, []);

  // Organize plots into hierarchy - memoized for performance
  const organizePlots = useCallback((plots: PlotMetadata[]): PlotHierarchy => {
    const hierarchy: PlotHierarchy = {};
    
    plots.forEach(plot => {
      if (!hierarchy[plot.outcome]) {
        hierarchy[plot.outcome] = {};
      }
      if (!hierarchy[plot.outcome][plot.statistic_type]) {
        hierarchy[plot.outcome][plot.statistic_type] = [];
      }
      hierarchy[plot.outcome][plot.statistic_type].push(plot);
    });
    
    return hierarchy;
  }, []);

  // Fetch plots for a specific scenario - memoized with dependencies
  const fetchPlotsForScenario = useCallback(async (scenario: string) => {
    if (!city || plotsByScenario[scenario]) return;

    setLoading(prev => ({ ...prev, [scenario]: true }));

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const searchUrl = `${baseUrl}/plots/search?city=${encodeURIComponent(city.code)}&scenario=${encodeURIComponent(scenario)}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch plots: ${response.status}`);
      }

      const data = await response.json();
      const organizedPlots = organizePlots(data.plots || []);
      
      setPlotsByScenario(prev => ({
        ...prev,
        [scenario]: organizedPlots
      }));

    } catch {
      setPlotsByScenario(prev => ({
        ...prev,
        [scenario]: {}
      }));
    } finally {
      setLoading(prev => ({ ...prev, [scenario]: false }));
    }
  }, [city, plotsByScenario, organizePlots]);

  // Handle scenario toggle - memoized for performance
  const toggleScenario = useCallback((scenario: string) => {
    if (expandedScenario === scenario) {
      setExpandedScenario(null);
      setSelectedOutcome(null);
      setSelectedStatistic(null);
    } else {
      setExpandedScenario(scenario);
      setSelectedOutcome(null);
      setSelectedStatistic(null);
      fetchPlotsForScenario(scenario);
    }
  }, [expandedScenario, fetchPlotsForScenario]);

  // Reset when city changes
  useEffect(() => {
    setExpandedScenario(null);
    setSelectedOutcome(null);
    setSelectedStatistic(null);
    setPlotsByScenario({});
    setLoading({});
  }, [city]);

  // Get current plots for selected outcome/statistic - memoized
  const getCurrentPlots = useCallback((): PlotMetadata[] => {
    if (!expandedScenario || !selectedOutcome || !selectedStatistic) return [];
    return plotsByScenario[expandedScenario]?.[selectedOutcome]?.[selectedStatistic] || [];
  }, [expandedScenario, selectedOutcome, selectedStatistic, plotsByScenario]);

  // Handle multi-plot selection - memoized
  const handleViewAllFacets = useCallback(() => {
    if (!expandedScenario || !selectedOutcome || !selectedStatistic) return;
    const plots = getCurrentPlots();
    if (plots.length > 1 && onMultiPlotSelect) {
      onMultiPlotSelect(city!, expandedScenario, plots);
    }
  }, [expandedScenario, selectedOutcome, selectedStatistic, getCurrentPlots, onMultiPlotSelect, city]);

  if (!city) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-0 right-0 h-screen w-96 bg-white/95 backdrop-blur-xl shadow-2xl border-l border-gray-200/50 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-tight mb-1">
                {city.name.split(',')[0]}
              </h2>
              <p className="text-slate-300 text-sm">
                {city.name.split(',').slice(1).join(',').trim()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span>{city.availableScenarios?.length || 0} funding scenarios</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {city.availableScenarios?.map((scenario) => (
              <div key={scenario} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Scenario Header */}
                <button
                  onClick={() => toggleScenario(scenario)}
                  className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">
                      {formatScenarioName(scenario)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {scenario === 'brief_interruption' && 'Short-term funding disruption'}
                      {scenario === 'cessation' && 'Complete program termination'}
                      {scenario === 'prolonged_interruption' && 'Extended funding interruption'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {plotsByScenario[scenario] && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {Object.keys(plotsByScenario[scenario]).length} outcomes
                      </span>
                    )}
                    <svg 
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        expandedScenario === scenario ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Content - 3-Level Hierarchy */}
                <AnimatePresence>
                  {expandedScenario === scenario && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-white"
                    >
                      {/* Loading State */}
                      {loading[scenario] && (
                        <div className="p-6 flex items-center gap-3 text-gray-600">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                          <span className="text-sm">Loading analysis outcomes...</span>
                        </div>
                      )}

                      {!loading[scenario] && plotsByScenario[scenario] && (
                        <div className="p-4">
                          {/* Step 1: Outcome Selection */}
                          {!selectedOutcome && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                What do you want to analyze?
                              </h4>
                              <div className="space-y-2">
                                {Object.keys(plotsByScenario[scenario]).map((outcome) => (
                                  <button
                                    key={outcome}
                                    onClick={() => setSelectedOutcome(outcome)}
                                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                                  >
                                    <div className="font-medium text-gray-900 group-hover:text-blue-900">
                                      {formatOutcomeName(outcome)}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {getOutcomeDescription(outcome)}
                                    </div>
                                    <div className="text-xs text-blue-600 mt-1">
                                      {Object.keys(plotsByScenario[scenario][outcome]).length} analysis types →
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Step 2: Statistic Type Selection */}
                          {selectedOutcome && !selectedStatistic && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <button
                                  onClick={() => setSelectedOutcome(null)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <h4 className="text-sm font-semibold text-gray-900">
                                  {formatOutcomeName(selectedOutcome)} - Analysis Type
                                </h4>
                              </div>
                              <div className="space-y-2">
                                {Object.keys(plotsByScenario[scenario][selectedOutcome]).map((statType) => (
                                  <button
                                    key={statType}
                                    onClick={() => setSelectedStatistic(statType)}
                                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                                  >
                                    <div className="font-medium text-gray-900 group-hover:text-blue-900">
                                      {formatOutcomeName(statType)}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {getStatisticDescription(statType)}
                                    </div>
                                    <div className="text-xs text-blue-600 mt-1">
                                      {plotsByScenario[scenario][selectedOutcome][statType].length} demographic views →
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Step 3: Facet Selection + Multi-plot Options */}
                          {selectedOutcome && selectedStatistic && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <button
                                  onClick={() => setSelectedStatistic(null)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <h4 className="text-sm font-semibold text-gray-900">
                                  Demographic Breakdown
                                </h4>
                              </div>

                              {/* Smart comparison option (NEW!) */}
                              {getCurrentPlots().length > 1 && onMultiPlotSelect && (
                                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                                    </svg>
                                    <span className="text-sm font-medium text-blue-900">New: Smart Comparison</span>
                                  </div>
                                  <p className="text-xs text-blue-700 mb-2">
                                    Coming soon: Compare key demographic patterns side-by-side
                                  </p>
                                  <button
                                    onClick={handleViewAllFacets}
                                    disabled
                                    className="w-full py-2 px-3 bg-gray-300 text-gray-500 text-sm font-medium rounded-md cursor-not-allowed"
                                  >
                                    Compare Key Demographics (Preview)
                                  </button>
                                  <p className="text-xs text-gray-500 mt-1">
                                    For now, explore individual demographics below
                                  </p>
                                </div>
                              )}

                              {/* Individual plot selection */}
                              <div className="space-y-2">
                                {getCurrentPlots().map((plot, index) => (
                                  <button
                                    key={`${plot.facet_choice}-${index}`}
                                    onClick={() => onPlotSelect(city, scenario, plot)}
                                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 group-hover:text-blue-900">
                                          By {formatOutcomeName(plot.facet_choice)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          Single demographic view
                                        </div>
                                      </div>
                                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                      </svg>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!loading[scenario] && Object.keys(plotsByScenario[scenario] || {}).length === 0 && (
                        <div className="p-6 text-center text-gray-500 text-sm">
                          No analysis data available for this scenario
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            {!expandedScenario ? 
              'Select a funding scenario to explore analysis outcomes' :
              !selectedOutcome ?
              'Choose what you want to analyze' :
              !selectedStatistic ?
              'Select analysis type' :
              'Choose demographic breakdown or compare all'
            }
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

PlotExplorationSidebar.displayName = 'PlotExplorationSidebar';

export default PlotExplorationSidebar;
