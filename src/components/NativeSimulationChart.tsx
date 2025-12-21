'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import type { FacetPanel, ChartDisplayOptions } from '@/types/native-plotting';
import { getValueRange } from '@/utils/transformPlotData';

interface ObservationHoverInfo {
  year: number;
  value: number;
  source: string;
  x: number;
  y: number;
}

interface NativeSimulationChartProps {
  panel: FacetPanel;
  outcomeLabel: string;
  units: string;
  displayAsPercent: boolean;
  options: ChartDisplayOptions;
  height?: number;
}

interface TooltipPayload {
  value?: number;
  dataKey: string;
  color: string;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  displayAsPercent: boolean;
  units: string;
}

interface ObservationPayload {
  value?: number;
  source?: string;
  payload?: { source?: string };
}

const CustomTooltip = ({ active, payload, label, displayAsPercent, units }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const interventionPoint = payload.find(p => p.dataKey === 'value');
  const baselinePoint = payload.find(p => p.dataKey === 'baselineValue');
  // Observation points come from separate data array
  const observationPoints = payload.filter(p => p.name === 'obsValue') as unknown as ObservationPayload[];

  const formatValue = (val: number | undefined) => {
    if (val === undefined) return 'N/A';
    // Data is already in display units (e.g., 14.8 for 14.8%)
    if (displayAsPercent) return `${val.toFixed(1)}%`;
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  return (
    <div className="bg-white/98 backdrop-blur-xl p-4 border-2 border-gray-200/60 rounded-xl shadow-xl">
      <p className="text-lg font-bold text-gray-900 mb-2">{label}</p>

      {interventionPoint && interventionPoint.value !== undefined && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-sm text-gray-700">Intervention:</span>
          <span className="text-sm font-semibold">{formatValue(interventionPoint.value)}</span>
        </div>
      )}

      {baselinePoint && baselinePoint.value !== undefined && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9ca3af' }} />
          <span className="text-sm text-gray-700">Baseline:</span>
          <span className="text-sm font-semibold">{formatValue(baselinePoint.value)}</span>
        </div>
      )}

      {observationPoints.map((obs, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-sm text-gray-700">
            Observed{obs.payload?.source ? ` (${obs.payload.source})` : ''}:
          </span>
          <span className="text-sm font-semibold">{formatValue(obs.value)}</span>
        </div>
      ))}

      <p className="text-xs text-gray-500 mt-2">{units}</p>
    </div>
  );
};

// Sanitize a string for use as an SVG ID (remove special characters)
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

const NativeSimulationChart = memo(({
  panel,
  outcomeLabel,
  units,
  displayAsPercent,
  options,
  height = 400,
}: NativeSimulationChartProps) => {
  const { showConfidenceInterval, showBaseline, showObservations } = options;
  const { data, observations, facetLabel, isIndividualSimulation, individualSimulations } = panel;

  // Create safe ID for SVG gradient references
  const safeId = sanitizeId(panel.facetValue);

  // State for observation hover tooltip
  const [hoveredObs, setHoveredObs] = useState<ObservationHoverInfo | null>(null);

  // Keep observations as separate array for independent scatter rendering
  // This allows multiple observations per year to be shown
  const observationData = useMemo(() => {
    return observations.map(obs => ({
      year: obs.year,
      value: obs.value,
      source: obs.source,
      url: obs.url,
    }));
  }, [observations]);

  // Format value for display
  const formatDisplayValue = useCallback((val: number) => {
    if (displayAsPercent) return `${val.toFixed(1)}%`;
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }, [displayAsPercent]);

  // Calculate Y domain - include individual simulations if present
  const yDomain = useMemo(() => {
    return getValueRange(data, observations, showBaseline, showConfidenceInterval, individualSimulations);
  }, [data, observations, showBaseline, showConfidenceInterval, individualSimulations]);

  // Transform data for CI band rendering
  // Recharts Area fills from 0 by default, so we use stacking:
  // - ciBase: invisible area from 0 to lower bound
  // - ciHeight: visible area from lower to upper (the actual CI band)
  const chartDataWithCI = useMemo(() => {
    return data.map(d => ({
      ...d,
      // Intervention CI band
      ciBase: d.lower ?? 0,
      ciHeight: (d.upper !== undefined && d.lower !== undefined) ? d.upper - d.lower : 0,
      // Baseline CI band
      baselineCiBase: d.baselineLower ?? 0,
      baselineCiHeight: (d.baselineUpper !== undefined && d.baselineLower !== undefined)
        ? d.baselineUpper - d.baselineLower : 0,
    }));
  }, [data]);

  // Prepare individual simulation data for Recharts
  // Each simulation becomes a row with columns for each year
  const individualSimData = useMemo(() => {
    if (!isIndividualSimulation || !individualSimulations) return null;

    // Get all unique years
    const years = new Set<number>();
    individualSimulations.forEach(line => {
      line.points.forEach(p => years.add(p.year));
    });
    const sortedYears = Array.from(years).sort((a, b) => a - b);

    // Create one data row per year with values for each simulation line
    return sortedYears.map(year => {
      const row: Record<string, number> = { year };
      individualSimulations.forEach(line => {
        const point = line.points.find(p => p.year === year);
        if (point) {
          // Key format: simset_simId (e.g., "Baseline_1", "Cessation_23")
          row[`${line.simset}_${line.simId}`] = point.value;
        }
      });
      return row;
    });
  }, [isIndividualSimulation, individualSimulations]);


  // Format Y axis values
  const formatYAxis = (value: number) => {
    if (displayAsPercent) return `${value.toFixed(0)}%`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {outcomeLabel}
        {facetLabel !== 'All' && (
          <span className="text-gray-500 font-normal"> - {facetLabel}</span>
        )}
      </h3>

      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={isIndividualSimulation && individualSimData ? individualSimData : chartDataWithCI}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            {/* Gradient for intervention confidence interval */}
            <linearGradient id={`interventionCI-${safeId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            {/* Gradient for baseline confidence interval */}
            <linearGradient id={`baselineCI-${safeId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9ca3af" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="year"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
            axisLine={{ stroke: '#9ca3af' }}
          />

          <YAxis
            domain={yDomain}
            tickFormatter={formatYAxis}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
            axisLine={{ stroke: '#9ca3af' }}
            label={{
              value: units,
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 },
            }}
          />

          {/* Tooltip disabled for individual simulations (too many lines) */}
          {!isIndividualSimulation && (
            <Tooltip content={<CustomTooltip displayAsPercent={displayAsPercent} units={units} />} />
          )}

          {/* Legend - custom for individual simulations */}
          {!isIndividualSimulation && (
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  value: 'Intervention',
                  baselineValue: 'Baseline',
                };
                return <span className="text-sm text-gray-700">{labels[value] || value}</span>;
              }}
            />
          )}

          {/* Reference line at 2025 (typical intervention start) */}
          <ReferenceLine
            x={2025}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            strokeWidth={1}
            label={{
              value: 'Intervention Start',
              position: 'top',
              fill: '#f59e0b',
              fontSize: 10,
            }}
          />

          {/* === INDIVIDUAL SIMULATION RENDERING === */}
          {isIndividualSimulation && individualSimulations && (
            <>
              {/* Render each simulation line - baseline lines (gray, low opacity) */}
              {showBaseline && individualSimulations
                .filter(line => line.simset === 'Baseline')
                .map(line => (
                  <Line
                    key={`baseline-${line.simId}`}
                    type="monotone"
                    dataKey={`Baseline_${line.simId}`}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    dot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                ))
              }
              {/* Render intervention lines (blue, low opacity) */}
              {individualSimulations
                .filter(line => line.simset !== 'Baseline')
                .map(line => (
                  <Line
                    key={`intervention-${line.simId}`}
                    type="monotone"
                    dataKey={`${line.simset}_${line.simId}`}
                    stroke="#3b82f6"
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    dot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                ))
              }
            </>
          )}

          {/* === MEAN/MEDIAN RENDERING === */}
          {!isIndividualSimulation && (
            <>
              {/* Baseline confidence interval - stacked areas for proper lower-to-upper band */}
              {showConfidenceInterval && showBaseline && (
                <>
                  {/* Invisible base from 0 to lower bound */}
                  <Area
                    type="monotone"
                    dataKey="baselineCiBase"
                    stackId="baselineCI"
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    isAnimationActive={false}
                  />
                  {/* Visible CI band from lower to upper */}
                  <Area
                    type="monotone"
                    dataKey="baselineCiHeight"
                    stackId="baselineCI"
                    stroke="none"
                    fill={`url(#baselineCI-${safeId})`}
                    fillOpacity={1}
                    name="baselineCI"
                    legendType="none"
                    isAnimationActive={false}
                  />
                </>
              )}

              {/* Intervention confidence interval - stacked areas for proper lower-to-upper band */}
              {showConfidenceInterval && (
                <>
                  {/* Invisible base from 0 to lower bound */}
                  <Area
                    type="monotone"
                    dataKey="ciBase"
                    stackId="interventionCI"
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    isAnimationActive={false}
                  />
                  {/* Visible CI band from lower to upper */}
                  <Area
                    type="monotone"
                    dataKey="ciHeight"
                    stackId="interventionCI"
                    stroke="none"
                    fill={`url(#interventionCI-${safeId})`}
                    fillOpacity={1}
                    name="interventionCI"
                    legendType="none"
                    isAnimationActive={false}
                  />
                </>
              )}

              {/* Baseline line */}
              {showBaseline && (
                <Line
                  type="monotone"
                  dataKey="baselineValue"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="baselineValue"
                />
              )}

              {/* Main intervention line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                name="value"
              />
            </>
          )}

          {/* Observation points - rendered as ReferenceDots with custom shape for hover

              Why ReferenceDot instead of Scatter?
              Recharts Scatter with a separate data array extends the x-axis domain,
              causing the axis to repeat/extend incorrectly when observations fall
              outside the simulation year range. ReferenceDot positions points absolutely
              without affecting axis domains. The custom shape with onMouseEnter/Leave
              provides tooltip functionality since ReferenceDot doesn't participate in
              the built-in Tooltip system. This is a known Recharts limitation - see:
              https://github.com/recharts/recharts/issues/1775
              https://github.com/recharts/recharts/issues/2338
          */}
          {showObservations && observationData.map((obs, idx) => (
            <ReferenceDot
              key={`obs-${idx}-${obs.year}-${obs.source}`}
              x={obs.year}
              y={obs.value}
              r={6}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={2}
              shape={(props: { cx?: number; cy?: number }) => {
                const { cx = 0, cy = 0 } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredObs({ year: obs.year, value: obs.value, source: obs.source, x: cx, y: cy })}
                    onMouseLeave={() => setHoveredObs(null)}
                  />
                );
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

        {/* Observation tooltip - positioned absolutely within chart area */}
        {hoveredObs && (
          <div
            className="absolute pointer-events-none bg-white/98 backdrop-blur-xl p-3 border-2 border-gray-200/60 rounded-xl shadow-xl z-50"
            style={{
              left: hoveredObs.x + 10,
              top: hoveredObs.y - 10,
              transform: 'translateY(-100%)',
            }}
          >
            <p className="text-sm font-bold text-gray-900 mb-1">{hoveredObs.year}</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-700">{hoveredObs.source}:</span>
              <span className="text-sm font-semibold">{formatDisplayValue(hoveredObs.value)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{units}</p>
          </div>
        )}
      </div>

      {/* Custom legend for observations (shown when observations are enabled and present) */}
      {showObservations && observationData.length > 0 && (
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Observed Data</span>
          </div>
        </div>
      )}
    </div>
  );
});

NativeSimulationChart.displayName = 'NativeSimulationChart';

export default NativeSimulationChart;
