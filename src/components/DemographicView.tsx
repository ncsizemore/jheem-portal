'use client';

import { useMemo, useState, useEffect } from 'react';
import MultiStateChartGrid from './MultiStateChartGrid';
import StateSelector from './StateSelector';
import TimelineControls from './TimelineControls';
import { StateAgeData, getStateCode } from '@/data/hiv-age-projections';
import { exportToCSV } from '@/utils/csvExport';

/**
 * Generic interface for demographic data items (race, sex, age group, etc.)
 */
export interface DemographicDataItem {
  state_code: string;
  state_name: string;
  category: string; // e.g., 'black', 'msm'
  category_label: string; // e.g., 'Black', 'MSM'
  data: Array<{
    year: number;
    age_cohorts: {
      '13-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55+': number;
    };
  }>;
}

/**
 * Props for the generic DemographicView component
 * This component handles any demographic breakdown (race, sex, etc.)
 */
interface DemographicViewProps<T extends string> {
  // State selection
  selectedStateNames: string[];
  onStateChange: (states: string[]) => void;

  // Category selection (e.g., races or sex categories)
  selectedCategories: T[];
  onCategoriesChange: (categories: T[]) => void;

  // Display options
  normalized: boolean;
  onNormalizedChange: (normalized: boolean) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;

  // Configuration: what makes this view unique
  viewMode: 'race' | 'sex'; // View mode for CSV export
  categoryLabel: string; // "Races" or "Sex Categories"
  categorySingular: string; // "race" or "category"
  categoryOptions: Record<T, string>; // e.g., { black: 'Black', hispanic: 'Hispanic' }
  categoryTooltips?: Partial<Record<T, string>>; // Optional tooltips for specific categories
  getDataFn: (stateCodes: string[], categories: T[]) => DemographicDataItem[]; // Data fetching function
  emptyMessage?: string; // Optional custom empty state message
}

/**
 * DemographicView - Generic component for demographic breakdowns
 *
 * This component eliminates duplication between ByRaceView and BySexView by providing
 * a reusable pattern for any demographic dimension (race, sex, age group, etc.)
 *
 * @example
 * <DemographicView
 *   selectedCategories={['black', 'hispanic']}
 *   categoryLabel="Races"
 *   categoryOptions={{ black: 'Black', hispanic: 'Hispanic', other: 'Other' }}
 *   getDataFn={getMultiStateRaceData}
 *   {...otherProps}
 * />
 */
export default function DemographicView<T extends string>({
  selectedStateNames,
  onStateChange,
  selectedCategories,
  onCategoriesChange,
  normalized,
  onNormalizedChange,
  yearRange,
  onYearRangeChange,
  viewMode,
  categoryLabel,
  categoryTooltips,
  categorySingular,
  categoryOptions,
  getDataFn,
  emptyMessage,
}: DemographicViewProps<T>) {

  // Track export status for visual feedback
  type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');

  // Listen for export status events from MultiStateChartGrid
  useEffect(() => {
    const handleExportStatus = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: ExportStatus }>;
      setExportStatus(customEvent.detail.status);

      // Auto-reset success/error states after 2 seconds
      if (customEvent.detail.status === 'success' || customEvent.detail.status === 'error') {
        setTimeout(() => setExportStatus('idle'), 2000);
      }
    };

    window.addEventListener('exportStatus', handleExportStatus);
    return () => window.removeEventListener('exportStatus', handleExportStatus);
  }, []);

  // Calculate how many charts will be displayed
  const chartCount = selectedStateNames.length * selectedCategories.length;
  const maxCharts = 25;
  const maxStates = Math.floor(maxCharts / selectedCategories.length);

  // Transform demographic data into format that MultiStateChartGrid expects
  const chartData: StateAgeData[] = useMemo(() => {
    try {
      // Map state names to codes using centralized utility
      const stateCodes = selectedStateNames.map(getStateCode);

      const demographicData = getDataFn(stateCodes, selectedCategories);

      // Validate data
      if (!demographicData || demographicData.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`No ${categoryLabel.toLowerCase()} data available for selected states/categories`);
        }
        return [];
      }

      // Transform into "virtual states" for the chart grid
      // Each state+category combination becomes a virtual state like "CA_Black" or "CA_MSM"
      return demographicData.map(item => ({
        state_code: `${item.state_code}_${item.category}`,
        state_name: `${item.state_name} - ${item.category_label}`,
        data: item.data
      }));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error loading ${categoryLabel.toLowerCase()} data:`, error);
      }
      return [];
    }
  }, [selectedStateNames, selectedCategories, getDataFn, categoryLabel]);

  // Toggle category selection
  const toggleCategory = (category: T) => {
    if (selectedCategories.includes(category)) {
      // Don't allow deselecting all categories
      if (selectedCategories.length > 1) {
        onCategoriesChange(selectedCategories.filter(c => c !== category));
      }
    } else {
      onCategoriesChange([...selectedCategories, category]);
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
              Deselect states or {categoryLabel.toLowerCase()} to add more comparisons.
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
          <div className="mt-2 text-xs text-gray-600 text-center">
            You can select up to {maxStates} states with {selectedCategories.length} {selectedCategories.length === 1 ? categorySingular : categoryLabel.toLowerCase()} selected. Currently showing {chartCount} of 25 charts.
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
          {/* Display Mode - Segmented Control */}
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 flex flex-col items-center justify-center">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Display Mode
            </label>
            <div className="w-full flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => onNormalizedChange(false)}
                className={`flex-1 px-2 py-2 text-[11px] font-semibold transition-all duration-200 ${
                  !normalized
                    ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Show absolute case counts"
              >
                Case Counts
              </button>
              <button
                onClick={() => onNormalizedChange(true)}
                className={`flex-1 px-2 py-2 text-[11px] font-semibold transition-all duration-200 border-l border-gray-300 ${
                  normalized
                    ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Show proportional percentages"
              >
                Proportional %
              </button>
            </div>
          </div>

          {/* Export - PNG and CSV side by side */}
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 flex flex-col items-center justify-center">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Export
            </label>
            <div className="w-full flex gap-1.5">
              {/* PNG Export */}
              <button
                onClick={() => {
                  const event = new CustomEvent('exportCharts');
                  window.dispatchEvent(event);
                }}
                disabled={exportStatus === 'exporting'}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold rounded-lg transition-all shadow-sm ${
                  exportStatus === 'exporting'
                    ? 'bg-gray-100 border border-gray-300 text-gray-400 cursor-wait'
                    : exportStatus === 'success'
                    ? 'bg-green-50 border border-green-300 text-green-700'
                    : exportStatus === 'error'
                    ? 'bg-red-50 border border-red-300 text-red-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-hopkins-blue hover:bg-gray-50 hover:shadow-md'
                }`}
                title={
                  exportStatus === 'exporting' ? 'Generating export...' :
                  exportStatus === 'success' ? 'Export successful!' :
                  exportStatus === 'error' ? 'Export failed' :
                  'Export charts as PNG image'
                }
              >
                {exportStatus === 'exporting' ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : exportStatus === 'success' ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : exportStatus === 'error' ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="whitespace-nowrap">PNG</span>
              </button>

              {/* CSV Export */}
              <button
                onClick={() => {
                  exportToCSV(chartData, yearRange, normalized, viewMode);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold rounded-lg transition-all shadow-sm bg-white border border-gray-300 text-gray-700 hover:border-hopkins-blue hover:bg-gray-50 hover:shadow-md"
                title="Export data as CSV file"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="whitespace-nowrap">CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selector */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
          Select {categoryLabel}
        </label>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(categoryOptions) as T[]).map((category) => {
            const isSelected = selectedCategories.includes(category);
            const categoryDisplayLabel = categoryOptions[category];
            const tooltip = categoryTooltips?.[category];

            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`group relative px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm ${
                  isSelected
                    ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white shadow-md hover:shadow-lg scale-105'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-hopkins-blue hover:scale-105 hover:shadow-md'
                }`}
              >
                {categoryDisplayLabel}
                {tooltip && (
                  <span
                    className={`ml-1.5 text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}
                    title={tooltip}
                  >
                    ⓘ
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selectedCategories.length < 2 && (
          <p className="text-xs text-gray-500 mt-2">
            Select at least 2 {categoryLabel.toLowerCase()} to enable deselection
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
          <p>
            {emptyMessage || `Please select at least one state and one ${categorySingular} to view data.`}
          </p>
        </div>
      )}
    </div>
  );
}
