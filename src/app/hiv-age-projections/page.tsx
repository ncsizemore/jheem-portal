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
      {/* Controls Section */}
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            Multi-State Comparison
          </h3>
          <p className="text-sm text-gray-500">
            Select states and adjust display settings to compare age distribution patterns
          </p>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* State Selector */}
          <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <StateSelector
              selectedStates={selectedStateNames}
              onStateChange={setSelectedStateNames}
              maxStates={9}
            />
          </div>

          {/* Timeline Controls */}
          <div className="lg:w-[400px] bg-gray-50 rounded-lg p-4 border border-gray-200">
            <TimelineControls
              yearRange={yearRange}
              onYearRangeChange={setYearRange}
              minYear={2025}
              maxYear={2040}
            />
          </div>
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
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="font-medium">Time Period:</span> {yearRange[0]}-{yearRange[1]}
            </div>
            <div>
              <span className="font-medium">Age Cohorts:</span> 5 groups (13-24, 25-34, 35-44, 45-54, 55+)
            </div>
            <div>
              <span className="font-medium">View:</span> {normalized ? 'Normalized' : 'Absolute'}
            </div>
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
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-4">
                  JHEEM Modeling Analysis
                </p>
                <h1 className="text-4xl lg:text-5xl font-light text-gray-900 leading-tight mb-6">
                  Projected Aging Among<br />
                  <span className="font-semibold">People with HIV</span>
                </h1>
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
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-gradient-to-br from-hopkins-blue/5 to-hopkins-spirit-blue/10 p-6 rounded-xl space-y-6"
              >
                <div className="border-b border-hopkins-blue/20 pb-4">
                  <div className="text-3xl font-light text-hopkins-blue mb-1">24 States</div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">86% of Diagnosed Cases</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-hopkins-blue mt-1.5 flex-shrink-0" />
                    <p className="text-gray-700">Median age rising 11 years (51→62) by 2040</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-hopkins-blue mt-1.5 flex-shrink-0" />
                    <p className="text-gray-700">Over 50% aged 65+ by 2040</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-hopkins-blue mt-1.5 flex-shrink-0" />
                    <p className="text-gray-700">Substantial variation across states</p>
                  </div>
                </div>
              </motion.div>
            </div>
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
              <h2 className="text-2xl font-light text-gray-900 mb-6 text-center">
                Interactive State-Level Analysis
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