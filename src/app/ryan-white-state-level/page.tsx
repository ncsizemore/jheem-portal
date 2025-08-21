'use client';

import { useEffect, useState } from 'react';

export default function RyanWhiteStateLevelPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate brief loading for iframe setup
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              JHEEM Ryan White State Level Model
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Interactive HIV transmission modeling for state-level policy analysis
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Powered by Johns Hopkins Bloomberg School of Public Health
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading JHEEM State Level Model...</p>
          </div>
        </div>
      )}

      {/* Iframe Container */}
      {!loading && (
        <div className="flex-1 relative">
          <iframe
            src="https://jheem.shinyapps.io/ryan-white-state-level/"
            className="absolute inset-0 w-full h-full border-0"
            title="JHEEM Ryan White State Level Model"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
          />
          
          {/* Error Fallback - in case iframe fails to load */}
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
                The JHEEM State Level Model interface is temporarily unavailable. 
                Please try again later or contact support.
              </p>
              <a 
                href="https://jheem.shinyapps.io/ryan-white-state-level/" 
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
    </div>
  );
}