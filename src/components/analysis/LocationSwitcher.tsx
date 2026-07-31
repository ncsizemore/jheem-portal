'use client';

/**
 * LocationSwitcher - Dropdown for switching between locations
 *
 * Features:
 * - Search/filter locations
 * - Current location display with expand/collapse
 * - Keyboard accessible
 */

import { useState, useRef, useEffect, useId, useMemo } from 'react';

export interface Location {
  code: string;
  name: string;
}

interface LocationSwitcherProps {
  currentLocation: Location | undefined;
  locationCode: string;
  availableLocations: Location[];
  geographyLabelPlural: string;
  onLocationChange: (location: Location) => void;
}

export default function LocationSwitcher({
  currentLocation,
  locationCode,
  availableLocations,
  geographyLabelPlural,
  onLocationChange,
}: LocationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownId = useId();

  // Filtered locations for search
  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return availableLocations;
    const searchLower = searchTerm.toLowerCase().trim();
    return availableLocations.filter(loc =>
      loc.name.toLowerCase().includes(searchLower)
    );
  }, [availableLocations, searchTerm]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (loc: Location) => {
    setIsOpen(false);
    if (loc.code !== locationCode) {
      onLocationChange(loc);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? dropdownId : undefined}
        className="text-left group flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div>
          <h1 className="font-semibold text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
            {currentLocation?.name.split(',')[0] || locationCode}
          </h1>
          {currentLocation?.name.includes(',') && (
            <p className="text-slate-400 text-xs">
              {currentLocation.name.split(',').slice(1).join(',').trim()}
            </p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />
          <div
            id={dropdownId}
            className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50 min-w-[min(280px,calc(100vw-2rem))]"
          >
            {/* Search input */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={`Search ${geographyLabelPlural.toLowerCase()}...`}
                  aria-label={`Search ${geographyLabelPlural.toLowerCase()}`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear location search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Location list */}
            <div className="max-h-64 overflow-y-auto" role="listbox" aria-label={geographyLabelPlural}>
              {filteredLocations.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-slate-500">No {geographyLabelPlural.toLowerCase()} match &quot;{searchTerm}&quot;</p>
                </div>
              ) : (
                filteredLocations.map(loc => (
                  <button
                    key={loc.code}
                    type="button"
                    role="option"
                    aria-selected={loc.code === locationCode}
                    onClick={() => handleSelect(loc)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between
                      ${loc.code === locationCode ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                  >
                    <span>{loc.name}</span>
                    {loc.code === locationCode && (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer showing count */}
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400">
                {filteredLocations.length === availableLocations.length
                  ? `${availableLocations.length} ${geographyLabelPlural.toLowerCase()}`
                  : `${filteredLocations.length} of ${availableLocations.length} ${geographyLabelPlural.toLowerCase()}`}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
