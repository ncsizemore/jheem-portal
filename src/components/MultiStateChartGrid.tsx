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

// Smart grid layout calculator with optimized spacing
function getGridLayout(stateCount: number, screenWidth: number = 1200) {
  if (stateCount === 0) return { cols: 0, chartHeight: 0, gridClass: '', gap: 'gap-6' };
  if (stateCount === 1) return {
    cols: 1,
    chartHeight: 500,
    gridClass: 'grid-cols-1',
    gap: 'gap-6'
  };
  if (stateCount === 2) return {
    cols: 2,
    chartHeight: 450,
    gridClass: 'grid-cols-1 md:grid-cols-2',
    gap: 'gap-6'
  };
  if (stateCount <= 4) return {
    cols: 2,
    chartHeight: 420,
    gridClass: 'grid-cols-1 md:grid-cols-2',
    gap: 'gap-6'
  };
  if (stateCount <= 6) return {
    cols: screenWidth < 768 ? 1 : 3,
    chartHeight: 380,
    gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    gap: 'gap-5'
  };
  // For 7+ states, always use 3 columns max
  return {
    cols: screenWidth < 768 ? 1 : 3,
    chartHeight: 340,
    gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    gap: 'gap-4'
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
          {/* Enhanced Display Mode Toggle */}
          {onNormalizedChange && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
              <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                Display:
              </label>
              <button
                onClick={() => onNormalizedChange(!normalized)}
                className={`group relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                  normalized
                    ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white scale-105'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-hopkins-blue hover:scale-105'
                }`}
                title={normalized ? 'Switch to absolute case counts' : 'Switch to proportional view'}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{normalized ? '📊' : '📈'}</span>
                  <span>{normalized ? 'Proportional (%)' : 'Cases'}</span>
                </span>
                {normalized && (
                  <div className="absolute inset-0 rounded-lg bg-white/20 blur-sm -z-10"></div>
                )}
              </button>
            </div>
          )}

          <div className="text-xs text-gray-500 whitespace-nowrap font-medium">
            {yearRange[0]}–{yearRange[1]}
          </div>
        </div>
      </div>

      {/* Responsive Chart Grid */}
      <div className={`grid ${gridLayout.gap} ${gridLayout.gridClass}`}>
        {states.map((state, index) => {
          const statePrefix = state.state_name.replace(/\s+/g, '_');

          // Smart animation delays: reduce delay for large state counts
          const animationDelay = states.length > 6
            ? Math.min(index * 0.03, 0.3) // Max 300ms total delay for many states
            : index * 0.1; // Normal stagger for few states

          return (
            <motion.div
              key={state.state_code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: animationDelay, duration: 0.4 }}
              className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 p-5"
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
          Grid: {gridLayout.cols} cols, Height: {gridLayout.chartHeight}px, Gap: {gridLayout.gap}, Class: {gridLayout.gridClass}
        </div>
      )}
    </div>
  );
});

MultiStateChartGrid.displayName = 'MultiStateChartGrid';

export default MultiStateChartGrid;