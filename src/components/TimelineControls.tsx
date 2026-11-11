'use client';
import { useId } from 'react';
export default function TimelineControls({
  yearRange,
  onYearRangeChange,
  minYear = 2025,
  maxYear = 2040,
}: {
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const id = useId();
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i,
  );
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium">Years</legend>
      <div className="flex items-center gap-3">
        <label htmlFor={`${id}-start`} className="sr-only">
          Start year
        </label>
        <select
          id={`${id}-start`}
          className="aging-select"
          value={yearRange[0]}
          onChange={(e) =>
            onYearRangeChange([
              Number(e.target.value),
              Math.max(Number(e.target.value), yearRange[1]),
            ])
          }
        >
          {years.map((year) => (
            <option key={year}>{year}</option>
          ))}
        </select>
        <span className="text-muted">to</span>
        <label htmlFor={`${id}-end`} className="sr-only">
          End year
        </label>
        <select
          id={`${id}-end`}
          className="aging-select"
          value={yearRange[1]}
          onChange={(e) =>
            onYearRangeChange([
              Math.min(yearRange[0], Number(e.target.value)),
              Number(e.target.value),
            ])
          }
        >
          {years.map((year) => (
            <option key={year}>{year}</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
