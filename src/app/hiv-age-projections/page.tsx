'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';
import StateSelector from '@/components/StateSelector';
import MultiStateChartGrid from '@/components/MultiStateChartGrid';
import TimelineControls from '@/components/TimelineControls';
import { getStatesByNames } from '@/data/hiv-age-projections';

// Multi-state comparison component
function MultiStateComparison() {
  const [selectedStateNames, setSelectedStateNames] = useState<string[]>(['California', 'Texas']);
  const [normalized, setNormalized] = useState(false);
  const [yearRange, setYearRange] = useState<[number, number]>([2025, 2040]);

  // Get state data objects from names
  const selectedStates = getStatesByNames(selectedStateNames);

  return (
    <div className="bg-white rounded-xl p-8 shadow-lg space-y-8">
      {/* Controls Section - Equal width columns */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* State Selector - 50% width on desktop */}
        <div className="lg:flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <StateSelector
            selectedStates={selectedStateNames}
            onStateChange={setSelectedStateNames}
            maxStates={25}
          />
        </div>

        {/* Timeline Controls - 50% width on desktop */}
        <div className="lg:flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <TimelineControls
            yearRange={yearRange}
            onYearRangeChange={setYearRange}
            minYear={2025}
            maxYear={2040}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Chart Grid */}
      <MultiStateChartGrid
        states={selectedStates}
        normalized={normalized}
        yearRange={yearRange}
        onNormalizedChange={setNormalized}
      />

      {/* Quick Stats */}
      {selectedStates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group bg-gradient-to-br from-hopkins-blue/5 via-white to-gray-50 rounded-xl p-5 border border-gray-200/60 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <div className="text-xs font-bold text-hopkins-blue uppercase tracking-wider mb-2">Time Period</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{yearRange[0]}–{yearRange[1]}</div>
            <div className="text-xs text-gray-600 font-medium">{yearRange[1] - yearRange[0] + 1} years of projection</div>
          </div>
          <div className="group bg-gradient-to-br from-hopkins-spirit-blue/5 via-white to-gray-50 rounded-xl p-5 border border-gray-200/60 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <div className="text-xs font-bold text-hopkins-spirit-blue uppercase tracking-wider mb-2">Age Cohorts</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">5 Groups</div>
            <div className="text-xs text-gray-600 font-medium">13-24, 25-34, 35-44, 45-54, 55+</div>
          </div>
          <div className="group bg-gradient-to-br from-hopkins-gold/10 via-white to-gray-50 rounded-xl p-5 border border-gray-200/60 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <div className="text-xs font-bold text-hopkins-blue uppercase tracking-wider mb-2">Display Mode</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{normalized ? 'Proportional (%)' : 'Cases'}</div>
            <div className="text-xs text-gray-600 font-medium">{normalized ? 'Within-state distribution' : 'Absolute case counts'}</div>
          </div>
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
              <h2 className="text-2xl font-light text-gray-900 mb-8 text-center">
                Compare age distribution patterns across states over time
              </h2>

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