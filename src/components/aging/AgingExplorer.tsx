'use client';
import { Suspense, useMemo, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import StateSelector from '@/components/StateSelector';
import TimelineControls from '@/components/TimelineControls';
import {
  getStatesByNames,
  AGE_COHORT_COLORS,
} from '@/data/hiv-age-projections';
import {
  AGES,
  RACES,
  TRANSMISSION,
  agingQuery,
  maxStates,
  parseAgingSelection,
  type AgingSelection,
} from '@/lib/aging-state';
import MultiStateChartGrid from '@/components/MultiStateChartGrid';

const Loading = () => (
  <p role="status" className="py-16 text-sm text-muted">
    Loading this breakdown…
  </p>
);
const ByRaceView = dynamic(() => import('@/components/ByRaceView'), {
  loading: Loading,
});
const BySexView = dynamic(() => import('@/components/BySexView'), {
  loading: Loading,
});
const views = [
  ['state', 'Overall'],
  ['race', 'Race and ethnicity'],
  ['sex', 'Transmission category'],
] as const;
const selectionEvent = 'jheem:aging-selection';
function subscribeToSelection(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener(selectionEvent, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(selectionEvent, listener);
  };
}
const readSelection = () => window.location.search;
function Explorer() {
  const params = useSearchParams();
  // Use the URL as the single source of truth, with synchronous control updates.
  // Next's search-parameter update is a transition; controlled checkboxes must
  // not briefly revert while that transition runs. The server snapshot also
  // keeps direct links inside the existing Suspense boundary.
  const query = useSyncExternalStore(subscribeToSelection, readSelection, () =>
    params.toString(),
  );
  const selection = useMemo(
    () => parseAgingSelection(new URLSearchParams(query)),
    [query],
  );
  const [notice, setNotice] = useState<{
    search: string;
    message: string;
  } | null>(null);
  const states = useMemo(
    () => getStatesByNames(selection.states),
    [selection.states],
  );
  function update(patch: Partial<AgingSelection>) {
    const next = { ...selection, ...patch };
    const limit = maxStates(next);
    const message =
      next.states.length > limit
        ? `This breakdown can show ${limit} locations at once. The first ${limit} selected locations are retained; use Choose states to change them.`
        : '';
    next.states = next.states.slice(0, limit);
    const search = `?${agingQuery(next)}`;
    setNotice(message ? { search, message } : null);
    window.history.pushState(
      null,
      '',
      `${window.location.pathname}${search}${window.location.hash}`,
    );
    window.dispatchEvent(new Event(selectionEvent));
  }
  const currentNotice = notice?.search === query ? notice.message : '';
  const groups = selection.view === 'race' ? RACES : TRANSMISSION;
  const chosen = selection.view === 'race' ? selection.races : selection.sex;
  return (
    <div>
      <div
        aria-label="Population breakdown"
        role="group"
        className="flex flex-wrap gap-x-6 border-b border-rule"
      >
        {views.map(([view, label]) => (
          <button
            key={view}
            type="button"
            aria-pressed={selection.view === view}
            onClick={() => update({ view })}
            className={`min-h-12 border-b-2 py-3 text-sm ${selection.view === view ? 'border-hopkins-blue font-medium text-hopkins-blue' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {selection.view !== 'state' && (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {selection.view === 'race'
            ? 'Compare Black, Hispanic, and other racial and ethnic groups. “Other” follows the source data’s combined category.'
            : 'MSM means men who have sex with men. Non-MSM includes all other populations in this model; these are transmission categories, not sex categories.'}
        </p>
      )}
      <div className="my-6 border-y border-rule bg-paper px-5 py-5 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="text-sm font-medium">Locations</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {selection.states.length
                ? selection.states
                    .map((s) => (s === 'Total' ? 'Combined states' : s))
                    .join(' · ')
                : 'No locations selected'}
            </p>
          </div>
          <TimelineControls
            yearRange={selection.years}
            onYearRangeChange={(years) => update({ years })}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Display</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  [false, 'People'],
                  [true, 'Percentage'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={selection.normalized === value}
                  onClick={() => update({ normalized: value })}
                  className="aging-choice"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="mt-5 border-t border-rule pt-4">
          <StateSelector
            selectedStates={selection.states}
            maxStates={maxStates(selection)}
            onStateChange={(states) => update({ states })}
          />
        </div>
        {selection.view !== 'state' && (
          <fieldset className="mt-5 border-t border-rule pt-4">
            <legend className="sr-only">Groups to compare</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Object.entries(groups).map(([id, label]) => (
                <label
                  key={id}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-hopkins-blue"
                    checked={(chosen as string[]).includes(id)}
                    disabled={
                      chosen.length === 1 && (chosen as string[]).includes(id)
                    }
                    onChange={() => {
                      const next = (chosen as string[]).includes(id)
                        ? chosen.filter((x) => x !== id)
                        : [...chosen, id];
                      update(
                        selection.view === 'race'
                          ? { races: next as AgingSelection['races'] }
                          : { sex: next as AgingSelection['sex'] },
                      );
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
      {(currentNotice || selection.omittedStates > 0) && (
        <p
          role="status"
          className="mb-5 border-l-2 border-hopkins-blue pl-4 text-sm text-muted"
        >
          {currentNotice ||
            `This breakdown shows up to ${maxStates(selection)} locations. Use Choose states to change the retained locations.`}
        </p>
      )}
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-medium">
          Age groups{' '}
          <span className="font-normal text-muted">
            · select to show or hide across all charts
          </span>
        </legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {AGES.map((age) => (
            <label
              key={age}
              className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                className="accent-hopkins-blue"
                checked={selection.ages.includes(age)}
                disabled={
                  selection.ages.length === 1 && selection.ages.includes(age)
                }
                onChange={() =>
                  update({
                    ages: selection.ages.includes(age)
                      ? selection.ages.filter((x) => x !== age)
                      : AGES.filter(
                          (x) => x === age || selection.ages.includes(x),
                        ),
                  })
                }
              />
              <span
                aria-hidden="true"
                className="h-3 w-3"
                style={{ backgroundColor: AGE_COHORT_COLORS[age] }}
              />
              {age} years
            </label>
          ))}
        </div>
      </fieldset>
      {selection.view === 'state' ? (
        <MultiStateChartGrid
          states={states}
          normalized={selection.normalized}
          yearRange={selection.years}
          ages={selection.ages}
        />
      ) : selection.view === 'race' ? (
        <ByRaceView selection={selection} />
      ) : (
        <BySexView selection={selection} />
      )}
    </div>
  );
}
export default function AgingExplorer() {
  return (
    <Suspense fallback={<Loading />}>
      <Explorer />
    </Suspense>
  );
}
