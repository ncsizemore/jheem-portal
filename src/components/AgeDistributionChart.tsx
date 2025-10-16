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
        <div className="relative z-50 bg-white/95 backdrop-blur-sm p-4 border border-gray-300 rounded-xl shadow-xl">
          {/* Header */}
          <div className="mb-3 pb-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {stateName}
            </p>
            <p className="text-lg font-bold text-hopkins-blue">
              {label}
            </p>
          </div>

          {/* Age cohort data */}
          <div className="space-y-2">
            {payload.reverse().map((entry: TooltipPayload, index: number) => {
              const cohort = entry.dataKey.split('_').slice(-1)[0];
              const value = entry.value || 0;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

              return (
                <div key={index} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className="w-3 h-3 rounded-sm shadow-sm"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium text-gray-700">{cohort}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">
                      {normalized
                        ? `${value.toFixed(1)}%`
                        : value.toLocaleString()
                      }
                    </span>
                    {!normalized && (
                      <span className="text-xs text-gray-500 ml-1.5">
                        ({percentage}%)
                      </span>
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
              className={`group flex items-center ${isCompact ? 'gap-1.5 px-2 py-1' : 'gap-2 px-3 py-1.5'} rounded-md transition-all ${
                isVisible
                  ? 'bg-white hover:bg-gray-50'
                  : 'bg-transparent'
              }`}
              title={isVisible ? 'Click to hide this age group' : 'Click to show this age group'}
            >
              <div
                className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} rounded-sm transition-all ${
                  isVisible
                    ? 'shadow-sm'
                    : 'opacity-30 grayscale'
                }`}
                style={{
                  backgroundColor: color,
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
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900">{stateName}</h3>
        <p className="text-sm text-gray-600">
          {normalized ? 'Proportional Distribution' : 'Case Counts'}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#666"
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
            cursor={{ fill: 'rgba(0, 45, 114, 0.05)' }}
          />
          <Legend content={<CustomLegend />} />

          {/* Stacked bars for each age cohort - conditionally rendered based on visibility */}
          {visibleCohorts.has('13-24') && (
            <Bar
              dataKey={`${statePrefix}_13-24`}
              stackId="1"
              fill={AGE_COHORT_COLORS['13-24']}
            />
          )}
          {visibleCohorts.has('25-34') && (
            <Bar
              dataKey={`${statePrefix}_25-34`}
              stackId="1"
              fill={AGE_COHORT_COLORS['25-34']}
            />
          )}
          {visibleCohorts.has('35-44') && (
            <Bar
              dataKey={`${statePrefix}_35-44`}
              stackId="1"
              fill={AGE_COHORT_COLORS['35-44']}
            />
          )}
          {visibleCohorts.has('45-54') && (
            <Bar
              dataKey={`${statePrefix}_45-54`}
              stackId="1"
              fill={AGE_COHORT_COLORS['45-54']}
            />
          )}
          {visibleCohorts.has('55+') && (
            <Bar
              dataKey={`${statePrefix}_55+`}
              stackId="1"
              fill={AGE_COHORT_COLORS['55+']}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

AgeDistributionChart.displayName = 'AgeDistributionChart';

export default AgeDistributionChart;