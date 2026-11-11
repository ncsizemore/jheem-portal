'use client';
import { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AGE_COHORT_COLORS,
  type ChartDataPoint,
} from '@/data/hiv-age-projections';
import { AGES, type AgeGroup } from '@/lib/aging-state';
interface Props {
  data: ChartDataPoint[];
  statePrefix: string;
  stateName: string;
  normalized?: boolean;
  height?: number;
  ages?: readonly AgeGroup[];
}
function AgeDistributionChart({
  data,
  statePrefix,
  stateName,
  normalized = false,
  height = 340,
  ages = AGES,
}: Props) {
  const displayName = stateName.replace(
    /^Total(?= - |$)/,
    'Combined study states',
  );
  return (
    <div className="min-w-0" data-testid="aging-chart">
      <h3 className="font-serif text-2xl leading-snug" data-chart-title>
        {displayName}
      </h3>
      <p className="mb-4 mt-1 text-xs text-muted">
        {normalized
          ? 'Percentage of people with diagnosed HIV'
          : 'People with diagnosed HIV'}
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
          accessibilityLayer
          aria-label={`${displayName}: age distribution by year`}
        >
          <CartesianGrid vertical={false} stroke="#dce4e7" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: '#506271' }}
            axisLine={{ stroke: '#bac9d1' }}
            tickLine={false}
            minTickGap={18}
          />
          <YAxis
            width={48}
            domain={normalized ? [0, 100] : [0, 'auto']}
            ticks={normalized ? [0, 25, 50, 75, 100] : undefined}
            tick={{ fontSize: 12, fill: '#506271' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              normalized
                ? `${value}%`
                : value >= 1000
                  ? `${Number((value / 1000).toFixed(1))}k`
                  : String(value)
            }
          />
          <Tooltip
            cursor={{ fill: '#173e560a' }}
            isAnimationActive={false}
            content={({ active, label }) => {
              const row = data.find((item) => item.year === Number(label));
              if (!active || !row) return null;
              return (
                <div className="border border-rule bg-white p-4 text-sm shadow-sm">
                  <p className="mb-2 font-medium">
                    {displayName} · {label}
                  </p>
                  <p className="mb-3 text-xs text-muted">
                    {normalized
                      ? 'Share of the full population in this panel'
                      : 'Median projections'}
                  </p>
                  {ages.map((age) => (
                    <div key={age} className="flex justify-between gap-6 py-1">
                      <span>{age} years</span>
                      <span className="tabular-nums">
                        {normalized
                          ? `${row[`${statePrefix}_${age}`].toFixed(1)}%`
                          : Math.round(
                              row[`${statePrefix}_${age}`],
                            ).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {ages.map((age) => (
            <Bar
              key={age}
              dataKey={`${statePrefix}_${age}`}
              stackId="age"
              fill={AGE_COHORT_COLORS[age]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <details className="mt-3 border-t border-rule pt-3">
        <summary className="min-h-8 cursor-pointer text-sm text-hopkins-blue">
          View values for {displayName}
        </summary>
        <div
          className="mt-3 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={`${displayName} data table`}
        >
          <table className="w-full min-w-100 border-collapse text-right text-xs tabular-nums">
            <caption className="pb-3 text-left leading-relaxed text-muted">
              {displayName} ·{' '}
              {normalized
                ? 'Percent of all age groups'
                : 'People; median by age group'}
            </caption>
            <thead>
              <tr className="border-b border-rule">
                <th scope="col" className="py-2 text-left">
                  Year
                </th>
                {ages.map((age) => (
                  <th scope="col" key={age} className="px-2 py-2 font-medium">
                    {age}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.year} className="border-b border-rule">
                  <th scope="row" className="py-2 text-left font-normal">
                    {row.year}
                  </th>
                  {ages.map((age) => (
                    <td key={age} className="px-2 py-2">
                      {normalized
                        ? `${row[`${statePrefix}_${age}`].toFixed(1)}%`
                        : Math.round(
                            row[`${statePrefix}_${age}`],
                          ).toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
export default memo(AgeDistributionChart);
