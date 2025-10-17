'use client';

import React, { memo } from 'react';
import { HIV_AGE_PROJECTIONS } from '@/data/hiv-age-projections';

interface StateSelectorProps {
  selectedStates: string[];
  onStateChange: (states: string[]) => void;
  maxStates?: number;
}

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
        <div className="text-xs font-medium text-gray-600">
          {selectedStates.length === 0 ? (
            `Select states (up to ${maxStates})`
          ) : (
            <span>
              <span className="text-hopkins-blue font-semibold">{selectedStates.length}</span>/{maxStates} selected
            </span>
          )}
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

      {/* State Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
        {HIV_AGE_PROJECTIONS.map(state => {
          const isSelected = selectedStates.includes(state.state_name);
          const isDisabled = !isSelected && selectedStates.length >= maxStates;

          return (
            <button
              key={state.state_code}
              onClick={() => !isDisabled && handleStateToggle(state.state_name)}
              disabled={isDisabled}
              className={`group px-2 py-1.5 text-xs rounded-lg border-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue text-white border-hopkins-blue font-semibold shadow-md hover:shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-hopkins-blue hover:bg-gray-50 hover:scale-105 hover:shadow-sm'
              }`}
              title={state.state_name}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${state.state_name}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="truncate">
                  {state.state_name}
                </span>
                {state.state_name === 'Total' && (
                  <span className={`text-[10px] px-1 py-0.5 rounded font-bold flex-shrink-0 ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-hopkins-gold text-hopkins-blue'
                  }`}>
                    ALL
                  </span>
                )}
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