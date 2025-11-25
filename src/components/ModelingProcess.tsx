'use client';

import { motion } from 'framer-motion';

export default function ModelingProcess() {
  return (
    <section className="py-20 bg-gradient-to-br from-white via-slate-50/30 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-4">
              Our Approach
            </p>
            <h2 className="text-4xl font-extralight text-gray-900 mb-4">
              From Data to <span className="font-medium">Policy Insights</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-light">
              JHEEM transforms real-world surveillance data into actionable evidence
              for HIV intervention strategies
            </p>
          </div>

          {/* Process Flow */}
          <div className="grid lg:grid-cols-7 gap-8 items-center">

            {/* Step 1: Real-World Data */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-hopkins-blue/30 hover:shadow-xl transition-all duration-300">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Real-World Data
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-hopkins-blue rounded-full"></span>
                      CDC HIV surveillance
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-hopkins-blue rounded-full"></span>
                      31 US metropolitan areas
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-hopkins-blue rounded-full"></span>
                      HIV diagnoses & treatment
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-hopkins-blue rounded-full"></span>
                      Behavioral risk factors
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Arrow 1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              className="lg:col-span-1 flex justify-center"
            >
              <svg className="w-8 h-8 text-hopkins-blue/40 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <svg className="w-8 h-8 text-hopkins-blue/40 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </motion.div>

            {/* Step 2: JHEEM Model */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="lg:col-span-2"
            >
              <div className="bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                {/* Icon */}
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-3">
                    JHEEM Model
                  </h3>
                  <ul className="space-y-2 text-sm text-white/90">
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white/80 rounded-full"></span>
                      Calibrated to local data
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white/80 rounded-full"></span>
                      32 metro area models
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white/80 rounded-full"></span>
                      R simulation engine
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white/80 rounded-full"></span>
                      Thousands of scenarios
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Arrow 2 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.9 }}
              className="lg:col-span-1 flex justify-center"
            >
              <svg className="w-8 h-8 text-hopkins-blue/40 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <svg className="w-8 h-8 text-hopkins-blue/40 lg:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </motion.div>

            {/* Step 3: Policy Insights */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-hopkins-gold/50 hover:shadow-xl transition-all duration-300">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-hopkins-gold to-amber-400 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-hopkins-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Policy Insights
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-hopkins-gold rounded-full"></span>
                      What if PrEP scales up?
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-hopkins-gold rounded-full"></span>
                      What if funding is cut?
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-hopkins-gold rounded-full"></span>
                      What if testing increases?
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-hopkins-gold rounded-full"></span>
                      Evidence for decision-makers
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="text-center mt-12"
          >
            <p className="text-gray-600 text-sm mb-4">
              Explore these scenarios using our interactive modeling tools below
            </p>
            <svg className="w-6 h-6 text-hopkins-blue/40 mx-auto animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
