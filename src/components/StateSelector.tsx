'use client';

import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states based on search term
  const filteredStates = HIV_AGE_PROJECTIONS.filter(state =>
    state.state_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStateToggle = (stateName: string) => {
    if (selectedStates.includes(stateName)) {
      // Remove state
      onStateChange(selectedStates.filter(s => s !== stateName));
    } else if (selectedStates.length < maxStates) {
      // Add state if under limit
      onStateChange([...selectedStates, stateName]);
    }
  };

  const handleSelectAll = () => {
    const availableStates = filteredStates.slice(0, maxStates).map(s => s.state_name);
    onStateChange(availableStates);
  };

  const handleClearAll = () => {
    onStateChange([]);
  };

  return (
    <div className="relative">
      {/* Selected States Display */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selected States ({selectedStates.length}/{maxStates}):
        </label>
        {selectedStates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedStates.map(stateName => (
              <motion.span
                key={stateName}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 bg-hopkins-blue text-white px-3 py-1 rounded-full text-sm"
              >
                {stateName}
                <button
                  onClick={() => handleStateToggle(stateName)}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${stateName}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No states selected</p>
        )}
      </div>

      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-hopkins-blue focus:ring-2 focus:ring-hopkins-blue focus:border-transparent transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-700">
            {selectedStates.length === 0
              ? 'Select states to compare...'
              : `Add more states (${maxStates - selectedStates.length} remaining)`
            }
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden"
          >
            {/* Search and Controls */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search states..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-hopkins-blue focus:border-transparent"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSelectAll}
                  disabled={selectedStates.length >= maxStates}
                  className="px-3 py-1 text-xs bg-hopkins-blue text-white rounded hover:bg-hopkins-spirit-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Select Filtered
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* State List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredStates.map(state => {
                const isSelected = selectedStates.includes(state.state_name);
                const isDisabled = !isSelected && selectedStates.length >= maxStates;

                return (
                  <button
                    key={state.state_code}
                    onClick={() => !isDisabled && handleStateToggle(state.state_name)}
                    disabled={isDisabled}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected ? 'bg-hopkins-blue/10' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      isSelected
                        ? 'bg-hopkins-blue border-hopkins-blue'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* State Name */}
                    <span className={`flex-1 text-sm ${
                      isSelected ? 'font-medium text-hopkins-blue' : 'text-gray-700'
                    }`}>
                      {state.state_name}
                    </span>

                    {/* Special indicator for "Total" */}
                    {state.state_name === 'Total' && (
                      <span className="text-xs bg-hopkins-gold text-hopkins-blue px-2 py-0.5 rounded-full font-medium">
                        ALL
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {filteredStates.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No states found matching &ldquo;{searchTerm}&rdquo;
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
});

StateSelector.displayName = 'StateSelector';

export default StateSelector;