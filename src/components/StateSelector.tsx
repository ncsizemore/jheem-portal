'use client';

import React, { memo, useMemo } from 'react';
import { HIV_AGE_PROJECTIONS, STATE_ABBREVIATIONS } from '@/data/hiv-age-projections';

interface StateSelectorProps {
  selectedStates: string[];
  onStateChange: (states: string[]) => void;
  maxStates?: number;
}

// Lightweight sparkline component for aging trend visualization (shown in tooltip)
const AgingSparkline = memo(({ stateData }: { stateData: typeof HIV_AGE_PROJECTIONS[0] }) => {
  // Extract 55+ age cohort trend over time
  const trend = useMemo(() => {
    return stateData.data.map(yearData => {
      const total = Object.values(yearData.age_cohorts).reduce((sum, val) => sum + val, 0);
      return (yearData.age_cohorts['55+'] / total) * 100; // Percentage
    });
  }, [stateData]);

  // Calculate min/max for scaling
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const range = max - min;

  // Generate SVG path
  const width = 32;
  const height = 12;
  const points = trend.map((value, index) => {
    const x = (index / (trend.length - 1)) * width;
    const y = range > 0 ? height - ((value - min) / range) * height : height / 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      width={width}
      height={height}
      className="flex-shrink-0"
      style={{ minWidth: width }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

AgingSparkline.displayName = 'AgingSparkline';

const StateSelector = memo(({
  selectedStates,
  onStateChange,
  maxStates = 9
}: StateSelectorProps) => {
  const handleStateToggle = (stateName: string) => {
    if (selectedStates.includes(stateName)) {
      // Remove state
      onStateChange(selectedStates.filter(s => s !== stateName));
    } else if (selectedStates.length < maxStates) {
      // Add state if under limit
      onStateChange([...selectedStates, stateName]);
    }
  };

  const handleClearAll = () => {
    onStateChange([]);
  };

  const handleSelectAll = () => {
    onStateChange(HIV_AGE_PROJECTIONS.map(s => s.state_name));
  };

  return (
    <div className="space-y-2">
      {/* Header with label and controls - matching Timeline style */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700">
          Select States
        </label>
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-gray-600">
            {selectedStates.length === 0 ? (
              <span className="text-gray-400">None selected</span>
            ) : (
              <span>
                <span className="text-hopkins-blue font-semibold">{selectedStates.length}</span>/{maxStates}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {selectedStates.length < HIV_AGE_PROJECTIONS.length && (
              <button
                onClick={handleSelectAll}
                className="text-xs text-gray-600 hover:text-gray-900 underline transition-colors"
              >
                All
              </button>
            )}
            {selectedStates.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-gray-600 hover:text-gray-900 underline transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* State Grid - 7 columns for more even distribution */}
      <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5">
        {HIV_AGE_PROJECTIONS.map(state => {
          const isSelected = selectedStates.includes(state.state_name);
          const isDisabled = !isSelected && selectedStates.length >= maxStates;
          const abbreviation = STATE_ABBREVIATIONS[state.state_name] || state.state_name;

          // Special styling for "Total" button
          const isTotal = state.state_name === 'Total';

          return (
            <button
              key={state.state_code}
              onClick={() => !isDisabled && handleStateToggle(state.state_name)}
              disabled={isDisabled}
              className={`group relative px-2 py-2 text-xs font-semibold rounded-lg border-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                isTotal ? 'col-span-2' : ''
              } ${
                isTotal
                  ? isSelected
                    ? 'bg-gradient-to-br from-hopkins-gold to-amber-400 text-gray-900 border-hopkins-gold shadow-md hover:shadow-lg scale-105'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border-gray-400 hover:border-hopkins-gold hover:bg-gradient-to-br hover:from-amber-50 hover:to-amber-100 hover:scale-105 hover:shadow-sm'
                  : isSelected
                    ? 'bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue text-white border-hopkins-blue shadow-md hover:shadow-lg scale-105'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-hopkins-blue hover:bg-gray-50 hover:scale-105 hover:shadow-sm'
              }`}
              aria-label={`${state.state_name}, ${isSelected ? 'selected, click to deselect' : 'click to select'}`}
            >
              {/* State abbreviation or "Total" - single line */}
              <span className={`${isTotal ? 'text-sm' : 'text-sm'} font-bold tracking-wide`}>
                {isTotal ? 'TOTAL' : abbreviation}
              </span>

              {/* Hover tooltip with full name and sparkline */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                  <div className="font-semibold mb-1">
                    {isTotal ? 'All States Combined' : state.state_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">55+ trend:</span>
                    <AgingSparkline stateData={state} />
                  </div>
                  {/* Tooltip arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

StateSelector.displayName = 'StateSelector';

export default StateSelector;