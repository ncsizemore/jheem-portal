'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import Footer from '@/components/Footer';

export default function RyanWhiteLandingPage() {
  const [citationCopied, setCitationCopied] = useState(false);

  const handleCopyCitation = async () => {
    const citation = 'Forster R, Schnure M, Jones J, Lesko C, Batey DS, Butler I, Ward D, Musgrove K, Althoff KN, Jain MK, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT. The Potential Impact of Ending the Ryan White HIV/AIDS Program on HIV Incidence: A Simulation Study in 31 U.S. Cities. Annals of Internal Medicine. 2025. doi:10.7326/ANNALS-25-01737';

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(citation);
        setCitationCopied(true);
        setTimeout(() => setCitationCopied(false), 2000);
      } else {
        // Fallback for browsers/contexts without Clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = citation;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCitationCopied(true);
        setTimeout(() => setCitationCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy citation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-16 mb-8">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-6">
                  Program Impact Analysis
                </p>
                <h1 className="text-5xl lg:text-6xl font-extralight text-gray-900 leading-none mb-8 tracking-tight">
                  Ryan White<br />
                  <span className="font-medium">HIV/AIDS Program</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed font-light max-w-lg">
                  The nation&apos;s largest HIV care program serves as the payer of last resort for over
                  500,000 people annually. Our models reveal how funding changes could affect
                  viral suppression, transmission, and epidemic control across US metropolitan areas.
                </p>
              </motion.div>
            </div>

            <div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-8 h-full flex flex-col justify-center rounded-2xl border-l-4 border-hopkins-blue shadow-md"
              >
                <div className="text-center mb-8">
                  <div className="text-4xl font-light text-hopkins-blue mb-2">500K+</div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">People Served Annually</p>
                </div>
                <div className="space-y-4 text-sm text-gray-700">
                  <p>Serves over half of all people with HIV in the United States</p>
                  <p>Payer of last resort for antiretroviral medications and care</p>
                  <p>With viral suppression, people with HIV live normal lifespans and do not transmit the virus</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Research Publication - Integrated into Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-white border-2 border-hopkins-blue/20 rounded-2xl p-6 lg:p-8 shadow-sm">
              <div>
                <h3 className="text-lg lg:text-xl font-light text-gray-900 mb-3 leading-snug">
                    The Potential Impact of Ending the Ryan White HIV/AIDS Program on HIV Incidence: A Simulation Study in 31 U.S. Cities
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Forster R, Schnure M, Jones J, ... Fojo AT (15 authors). <span className="italic">Annals of Internal Medicine</span>. 2025.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://doi.org/10.7326/ANNALS-25-01737"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-hopkins-blue text-white text-sm font-medium rounded-lg hover:bg-hopkins-spirit-blue transition-colors"
                    >
                      <span>Read Full Paper</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        citationCopied
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={handleCopyCitation}
                    >
                      {citationCopied ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy Citation</span>
                        </>
                      )}
                    </button>
                  </div>
              </div>
            </div>
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
              <p className="text-gray-600 leading-relaxed font-light mb-6">
                The Ryan White HIV/AIDS Program provides three critical types of services to people living with HIV who cannot afford care:
              </p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-hopkins-blue rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">ADAP</p>
                    <p className="text-sm text-gray-600">Antiretroviral medications, insurance premiums, and copay assistance</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-hopkins-blue rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Outpatient Care</p>
                    <p className="text-sm text-gray-600">Direct funding to HIV care facilities for medical services</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-hopkins-blue rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Support Services</p>
                    <p className="text-sm text-gray-600">Case management, transportation, housing assistance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenarios with Research Context */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-light text-gray-900 mb-4">Policy Scenarios</h2>
              <p className="text-gray-600 leading-relaxed font-light mb-4">
                Our models address critical policy questions: What happens if Ryan White funding is cut or interrupted?
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
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-light text-gray-900 mb-4">Study Overview</h2>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="space-y-6">
                  <div className="pb-6 border-b border-gray-300">
                    <div className="flex items-baseline gap-2 mb-2">
                      <div className="text-4xl font-light text-hopkins-blue">31</div>
                      <div className="text-sm text-gray-600 font-medium">Cities Modeled</div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      High-burden US metropolitan areas capturing local epidemic dynamics and service utilization patterns
                    </p>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <div className="text-4xl font-light text-red-700">75,436</div>
                      <div className="text-sm text-gray-700 font-medium">Excess Infections</div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      Projected by 2030 if Ryan White services end permanently
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">+49% increase</span>
                      <span className="text-gray-500">Range: 9% to 110% by city</span>
                    </div>
                  </div>
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
                <div>
                  <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-4">
                    Modeling Tools
                  </p>
                  <h2 className="text-4xl font-extralight text-gray-900 leading-tight mb-6">
                    Explore Ryan White<br />
                    <span className="font-medium">Funding Scenarios</span>
                  </h2>
                  <p className="text-gray-600 leading-relaxed font-light mb-8 max-w-xl">
                    Explore prerun scenario data or design custom parameter combinations.
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
                      <div className="bg-white border-2 border-hopkins-blue/30 rounded-2xl p-8 hover:border-hopkins-blue hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-start gap-6">
                          <div className="bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 7V10m0 0L9 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-2xl font-light text-gray-900 group-hover:text-hopkins-blue transition-colors duration-300">Interactive Map Explorer</h3>
                              <span className="bg-hopkins-gold text-hopkins-blue text-xs font-bold px-2.5 py-1 rounded-full">NEW</span>
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-4 font-light">
                              Modern map-based interface for exploring prerun scenario results. Click any city on the map to see how cessation, brief interruption, and prolonged interruption scenarios affect HIV incidence. Currently available for 4 cities, with full coverage coming soon.
                            </p>
                            <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-hopkins-spirit-blue transition-all duration-300">
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
                      <div className="bg-white border-2 border-green-500/30 rounded-2xl p-8 hover:border-green-500 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-start gap-6">
                          <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-2xl font-light text-gray-900 group-hover:text-green-700 transition-colors duration-300">
                                Prerun Scenarios
                              </h3>
                              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">COMPLETE DATASET</span>
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-4 font-light">
                              Full-featured Shiny application with complete data for all 31 cities. Explore the three policy scenarios (18-month, 42-month interruption, and permanent cessation) across all demographics, outcomes, and time periods using traditional menu-based controls.
                            </p>
                            <div className="flex items-center text-green-600 text-sm font-medium group-hover:text-green-700 transition-all duration-300">
                              <span>View All Results</span>
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
                      <div className="bg-white border-2 border-purple-500/30 rounded-2xl p-8 hover:border-purple-500 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-start gap-6">
                          <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl p-4 group-hover:shadow-lg transition-shadow duration-300">
                            <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-light text-gray-900 group-hover:text-purple-700 transition-colors duration-300 mb-3">
                              Custom Simulations
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