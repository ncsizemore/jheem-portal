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
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{`${stateName} - ${label}`}</p>
          {payload.reverse().map((entry: TooltipPayload, index: number) => {
            const cohort = entry.dataKey.split('_').slice(-1)[0];
            const value = entry.value || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium">{cohort} years:</span>
                <span>
                  {normalized
                    ? `${value.toFixed(1)}%`
                    : `${value.toLocaleString()} (${percentage}%)`
                  }
                </span>
              </div>
            );
          })}
          {!normalized && (
            <div className="border-t border-gray-200 mt-2 pt-2">
              <span className="text-sm font-medium">Total: {total.toLocaleString()}</span>
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
  const CustomLegend = () => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {allCohorts.map((cohort) => {
          const isVisible = visibleCohorts.has(cohort);
          const color = AGE_COHORT_COLORS[cohort];

          return (
            <button
              key={cohort}
              onClick={() => toggleCohort(cohort)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${
                isVisible
                  ? 'bg-white border-gray-200 hover:border-hopkins-blue hover:shadow-sm'
                  : 'bg-gray-50 border-gray-200 border-dashed'
              }`}
              title={isVisible ? 'Click to hide this age group' : 'Click to show this age group'}
            >
              <div
                className={`w-3 h-3 rounded-sm transition-all ${
                  isVisible ? '' : 'opacity-40'
                }`}
                style={{
                  backgroundColor: color,
                  ...(isVisible ? {} : {
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)`
                  })
                }}
              />
              <span className={`text-sm transition-all ${
                isVisible
                  ? 'text-gray-700 font-medium'
                  : 'text-gray-400 line-through'
              }`}>
                {cohort} years
              </span>
              {!isVisible && (
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
                </svg>
              )}
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
          <Tooltip content={<CustomTooltip />} />
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