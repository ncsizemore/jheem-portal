'use client';

import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import AgeDistributionChart from './AgeDistributionChart';
import { StateAgeData, transformDataForChart } from '@/data/hiv-age-projections';

interface MultiStateChartGridProps {
  states: StateAgeData[];
  normalized?: boolean;
  yearRange?: [number, number];
}

// Smart grid layout calculator with optimized spacing
function getGridLayout(stateCount: number, screenWidth: number = 1200) {
  if (stateCount === 0) return { cols: 0, chartHeight: 0, gridClass: '', gap: 'gap-6' };
  if (stateCount === 1) return {
    cols: 1,
    chartHeight: 500,
    gridClass: 'grid-cols-1',
    gap: 'gap-6'
  };
  if (stateCount === 2) return {
    cols: 2,
    chartHeight: 450,
    gridClass: 'grid-cols-1 md:grid-cols-2',
    gap: 'gap-6'
  };
  if (stateCount <= 4) return {
    cols: 2,
    chartHeight: 420,
    gridClass: 'grid-cols-1 md:grid-cols-2',
    gap: 'gap-6'
  };
  if (stateCount <= 6) return {
    cols: screenWidth < 768 ? 1 : 3,
    chartHeight: 380,
    gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    gap: 'gap-5'
  };
  // For 7+ states, always use 3 columns max
  return {
    cols: screenWidth < 768 ? 1 : 3,
    chartHeight: 340,
    gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    gap: 'gap-4'
  };
}

const MultiStateChartGrid = memo(({
  states,
  normalized = false,
  yearRange = [2025, 2040]
}: MultiStateChartGridProps) => {
  // Staggered rendering: progressively render charts for better perceived performance
  const INITIAL_RENDER_COUNT = 6; // Show first 6 immediately
  const BATCH_SIZE = 6; // Render 6 more at a time
  const BATCH_DELAY = 100; // 100ms between batches

  const [renderedCount, setRenderedCount] = useState(INITIAL_RENDER_COUNT);
  const gridRef = useRef<HTMLDivElement>(null);

  // Reset rendered count when states, normalized, or yearRange changes
  // This triggers progressive re-rendering for smoother updates
  useEffect(() => {
    setRenderedCount(Math.min(INITIAL_RENDER_COUNT, states.length));
  }, [states.length, normalized, yearRange]);

  // Progressively increase rendered count
  useEffect(() => {
    if (renderedCount < states.length) {
      const timer = setTimeout(() => {
        setRenderedCount(prev => Math.min(prev + BATCH_SIZE, states.length));
      }, BATCH_DELAY);
      return () => clearTimeout(timer);
    }
  }, [renderedCount, states.length]);

  // Calculate layout based on number of states
  const gridLayout = useMemo(() => getGridLayout(states.length), [states.length]);

  // Transform data for all states
  const chartData = useMemo(() => {
    if (states.length === 0) return [];
    return transformDataForChart(states, yearRange, normalized);
  }, [states, yearRange, normalized]);

  // Export all charts as PNG
  const handleExportCharts = useCallback(async () => {
    if (!gridRef.current) return;

    // Dispatch export started event
    window.dispatchEvent(new CustomEvent('exportStatus', { detail: { status: 'exporting' } }));

    try {
      // Wait a moment for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
        // Ignore elements that might have problematic color functions
        ignoreElements: (element) => {
          // Skip elements with data-html2canvas-ignore attribute
          return element.hasAttribute('data-html2canvas-ignore');
        },
        onclone: (clonedDoc) => {
          // Convert any lab() colors to hex before rendering
          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computedStyle = window.getComputedStyle(el);

            // Fix background colors
            if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes('lab')) {
              htmlEl.style.backgroundColor = 'rgb(255, 255, 255)';
            }

            // Fix text colors
            if (computedStyle.color && computedStyle.color.includes('lab')) {
              htmlEl.style.color = 'rgb(0, 0, 0)';
            }

            // Fix border colors
            if (computedStyle.borderColor && computedStyle.borderColor.includes('lab')) {
              htmlEl.style.borderColor = 'rgb(200, 200, 200)';
            }
          });
        }
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const timestamp = new Date().toISOString().split('T')[0];
          const stateNames = states.length <= 3
            ? states.map(s => s.state_name.replace(/\s+/g, '_')).join('_')
            : `${states.length}_states`;
          link.download = `hiv_age_projections_${stateNames}_${timestamp}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);

          // Dispatch export success event
          window.dispatchEvent(new CustomEvent('exportStatus', { detail: { status: 'success' } }));
        } else {
          throw new Error('Failed to create blob from canvas');
        }
      });
    } catch (error) {
      // Log error details for debugging (especially important for Vercel deployment issues)
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        chartCount: states.length,
        timestamp: new Date().toISOString()
      };

      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to export charts:', errorDetails);
      } else {
        // In production, log to console for Vercel logs
        console.error('Export failed:', errorDetails.message, {
          browser: errorDetails.browser,
          chartCount: errorDetails.chartCount
        });
      }

      // Dispatch export error event
      window.dispatchEvent(new CustomEvent('exportStatus', { detail: { status: 'error' } }));
    }
  }, [states]);

  // Listen for export event from parent
  useEffect(() => {
    const handleExport = () => {
      handleExportCharts();
    };
    window.addEventListener('exportCharts', handleExport);
    return () => window.removeEventListener('exportCharts', handleExport);
  }, [handleExportCharts]);

  // If no states selected, show placeholder
  if (states.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-600 mb-2">No States Selected</h3>
          <p className="text-gray-500">Choose states from the selector above to begin comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Responsive Chart Grid */}
      <div ref={gridRef} className={`grid ${gridLayout.gap} ${gridLayout.gridClass}`}>
        {states.map((state, index) => {
          const statePrefix = state.state_name.replace(/\s+/g, '_');
          const isRendered = index < renderedCount;

          // Smart animation delays: reduce delay for large state counts
          const animationDelay = states.length > 6
            ? Math.min(index * 0.03, 0.3) // Max 300ms total delay for many states
            : index * 0.1; // Normal stagger for few states

          return (
            <motion.div
              key={state.state_code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: animationDelay, duration: 0.4 }}
              className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 p-3"
            >
              {isRendered ? (
                <>
                  <AgeDistributionChart
                    data={chartData}
                    statePrefix={statePrefix}
                    stateName={state.state_name}
                    normalized={normalized}
                    height={gridLayout.chartHeight}
                  />

                  {/* State-specific info */}
                  {state.state_name === 'Total' && (
                    <div className="mt-2 text-center">
                      <span className="inline-block bg-hopkins-gold text-hopkins-blue text-xs font-bold px-2 py-1 rounded-full">
                        AGGREGATE
                      </span>
                    </div>
                  )}
                </>
              ) : (
                /* Skeleton placeholder while chart loads */
                <div className="w-full animate-pulse">
                  <div className="mb-4 text-center space-y-2">
                    <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md w-3/4 mx-auto"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md w-1/2 mx-auto"></div>
                  </div>
                  <div className="relative" style={{ height: `${gridLayout.chartHeight}px` }}>
                    <div className="absolute inset-0 flex items-end justify-around gap-2 px-8 pb-8">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-gray-300 via-gray-200 to-gray-100 rounded-t-md"
                          style={{ height: `${Math.random() * 60 + 40}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Grid Layout Info (for debugging/development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
          Grid: {gridLayout.cols} cols, Height: {gridLayout.chartHeight}px, Gap: {gridLayout.gap}, Class: {gridLayout.gridClass} |
          Rendered: {renderedCount}/{states.length} charts
        </div>
      )}
    </div>
  );
});

MultiStateChartGrid.displayName = 'MultiStateChartGrid';

export default MultiStateChartGrid;