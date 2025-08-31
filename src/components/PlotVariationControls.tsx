'use client';

import { useState, useEffect } from 'react';
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

export default function PlotVariationControls({
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
        const searchUrl = `${baseUrl}/plots/search?city=${city.code}&scenario=${scenario}`;
        
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('Failed to fetch plot options');

        const data = await response.json();
        const plots = data.plots || [];
        
        // Organize plots by dimensions
        const outcomes = [...new Set(plots.map((p: PlotMetadata) => p.outcome))] as string[];
        const statisticTypes = [...new Set(plots.map((p: PlotMetadata) => p.statistic_type))] as string[];
        const facetChoices = [...new Set(plots.map((p: PlotMetadata) => p.facet_choice))] as string[];
        
        // Create lookup map: "outcome|statistic|facet" -> PlotMetadata
        const plotsMap = new Map();
        plots.forEach((plot: PlotMetadata) => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchPlotOptions();
  }, [city.code, scenario, currentPlot]);

  // Handle option changes
  const handleSelectionChange = (type: 'outcome' | 'statistic' | 'facet', value: string) => {
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
  };

  // Format display names
  const formatName = (name: string) => {
    return name
      .replace(/\./g, ' ')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="fixed bottom-6 left-6 right-6 z-[45]">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl p-4">
          <div className="flex items-center justify-center gap-3 text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-sm">Loading plot options...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 left-6 right-6 z-[45]"
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
}