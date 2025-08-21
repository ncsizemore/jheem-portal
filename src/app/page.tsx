'use client';

import Link from "next/link";
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            The Johns Hopkins Epidemiologic and Economic Model
          </h1>
          <h2 className="text-xl md:text-2xl text-gray-600 mb-8">
            A Mathematical Model in Service of Ending the HIV Epidemic in the US
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto mb-8">
            The JHEEM is a mathematical model of HIV transmission calibrated to 32 US cities. 
            It generates local predictions of the HIV epidemic under potential interventions that 
            include HIV testing, viral suppression among people with HIV (PWH), and pre-exposure 
            prophylaxis (PrEP).
          </p>
        </motion.div>

        {/* Model Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-8 mb-16"
        >
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Model Capabilities</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Calibrated to 32 US metropolitan areas
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Dynamic compartmental HIV transmission model
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Population stratified by age, race, sex, and risk factors
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Intervention impact projections
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Interventions Modeled</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                HIV testing frequency optimization
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                PrEP coverage expansion strategies
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Viral suppression improvements
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Needle-exchange and MOUD programs
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Model Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h3 className="text-3xl font-semibold text-gray-900 text-center mb-8">
            Model Applications
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Ryan White Model */}
            <Link href="/ryan-white" className="group">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 h-full shadow-lg hover:shadow-xl hover:border-hopkins-blue transition-all duration-300 transform hover:-translate-y-1">
                <div className="bg-hopkins-blue rounded-lg p-3 w-fit mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-hopkins-blue transition-colors">
                  Ryan White HIV/AIDS Program
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Analyze the impact of funding scenarios on HIV care and treatment outcomes across metropolitan areas.
                </p>
                <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-hopkins-spirit-blue transition-colors">
                  Explore Model
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* State Level Model */}
            <Link href="/ryan-white-state-level" className="group">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 h-full shadow-lg hover:shadow-xl hover:border-hopkins-spirit-blue transition-all duration-300 transform hover:-translate-y-1">
                <div className="bg-hopkins-spirit-blue rounded-lg p-3 w-fit mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 7V10m0 0L9 7" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-hopkins-spirit-blue transition-colors">
                  State Level Analysis
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  State-wide HIV transmission modeling for policy analysis and intervention planning at the state level.
                </p>
                <div className="flex items-center text-hopkins-spirit-blue text-sm font-medium group-hover:text-hopkins-blue transition-colors">
                  Access Model
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* CDC Testing Model */}
            <Link href="/cdc-testing" className="group">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 h-full shadow-lg hover:shadow-xl hover:border-hopkins-gold transition-all duration-300 transform hover:-translate-y-1">
                <div className="bg-hopkins-gold rounded-lg p-3 w-fit mb-4">
                  <svg className="w-6 h-6 text-hopkins-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-hopkins-blue transition-colors">
                  CDC Testing Strategies
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Optimize HIV testing strategies and evaluate the impact of testing frequency on epidemic outcomes.
                </p>
                <div className="flex items-center text-hopkins-blue text-sm font-medium group-hover:text-hopkins-gold transition-colors">
                  Explore Testing
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Funding Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center bg-white rounded-xl shadow-lg p-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Funding Sources</h3>
          <p className="text-gray-600 mb-4">
            This work is supported by the following grants from the National Institutes of Health:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-700">
            <span className="bg-gray-100 px-3 py-1 rounded-full">R01 AI146555</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">R01 DA047952</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">DP2 DA049295</span>
          </div>
          <div className="mt-6 text-gray-600">
            <p className="font-medium">Johns Hopkins Bloomberg School of Public Health</p>
            <p className="text-sm">Computational Epidemiology Research Group</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
