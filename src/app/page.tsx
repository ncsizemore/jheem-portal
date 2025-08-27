'use client';

import Link from "next/link";
import { motion } from 'framer-motion';

export default function Home() {
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
                <p className="text-hopkins-blue text-sm font-medium tracking-widest uppercase mb-6">
                  Mathematical Epidemiology
                </p>
                <h1 className="text-5xl lg:text-6xl font-extralight text-gray-900 leading-none mb-8 tracking-tight">
                  Ending the HIV<br />
                  <span className="font-medium">Epidemic</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed mb-8 font-light max-w-lg">
                  The Johns Hopkins Epidemiologic and Economic Model provides quantitative insights 
                  for HIV intervention strategies across US metropolitan areas.
                </p>
              </motion.div>
            </div>
            
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-gray-50 p-8 h-full flex flex-col justify-center"
              >
                <div className="text-center mb-8">
                  <div className="text-4xl font-light text-hopkins-blue mb-2">32</div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">US Metropolitan Areas</p>
                </div>
                <div className="space-y-4 text-sm text-gray-700">
                  <p>Calibrated to real-world HIV surveillance data</p>
                  <p>Models intervention impacts on transmission dynamics</p>
                  <p>Informs policy decisions for epidemic control</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Focus */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid lg:grid-cols-12 gap-12"
          >
            <div className="lg:col-span-4">
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                Modeling HIV<br />Transmission
              </h2>
              <p className="text-gray-600 leading-relaxed">
                JHEEM employs mathematical modeling to understand and predict HIV transmission 
                patterns, enabling evidence-based intervention planning.
              </p>
            </div>
            
            <div className="lg:col-span-8">
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Population Modeling</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>Dynamic compartmental structure</li>
                      <li>Demographic stratification by age, race, sex</li>
                      <li>Behavioral risk factor integration</li>
                      <li>Geographic calibration to metro areas</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Intervention Analysis</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>HIV testing optimization</li>
                      <li>PrEP coverage strategies</li>
                      <li>Treatment scale-up scenarios</li>
                      <li>Harm reduction programs</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Data Integration</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>CDC HIV surveillance data</li>
                      <li>Behavioral survey integration</li>
                      <li>Clinical outcomes tracking</li>
                      <li>Real-world calibration</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Policy Applications</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>Resource allocation guidance</li>
                      <li>Program impact assessment</li>
                      <li>Cost-effectiveness analysis</li>
                      <li>Strategic planning support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Model Applications - Sophisticated Academic Layout */}
      <section className="py-32 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="grid lg:grid-cols-12 gap-16 items-start">
              <div className="lg:col-span-4">
                <div className="sticky top-32">
                  <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-4">
                    Research Applications
                  </p>
                  <h2 className="text-4xl font-extralight text-gray-900 leading-tight mb-8">
                    Translating <span className="font-medium">Mathematical Models</span><br />
                    into Policy Impact
                  </h2>
                  <div className="w-20 h-px bg-gradient-to-r from-hopkins-blue to-hopkins-gold mb-6"></div>
                  <p className="text-lg text-gray-600 leading-relaxed font-light">
                    JHEEM provides three specialized interfaces for exploring HIV intervention strategies across different scales and contexts.
                  </p>
                </div>
              </div>
              
              <div className="lg:col-span-8">
                <div className="space-y-8">
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
                            <h3 className="text-2xl font-light text-gray-900 mb-3 group-hover:text-hopkins-blue transition-colors duration-300">
                              Ryan White HIV/AIDS Program
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4 font-light">
                              Analyze funding scenarios and their impact on HIV care continuum outcomes across US metropolitan areas. Model the effects of brief interruptions, prolonged gaps, and complete program cessation.
                            </p>
                            <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-hopkins-spirit-blue transition-all duration-300">
                              <span>Explore Funding Impact</span>
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
                            <h3 className="text-2xl font-light text-gray-900 mb-3 group-hover:text-hopkins-spirit-blue transition-colors duration-300">
                              State Level Analysis
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4 font-light">
                              Analyze Ryan White HIV/AIDS Program funding scenarios at the state level, providing comprehensive jurisdictional insights for policy makers and program administrators.
                            </p>
                            <div className="flex items-center text-hopkins-spirit-blue text-sm font-medium group-hover:text-hopkins-blue transition-all duration-300">
                              <span>Access State Model</span>
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
                            <h3 className="text-2xl font-light text-gray-900 mb-3 group-hover:text-hopkins-blue transition-colors duration-300">
                              CDC Testing Strategies
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4 font-light">
                              Evaluate the epidemiological impact of cuts to CDC-funded HIV testing programs, modeling cessation, brief interruption, and prolonged interruption scenarios.
                            </p>
                            <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-amber-600 transition-all duration-300">
                              <span>Explore Testing Model</span>
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

      {/* Publications - Editorial Academic Style */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="grid lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <div className="sticky top-32">
                  <div className="w-8 h-px bg-hopkins-blue mb-6"></div>
                  <h2 className="text-3xl font-extralight text-gray-900 mb-6">
                    Selected<br />
                    <span className="font-medium">Publications</span>
                  </h2>
                  <p className="text-sm text-gray-500 uppercase tracking-widest font-medium">
                    Key Research Findings
                  </p>
                </div>
              </div>
              
              <div className="lg:col-span-9">
                <div className="space-y-12">
                  <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="group"
                  >
                    <div className="bg-slate-50/50 rounded-2xl p-8 group-hover:bg-slate-50 transition-colors duration-300">
                      <h3 className="text-xl font-light text-gray-900 leading-relaxed mb-4">
                        Perry A, Kasaie P, Dowdy DW, Shah M. <span className="font-medium">What Will It Take to Reduce HIV Incidence in the United States</span>: A Mathematical Modeling Analysis.
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-hopkins-blue font-medium italic">Open Forum Infect Dis</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span className="text-gray-600">2018;5(2):ofy008</span>
                      </div>
                    </div>
                  </motion.article>

                  <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="group"
                  >
                    <div className="bg-blue-50/30 rounded-2xl p-8 group-hover:bg-blue-50/50 transition-colors duration-300">
                      <h3 className="text-xl font-light text-gray-900 leading-relaxed mb-4">
                        Shah M, Perry A, Risher K, et al. <span className="font-medium">Effect of the US National HIV/AIDS Strategy targets for improved HIV care engagement</span>: a modelling study.
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-hopkins-blue font-medium italic">Lancet HIV</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span className="text-gray-600">2016;3(3):e140-146</span>
                      </div>
                    </div>
                  </motion.article>

                  <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
                    className="group"
                  >
                    <div className="bg-slate-50/50 rounded-2xl p-8 group-hover:bg-slate-50 transition-colors duration-300">
                      <h3 className="text-xl font-light text-gray-900 leading-relaxed mb-4">
                        Shah M, Risher K, Berry SA, Dowdy DW. <span className="font-medium">The Epidemiologic and Economic Impact of Improving HIV Testing, Linkage, and Retention in Care</span> in the United States.
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-hopkins-blue font-medium italic">Clin Infect Dis</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span className="text-gray-600">2016;62(2):220-229</span>
                      </div>
                    </div>
                  </motion.article>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Funding Information - Sophisticated Footer */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-hopkins-blue to-hopkins-spirit-blue">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="w-12 h-px bg-gradient-to-r from-hopkins-gold to-transparent mb-8"></div>
                <h2 className="text-3xl font-extralight text-white mb-8 leading-tight">
                  Research <span className="font-medium">Funding</span><br />
                  <span className="text-hopkins-gold text-xl font-light">& Institutional Support</span>
                </h2>
                
                <p className="text-blue-100 leading-relaxed mb-8 font-light text-lg">
                  This research is supported by grants from the National Institute of Mental Health 
                  and the National Institute of Allergy and Infectious Diseases.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-hopkins-gold rounded-full"></div>
                    <span className="text-white font-mono text-sm">K08MH118094</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-hopkins-gold rounded-full"></div>
                    <span className="text-white font-mono text-sm">K01AI138853</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-hopkins-gold rounded-full"></div>
                    <span className="text-white font-mono text-sm">P30-AI094189</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-hopkins-gold to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-hopkins-blue font-bold text-xl">JH</span>
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    Johns Hopkins Bloomberg School of Public Health
                  </h3>
                  <p className="text-hopkins-gold text-sm font-medium tracking-wider uppercase mb-4">
                    Computational Epidemiology Research Group
                  </p>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                  <p className="text-blue-100 text-sm mt-4 font-light">
                    Advancing mathematical modeling for HIV prevention and control
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
