'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';
import StateSelector from '@/components/StateSelector';
import MultiStateChartGrid from '@/components/MultiStateChartGrid';
import TimelineControls from '@/components/TimelineControls';
import ByRaceView from '@/components/ByRaceView';
import BySexView from '@/components/BySexView';
import ErrorBoundary from '@/components/ErrorBoundary';
import CalibrationSection from '@/components/CalibrationSection';
import { getStatesByNames, getStateName, getStateCode, isValidStateCode } from '@/data/hiv-age-projections';
import { RACE_CATEGORIES, RaceCategory } from '@/data/hiv-age-projections-race';
import { SEX_CATEGORIES, SexCategory } from '@/data/hiv-age-projections-sex';
import { exportToCSV } from '@/utils/csvExport';

// View mode type
type ViewMode = 'state' | 'race' | 'sex';

interface InitialSelections {
  viewMode: ViewMode;
  selectedStateNames: string[];
  selectedRaces: RaceCategory[];
  selectedSexCategories: SexCategory[];
  normalized: boolean;
  yearRange: [number, number];
}

function limitStates(
  states: string[],
  viewMode: ViewMode,
  races: RaceCategory[],
  sexCategories: SexCategory[],
): string[] {
  const categoryCount = viewMode === 'race'
    ? races.length
    : viewMode === 'sex'
      ? sexCategories.length
      : 0;
  if (categoryCount === 0) return states;
  return states.slice(0, Math.floor(25 / categoryCount));
}

function parseInitialSelections(searchParams: { get(name: string): string | null }): InitialSelections {
  const urlView = searchParams.get('view');
  const viewMode: ViewMode = urlView === 'race' || urlView === 'sex' || urlView === 'state'
    ? urlView
    : 'state';

  const stateCodes = (searchParams.get('states') || '')
    .split(',')
    .filter((code) => isValidStateCode(code));
  const selectedStateNames = stateCodes.length > 0
    ? stateCodes.map((code) => getStateName(code))
    : ['California', 'Texas'];

  const races = (searchParams.get('races') || '').split(',').filter(
    (race): race is RaceCategory => race in RACE_CATEGORIES,
  );
  const selectedRaces: RaceCategory[] = races.length > 0
    ? races
    : ['black', 'hispanic', 'other'];

  const sexCategories = (searchParams.get('sex') || '').split(',').filter(
    (sex): sex is SexCategory => sex in SEX_CATEGORIES,
  );
  const selectedSexCategories: SexCategory[] = sexCategories.length > 0
    ? sexCategories
    : ['msm', 'non_msm'];

  const [start, end] = (searchParams.get('years') || '').split('-').map(Number);
  const yearRange: [number, number] = Number.isFinite(start)
    && Number.isFinite(end)
    && start >= 2025
    && end <= 2040
    && start <= end
    ? [start, end]
    : [2025, 2040];

  return {
    viewMode,
    selectedStateNames: limitStates(
      selectedStateNames,
      viewMode,
      selectedRaces,
      selectedSexCategories,
    ),
    selectedRaces,
    selectedSexCategories,
    normalized: searchParams.get('normalized') === 'true',
    yearRange,
  };
}

// Multi-state comparison component (inner, uses useSearchParams)
function MultiStateComparisonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSelections = useMemo(() => parseInitialSelections(searchParams), [searchParams]);

  // Initialize state from URL or defaults
  const [viewMode, setViewMode] = useState<ViewMode>(() => initialSelections.viewMode);
  const [selectedStateNames, setSelectedStateNames] = useState<string[]>(() => initialSelections.selectedStateNames);
  const [selectedRaces, setSelectedRaces] = useState<RaceCategory[]>(() => initialSelections.selectedRaces);
  const [selectedSexCategories, setSelectedSexCategories] = useState<SexCategory[]>(() => initialSelections.selectedSexCategories);
  const [normalized, setNormalized] = useState(() => initialSelections.normalized);
  const [yearRange, setYearRange] = useState<[number, number]>(() => initialSelections.yearRange);

  // Track export status for visual feedback
  type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');

  const handleViewModeChange = (nextViewMode: ViewMode) => {
    setViewMode(nextViewMode);
    setSelectedStateNames((states) => limitStates(
      states,
      nextViewMode,
      selectedRaces,
      selectedSexCategories,
    ));
  };

  const handleStateChange = (states: string[]) => {
    setSelectedStateNames(limitStates(states, viewMode, selectedRaces, selectedSexCategories));
  };

  const handleRacesChange = (races: RaceCategory[]) => {
    setSelectedRaces(races);
    setSelectedStateNames((states) => limitStates(states, viewMode, races, selectedSexCategories));
  };

  const handleSexCategoriesChange = (sexCategories: SexCategory[]) => {
    setSelectedSexCategories(sexCategories);
    setSelectedStateNames((states) => limitStates(states, viewMode, selectedRaces, sexCategories));
  };

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();

    // Add view mode
    params.set('view', viewMode);

    // Add states (convert names to codes for shorter URLs)
    const stateCodes = selectedStateNames.map(getStateCode);
    params.set('states', stateCodes.join(','));

    // Add races (only if race view)
    if (viewMode === 'race') {
      params.set('races', selectedRaces.join(','));
    }

    // Add sex categories (only if sex view)
    if (viewMode === 'sex') {
      params.set('sex', selectedSexCategories.join(','));
    }

    // Add normalized (only if true)
    if (normalized) {
      params.set('normalized', 'true');
    }

    // Add year range (only if not default)
    if (yearRange[0] !== 2025 || yearRange[1] !== 2040) {
      params.set('years', `${yearRange[0]}-${yearRange[1]}`);
    }

    // Update URL without scroll or reload
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [viewMode, selectedStateNames, selectedRaces, selectedSexCategories, normalized, yearRange, router]);

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

  // Get state data objects from names
  const selectedStates = getStatesByNames(selectedStateNames);

  return (
    <div className="space-y-4">
      {/* Tab Navigation - Outside container */}
      <div className="flex items-center gap-3">
        <span className="text-base font-bold text-gray-800 mr-2">
          Breakdown:
        </span>
        <button
          onClick={() => handleViewModeChange('state')}
          title="View overall state-level aging trends without demographic breakdowns"
          className={`group px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            viewMode === 'state'
              ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white shadow-lg shadow-hopkins-blue/30 scale-105 hover:shadow-xl'
              : 'bg-white text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-md border border-gray-200 shadow-sm'
          }`}
        >
          Overall
        </button>
        <button
          onClick={() => handleViewModeChange('race')}
          title="Compare aging trends across racial/ethnic groups (Black, Hispanic, Other)"
          className={`group px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            viewMode === 'race'
              ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white shadow-lg shadow-hopkins-blue/30 scale-105 hover:shadow-xl'
              : 'bg-white text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-md border border-gray-200 shadow-sm'
          }`}
        >
          By Race
        </button>
        <button
          onClick={() => handleViewModeChange('sex')}
          title="Compare aging trends by transmission category: MSM (Men who have Sex with Men) vs Non-MSM populations"
          className={`group px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            viewMode === 'sex'
              ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white shadow-lg shadow-hopkins-blue/30 scale-105 hover:shadow-xl'
              : 'bg-white text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-md border border-gray-200 shadow-sm'
          }`}
        >
          By Transmission <span className="text-xs opacity-80">(MSM)</span>
        </button>
      </div>

      {/* Helper text for current view mode */}
      {viewMode === 'state' && (
        <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="font-semibold">Overall view:</span> Compare aging trends across states without demographic breakdowns. Select up to 25 states.
        </div>
      )}
      {viewMode === 'race' && (
        <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="font-semibold">Race breakdown:</span> Compare aging trends by racial/ethnic group (<strong>Black</strong>, <strong>Hispanic</strong>, <strong>Other</strong>). Chart limit: 25 total.
        </div>
      )}
      {viewMode === 'sex' && (
        <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="font-semibold">Transmission breakdown:</span> Compare trends by transmission category: <strong>MSM</strong> (Men who have Sex with Men) and <strong>Non-MSM</strong> (all other populations). Chart limit: 25 total.
        </div>
      )}

      {/* Main container */}
      <div className="bg-white rounded-xl p-8 shadow-lg space-y-8">

      {/* By State View */}
      {viewMode === 'state' && (
        <div className="space-y-8">
      {/* Controls Section - 3 columns */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* State Selector - ~40% width */}
        <div className="lg:w-[38%] bg-gray-50 rounded-lg p-3 border border-gray-200">
          <StateSelector
            selectedStates={selectedStateNames}
            onStateChange={handleStateChange}
            maxStates={25}
          />
        </div>

        {/* Timeline Controls - ~40% width */}
        <div className="lg:w-[38%] bg-gray-50 rounded-lg p-3 border border-gray-200">
          <TimelineControls
            yearRange={yearRange}
            onYearRangeChange={setYearRange}
            minYear={2025}
            maxYear={2040}
          />
        </div>

        {/* Display Mode and Export - ~20% width, stacked */}
        <div className="lg:w-[24%] flex flex-col gap-2">
          {/* Display Mode - Segmented Control */}
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 flex flex-col items-center justify-center">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Display Mode
            </label>
            <div className="w-full flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setNormalized(false)}
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
                onClick={() => setNormalized(true)}
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
                  exportToCSV(selectedStates, yearRange, normalized, 'state');
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

      {/* Chart Grid */}
      <ErrorBoundary>
        <MultiStateChartGrid
          states={selectedStates}
          normalized={normalized}
          yearRange={yearRange}
        />
      </ErrorBoundary>
        </div>
      )}

      {/* By Race View */}
      {viewMode === 'race' && (
        <ErrorBoundary>
          <ByRaceView
            selectedStateNames={selectedStateNames}
            onStateChange={handleStateChange}
            selectedRaces={selectedRaces}
            onRacesChange={handleRacesChange}
            normalized={normalized}
            onNormalizedChange={setNormalized}
            yearRange={yearRange}
            onYearRangeChange={setYearRange}
          />
        </ErrorBoundary>
      )}

      {/* By Sex View */}
      {viewMode === 'sex' && (
        <ErrorBoundary>
          <BySexView
            selectedStateNames={selectedStateNames}
            onStateChange={handleStateChange}
            selectedSexCategories={selectedSexCategories}
            onSexCategoriesChange={handleSexCategoriesChange}
            normalized={normalized}
            onNormalizedChange={setNormalized}
            yearRange={yearRange}
            onYearRangeChange={setYearRange}
          />
        </ErrorBoundary>
      )}
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary
function MultiStateComparison() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-xl p-8 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <MultiStateComparisonInner />
    </Suspense>
  );
}

// Collapsible section wrapper for projections
function ProjectionsSection() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      {/* Section Header */}
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
            <h3 className="text-lg font-semibold text-gray-900">Age Distribution Projections</h3>
            <p className="text-sm text-gray-600">
              Projected age cohort trends by state and demographic group (2025–2040)
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
        <div className="mt-4">
          <MultiStateComparison />
        </div>
      )}
    </div>
  );
}

export default function HIVAgeProjectionsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-4">
              JHEEM Modeling Analysis
            </p>
            <h1 className="text-4xl lg:text-5xl font-light text-gray-900 leading-tight mb-8">
              Projected Aging Among<br />
              <span className="font-semibold">People with HIV</span>
            </h1>
          </motion.div>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <p className="text-lg text-gray-700 leading-relaxed mb-6 max-w-2xl">
                By 2040, the median age of adults with diagnosed HIV across 24 US states
                will rise from 51 to 62 years. State-level patterns vary substantially:
                more populous, urban states with older epidemics will age significantly,
                while rural states with younger populations may see little change.
              </p>
              <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
                This interactive tool allows you to explore how aging dynamics differ by state
                and demographic group, informing planning for age-related comorbidities among
                people living with HIV.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-gradient-to-br from-hopkins-blue/5 to-hopkins-spirit-blue/10 p-6 rounded-xl space-y-5"
            >
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-light text-hopkins-blue mb-1">24 States</div>
                  <p className="text-xs text-gray-600">Representing 86% of diagnosed HIV cases in the US</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-hopkins-blue/20">
                  <div>
                    <div className="text-2xl font-semibold text-hopkins-blue mb-1">51→62</div>
                    <p className="text-xs text-gray-600">Median age by 2040</p>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-hopkins-blue mb-1">50%+</div>
                    <p className="text-xs text-gray-600">Aged 65+ by 2040</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main App Area */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-hopkins-blue/5 to-hopkins-spirit-blue/10 rounded-2xl p-8 space-y-8">
              {/* Age Distribution Projections */}
              <ErrorBoundary>
                <ProjectionsSection />
              </ErrorBoundary>

              {/* Model Calibration Section */}
              <ErrorBoundary>
                <CalibrationSection />
              </ErrorBoundary>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
