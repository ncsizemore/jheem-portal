'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { formatOptionName } from '@/hooks/useCityData';

interface NativePlotControlsProps {
  cityName: string;
  scenario: string;
  options: {
    outcomes: string[];
    statistics: string[];
    facets: string[];
  };
  selectedOutcome: string;
  selectedStatistic: string;
  selectedFacet: string;
  onSelectionChange: (
    type: 'outcome' | 'statistic' | 'facet',
    value: string
  ) => void;
}

export default React.memo(function NativePlotControls({
  cityName,
  scenario,
  options,
  selectedOutcome,
  selectedStatistic,
  selectedFacet,
  onSelectionChange,
}: NativePlotControlsProps) {
  const handleChange = useCallback(
    (type: 'outcome' | 'statistic' | 'facet') =>
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSelectionChange(type, e.target.value);
      },
    [onSelectionChange]
  );

  // Show empty state if no options available
  if (options.outcomes.length === 0) {
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
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">
              No plot variations available for this selection
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  const totalCombinations =
    options.outcomes.length * options.statistics.length * options.facets.length;

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
              Plot Options - {cityName}
            </h3>
          </div>
          <div className="text-xs text-gray-500">
            {formatOptionName(scenario)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Outcome Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Outcome
            </label>
            <select
              value={selectedOutcome}
              onChange={handleChange('outcome')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.outcomes.map(outcome => (
                <option key={outcome} value={outcome}>
                  {formatOptionName(outcome)}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Type Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Summary
            </label>
            <select
              value={selectedStatistic}
              onChange={handleChange('statistic')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.statistics.map(stat => (
                <option key={stat} value={stat}>
                  {formatOptionName(stat)}
                </option>
              ))}
            </select>
          </div>

          {/* Facet Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Breakdown
            </label>
            <select
              value={selectedFacet}
              onChange={handleChange('facet')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.facets.map(facet => (
                <option key={facet} value={facet}>
                  {formatOptionName(facet)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>{totalCombinations} plot combinations available</span>
          <span>Select options to view different analyses</span>
        </div>
      </div>
    </motion.div>
  );
});
