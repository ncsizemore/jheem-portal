'use client';

import { useSyncExternalStore } from 'react';

const CHANGE = 'jheem-analysis-navigation';
function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener(CHANGE, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(CHANGE, callback);
  };
}
const snapshot = () => window.location.search;
const serverSnapshot = () => '';

export function useAnalysisQuery() {
  return new URLSearchParams(
    useSyncExternalStore(subscribe, snapshot, serverSnapshot),
  );
}

export function updateAnalysisQuery(
  values: Record<string, string | null>,
  replace = false,
) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.href === window.location.href) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event(CHANGE));
}
