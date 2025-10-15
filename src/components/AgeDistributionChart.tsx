'use client';

import React, { memo } from 'react';
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

interface AgeDistributionChartProps {
  data: any[];
  statePrefix: string;
  stateName: string;
  normalized?: boolean;
  height?: number;
}

const AgeDistributionChart = memo(({
  data,
  statePrefix,
  stateName,
  normalized = false,
  height = 400
}: AgeDistributionChartProps) => {
  // Custom tooltip to show detailed information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{`${stateName} - ${label}`}</p>
          {payload.reverse().map((entry: any, index: number) => {
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

  // Custom legend
  const CustomLegend = (props: any) => {
    const { payload } = props;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const cohort = entry.dataKey.split('_').slice(-1)[0];
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-700">{cohort} years</span>
            </div>
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
          {normalized ? 'Proportional Distribution' : 'Absolute Numbers'}
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
            tickFormatter={(value) => {
              if (normalized) {
                return `${value}%`;
              }
              return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />

          {/* Stacked bars for each age cohort */}
          <Bar
            dataKey={`${statePrefix}_13-24`}
            stackId="1"
            fill={AGE_COHORT_COLORS['13-24']}
          />
          <Bar
            dataKey={`${statePrefix}_25-34`}
            stackId="1"
            fill={AGE_COHORT_COLORS['25-34']}
          />
          <Bar
            dataKey={`${statePrefix}_35-44`}
            stackId="1"
            fill={AGE_COHORT_COLORS['35-44']}
          />
          <Bar
            dataKey={`${statePrefix}_45-54`}
            stackId="1"
            fill={AGE_COHORT_COLORS['45-54']}
          />
          <Bar
            dataKey={`${statePrefix}_55+`}
            stackId="1"
            fill={AGE_COHORT_COLORS['55+']}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

AgeDistributionChart.displayName = 'AgeDistributionChart';

export default AgeDistributionChart;