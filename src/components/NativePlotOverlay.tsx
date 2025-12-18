'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import NativeSimulationChart from './NativeSimulationChart';
import { transformPlotData } from '@/utils/transformPlotData';
import type { PlotDataFile, ChartDisplayOptions, FacetPanel } from '@/types/native-plotting';

interface NativePlotOverlayProps {
  plotData: PlotDataFile | null;
  plotTitle?: string;
  onClose: () => void;
  onBackToSelection?: () => void;
}

export default function NativePlotOverlay({
  plotData,
  plotTitle,
  onClose,
  onBackToSelection,
}: NativePlotOverlayProps) {
  // Display options state
  const [displayOptions, setDisplayOptions] = useState<ChartDisplayOptions>({
    showConfidenceInterval: true,
    showBaseline: true,
    showObservations: true,
  });

  // Transform plot data for charts
  const chartPanels: FacetPanel[] = useMemo(() => {
    if (!plotData) return [];
    return transformPlotData(plotData);
  }, [plotData]);

  if (!plotData) return null;

  const { metadata } = plotData;
  const outcomeLabel =
    metadata.outcome_metadata?.display_name || metadata.outcome;
  const units = metadata.y_label;
  const displayAsPercent = metadata.outcome_metadata?.display_as_percent || false;
  const isFaceted = chartPanels.length > 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 100 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-4 bg-black/80 backdrop-blur-xl shadow-2xl z-[60] rounded-3xl border border-white/20 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative p-6 border-b border-white/10 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/90 to-indigo-900/90"></div>

          <div className="relative flex justify-between items-start">
            <div className="flex-1">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-blue-100 tracking-tight mb-1"
              >
                {plotTitle || 'Analysis Results'}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-white/70 text-sm"
              >
                {outcomeLabel} - {units}
                {isFaceted && ` (${chartPanels.length} panels)`}
              </motion.p>
            </div>

            {/* Display Options */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex items-center gap-4 mr-4"
            >
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:text-white/90 transition-colors">
                <input
                  type="checkbox"
                  checked={displayOptions.showConfidenceInterval}
                  onChange={e =>
                    setDisplayOptions(prev => ({
                      ...prev,
                      showConfidenceInterval: e.target.checked,
                    }))
                  }
                  className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/50"
                />
                95% CI
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:text-white/90 transition-colors">
                <input
                  type="checkbox"
                  checked={displayOptions.showBaseline}
                  onChange={e =>
                    setDisplayOptions(prev => ({
                      ...prev,
                      showBaseline: e.target.checked,
                    }))
                  }
                  className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/50"
                />
                Baseline
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:text-white/90 transition-colors">
                <input
                  type="checkbox"
                  checked={displayOptions.showObservations}
                  onChange={e =>
                    setDisplayOptions(prev => ({
                      ...prev,
                      showObservations: e.target.checked,
                    }))
                  }
                  className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/50"
                />
                Observed
              </label>
            </motion.div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {onBackToSelection && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  onClick={onBackToSelection}
                  className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl px-4 py-2 transition-all duration-300 border border-white/20"
                  title="Explore other analyses"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="text-sm font-medium">Back</span>
                </motion.button>
              )}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-300 border border-white/20"
                title="Return to map"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="flex-1 p-6 overflow-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl overflow-auto"
          >
            {chartPanels.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No data available</p>
              </div>
            ) : chartPanels.length === 1 ? (
              // Single chart for unfaceted view
              <div className="p-6 h-full">
                <NativeSimulationChart
                  panel={chartPanels[0]}
                  outcomeLabel={outcomeLabel}
                  units={units}
                  displayAsPercent={displayAsPercent}
                  options={displayOptions}
                  height={Math.max(400, window.innerHeight - 300)}
                />
              </div>
            ) : (
              // Grid of charts for faceted view
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartPanels.map(panel => (
                  <div
                    key={panel.facetValue}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                  >
                    <NativeSimulationChart
                      panel={panel}
                      outcomeLabel={outcomeLabel}
                      units={units}
                      displayAsPercent={displayAsPercent}
                      options={displayOptions}
                      height={350}
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
