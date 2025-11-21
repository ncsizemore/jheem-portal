'use client';

import { motion } from 'framer-motion';

export default function JheemCapabilities() {
  return (
    <section className="py-24 bg-gradient-to-b from-white via-slate-50/40 to-white relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="1" fill="#002D72" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mb-16"
        >
          <p className="text-hopkins-blue text-sm font-semibold tracking-widest uppercase mb-4">
            Model Capabilities
          </p>
          <h2 className="text-4xl lg:text-5xl font-extralight text-gray-900 mb-6">
            Modeling HIV Across <span className="font-medium">Multiple Dimensions</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
            JHEEM answers critical policy questions by simulating HIV transmission dynamics
            across geographic scales, intervention strategies, and time horizons
          </p>
        </motion.div>

        {/* Three Capability Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">

          {/* Geographic Scope */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="group"
          >
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-hopkins-blue/30 hover:shadow-2xl transition-all duration-500 h-full">
              {/* Custom SVG Icon - Globe with location pins */}
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                  {/* Globe circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="#002D72"
                    strokeWidth="2"
                    opacity="0.2"
                  />
                  {/* Longitude lines */}
                  <path
                    d="M 40 4 Q 25 40 40 76 Q 55 40 40 4"
                    fill="none"
                    stroke="#002D72"
                    strokeWidth="1.5"
                    opacity="0.3"
                  />
                  <path
                    d="M 40 4 Q 55 40 40 76 Q 25 40 40 4"
                    fill="none"
                    stroke="#002D72"
                    strokeWidth="1.5"
                    opacity="0.3"
                  />
                  {/* Latitude lines */}
                  <ellipse cx="40" cy="40" rx="36" ry="12" fill="none" stroke="#002D72" strokeWidth="1.5" opacity="0.3" />
                  <ellipse cx="40" cy="40" rx="36" ry="24" fill="none" stroke="#002D72" strokeWidth="1.5" opacity="0.3" />

                  {/* Location pins (US cities) */}
                  <g transform="translate(28, 32)">
                    <path d="M 6 0 C 2.7 0 0 2.7 0 6 C 0 10.5 6 18 6 18 C 6 18 12 10.5 12 6 C 12 2.7 9.3 0 6 0 Z"
                          fill="#002D72" opacity="0.8" />
                    <circle cx="6" cy="6" r="2" fill="white" />
                  </g>
                  <g transform="translate(48, 28)">
                    <path d="M 6 0 C 2.7 0 0 2.7 0 6 C 0 10.5 6 18 6 18 C 6 18 12 10.5 12 6 C 12 2.7 9.3 0 6 0 Z"
                          fill="#002D72" opacity="0.8" />
                    <circle cx="6" cy="6" r="2" fill="white" />
                  </g>
                  <g transform="translate(20, 48)">
                    <path d="M 6 0 C 2.7 0 0 2.7 0 6 C 0 10.5 6 18 6 18 C 6 18 12 10.5 12 6 C 12 2.7 9.3 0 6 0 Z"
                          fill="#002D72" opacity="0.6" />
                    <circle cx="6" cy="6" r="2" fill="white" />
                  </g>
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 text-center mb-4">
                Geographic Modeling
              </h3>

              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-blue rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold text-gray-900">32 US metropolitan areas</span>
                    <br />86% of US HIV diagnoses
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-blue rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold text-gray-900">State-level analysis</span>
                    <br />31 states analyzed for policy impacts
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-blue rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold text-gray-900">International applications</span>
                    <br />Spain, Kenya adaptations
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Policy Scenarios */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="group"
          >
            <div className="bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue rounded-2xl p-8 text-white hover:shadow-2xl transition-all duration-500 h-full transform hover:scale-[1.02]">
              {/* Custom SVG Icon - Branching decision tree */}
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                  {/* Central node */}
                  <circle cx="40" cy="20" r="8" fill="white" opacity="0.9" />
                  <text x="40" y="24" textAnchor="middle" fill="#002D72" fontSize="10" fontWeight="bold">?</text>

                  {/* Branching paths */}
                  <path d="M 40 28 L 40 35" stroke="white" strokeWidth="2.5" opacity="0.7" />
                  <path d="M 40 35 L 25 50" stroke="white" strokeWidth="2.5" opacity="0.7" />
                  <path d="M 40 35 L 40 50" stroke="white" strokeWidth="2.5" opacity="0.7" />
                  <path d="M 40 35 L 55 50" stroke="white" strokeWidth="2.5" opacity="0.7" />

                  {/* End nodes */}
                  <circle cx="25" cy="50" r="6" fill="white" opacity="0.8" />
                  <circle cx="40" cy="50" r="6" fill="white" opacity="0.8" />
                  <circle cx="55" cy="50" r="6" fill="white" opacity="0.8" />

                  {/* Sub-branches */}
                  <path d="M 25 56 L 20 65" stroke="white" strokeWidth="2" opacity="0.5" />
                  <path d="M 25 56 L 30 65" stroke="white" strokeWidth="2" opacity="0.5" />
                  <path d="M 40 56 L 35 65" stroke="white" strokeWidth="2" opacity="0.5" />
                  <path d="M 40 56 L 45 65" stroke="white" strokeWidth="2" opacity="0.5" />
                  <path d="M 55 56 L 50 65" stroke="white" strokeWidth="2" opacity="0.5" />
                  <path d="M 55 56 L 60 65" stroke="white" strokeWidth="2" opacity="0.5" />

                  {/* Final nodes */}
                  <circle cx="20" cy="65" r="4" fill="white" opacity="0.6" />
                  <circle cx="30" cy="65" r="4" fill="white" opacity="0.6" />
                  <circle cx="35" cy="65" r="4" fill="white" opacity="0.6" />
                  <circle cx="45" cy="65" r="4" fill="white" opacity="0.6" />
                  <circle cx="50" cy="65" r="4" fill="white" opacity="0.6" />
                  <circle cx="60" cy="65" r="4" fill="white" opacity="0.6" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-center mb-4">
                Policy Scenarios
              </h3>

              <div className="space-y-4 text-sm text-white/95">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold">What if funding is cut?</span>
                    <br />Ryan White, CDC testing programs
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold">What if interventions scale up?</span>
                    <br />PrEP coverage, testing frequency, treatment timing
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold">What if disruptions occur?</span>
                    <br />Pandemic impacts, service interruptions
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Time Horizons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="group"
          >
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-hopkins-gold/50 hover:shadow-2xl transition-all duration-500 h-full">
              {/* Custom SVG Icon - Horizontal Timeline */}
              <div className="w-full h-24 mx-auto mb-6 relative max-w-xs">
                <svg viewBox="0 0 200 80" className="w-full h-full">
                  {/* Horizontal timeline line with arrow */}
                  <defs>
                    <marker id="arrowhead-right" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                      <polygon points="0 0, 10 5, 0 10" fill="#F2C413" />
                    </marker>
                  </defs>
                  <path d="M 20 40 L 180 40" stroke="#F2C413" strokeWidth="3" markerEnd="url(#arrowhead-right)" />

                  {/* Time milestones */}
                  <g>
                    {/* 2025 (now) - left */}
                    <circle cx="30" cy="40" r="6" fill="#002D72" />
                    <text x="30" y="30" textAnchor="middle" fill="#002D72" fontSize="12" fontWeight="600">2025</text>
                    <text x="30" y="60" textAnchor="middle" fill="#666" fontSize="10">Now</text>

                    {/* 2030 (medium) - middle */}
                    <circle cx="100" cy="40" r="7" fill="#F2C413" />
                    <text x="100" y="30" textAnchor="middle" fill="#002D72" fontSize="12" fontWeight="600">2030</text>
                    <text x="100" y="60" textAnchor="middle" fill="#666" fontSize="10">5-Year</text>

                    {/* 2040 (long-term) - right */}
                    <circle cx="170" cy="40" r="6" fill="#002D72" opacity="0.6" />
                    <text x="170" y="30" textAnchor="middle" fill="#002D72" fontSize="12" fontWeight="600">2040</text>
                    <text x="170" y="60" textAnchor="middle" fill="#666" fontSize="10">Long-term</text>
                  </g>
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 text-center mb-4">
                Time Horizons
              </h3>

              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-gold rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold text-gray-900">Immediate impacts</span>
                    <br />Brief interruptions, service disruptions
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-gold rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold text-gray-900">5-year projections</span>
                    <br />Policy impacts through 2030
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-hopkins-gold rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-semibold text-gray-900">Long-term forecasts</span>
                    <br />Demographic shifts, aging populations
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Bottom Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl p-8 border border-gray-100"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-light text-hopkins-blue mb-2">16</div>
              <p className="text-sm text-gray-600 font-medium">JHEEM Publications</p>
            </div>
            <div>
              <div className="text-3xl font-light text-hopkins-blue mb-2">32</div>
              <p className="text-sm text-gray-600 font-medium">US Metro Areas Modeled</p>
            </div>
            <div>
              <div className="text-3xl font-light text-hopkins-blue mb-2">86%</div>
              <p className="text-sm text-gray-600 font-medium">of US HIV Diagnoses Covered</p>
            </div>
            <div>
              <div className="text-3xl font-light text-hopkins-blue mb-2">2025</div>
              <p className="text-sm text-gray-600 font-medium">Latest Policy Research</p>
            </div>
          </div>
        </motion.div>

        {/* CTA Arrow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 text-sm mb-3">Explore JHEEM's modeling applications</p>
          <svg className="w-6 h-6 text-hopkins-blue/30 mx-auto animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
