'use client';

import React, { memo, useMemo } from 'react';
import { HIV_AGE_PROJECTIONS, STATE_ABBREVIATIONS } from '@/data/hiv-age-projections';

interface StateSelectorProps {
  selectedStates: string[];
  onStateChange: (states: string[]) => void;
  maxStates?: number;
}

// Lightweight sparkline component for aging trend visualization
const AgingSparkline = memo(({ stateData, isSelected }: { stateData: typeof HIV_AGE_PROJECTIONS[0], isSelected: boolean }) => {
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
  const width = 24;
  const height = 10;
  const points = trend.map((value, index) => {
    const x = (index / (trend.length - 1)) * width;
    const y = range > 0 ? height - ((value - min) / range) * height : height / 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      width={width}
      height={height}
      className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
      style={{ minWidth: width }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={isSelected ? 'rgba(255,255,255,0.8)' : '#10B981'}
        strokeWidth="1.5"
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
    <div className="space-y-2.5">
      {/* Header with count and controls */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-600 flex items-center gap-2">
          {selectedStates.length === 0 ? (
            `Select states (up to ${maxStates})`
          ) : (
            <span>
              <span className="text-hopkins-blue font-semibold">{selectedStates.length}</span>/{maxStates} selected
            </span>
          )}
          <span className="text-[10px] text-gray-500 hidden md:inline" title="Each state shows a trend line of the 55+ age cohort percentage over time">
            📈 = 55+ aging trend
          </span>
        </div>
        <div className="flex gap-3">
          {selectedStates.length < HIV_AGE_PROJECTIONS.length && (
            <button
              onClick={handleSelectAll}
              className="text-xs text-gray-600 hover:text-gray-900 underline transition-colors"
            >
              Select all
            </button>
          )}
          {selectedStates.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-600 hover:text-gray-900 underline transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* State Grid - Denser with abbreviations */}
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
        {HIV_AGE_PROJECTIONS.map(state => {
          const isSelected = selectedStates.includes(state.state_name);
          const isDisabled = !isSelected && selectedStates.length >= maxStates;
          const abbreviation = STATE_ABBREVIATIONS[state.state_name] || state.state_name;

          return (
            <button
              key={state.state_code}
              onClick={() => !isDisabled && handleStateToggle(state.state_name)}
              disabled={isDisabled}
              className={`group px-2 py-2 text-xs font-semibold rounded-lg border-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue text-white border-hopkins-blue shadow-md hover:shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-hopkins-blue hover:bg-gray-50 hover:scale-105 hover:shadow-sm'
              }`}
              title={`${state.state_name} - Click to ${isSelected ? 'deselect' : 'select'}`}
              aria-label={`${state.state_name}, ${isSelected ? 'selected, click to deselect' : 'click to select'}`}
            >
              <div className="flex flex-col items-center gap-1 w-full">
                {/* State abbreviation */}
                <span className="text-sm font-bold tracking-wide">
                  {abbreviation}
                </span>

                {/* Aging trend sparkline */}
                <AgingSparkline stateData={state} isSelected={isSelected} />
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