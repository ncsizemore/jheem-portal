'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';
import AgeDistributionChart from '@/components/AgeDistributionChart';
import {
  HIV_AGE_PROJECTIONS,
  getStateByName,
  transformDataForChart
} from '@/data/hiv-age-projections';

// Test component to demonstrate the chart
function ChartTestComponent() {
  const [normalized, setNormalized] = useState(false);
  const [selectedState, setSelectedState] = useState('California');

  const stateData = getStateByName(selectedState);
  const chartData = stateData ? transformDataForChart([stateData], [2025, 2040], normalized) : [];
  const statePrefix = selectedState.replace(/\s+/g, '_');

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select State:
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hopkins-blue focus:border-transparent"
          >
            {HIV_AGE_PROJECTIONS.slice(0, 10).map(state => (
              <option key={state.state_code} value={state.state_name}>
                {state.state_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Mode:
          </label>
          <button
            onClick={() => setNormalized(!normalized)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              normalized
                ? 'bg-hopkins-blue text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {normalized ? 'Proportional (%)' : 'Absolute Numbers'}
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <AgeDistributionChart
          data={chartData}
          statePrefix={statePrefix}
          stateName={selectedState}
          normalized={normalized}
          height={500}
        />
      )}
    </div>
  );
}

export default function HIVAgeProjectionsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-5 gap-16">
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-6">
                  Demographic Analysis
                </p>
                <h1 className="text-5xl lg:text-6xl font-extralight text-gray-900 leading-none mb-8 tracking-tight">
                  HIV Age<br />
                  <span className="font-medium">Projections</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed mb-8 font-light max-w-lg">
                  Interactive exploration of projected HIV age distributions across US states
                  from 2025 to 2040, revealing demographic shifts in the HIV epidemic.
                </p>
              </motion.div>
            </div>

            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-8 h-full flex flex-col justify-center rounded-2xl"
              >
                <div className="text-center mb-8">
                  <div className="text-4xl font-light text-hopkins-blue mb-2">2025-2040</div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">Projection Period</p>
                </div>
                <div className="space-y-4 text-sm text-gray-700">
                  <p>Age cohort projections across US states</p>
                  <p>Interactive temporal analysis and comparison</p>
                  <p>Demographic transition visualization</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Main App Area - Chart Test */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-hopkins-blue/5 to-hopkins-spirit-blue/10 rounded-2xl p-8">
              <h2 className="text-3xl font-light text-gray-900 mb-8 text-center">
                Interactive Visualization Demo
              </h2>

              {/* Test Chart */}
              <ChartTestComponent />

              {/* Feature Preview */}
              <div className="grid md:grid-cols-3 gap-6 text-center mt-12">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-medium text-gray-900 mb-2">Multi-State Comparison</h3>
                  <p className="text-sm text-gray-600">Side-by-side state analysis</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-2xl mb-2">⚖️</div>
                  <h3 className="font-medium text-gray-900 mb-2">Normalization Toggle</h3>
                  <p className="text-sm text-gray-600">Absolute vs. proportional views</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-2xl mb-2">📈</div>
                  <h3 className="font-medium text-gray-900 mb-2">Timeline Controls</h3>
                  <p className="text-sm text-gray-600">Year range selection</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}