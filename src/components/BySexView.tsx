'use client';

import { useMemo } from 'react';
import MultiStateChartGrid from './MultiStateChartGrid';
import StateSelector from './StateSelector';
import TimelineControls from './TimelineControls';
import { getMultiStateSexData, SEX_CATEGORIES, SexCategory } from '@/data/hiv-age-projections-sex';
import { StateAgeData, getStateCode } from '@/data/hiv-age-projections';

interface BySexViewProps {
  selectedStateNames: string[];
  onStateChange: (states: string[]) => void;
  selectedSexCategories: SexCategory[];
  onSexCategoriesChange: (sexCategories: SexCategory[]) => void;
  normalized: boolean;
  onNormalizedChange: (normalized: boolean) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
}

export default function BySexView({
  selectedStateNames,
  onStateChange,
  selectedSexCategories,
  onSexCategoriesChange,
  normalized,
  onNormalizedChange,
  yearRange,
  onYearRangeChange,
}: BySexViewProps) {

  // Calculate how many charts will be displayed
  const chartCount = selectedStateNames.length * selectedSexCategories.length;
  const maxCharts = 25;
  const maxStates = Math.floor(maxCharts / selectedSexCategories.length);

  // Transform sex data into format that MultiStateChartGrid expects
  const chartData: StateAgeData[] = useMemo(() => {
    try {
      // Map state names to codes using centralized utility
      const stateCodes = selectedStateNames.map(getStateCode);

      const sexData = getMultiStateSexData(stateCodes, selectedSexCategories);

      // Validate data
      if (!sexData || sexData.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('No sex data available for selected states/sex categories');
        }
        return [];
      }

      // Transform into "virtual states" for the chart grid
      // Each state+sex combination becomes a virtual state like "CA_MSM"
      return sexData.map(item => ({
        state_code: `${item.state_code}_${item.sex}`,
        state_name: `${item.state_name} - ${item.sex_label}`,
        data: item.data
      }));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading sex data:', error);
      }
      return [];
    }
  }, [selectedStateNames, selectedSexCategories]);

  // Toggle sex category selection
  const toggleSex = (sex: SexCategory) => {
    if (selectedSexCategories.includes(sex)) {
      // Don't allow deselecting all sex categories
      if (selectedSexCategories.length > 1) {
        onSexCategoriesChange(selectedSexCategories.filter(s => s !== sex));
      }
    } else {
      onSexCategoriesChange([...selectedSexCategories, sex]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Warning: Approaching Chart Limit */}
      {chartCount > 20 && chartCount <= 25 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
          <span className="text-yellow-600 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">
              Approaching chart limit ({chartCount}/25)
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Deselect states or sex categories to add more comparisons.
            </p>
          </div>
        </div>
      )}

      {/* Info: Available Capacity */}
      {chartCount < 15 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="flex-1">
            <p className="text-xs text-blue-700">
              You can select up to {maxStates} states with {selectedSexCategories.length} {selectedSexCategories.length === 1 ? 'category' : 'categories'} selected.
              Currently showing {chartCount} of 25 charts.
            </p>
          </div>
        </div>
      )}

      {/* Controls Section */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* State Selector - ~40% width */}
        <div className="lg:w-[38%] bg-gray-50 rounded-lg p-3 border border-gray-200">
          <StateSelector
            selectedStates={selectedStateNames}
            onStateChange={onStateChange}
            maxStates={maxStates}
          />
          <div className="mt-2 text-xs text-gray-500 text-center">
            Max {maxStates} states × {selectedSexCategories.length} {selectedSexCategories.length === 1 ? 'category' : 'categories'} = {chartCount} charts
          </div>
        </div>

        {/* Timeline Controls - ~40% width */}
        <div className="lg:w-[38%] bg-gray-50 rounded-lg p-3 border border-gray-200">
          <TimelineControls
            yearRange={yearRange}
            onYearRangeChange={onYearRangeChange}
            minYear={2025}
            maxYear={2040}
          />
        </div>

        {/* Display Mode and Export - ~20% width */}
        <div className="lg:w-[24%] flex flex-col gap-2">
          {/* Display Mode Toggle */}
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 flex flex-col items-center justify-center">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Display Mode
            </label>
            <button
              onClick={() => onNormalizedChange(!normalized)}
              className={`w-full px-3 py-2 rounded-md text-xs font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                normalized
                  ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-hopkins-blue'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">{normalized ? '📊' : '📈'}</span>
                <span>{normalized ? 'Proportional %' : 'Case Counts'}</span>
              </div>
            </button>
          </div>

          {/* Export PNG */}
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 flex items-center justify-center">
            <button
              onClick={() => {
                const event = new CustomEvent('exportCharts');
                window.dispatchEvent(event);
              }}
              className="w-full flex flex-col items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md bg-white border border-gray-300 text-gray-700 hover:border-hopkins-blue hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export PNG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sex Category Selector */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
          Select Sex Categories
        </label>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(SEX_CATEGORIES) as SexCategory[]).map((sex) => {
            const isSelected = selectedSexCategories.includes(sex);
            const sexLabel = SEX_CATEGORIES[sex];

            return (
              <button
                key={sex}
                onClick={() => toggleSex(sex)}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                  isSelected
                    ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-hopkins-blue'
                }`}
              >
                {sexLabel}
              </button>
            );
          })}
        </div>
        {selectedSexCategories.length < 2 && (
          <p className="text-xs text-gray-500 mt-2">
            Select at least 2 categories to enable deselection
          </p>
        )}
      </div>

      {/* Chart Grid */}
      {chartData.length > 0 ? (
        <MultiStateChartGrid
          states={chartData}
          normalized={normalized}
          yearRange={yearRange}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>Please select at least one state and one sex category to view data.</p>
        </div>
      )}
    </div>
  );
}
