'use client';

import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <span>Loading plot...</span>
      </div>
    </div>
  )
});

interface PlotData {
  data: any[];
  layout: any;
}

interface MapPlotOverlayProps {
  plotData: PlotData | null;
  plotTitle?: string;
  onClose: () => void;
}

export default function MapPlotOverlay({ plotData, plotTitle, onClose }: MapPlotOverlayProps) {
  if (!plotData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-40 border-t border-gray-200"
        style={{ height: '65vh' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              {plotTitle || 'Analysis Results'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Interactive visualization of HIV transmission modeling results
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg p-2 transition-colors"
              title="Close plot"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Plot Container */}
        <div className="p-4 h-full">
          <div className="w-full h-full bg-white rounded-lg border border-gray-200">
            {plotData && (
              <Plot
                data={plotData.data}
                layout={{
                  ...plotData.layout,
                  autosize: true,
                  margin: { l: 60, r: 40, t: 40, b: 60 },
                  font: {
                    family: 'Inter, system-ui, sans-serif',
                    size: 12,
                    color: '#374151'
                  },
                  paper_bgcolor: '#ffffff',
                  plot_bgcolor: '#fafafa',
                  showlegend: true,
                  legend: {
                    orientation: 'v',
                    x: 1.02,
                    y: 1,
                    font: { size: 11 }
                  }
                }}
                style={{ width: '100%', height: '100%' }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: [
                    'pan2d',
                    'lasso2d',
                    'select2d',
                    'autoScale2d',
                    'hoverClosestCartesian',
                    'hoverCompareCartesian',
                    'toggleSpikelines'
                  ],
                  toImageButtonOptions: {
                    format: 'png',
                    filename: 'jheem_analysis',
                    height: 600,
                    width: 1000,
                    scale: 2
                  }
                }}
                useResizeHandler={true}
              />
            )}
          </div>
        </div>

        {/* Resize handle (visual indicator) */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-12 h-1 bg-gray-300 rounded-full"></div>
      </motion.div>
    </AnimatePresence>
  );
}
