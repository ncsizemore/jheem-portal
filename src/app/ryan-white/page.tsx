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
                <p className="text-xl text-gray-600 leading-relaxed font-light max-w-lg">
                  The nation&apos;s largest HIV care program serves as the payer of last resort for over
                  500,000 people annually. Mathematical models reveal how funding changes could affect
                  viral suppression, transmission, and epidemic control across US metropolitan areas.
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
                  <p>Serves over half of all people with HIV in the United States</p>
                  <p>Payer of last resort for antiretroviral medications and care</p>
                  <p>Critical for maintaining viral suppression and preventing transmission</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Publication */}
      <section className="py-12 bg-gradient-to-br from-hopkins-blue/5 to-slate-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-xl font-light text-gray-900 mb-2">
              The Potential Impact of Ending the Ryan White HIV/AIDS Program on HIV Incidence: A Simulation Study in 31 U.S. Cities
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Forster R, Schnure M, Jones J, Lesko C, Batey DS, Butler I, Ward D, Musgrove K, Althoff KN, Jain MK, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT. <span className="italic">Annals of Internal Medicine</span>. 2025. doi:10.7326/ANNALS-25-01737
            </p>
            <a
              href="https://doi.org/10.7326/ANNALS-25-01737"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-hopkins-blue hover:text-hopkins-spirit-blue transition-colors"
            >
              <span>Read Full Paper</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Why Ryan White Matters */}
      <section className="py-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid lg:grid-cols-3 gap-12"
          >
            {/* Program Explanation */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-light text-gray-900 mb-4">
                Why Ryan White Matters
              </h2>
              <p className="text-gray-600 leading-relaxed font-light mb-4">
                The Ryan White HIV/AIDS Program provides three critical types of services to people living with HIV who cannot afford care:
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-blue rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700"><span className="font-medium">ADAP</span> - Antiretroviral medications, insurance premiums, and copay assistance</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-blue rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700"><span className="font-medium">Outpatient care</span> - Direct funding to HIV care facilities for medical services</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-blue rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700"><span className="font-medium">Support services</span> - Case management, transportation, housing assistance</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed font-light mt-4">
                With viral suppression, people with HIV live normal lifespans and do not transmit the virus.
              </p>
            </div>

            {/* Scenarios with Research Context */}
            <div className="lg:col-span-1">
              <h3 className="text-2xl font-light text-gray-900 mb-4">Policy Scenarios</h3>
              <p className="text-gray-600 leading-relaxed font-light mb-4">
                These models address critical policy questions: What happens if Ryan White funding is cut or interrupted?
              </p>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">Brief Interruption</span>
                    <span className="text-xs text-gray-500">(18 months)</span>
                  </div>
                  <p className="text-sm text-gray-600">Services resume after temporary funding gap. Research projects 19% more infections through 2030.</p>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">Prolonged Interruption</span>
                    <span className="text-xs text-gray-500">(42 months)</span>
                  </div>
                  <p className="text-sm text-gray-600">Extended funding gap before restoration. Leads to 38% more infections as people lose access to care.</p>
                </div>
                <div className="border-l-4 border-red-700 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">Complete Cessation</span>
                    <span className="text-xs text-gray-500">(permanent)</span>
                  </div>
                  <p className="text-sm text-gray-600">Program shutdown with no recovery. Could cause 75,000+ excess infections—a 49% increase.</p>
                </div>
              </div>
            </div>

            {/* Research Findings */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gradient-to-br from-hopkins-blue/5 to-hopkins-spirit-blue/10 rounded-2xl p-6">
                <div className="text-center">
                  <div className="text-3xl font-light text-hopkins-blue mb-2">31</div>
                  <p className="text-sm text-gray-600 mb-3 font-medium">High-Burden US Cities</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    City-level modeling captures local HIV epidemic dynamics and Ryan White service utilization
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
                <div className="text-center">
                  <div className="text-2xl font-light text-red-700 mb-2">75,436</div>
                  <p className="text-sm text-gray-700 mb-3 font-medium">Projected Excess Infections</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    If Ryan White services end permanently (2025-2030). Impacts vary by city from 9% to 110% increases.
                  </p>
                </div>
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
                  <h2 className="text-4xl font-extralight text-gray-900 leading-tight mb-6">
                    Explore Ryan White<br />
                    <span className="font-medium">Funding Scenarios</span>
                  </h2>
                  <p className="text-gray-600 leading-relaxed font-light mb-8 max-w-xl">
                    Choose your preferred interface to explore pre-calculated scenario results or design custom simulations.
                  </p>
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
                              Modern map-based interface for exploring prerun scenario results. Click any city on the map to see how cessation, brief interruption, and prolonged interruption scenarios affect HIV incidence. Currently available for 4 cities, with full coverage coming soon.
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
                              Prerun Scenarios (Traditional Interface)
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4 font-light">
                              Full-featured Shiny application with complete data for all 31 cities. Explore the three policy scenarios (18-month, 42-month interruption, and permanent cessation) across all demographics, outcomes, and time periods using traditional menu-based controls.
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
                              Design custom funding scenarios beyond the standard interruption periods. Adjust ADAP coverage, outpatient health services, and support service parameters to model specific policy questions and intervention combinations tailored to your research needs.
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