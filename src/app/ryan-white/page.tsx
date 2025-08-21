'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function RyanWhiteLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Ryan White HIV/AIDS Program Analysis
          </h1>
          <h2 className="text-xl md:text-2xl text-gray-600 mb-6">
            Modeling the Impact of Ryan White Funding on HIV Outcomes
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto">
            Use JHEEM to analyze how changes in Ryan White HIV/AIDS Program funding affect HIV care, 
            treatment outcomes, and transmission dynamics across US metropolitan areas. Explore funding 
            interruption scenarios and their impact on the HIV care continuum.
          </p>
        </motion.header>

        {/* Ryan White Program Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-8 mb-12"
        >
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">
            About the Ryan White HIV/AIDS Program
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-700 mb-4">
                The Ryan White HIV/AIDS Program provides HIV-related services to more than 500,000 
                people each year. The program fills gaps in care and provides AIDS Drug Assistance 
                Program (ADAP) medications to low-income people living with HIV.
              </p>
              <p className="text-gray-700">
                JHEEM helps analyze potential impacts of funding changes on program outcomes and 
                HIV transmission in communities.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Modeled Scenarios</h4>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  Brief funding interruption (6 months)
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                  Prolonged funding interruption (18 months)
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-700 rounded-full mr-3"></div>
                  Complete program cessation
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Interface Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-12"
        >
          <h3 className="text-3xl font-semibold text-gray-900 text-center mb-8">
            Analysis Interfaces
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Interactive Explorer - NEW */}
            <Link href="/explore" className="group">
              <div className="bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue text-white rounded-xl p-6 h-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 rounded-lg p-2 mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 7V10m0 0L9 7" />
                    </svg>
                  </div>
                  <span className="bg-hopkins-gold text-hopkins-blue text-xs font-bold px-2 py-1 rounded-full">NEW</span>
                </div>
                <h4 className="text-xl font-semibold mb-3">Interactive Map Explorer</h4>
                <p className="text-blue-100 text-sm mb-4">
                  Explore Ryan White funding scenarios across US cities with our new interactive map. 
                  Visualize the impact of funding interruptions on HIV outcomes by city and demographic group.
                </p>
                <div className="flex items-center text-blue-200 text-sm font-medium group-hover:text-white transition-colors">
                  Explore by City
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Prerun Scenarios */}
            <Link href="/prerun" className="group">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 h-full shadow-lg hover:shadow-xl hover:border-hopkins-blue transition-all duration-300 transform hover:-translate-y-1">
                <div className="bg-green-100 rounded-lg p-2 w-fit mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">Prerun Funding Scenarios</h4>
                <p className="text-gray-600 text-sm mb-4">
                  View pre-calculated results for standard Ryan White funding scenarios including 
                  brief interruptions, prolonged interruptions, and program cessation.
                </p>
                <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-hopkins-spirit-blue transition-colors">
                  View Results
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Custom Simulations */}
            <Link href="/custom" className="group">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 h-full shadow-lg hover:shadow-xl hover:border-hopkins-blue transition-all duration-300 transform hover:-translate-y-1">
                <div className="bg-purple-100 rounded-lg p-2 w-fit mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">Custom Ryan White Analysis</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Design custom funding scenarios and intervention combinations to explore 
                  specific research questions about Ryan White program impacts.
                </p>
                <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-hopkins-spirit-blue transition-colors">
                  Design Scenario
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}