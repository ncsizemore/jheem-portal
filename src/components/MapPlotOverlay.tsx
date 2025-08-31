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

interface PlotlyDataPoint extends Record<string, unknown> {
  x?: number[] | string[];
  y?: number[] | string[];
  type?: string;
  mode?: string;
  name?: string;
  line?: Record<string, unknown>;
  marker?: Record<string, unknown>;
}

interface PlotlyLayout extends Record<string, unknown> {
  title?: string | Record<string, unknown>;
  xaxis?: Record<string, unknown>;
  yaxis?: Record<string, unknown>;
  width?: number;
  height?: number;
  margin?: Record<string, unknown>;
  showlegend?: boolean;
}

interface PlotData {
  data: PlotlyDataPoint[];
  layout: PlotlyLayout;
}

interface MapPlotOverlayProps {
  plotData: PlotData | null;
  plotTitle?: string;
  onClose: () => void;
  onBackToSelection?: () => void;
}

export default function MapPlotOverlay({ plotData, plotTitle, onClose, onBackToSelection }: MapPlotOverlayProps) {
  if (!plotData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 100 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-4 bg-black/80 backdrop-blur-xl shadow-2xl z-[60] rounded-3xl border border-white/20 overflow-hidden"
      >
        {/* Cinematic Header */}
        <div className="relative p-8 border-b border-white/10">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/90 to-indigo-900/90"></div>
          
          {/* Content */}
          <div className="relative flex justify-between items-start">
            <div className="flex-1">
              <motion.h3 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-blue-100 tracking-tight mb-2"
              >
                {plotTitle || 'Analysis Results'}
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-white/80 text-lg font-medium"
              >
                HIV Transmission Impact Analysis
              </motion.p>
              
            </div>
            
            {/* Cinematic Controls */}
            <div className="flex items-center gap-4">
              {onBackToSelection && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  onClick={onBackToSelection}
                  className="flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl px-4 py-3 transition-all duration-300 backdrop-blur-sm border border-white/20"
                  title="Explore other analyses"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="font-medium">Explore More</span>
                </motion.button>
              )}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl p-3 transition-all duration-300 backdrop-blur-sm border border-white/20"
                title="Return to map"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Cinematic Plot Container */}
        <div className="flex-1 p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
            style={{ height: 'calc(100% - 2rem)' }}
          >
            {plotData && (
              <Plot
                data={plotData.data}
                layout={{
                  ...plotData.layout,
                  autosize: true,
                  margin: { l: 80, r: 60, t: 80, b: 80 },
                  font: {
                    family: 'Inter, system-ui, sans-serif',
                    size: 14,
                    color: '#1f2937'
                  },
                  paper_bgcolor: 'rgba(255, 255, 255, 0.95)',
                  plot_bgcolor: 'rgba(248, 250, 252, 0.8)',
                  showlegend: true,
                  legend: {
                    orientation: 'v',
                    x: 1.02,
                    y: 1,
                    font: { size: 13 },
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    bordercolor: 'rgba(0, 0, 0, 0.1)',
                    borderwidth: 1
                  },
                  title: {
                    font: { size: 18, color: '#1f2937', family: 'Inter, system-ui, sans-serif' },
                    x: 0.05,
                    xanchor: 'left',
                    pad: { t: 20 }
                  },
                  // Enhanced grid and styling
                  xaxis: {
                    ...plotData.layout.xaxis,
                    gridcolor: 'rgba(0, 0, 0, 0.1)',
                    zerolinecolor: 'rgba(0, 0, 0, 0.2)'
                  },
                  yaxis: {
                    ...plotData.layout.yaxis,
                    gridcolor: 'rgba(0, 0, 0, 0.1)',
                    zerolinecolor: 'rgba(0, 0, 0, 0.2)'
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
                    'autoScale2d'
                  ],
                  toImageButtonOptions: {
                    format: 'png',
                    filename: 'jheem_analysis',
                    height: 1000,
                    width: 1400,
                    scale: 2
                  }
                }}
                useResizeHandler={true}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
