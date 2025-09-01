'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';

interface AppConfig {
  subtitle: string;
  title: string;
  description: string;
  statsNumber: string;
  statsLabel: string;
  features: Array<{
    title: string;
    description: string;
    color: string;
    icon: string;
  }>;
  actionText: string;
  iframeUrl: string;
  iframeTitle: string;
  loadingTitle: string;
  loadingDescription: string;
  loadingBackground: string;
  heroSectionTitle: string;
  heroDescription: string;
  sessionDescription: string;
}

interface EmbeddedShinyAppProps {
  appConfig: AppConfig;
}

export default function EmbeddedShinyApp({ appConfig }: EmbeddedShinyAppProps) {
  const [loading, setLoading] = useState(false);
  const [showLanding, setShowLanding] = useState(true); 
  const [appLoaded, setAppLoaded] = useState(false); 
  
  const handleLaunchApp = () => {
    setLoading(true);
    setShowLanding(false);
    setTimeout(() => {
      setAppLoaded(true);
      setLoading(false);
    }, 3000);
  };

  const handleMinimizeApp = () => {
    setShowLanding(true); 
  };

  const handleRestoreApp = () => {
    setShowLanding(false); 
  };

  const handleCloseApplication = () => {
    setShowLanding(true);
    setAppLoaded(false);
  };

  const renderLandingContent = () => (
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
                  {appConfig.subtitle}
                </p>
                <h1 className="text-5xl lg:text-6xl font-extralight text-gray-900 leading-none mb-8 tracking-tight">
                  {appConfig.title.split(' ').map((word, index, words) => {
                    if (index === words.length - 2 || index === words.length - 1) {
                      return (
                        <span key={index} className="font-medium">
                          {word}{index < words.length - 1 ? ' ' : ''}
                        </span>
                      );
                    }
                    return word + (index < words.length - 1 ? ' ' : '');
                  })}
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed mb-8 font-light max-w-lg">
                  {appConfig.description}
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
                  <div className="text-4xl font-light text-hopkins-blue mb-2">{appConfig.statsNumber}</div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">{appConfig.statsLabel}</p>
                </div>
                <div className="space-y-4 text-sm text-gray-700">
                  {appConfig.features.slice(0, 3).map((feature, index) => (
                    <p key={index}>{feature.description}</p>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {appConfig.features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safe space for floating panel */}
      <section className="py-32 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h2 className="text-3xl font-extralight text-gray-900 mb-6">
                {appConfig.heroSectionTitle}
              </h2>
              <p className="text-lg text-gray-600 mb-8 font-light max-w-lg">
                {appConfig.heroDescription}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );

  if (showLanding && !appLoaded) {
    return (
      <div className="min-h-screen bg-white">
        {renderLandingContent()}
        
        {/* Launch Panel */}
        <div className="fixed bottom-6 right-6 z-50">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="bg-gradient-to-br from-hopkins-blue to-hopkins-spirit-blue text-white rounded-2xl shadow-2xl p-6 max-w-sm"
          >
            <div className="text-center">
              <h4 className="font-bold text-lg mb-2">Ready to {appConfig.actionText.includes('Begin') ? 'Begin' : 'Explore'}?</h4>
              <p className="text-blue-100 text-sm mb-4 leading-relaxed">
                {appConfig.actionText}
              </p>
              <motion.button
                onClick={handleLaunchApp}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-hopkins-blue px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 w-full"
              >
                {appConfig.actionText.includes('Analysis') ? 'Launch Analysis Tool' : 'Launch Testing Model'}
              </motion.button>
              <p className="text-blue-200 text-xs mt-3">
                May take 30-60 seconds to initialize
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Enhanced Loading State */}
      {(loading || !appLoaded) && (
        <div className={`flex-1 flex items-center justify-center ${appConfig.loadingBackground}`}>
          <div className="text-center max-w-md">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-hopkins-blue/20 rounded-full mx-auto"></div>
              <div className="w-20 h-20 border-4 border-hopkins-blue border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <h3 className="text-2xl font-light text-gray-900 mb-4">
              {appConfig.loadingTitle}
            </h3>
            <p className="text-gray-600 mb-2">
              {appConfig.loadingDescription}
            </p>
            <p className="text-sm text-gray-500">
              This may take up to 60 seconds as the Shiny application starts up
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-hopkins-blue rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-hopkins-blue rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-hopkins-blue rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Iframe Container */}
      {!loading && appLoaded && (
        <div className="flex-1 relative">
          <iframe
            src={appConfig.iframeUrl}
            className="absolute inset-0 w-full h-full border-0"
            title={appConfig.iframeTitle}
            allow="encrypted-media"
            sandbox="allow-same-origin allow-scripts allow-forms"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          
          {/* Error Fallback */}
          <div className="absolute inset-0 bg-white flex items-center justify-center opacity-0 pointer-events-none" id="iframe-fallback">
            <div className="text-center max-w-md">
              <div className="text-red-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unable to Load Model
              </h3>
              <p className="text-gray-600 mb-4">
                The {appConfig.iframeTitle} interface is temporarily unavailable. 
                Please try again later or contact support.
              </p>
              <a 
                href={appConfig.iframeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open in New Tab
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Landing Page Overlay - shown when minimized */}
      {showLanding && appLoaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-white z-30 overflow-auto"
        >
          {renderLandingContent()}
        </motion.div>
      )}

      {/* Restore Panel - shown when app is minimized */}
      {!loading && appLoaded && showLanding && (
        <div className="fixed bottom-6 right-6 z-50">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-2xl shadow-2xl p-6 max-w-sm"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
                <h4 className="font-bold text-lg">Session Active</h4>
              </div>
              <p className="text-green-100 text-sm mb-4 leading-relaxed">
                {appConfig.sessionDescription}
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={handleRestoreApp}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-green-700 px-4 py-2.5 rounded-lg font-bold hover:shadow-lg transition-all duration-300 flex-1"
                >
                  Restore
                </motion.button>
                <motion.button
                  onClick={handleCloseApplication}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-600 transition-all duration-300"
                >
                  End
                </motion.button>
              </div>
              <p className="text-green-200 text-xs mt-3">
                Navigating to other models will end this session
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* App Controls - shown when app is running */}
      {!loading && appLoaded && !showLanding && (
        <div className="fixed top-20 right-6 z-50">
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-300 rounded-2xl shadow-xl px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleMinimizeApp}
                whileHover={{ scale: 1.1, y: -1 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-hopkins-blue/10 hover:bg-hopkins-blue text-hopkins-blue hover:text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Overview
              </motion.button>
              <motion.button
                onClick={handleCloseApplication}
                whileHover={{ scale: 1.1, y: -1 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}