'use client';

import React, { useCallback, memo } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface TimelineControlsProps {
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  minYear?: number;
  maxYear?: number;
}

const TimelineControls = memo(({
  yearRange,
  onYearRangeChange,
  minYear = 2025,
  maxYear = 2040
}: TimelineControlsProps) => {
  const [startYear, endYear] = yearRange;

  const handleSliderChange = useCallback((value: number | number[]) => {
    if (Array.isArray(value) && value.length === 2) {
      onYearRangeChange([value[0], value[1]]);
    }
  }, [onYearRangeChange]);

  // Quick year preset buttons
  const presets = [
    { label: 'All Years', range: [minYear, maxYear] as [number, number] },
    { label: 'Short Term', range: [2025, 2030] as [number, number] },
    { label: 'Mid Term', range: [2030, 2035] as [number, number] },
    { label: 'Long Term', range: [2035, 2040] as [number, number] },
  ];

  // Year markers for display
  const marks: Record<number, string> = {
    [minYear]: String(minYear),
    2030: '2030',
    2035: '2035',
    [maxYear]: String(maxYear),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Timeline Range:
        </label>
        <div className="text-sm font-semibold text-hopkins-blue">
          {startYear} - {endYear}
        </div>
      </div>

      {/* Range Slider */}
      <div className="px-2 pt-2 pb-8">
        <Slider
          range
          min={minYear}
          max={maxYear}
          value={[startYear, endYear]}
          onChange={handleSliderChange}
          marks={marks}
          allowCross={false}
          styles={{
            track: {
              backgroundColor: '#002D72', // hopkins-blue
              height: 8,
            },
            tracks: {
              backgroundColor: '#002D72',
              height: 8,
            },
            rail: {
              backgroundColor: '#e5e7eb', // gray-200
              height: 8,
            },
            handle: {
              backgroundColor: '#fff',
              borderColor: '#002D72',
              borderWidth: 3,
              width: 20,
              height: 20,
              marginTop: -6,
              opacity: 1,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            },
          }}
          className="timeline-slider"
        />
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = preset.range[0] === startYear && preset.range[1] === endYear;
          return (
            <button
              key={preset.label}
              onClick={() => onYearRangeChange(preset.range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-hopkins-blue text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-500">
        Showing {endYear - startYear + 1} years of projection data
        {endYear - startYear + 1 < maxYear - minYear + 1 && ' (filtered view)'}
      </p>

      {/* Custom styling for rc-slider hover/active states */}
      <style jsx global>{`
        .timeline-slider .rc-slider-handle:hover,
        .timeline-slider .rc-slider-handle:focus {
          border-color: #68ACE5 !important;
          box-shadow: 0 0 0 4px rgba(104, 172, 229, 0.2) !important;
        }

        .timeline-slider .rc-slider-handle:active {
          border-color: #68ACE5 !important;
          box-shadow: 0 0 0 4px rgba(104, 172, 229, 0.3) !important;
        }

        .timeline-slider .rc-slider-mark-text {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 8px;
        }

        .timeline-slider .rc-slider-mark-text-active {
          color: #002D72;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
});

TimelineControls.displayName = 'TimelineControls';

export default TimelineControls;
