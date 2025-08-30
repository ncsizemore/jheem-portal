'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function RyanWhiteLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-32">
          <div className="grid lg:grid-cols-5 gap-16">
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-6">
                  Federal Program Analysis
                </p>
                <h1 className="text-5xl lg:text-6xl font-extralight text-gray-900 leading-none mb-8 tracking-tight">
                  Ryan White<br />
                  <span className="font-medium">HIV/AIDS Program</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed mb-8 font-light max-w-lg">
                  Analyze how funding changes affect HIV care, treatment outcomes, and transmission 
                  dynamics across US metropolitan areas using mathematical modeling.
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
                  <div className="text-4xl font-light text-hopkins-blue mb-2">500K+</div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">People Served Annually</p>
                </div>
                <div className="space-y-4 text-sm text-gray-700">
                  <p>Provides HIV-related services and ADAP medications</p>
                  <p>Critical safety net for low-income populations</p>
                  <p>Models funding interruption scenarios and impacts</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Condensed Overview */}
      <section className="py-16 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid lg:grid-cols-3 gap-12 items-center"
          >
            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-4">
                Program Overview
              </h2>
              <p className="text-gray-600 leading-relaxed font-light">
                The nation's HIV care safety net, serving over 500,000 people annually with essential services and ADAP medications.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Modeling Scenarios</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Brief Interruption (6 months)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Prolonged Interruption (18 months)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-700 rounded-full"></div>
                  <span className="text-sm text-gray-700">Complete Program Cessation</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-hopkins-blue/5 to-hopkins-spirit-blue/10 rounded-2xl p-6">
              <div className="text-center">
                <div className="text-2xl font-light text-hopkins-blue mb-2">32</div>
                <p className="text-sm text-gray-600 mb-3">US Metropolitan Areas</p>
                <p className="text-xs text-gray-500">Mathematical modeling of funding impacts on HIV care continuum and transmission dynamics</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Analysis Interfaces */}
      <section className="py-20 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="grid lg:grid-cols-12 gap-16 items-start">
              <div className="lg:col-span-4">
                <div className="sticky top-32">
                  <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-4">
                    Analysis Interfaces
                  </p>
                  <h2 className="text-4xl font-extralight text-gray-900 leading-tight mb-8">
                    Explore Ryan White<br />
                    <span className="font-medium">Funding Scenarios</span>
                  </h2>
                  <div className="w-20 h-px bg-gradient-to-r from-hopkins-blue to-hopkins-gold mb-6"></div>
                </div>
              </div>
              
              <div className="lg:col-span-8">
                <div className="space-y-8">
                  {/* Interactive Explorer */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <Link href="/explore" className="group block">
                      <div className="bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue text-white rounded-2xl p-8 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-start gap-6">
                          <div className="bg-white/20 rounded-xl p-4 group-hover:bg-white/30 transition-colors duration-300">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 7V10m0 0L9 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-2xl font-light">Interactive Map Explorer</h3>
                              <span className="bg-hopkins-gold text-hopkins-blue text-xs font-bold px-2 py-1 rounded-full">NEW</span>
                            </div>
                            <p className="text-blue-100 leading-relaxed mb-4 font-light">
                              Explore Ryan White funding scenarios across US cities with interactive maps. 
                              Visualize impacts by city and demographic group with real-time adjustments.
                            </p>
                            <div className="flex items-center text-blue-200 text-sm font-medium group-hover:text-white transition-all duration-300">
                              <span>Explore by City</span>
                              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>

                  {/* Prerun Scenarios */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                  >
                    <Link href="/prerun" className="group block">
                      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:bg-white hover:border-green-200/50 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-start gap-6">
                          <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-light text-gray-900 mb-3 group-hover:text-green-700 transition-colors duration-300">
                              Prerun Funding Scenarios
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4 font-light">
                              Access pre-calculated results for standard Ryan White funding scenarios including 
                              brief interruptions, prolonged interruptions, and complete program cessation.
                            </p>
                            <div className="flex items-center text-green-600 text-sm font-medium group-hover:text-green-700 transition-all duration-300">
                              <span>View Results</span>
                              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>

                  {/* Custom Simulations */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
                  >
                    <Link href="/custom" className="group block">
                      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:bg-white hover:border-purple-200/50 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-start gap-6">
                          <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                            <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-light text-gray-900 mb-3 group-hover:text-purple-700 transition-colors duration-300">
                              Custom Ryan White Analysis
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4 font-light">
                              Design custom funding scenarios and intervention combinations to explore 
                              specific research questions about Ryan White program impacts.
                            </p>
                            <div className="flex items-center text-purple-600 text-sm font-medium group-hover:text-purple-700 transition-all duration-300">
                              <span>Design Scenario</span>
                              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
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