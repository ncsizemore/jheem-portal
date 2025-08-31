'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CityData } from '../data/cities';

interface PlotMetadata {
  outcome: string;
  statistic_type: string;
  facet_choice: string;
  s3_key: string;
  file_size: number;
  created_at: string;
}

interface PlotVariationControlsProps {
  city: CityData;
  scenario: string;
  currentPlot: PlotMetadata | null;
  onPlotChange: (plotMeta: PlotMetadata) => void;
}

interface PlotOptions {
  outcomes: string[];
  statisticTypes: string[];
  facetChoices: string[];
  plotsMap: Map<string, PlotMetadata>;
}

export default React.memo(function PlotVariationControls({
  city,
  scenario,
  currentPlot,
  onPlotChange
}: PlotVariationControlsProps) {
  const [plotOptions, setPlotOptions] = useState<PlotOptions>({
    outcomes: [],
    statisticTypes: [],
    facetChoices: [],
    plotsMap: new Map()
  });
  const [loading, setLoading] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('');
  const [selectedFacet, setSelectedFacet] = useState<string>('');

  // Fetch available plots for this city/scenario
  useEffect(() => {
    const fetchPlotOptions = async () => {
      setLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!baseUrl) {
          throw new Error('API base URL not configured');
        }
        
        const searchUrl = `${baseUrl}/plots/search?city=${city.code}&scenario=${scenario}`;
        
        // Add timeout for plot options fetch
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
            throw new Error('No plot options found for this city and scenario');
          } else if (response.status >= 500) {
            throw new Error('Server error occurred while loading plot options');
          } else {
            throw new Error(`Failed to fetch plot options: ${response.status} - ${errorText}`);
          }
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format for plot options');
        }
        
        const plots = data.plots || [];
        
        if (!Array.isArray(plots)) {
          throw new Error('Plot options data is not in expected format');
        }
        
        // Validate plot structure and filter out invalid plots
        const validPlots = plots.filter((p: unknown): p is PlotMetadata => {
          if (typeof p !== 'object' || p === null) return false;
          const plot = p as Record<string, unknown>;
          return typeof plot.outcome === 'string' && 
                 typeof plot.statistic_type === 'string' && 
                 typeof plot.facet_choice === 'string' &&
                 typeof plot.s3_key === 'string';
        });
        
        if (validPlots.length === 0) {
          throw new Error('No valid plots found for this city and scenario');
        }
        
        // Organize plots by dimensions
        const outcomes = [...new Set(validPlots.map(p => p.outcome))] as string[];
        const statisticTypes = [...new Set(validPlots.map(p => p.statistic_type))] as string[];
        const facetChoices = [...new Set(validPlots.map(p => p.facet_choice))] as string[];
        
        // Create lookup map: "outcome|statistic|facet" -> PlotMetadata
        const plotsMap = new Map();
        validPlots.forEach((plot: PlotMetadata) => {
          const key = `${plot.outcome}|${plot.statistic_type}|${plot.facet_choice}`;
          plotsMap.set(key, plot);
        });

        setPlotOptions({ outcomes, statisticTypes, facetChoices, plotsMap });

        // Set initial selections based on current plot
        if (currentPlot) {
          setSelectedOutcome(currentPlot.outcome);
          setSelectedStatistic(currentPlot.statistic_type);
          setSelectedFacet(currentPlot.facet_choice);
        }

      } catch (err) {
        console.error('Error fetching plot options:', err);
        
        // For plot options errors, we'll just show an empty state
        // rather than breaking the entire component
        setPlotOptions({
          outcomes: [],
          statisticTypes: [],
          facetChoices: [],
          plotsMap: new Map()
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlotOptions();
  }, [city.code, scenario, currentPlot]);

  // Handle option changes
  const handleSelectionChange = useCallback((type: 'outcome' | 'statistic' | 'facet', value: string) => {
    let newOutcome = selectedOutcome;
    let newStatistic = selectedStatistic;
    let newFacet = selectedFacet;

    if (type === 'outcome') newOutcome = value;
    if (type === 'statistic') newStatistic = value;
    if (type === 'facet') newFacet = value;

    setSelectedOutcome(newOutcome);
    setSelectedStatistic(newStatistic);
    setSelectedFacet(newFacet);

    // Find matching plot
    const key = `${newOutcome}|${newStatistic}|${newFacet}`;
    const matchingPlot = plotOptions.plotsMap.get(key);
    
    if (matchingPlot) {
      onPlotChange(matchingPlot);
    }
  }, [selectedOutcome, selectedStatistic, selectedFacet, plotOptions.plotsMap, onPlotChange]);

  // Format display names
  const formatName = useCallback((name: string) => {
    return name
      .replace(/\./g, ' ')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  if (loading) {
    return (
      <div className="fixed bottom-6 left-6 right-6 z-[70]">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl p-4">
          <div className="flex items-center justify-center gap-3 text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-sm">Loading plot options...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no plot options available
  if (plotOptions.outcomes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-6 left-6 right-6 z-[70]"
      >
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl p-4">
          <div className="flex items-center justify-center gap-3 text-gray-600">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">No plot variations available for this selection</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 left-6 right-6 z-[70]"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Plot Options - {city.name.split(',')[0]}
            </h3>
          </div>
          <div className="text-xs text-gray-500">
            {formatName(scenario)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Outcome Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Outcome</label>
            <select
              value={selectedOutcome}
              onChange={(e) => handleSelectionChange('outcome', e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {plotOptions.outcomes.map(outcome => (
                <option key={outcome} value={outcome}>
                  {formatName(outcome)}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Type Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
            <select
              value={selectedStatistic}
              onChange={(e) => handleSelectionChange('statistic', e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {plotOptions.statisticTypes.map(type => (
                <option key={type} value={type}>
                  {type.includes('mean') ? 'Mean' : 
                   type.includes('median') ? 'Median' : 
                   'All Simulations'}
                </option>
              ))}
            </select>
          </div>

          {/* Facet Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Breakdown</label>
            <select
              value={selectedFacet}
              onChange={(e) => handleSelectionChange('facet', e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {plotOptions.facetChoices.map(facet => (
                <option key={facet} value={facet}>
                  {facet === 'total' ? 'Total' : `By ${formatName(facet)}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            {plotOptions.plotsMap.size} plot combinations available
          </span>
          <span>
            Select options to view different analyses
          </span>
        </div>
      </div>
    </motion.div>
  );
});