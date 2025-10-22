'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';
import StateSelector from '@/components/StateSelector';
import MultiStateChartGrid from '@/components/MultiStateChartGrid';
import TimelineControls from '@/components/TimelineControls';
import ByRaceView from '@/components/ByRaceView';
import BySexView from '@/components/BySexView';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getStatesByNames, getStateName, getStateCode, isValidStateCode } from '@/data/hiv-age-projections';
import { RACE_CATEGORIES, RaceCategory } from '@/data/hiv-age-projections-race';
import { SEX_CATEGORIES, SexCategory } from '@/data/hiv-age-projections-sex';

// View mode type
type ViewMode = 'state' | 'race' | 'sex';

// Multi-state comparison component (inner, uses useSearchParams)
function MultiStateComparisonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL or defaults
  const [viewMode, setViewMode] = useState<ViewMode>('state');
  const [selectedStateNames, setSelectedStateNames] = useState<string[]>(['California', 'Texas']);
  const [selectedRaces, setSelectedRaces] = useState<RaceCategory[]>(['black', 'hispanic', 'other']);
  const [selectedSexCategories, setSelectedSexCategories] = useState<SexCategory[]>(['msm', 'non_msm']);
  const [normalized, setNormalized] = useState(false);
  const [yearRange, setYearRange] = useState<[number, number]>([2025, 2040]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse URL params on mount
  useEffect(() => {
    if (isInitialized) return;

    // Parse view mode
    const urlView = searchParams.get('view');
    if (urlView === 'race' || urlView === 'sex' || urlView === 'state') {
      setViewMode(urlView);
    }

    // Parse states (comma-separated state codes, convert to names)
    const urlStates = searchParams.get('states');
    if (urlStates) {
      const stateCodes = urlStates.split(',').filter(code => isValidStateCode(code));
      if (stateCodes.length > 0) {
        const stateNames = stateCodes.map(code => getStateName(code));
        setSelectedStateNames(stateNames);
      }
    }

    // Parse races (comma-separated race categories)
    const urlRaces = searchParams.get('races');
    if (urlRaces) {
      const races = urlRaces.split(',').filter(
        (race): race is RaceCategory => race in RACE_CATEGORIES
      );
      if (races.length > 0) {
        setSelectedRaces(races);
      }
    }

    // Parse sex categories (comma-separated)
    const urlSex = searchParams.get('sex');
    if (urlSex) {
      const sexCategories = urlSex.split(',').filter(
        (sex): sex is SexCategory => sex in SEX_CATEGORIES
      );
      if (sexCategories.length > 0) {
        setSelectedSexCategories(sexCategories);
      }
    }

    // Parse normalized (boolean)
    const urlNormalized = searchParams.get('normalized');
    if (urlNormalized === 'true') {
      setNormalized(true);
    }

    // Parse year range (format: "2025-2035")
    const urlYears = searchParams.get('years');
    if (urlYears) {
      const [start, end] = urlYears.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start >= 2025 && end <= 2040 && start <= end) {
        setYearRange([start, end]);
      }
    }

    setIsInitialized(true);
  }, [searchParams, isInitialized]);

  // Auto-truncate states when switching to race/sex view if over limit
  useEffect(() => {
    if (!isInitialized) return;

    if (viewMode === 'race') {
      const maxStates = Math.floor(25 / selectedRaces.length);
      if (selectedStateNames.length > maxStates) {
        // Keep first N states, truncate the rest
        const truncatedStates = selectedStateNames.slice(0, maxStates);
        setSelectedStateNames(truncatedStates);

        // Development-only logging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Truncated states from ${selectedStateNames.length} to ${maxStates} for race view`);
        }
      }
    } else if (viewMode === 'sex') {
      const maxStates = Math.floor(25 / selectedSexCategories.length);
      if (selectedStateNames.length > maxStates) {
        // Keep first N states, truncate the rest
        const truncatedStates = selectedStateNames.slice(0, maxStates);
        setSelectedStateNames(truncatedStates);

        // Development-only logging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Truncated states from ${selectedStateNames.length} to ${maxStates} for sex view`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedRaces.length, selectedSexCategories.length, isInitialized]);

  // Update URL when state changes
  useEffect(() => {
    if (!isInitialized) return; // Don't update URL until we've parsed it once

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
  }, [viewMode, selectedStateNames, selectedRaces, selectedSexCategories, normalized, yearRange, isInitialized, router]);

  // Get state data objects from names
  const selectedStates = getStatesByNames(selectedStateNames);

  return (
    <div className="bg-white rounded-xl p-8 shadow-lg space-y-8">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b-2 border-gray-200">
        <button
          onClick={() => setViewMode('state')}
          className={`px-6 py-3 font-semibold text-sm transition-all relative ${
            viewMode === 'state'
              ? 'text-hopkins-blue'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          By State
          {viewMode === 'state' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setViewMode('race')}
          className={`px-6 py-3 font-semibold text-sm transition-all relative ${
            viewMode === 'race'
              ? 'text-hopkins-blue'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          By Race
          {viewMode === 'race' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setViewMode('sex')}
          className={`px-6 py-3 font-semibold text-sm transition-all relative ${
            viewMode === 'sex'
              ? 'text-hopkins-blue'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          By Sex
          {viewMode === 'sex' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue rounded-t-full" />
          )}
        </button>
      </div>

      {/* By State View */}
      {viewMode === 'state' && (
        <div className="space-y-8">
      {/* Controls Section - 3 columns */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* State Selector - ~40% width */}
        <div className="lg:w-[38%] bg-gray-50 rounded-lg p-3 border border-gray-200">
          <StateSelector
            selectedStates={selectedStateNames}
            onStateChange={setSelectedStateNames}
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
          {/* Display Mode Toggle */}
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 flex flex-col items-center justify-center h-full">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Display Mode
            </label>
            <button
              onClick={() => setNormalized(!normalized)}
              className={`w-full px-3 py-2 rounded-md text-xs font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                normalized
                  ? 'bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-hopkins-blue'
              }`}
              title={normalized ? 'Switch to absolute case counts' : 'Switch to proportional view'}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">{normalized ? '📊' : '📈'}</span>
                <span>{normalized ? 'Proportional %' : 'Case Counts'}</span>
              </div>
            </button>
          </div>

          {/* Export PNG - Takes remaining space */}
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 flex items-center justify-center">
            <button
              onClick={() => {
                // We'll need to expose this from MultiStateChartGrid
                const event = new CustomEvent('exportCharts');
                window.dispatchEvent(event);
              }}
              className="w-full flex flex-col items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md bg-white border border-gray-300 text-gray-700 hover:border-hopkins-blue hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
              title="Export all charts as PNG image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export PNG</span>
            </button>
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
            onStateChange={setSelectedStateNames}
            selectedRaces={selectedRaces}
            onRacesChange={setSelectedRaces}
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
            onStateChange={setSelectedStateNames}
            selectedSexCategories={selectedSexCategories}
            onSexCategoriesChange={setSelectedSexCategories}
            normalized={normalized}
            onNormalizedChange={setNormalized}
            yearRange={yearRange}
            onYearRangeChange={setYearRange}
          />
        </ErrorBoundary>
      )}
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

export default function HIVAgeProjectionsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-20">
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
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-hopkins-blue/5 to-hopkins-spirit-blue/10 rounded-2xl p-8">
              {/* Multi-State Comparison */}
              <MultiStateComparison />
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}