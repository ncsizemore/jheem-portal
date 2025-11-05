'use client';

import React, { memo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { AGE_COHORT_COLORS } from '@/data/hiv-age-projections';

interface ChartDataPoint {
  year: number;
  [key: string]: number;
}

interface TooltipPayload {
  value?: number;
  dataKey: string;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}

interface AgeDistributionChartProps {
  data: ChartDataPoint[];
  statePrefix: string;
  stateName: string;
  normalized?: boolean;
  height?: number;
}

type AgeCohort = '13-24' | '25-34' | '35-44' | '45-54' | '55+';

const AgeDistributionChart = memo(({
  data,
  statePrefix,
  stateName,
  normalized = false,
  height = 400
}: AgeDistributionChartProps) => {
  // Track which cohorts are visible (all visible by default)
  const [visibleCohorts, setVisibleCohorts] = useState<Set<AgeCohort>>(
    new Set(['13-24', '25-34', '35-44', '45-54', '55+'])
  );

  // Toggle cohort visibility
  const toggleCohort = (cohort: AgeCohort) => {
    setVisibleCohorts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cohort)) {
        // Don't allow hiding all cohorts
        if (newSet.size > 1) {
          newSet.delete(cohort);
        }
      } else {
        newSet.add(cohort);
      }
      return newSet;
    });
  };
  // Custom tooltip to show detailed information
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: TooltipPayload) => sum + (entry.value || 0), 0);

      return (
        <div className="relative z-50 bg-white/98 backdrop-blur-xl p-4 border-2 border-gray-200/60 rounded-2xl shadow-2xl ring-1 ring-black/5">
          {/* Header */}
          <div className="mb-3 pb-2 border-b border-gray-200/70">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {stateName}
            </p>
            <p className="text-xl font-bold text-hopkins-blue bg-gradient-to-r from-hopkins-blue to-hopkins-spirit-blue bg-clip-text">
              {label}
            </p>
            <p className="text-[9px] text-gray-500 mt-1 italic">
              Median case counts (1000 simulations)
            </p>
          </div>

          {/* Age cohort data */}
          <div className="space-y-2">
            {payload.reverse().map((entry: TooltipPayload, index: number) => {
              const cohort = entry.dataKey.split('_').slice(-1)[0] as AgeCohort;
              const value = entry.value || 0;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              // Use actual color from AGE_COHORT_COLORS, not gradient URL
              const actualColor = AGE_COHORT_COLORS[cohort];

              return (
                <div key={index} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className="w-3 h-3 rounded-sm shadow-sm"
                      style={{ backgroundColor: actualColor }}
                    />
                    <span className="font-medium text-gray-700">{cohort}</span>
                  </div>
                  <div className="text-right">
                    {normalized ? (
                      // Proportional mode: Show percentage first, then count
                      <>
                        <span className="font-semibold text-gray-900">
                          {value.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500 ml-1.5">
                          ({Math.round((value / 100) * total).toLocaleString()})
                        </span>
                      </>
                    ) : (
                      // Case counts mode: Show count first, then percentage
                      <>
                        <span className="font-semibold text-gray-900">
                          {value.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 ml-1.5">
                          ({percentage}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total (for non-normalized view) */}
          {!normalized && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-gray-900">{total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // All cohorts for complete legend (regardless of visibility)
  const allCohorts: AgeCohort[] = ['13-24', '25-34', '35-44', '45-54', '55+'];

  // Custom interactive legend - always shows all cohorts
  // Make it more compact for smaller charts
  const isCompact = height < 380;

  const CustomLegend = () => {
    return (
      <div className={`flex flex-wrap justify-center ${isCompact ? 'gap-1.5 mt-2' : 'gap-2.5 mt-4'}`}>
        {allCohorts.map((cohort) => {
          const isVisible = visibleCohorts.has(cohort);
          const color = AGE_COHORT_COLORS[cohort];

          return (
            <button
              key={cohort}
              onClick={() => toggleCohort(cohort)}
              className={`group flex items-center ${isCompact ? 'gap-1.5 px-2 py-1' : 'gap-2 px-3 py-1.5'} rounded-lg border transition-all duration-200 ${
                isVisible
                  ? 'bg-white/90 hover:bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md hover:scale-105'
                  : 'bg-transparent border-transparent hover:bg-gray-50'
              }`}
              title={isVisible ? 'Click to hide this age group' : 'Click to show this age group'}
              aria-label={`${isVisible ? 'Hide' : 'Show'} age group ${cohort}`}
            >
              <div
                className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} rounded transition-all duration-200 ${
                  isVisible
                    ? 'shadow-sm group-hover:shadow-md'
                    : 'opacity-30 grayscale'
                }`}
                style={{
                  backgroundColor: color,
                  boxShadow: isVisible ? `0 0 8px ${color}40` : 'none',
                }}
              />
              <span className={`${isCompact ? 'text-xs' : 'text-sm'} transition-all ${
                isVisible
                  ? 'text-gray-700 font-medium'
                  : 'text-gray-400'
              }`}>
                {cohort}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-2 text-center">
        <h3 className="text-base font-semibold text-gray-900">{stateName}</h3>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 5,
          }}
        >
          {/* Gradient Definitions for Modern Look */}
          <defs>
            <linearGradient id="gradient-13-24" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="gradient-25-34" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="gradient-35-44" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="gradient-45-54" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#84CC16" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#84CC16" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="gradient-55+" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.7} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.6} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#d1d5db"
            tickLine={{ stroke: '#d1d5db' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#d1d5db"
            tickLine={{ stroke: '#d1d5db' }}
            domain={normalized ? [0, 100] : [0, 'auto']}
            ticks={normalized ? [0, 25, 50, 75, 100] : undefined}
            tickFormatter={(value) => {
              if (normalized) {
                return `${value}%`;
              }
              return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
            }}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ zIndex: 1000 }}
            cursor={{ fill: 'rgba(0, 45, 114, 0.08)', radius: 8 }}
          />
          <Legend content={<CustomLegend />} />

          {/* Stacked bars with gradient fills */}
          {visibleCohorts.has('13-24') && (
            <Bar
              dataKey={`${statePrefix}_13-24`}
              stackId="1"
              fill="url(#gradient-13-24)"
              radius={[0, 0, 0, 0]}
            />
          )}
          {visibleCohorts.has('25-34') && (
            <Bar
              dataKey={`${statePrefix}_25-34`}
              stackId="1"
              fill="url(#gradient-25-34)"
              radius={[0, 0, 0, 0]}
            />
          )}
          {visibleCohorts.has('35-44') && (
            <Bar
              dataKey={`${statePrefix}_35-44`}
              stackId="1"
              fill="url(#gradient-35-44)"
              radius={[0, 0, 0, 0]}
            />
          )}
          {visibleCohorts.has('45-54') && (
            <Bar
              dataKey={`${statePrefix}_45-54`}
              stackId="1"
              fill="url(#gradient-45-54)"
              radius={[0, 0, 0, 0]}
            />
          )}
          {visibleCohorts.has('55+') && (
            <Bar
              dataKey={`${statePrefix}_55+`}
              stackId="1"
              fill="url(#gradient-55+)"
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

AgeDistributionChart.displayName = 'AgeDistributionChart';

export default AgeDistributionChart;