'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import AgeDistributionChart from './AgeDistributionChart';
import { StateAgeData, transformDataForChart } from '@/data/hiv-age-projections';

interface MultiStateChartGridProps {
  states: StateAgeData[];
  normalized?: boolean;
  yearRange?: [number, number];
  onNormalizedChange?: (normalized: boolean) => void;
}

// Smart grid layout calculator
function getGridLayout(stateCount: number, screenWidth: number = 1200) {
  if (stateCount === 0) return { cols: 0, chartHeight: 0, gridClass: '' };
  if (stateCount === 1) return {
    cols: 1,
    chartHeight: 500,
    gridClass: 'grid-cols-1'
  };
  if (stateCount === 2) return {
    cols: 2,
    chartHeight: 450,
    gridClass: 'grid-cols-1 md:grid-cols-2'
  };
  if (stateCount <= 4) return {
    cols: 2,
    chartHeight: 400,
    gridClass: 'grid-cols-1 md:grid-cols-2'
  };
  if (stateCount <= 6) return {
    cols: screenWidth < 768 ? 1 : 3,
    chartHeight: 350,
    gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  };
  if (stateCount <= 9) return {
    cols: screenWidth < 768 ? 1 : 3,
    chartHeight: 300,
    gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  };
  return {
    cols: screenWidth < 768 ? 1 : 4,
    chartHeight: 280,
    gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };
}

const MultiStateChartGrid = memo(({
  states,
  normalized = false,
  yearRange = [2025, 2040],
  onNormalizedChange
}: MultiStateChartGridProps) => {
  // Calculate layout based on number of states
  const gridLayout = useMemo(() => getGridLayout(states.length), [states.length]);

  // Transform data for all states
  const chartData = useMemo(() => {
    if (states.length === 0) return [];
    return transformDataForChart(states, yearRange, normalized);
  }, [states, yearRange, normalized]);

  // If no states selected, show placeholder
  if (states.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-600 mb-2">No States Selected</h3>
          <p className="text-gray-500">Choose states from the selector above to begin comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid Statistics and Display Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-gray-600">
          Comparing <span className="font-semibold text-hopkins-blue">{states.length}</span> state{states.length !== 1 ? 's' : ''}
        </div>

        <div className="flex items-center gap-4">
          {/* Display Mode Toggle */}
          {onNormalizedChange && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                Display:
              </label>
              <button
                onClick={() => onNormalizedChange(!normalized)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border-2 ${
                  normalized
                    ? 'bg-hopkins-blue text-white border-hopkins-blue shadow-sm hover:bg-hopkins-spirit-blue'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-hopkins-blue hover:bg-gray-50'
                }`}
              >
                {normalized ? '📊 Proportional (%)' : '📈 Cases'}
              </button>
            </div>
          )}

          <div className="text-xs text-gray-500 whitespace-nowrap">
            {yearRange[0]}–{yearRange[1]}
          </div>
        </div>
      </div>

      {/* Responsive Chart Grid */}
      <div className={`grid gap-6 ${gridLayout.gridClass}`}>
        {states.map((state, index) => {
          const statePrefix = state.state_name.replace(/\s+/g, '_');

          return (
            <motion.div
              key={state.state_code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <AgeDistributionChart
                data={chartData}
                statePrefix={statePrefix}
                stateName={state.state_name}
                normalized={normalized}
                height={gridLayout.chartHeight}
              />

              {/* State-specific info */}
              {state.state_name === 'Total' && (
                <div className="mt-2 text-center">
                  <span className="inline-block bg-hopkins-gold text-hopkins-blue text-xs font-bold px-2 py-1 rounded-full">
                    AGGREGATE
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Grid Layout Info (for debugging/development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
          Grid: {gridLayout.cols} cols, Height: {gridLayout.chartHeight}px, Class: {gridLayout.gridClass}
        </div>
      )}
    </div>
  );
});

MultiStateChartGrid.displayName = 'MultiStateChartGrid';

export default MultiStateChartGrid;