'use client';

/**
 * DisplayOptionsPopover - Chart display options dropdown
 */

import { useState } from 'react';
import type { ChartDisplayOptions } from '@/types/native-plotting';

interface DisplayOptionsPopoverProps {
  options: ChartDisplayOptions;
  onChange: (options: ChartDisplayOptions) => void;
}

export default function DisplayOptionsPopover({
  options,
  onChange,
}: DisplayOptionsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md transition-colors
          ${isOpen
            ? 'bg-slate-200 text-slate-700'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
        title="Display options"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Display</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 min-w-[160px]">
            <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Show on chart</p>
            </div>
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={options.showConfidenceInterval}
                onChange={e => onChange({ ...options, showConfidenceInterval: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              95% CI
            </label>
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={options.showBaseline}
                onChange={e => onChange({ ...options, showBaseline: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Baseline
            </label>
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={options.showObservations}
                onChange={e => onChange({ ...options, showObservations: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Observed data
            </label>
          </div>
        </>
      )}
    </div>
  );
}
