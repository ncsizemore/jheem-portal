'use client';

import { useState, useMemo, memo } from 'react';
import CalibrationChart from './CalibrationChart';
import ErrorBoundary from './ErrorBoundary';
import {
  getCalibrationData,
  CalibrationOutcome,
  AgeCategory,
  CalibrationStateCode,
  CALIBRATION_STATES,
  STATE_NAMES,
  AGE_CATEGORIES,
  OUTCOME_LABELS
} from '@/data/calibration-data';

interface CalibrationSectionProps {
  defaultExpanded?: boolean;
}

type AgeSelection = 'total' | 'all';

const CalibrationSection = memo(({ defaultExpanded = true }: CalibrationSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedState, setSelectedState] = useState<CalibrationStateCode>('CA');
  const [selectedOutcome, setSelectedOutcome] = useState<CalibrationOutcome | 'both'>('both');
  const [ageSelection, setAgeSelection] = useState<AgeSelection>('total');

  // Get chart data based on selections
  const chartConfigs = useMemo(() => {
    const outcomes: CalibrationOutcome[] =
      selectedOutcome === 'both' ? ['prevalence', 'diagnoses'] : [selectedOutcome];

    const ages: (AgeCategory | 'total')[] =
      ageSelection === 'all' ? ['total', ...AGE_CATEGORIES] : ['total'];

    return outcomes.flatMap(outcome =>
      ages.map(age => ({
        outcome,
        age,
        data: getCalibrationData(selectedState, outcome, age),
        key: `${outcome}-${age}`
      }))
    );
  }, [selectedState, selectedOutcome, ageSelection]);

  // Determine grid layout based on number of charts
  const gridCols = useMemo(() => {
    const numCharts = chartConfigs.length;
    if (numCharts <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (numCharts <= 4) return 'grid-cols-1 md:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  }, [chartConfigs.length]);

  return (
    <div>
      {/* Section Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-hopkins-blue/30 hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isExpanded ? 'bg-hopkins-blue text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-hopkins-blue/10'
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Model Calibration</h3>
            <p className="text-sm text-gray-600">
              Compare model simulations with CDC surveillance data (2010–2021)
            </p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isExpanded ? 'bg-hopkins-blue/10 rotate-180' : 'bg-gray-100'
        }`}>
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-4 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Description */}
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">About these plots:</span> Black lines show the mean across 1,000 model simulations.
              Orange shaded regions represent 95% credible intervals. Green dots indicate CDC surveillance data.
              The dashed vertical line marks 2021, the last year of available surveillance data.
            </p>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-6">
              {/* State Selector */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value as CalibrationStateCode)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-hopkins-blue focus:border-transparent transition-all"
                >
                  {CALIBRATION_STATES.map(code => (
                    <option key={code} value={code}>
                      {STATE_NAMES[code]} ({code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Outcome Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Outcome
                </label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  {(['both', 'prevalence', 'diagnoses'] as const).map(outcome => (
                    <button
                      key={outcome}
                      onClick={() => setSelectedOutcome(outcome)}
                      className={`px-4 py-2 text-sm font-medium transition-all ${
                        selectedOutcome === outcome
                          ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      } ${outcome !== 'both' ? 'border-l border-gray-300' : ''}`}
                    >
                      {outcome === 'both' ? 'Both' : OUTCOME_LABELS[outcome]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Group Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Age Groups
                </label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setAgeSelection('total')}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      ageSelection === 'total'
                        ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Total Only
                  </button>
                  <button
                    onClick={() => setAgeSelection('all')}
                    className={`px-4 py-2 text-sm font-medium transition-all border-l border-gray-300 ${
                      ageSelection === 'all'
                        ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Age Groups
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Grid */}
          <div className="p-6">
            {selectedOutcome === 'both' ? (
              // Two-column layout for both outcomes
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Prevalence Column */}
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    {OUTCOME_LABELS.prevalence}
                  </h4>
                  <div className={`grid ${ageSelection === 'all' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid-cols-1'}`}>
                    {chartConfigs
                      .filter(c => c.outcome === 'prevalence')
                      .map(config => (
                        <ErrorBoundary key={config.key}>
                          <CalibrationChart
                            data={config.data}
                            outcome={config.outcome}
                            ageCategory={config.age}
                            stateName={STATE_NAMES[selectedState]}
                            height={ageSelection === 'all' ? 220 : 300}
                          />
                        </ErrorBoundary>
                      ))}
                  </div>
                </div>

                {/* Diagnoses Column */}
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    {OUTCOME_LABELS.diagnoses}
                  </h4>
                  <div className={`grid ${ageSelection === 'all' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid-cols-1'}`}>
                    {chartConfigs
                      .filter(c => c.outcome === 'diagnoses')
                      .map(config => (
                        <ErrorBoundary key={config.key}>
                          <CalibrationChart
                            data={config.data}
                            outcome={config.outcome}
                            ageCategory={config.age}
                            stateName={STATE_NAMES[selectedState]}
                            height={ageSelection === 'all' ? 220 : 300}
                          />
                        </ErrorBoundary>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              // Single outcome layout
              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  {OUTCOME_LABELS[selectedOutcome]}
                </h4>
                <div className={`grid ${gridCols} gap-4`}>
                  {chartConfigs.map(config => (
                    <ErrorBoundary key={config.key}>
                      <CalibrationChart
                        data={config.data}
                        outcome={config.outcome}
                        ageCategory={config.age}
                        stateName={STATE_NAMES[selectedState]}
                        height={ageSelection === 'all' ? 220 : 300}
                      />
                    </ErrorBoundary>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-gray-800 rounded" />
                <span className="text-gray-600">Model mean</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-orange-200 rounded opacity-60" />
                <span className="text-gray-600">95% credible interval</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-600">CDC surveillance data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0 border-t-2 border-dashed border-gray-400" />
                <span className="text-gray-600">End of observed data (2021)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CalibrationSection.displayName = 'CalibrationSection';

export default CalibrationSection;
