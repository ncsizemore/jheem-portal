'use client';

import Link from "next/link";
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';
import RecentPublications from '@/components/RecentPublications';
import PolicyNetworkIcon from '@/components/PolicyNetworkIcon';
import TimeProjectionIcon from '@/components/TimeProjectionIcon';
import GeographicScaleIcon from '@/components/GeographicScaleIcon';

interface Publication {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi?: string;
  url?: string;
  keyFindings?: string;
}

interface HomePageWrapperProps {
  publications: Publication[];
}

export default function HomePageWrapper({ publications }: HomePageWrapperProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Icon-Forward 50/50 Design */}
      <section className="bg-gradient-to-br from-blue-100 via-blue-50 to-slate-100 border-b border-gray-300 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="16" cy="16" r="1" fill="#002D72" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20 relative">
          <div className="grid lg:grid-cols-5 gap-16 lg:gap-20 items-center">
            {/* Left: Hero Content (40%) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-2 flex flex-col justify-center"
            >
              <p className="text-hopkins-blue text-sm font-medium tracking-wide uppercase mb-8">
                Johns Hopkins Epidemiological and Economic Model
              </p>
              <h1 className="text-5xl lg:text-7xl font-extralight text-gray-900 leading-tight mb-10 tracking-tight">
                Evidence for<br />
                <span className="font-medium">HIV Policy</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed font-light max-w-xl">
                JHEEM answers critical policy questions about HIV programs, interventions, and
                funding through calibrated mathematical modeling across US cities and states.
              </p>
            </motion.div>

            {/* Right: Structured Icon Capabilities (60%) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-3 relative"
            >
              {/* Population Scale */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex items-center gap-8 mb-8 pb-8 border-b border-gray-300"
              >
                <div className="w-32 h-32 lg:w-36 lg:h-36 flex-shrink-0">
                  <GeographicScaleIcon />
                </div>
                <div className="flex-1 max-w-sm">
                  <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-3">Demographic Precision at Scale</h3>
                  <p className="text-base lg:text-lg text-gray-600 leading-relaxed">
                    Detailed disease progression modeled across 32 major metros and 31 states
                  </p>
                </div>
              </motion.div>

              {/* Policy Scenarios */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex items-center gap-8 mb-8 pb-8 border-b border-gray-300"
              >
                <div className="w-32 h-32 lg:w-36 lg:h-36 flex-shrink-0">
                  <PolicyNetworkIcon />
                </div>
                <div className="flex-1 max-w-sm">
                  <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-3">Policy Scenarios</h3>
                  <p className="text-base lg:text-lg text-gray-600 leading-relaxed">
                    What-if modeling of funding cuts, intervention scale-up, service disruptions
                  </p>
                </div>
              </motion.div>

              {/* Time Horizons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex items-center gap-8"
              >
                <div className="w-32 h-32 lg:w-36 lg:h-36 flex-shrink-0">
                  <TimeProjectionIcon />
                </div>
                <div className="flex-1 max-w-sm">
                  <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-3">Time Horizons</h3>
                  <p className="text-base lg:text-lg text-gray-600 leading-relaxed">
                    Immediate impacts to long-term demographic shifts (2025-2040)
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Model Applications */}
      <section id="applications" className="py-24 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Section Header */}
            <div className="text-center mb-16">
              <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-4">
                Interactive Tools
              </p>
              <h2 className="text-4xl lg:text-5xl font-extralight text-gray-900 mb-6">
                Explore Our <span className="font-medium">Models</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
                Access specialized modeling applications for HIV policy analysis across metropolitan areas and states
              </p>
            </div>

            {/* Application Cards - 2x2 Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {/* Ryan White Model */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Link href="/ryan-white" className="group block">
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:bg-white hover:border-hopkins-blue/30 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                    <div className="flex items-start gap-6">
                      <div className="bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-2xl font-light text-gray-900 group-hover:text-hopkins-blue transition-colors duration-300">
                            Ryan White HIV/AIDS Program
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-hopkins-blue/10 text-hopkins-blue border border-hopkins-blue/20">
                            Interactive
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed mb-4 font-light">
                          Analyze funding scenarios and their impact on HIV care continuum outcomes across US metropolitan areas. Model the effects of brief interruptions, prolonged gaps, and complete program cessation.
                        </p>
                        <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-hopkins-spirit-blue transition-all duration-300">
                          <span>Explore Models</span>
                          <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* State Level Model */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <Link href="/ryan-white-state-level" className="group block">
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:bg-white hover:border-hopkins-spirit-blue/30 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                    <div className="flex items-start gap-6">
                      <div className="bg-gradient-to-br from-hopkins-spirit-blue to-hopkins-blue rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 7V10m0 0L9 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-2xl font-light text-gray-900 group-hover:text-hopkins-spirit-blue transition-colors duration-300">
                            State Level Analysis
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Shiny App
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed mb-4 font-light">
                          Analyze Ryan White HIV/AIDS Program funding scenarios at the state level, providing comprehensive jurisdictional insights for policy makers and program administrators.
                        </p>
                        <div className="flex items-center text-hopkins-spirit-blue text-sm font-medium group-hover:text-hopkins-blue transition-all duration-300">
                          <span>Launch Application</span>
                          <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* CDC Testing Model */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <Link href="/cdc-testing" className="group block">
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:bg-white hover:border-hopkins-gold/50 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                    <div className="flex items-start gap-6">
                      <div className="bg-gradient-to-br from-hopkins-gold to-amber-400 rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                        <svg className="w-7 h-7 text-hopkins-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-2xl font-light text-gray-900 group-hover:text-hopkins-blue transition-colors duration-300">
                            CDC Testing Strategies
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Shiny App
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed mb-4 font-light">
                          Evaluate the epidemiological impact of cuts to CDC-funded HIV testing programs, modeling cessation, brief interruption, and prolonged interruption scenarios.
                        </p>
                        <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-amber-600 transition-all duration-300">
                          <span>Launch Application</span>
                          <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* HIV Age Projections */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <Link href="/aging" className="group block">
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:bg-white hover:border-emerald-500/30 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                    <div className="flex items-start gap-6">
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-2xl font-light text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">
                            HIV Age Projections
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Interactive
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed mb-4 font-light">
                          Explore state-level projections of HIV age distributions from 2025-2040. Compare multiple states across demographic groups and visualize the aging HIV population.
                        </p>
                        <div className="flex items-center text-emerald-600 text-sm font-medium group-hover:text-teal-600 transition-all duration-300">
                          <span>Explore Projections</span>
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
          </motion.div>
        </div>
      </section>

      {/* Recent Publications - Dynamic from Group Website API */}
      <div id="publications">
        <RecentPublications publications={publications} />
      </div>

      <Footer />
    </div>
  );
}
