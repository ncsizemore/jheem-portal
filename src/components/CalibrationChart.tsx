'use client';

import React, { memo, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  CalibrationChartPoint,
  CalibrationOutcome,
  AgeCategory,
  OUTCOME_LABELS,
  AGE_CATEGORY_LABELS
} from '@/data/calibration-data';

interface CalibrationChartProps {
  data: CalibrationChartPoint[];
  outcome: CalibrationOutcome;
  ageCategory: AgeCategory | 'total';
  stateName: string;
  height?: number;
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  payload: CalibrationChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
  outcome: CalibrationOutcome;
  ageCategory: AgeCategory | 'total';
  stateName: string;
}

const CustomTooltip = memo(({
  active,
  payload,
  label,
  outcome,
  ageCategory,
  stateName
}: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  const ageLabel = ageCategory === 'total' ? 'Total' : AGE_CATEGORY_LABELS[ageCategory];
  const outcomeLabel = OUTCOME_LABELS[outcome];

  return (
    <div className="bg-white/98 backdrop-blur-xl p-4 border-2 border-gray-200/60 rounded-2xl shadow-2xl ring-1 ring-black/5 max-w-xs">
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-gray-200/70">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {stateName} · {ageLabel}
        </p>
        <p className="text-xl font-bold text-hopkins-blue">
          {label}
        </p>
      </div>

      {/* Data */}
      <div className="space-y-2 text-sm">
        {/* Model prediction */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-gray-800 rounded" />
            <span className="text-gray-600">Model mean</span>
          </div>
          <span className="font-semibold text-gray-900">
            {dataPoint.mean.toLocaleString()}
          </span>
        </div>

        {/* 95% CI */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-200 rounded-sm opacity-60" />
            <span className="text-gray-600">95% CI</span>
          </div>
          <span className="font-medium text-gray-700">
            {dataPoint.lower.toLocaleString()} – {dataPoint.upper.toLocaleString()}
          </span>
        </div>

        {/* Observed value */}
        {dataPoint.observed !== undefined && (
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600">CDC observed</span>
            </div>
            <span className="font-semibold text-emerald-700">
              {dataPoint.observed.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Outcome label */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500 italic">
          {outcomeLabel}
        </p>
      </div>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

const CalibrationChart = memo(({
  data,
  outcome,
  ageCategory,
  stateName,
  height = 280
}: CalibrationChartProps) => {
  // Prepare data with observed points as separate series for scatter plot
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      // For scatter plot, we need observed as a separate value
      observedPoint: point.observed
    }));
  }, [data]);

  // Calculate Y-axis domain with some padding
  const yDomain = useMemo(() => {
    const allValues = data.flatMap(d => [
      d.lower,
      d.upper,
      d.observed ?? 0
    ]).filter(v => v > 0);

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;

    return [Math.max(0, min - padding), max + padding];
  }, [data]);

  // Title based on age category
  const title = ageCategory === 'total'
    ? 'Total'
    : AGE_CATEGORY_LABELS[ageCategory];

  return (
    <div className="w-full">
      <div className="mb-2 text-center">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
        >
          <defs>
            {/* Gradient for CI band */}
            <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#FB923C" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#FDBA74" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.6} />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            stroke="#D1D5DB"
            tickLine={{ stroke: '#D1D5DB' }}
            domain={[2010, 2040]}
            ticks={[2010, 2015, 2020, 2025, 2030, 2035, 2040]}
          />

          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            stroke="#D1D5DB"
            tickLine={{ stroke: '#D1D5DB' }}
            domain={yDomain}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()
            }
            width={45}
          />

          {/* Reference line at 2021 (end of observed data) */}
          <ReferenceLine
            x={2021}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
            strokeWidth={1}
          />

          <Tooltip
            content={
              <CustomTooltip
                outcome={outcome}
                ageCategory={ageCategory}
                stateName={stateName}
              />
            }
            cursor={{ stroke: '#002D72', strokeWidth: 1, strokeOpacity: 0.3 }}
          />

          {/* 95% CI band (area between lower and upper) */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="url(#ciGradient)"
            fillOpacity={1}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="#FFFFFF"
            fillOpacity={1}
            isAnimationActive={false}
          />

          {/* Redraw CI as proper band */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="#F97316"
            strokeWidth={1}
            strokeOpacity={0.4}
            fill="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="#F97316"
            strokeWidth={1}
            strokeOpacity={0.4}
            fill="none"
            isAnimationActive={false}
          />

          {/* Mean line */}
          <Line
            type="monotone"
            dataKey="mean"
            stroke="#1F2937"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          {/* Observed data points */}
          <Scatter
            dataKey="observedPoint"
            fill="#10B981"
            stroke="#059669"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

CalibrationChart.displayName = 'CalibrationChart';

export default CalibrationChart;
