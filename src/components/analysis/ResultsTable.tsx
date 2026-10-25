'use client';
import { useState } from 'react';
import type { FacetPanel } from '@/types/native-plotting';

const number = (value?: number) =>
  value == null
    ? '—'
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const interval = (lower?: number, upper?: number) =>
  lower == null || upper == null ? '—' : `${number(lower)}–${number(upper)}`;
const cell = 'px-3 py-3 text-right tabular-nums whitespace-nowrap';
export default function ResultsTable({
  panels,
  scenario,
  units,
  title,
  selection,
}: {
  panels: FacetPanel[];
  scenario: string;
  units: string;
  title: string;
  selection: string;
}) {
  const [pagination, setPagination] = useState({ selection, page: 0 });
  const rows = panels.flatMap((panel) =>
    panel.isIndividualSimulation
      ? (panel.individualSimulations ?? []).flatMap((line) =>
          line.points.map((point) => ({
            group: panel.facetLabel,
            year: point.year,
            value: point.value,
            lower: undefined,
            upper: undefined,
            baselineValue: undefined,
            baselineLower: undefined,
            baselineUpper: undefined,
            simulation: `${line.simset} · ${line.simId}`,
          })),
        )
      : panel.data.map((point) => ({
          group: panel.facetLabel,
          ...point,
          simulation: '',
        })),
  );
  const page =
    pagination.selection === selection
      ? Math.min(pagination.page, Math.max(0, Math.ceil(rows.length / 50) - 1))
      : 0;
  const individual = panels.some((panel) => panel.isIndividualSimulation);
  return (
    <section aria-label="Modeled values" className="mt-5">
      <p className="mb-3 text-sm text-muted">
        Values in {units}. Intervals contain the middle 95% of simulated
        estimates. The table includes all model series, regardless of chart
        display settings.
      </p>
      <div
        className="overflow-x-auto rounded border border-rule"
        tabIndex={0}
        role="region"
        aria-label="Scrollable results table"
      >
        <table className="w-full text-sm text-ink">
          <caption className="sr-only">
            {title} — modeled results in {units}
          </caption>
          <thead className="bg-paper">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-paper px-3 py-3 text-left"
              >
                Year
              </th>
              {panels.length > 1 && (
                <th scope="col" className="px-3 text-left">
                  Population
                </th>
              )}
              {individual && (
                <th scope="col" className="px-3 text-left">
                  Simulation
                </th>
              )}
              <th scope="col" className={cell}>
                {individual ? 'Value' : scenario}
              </th>
              {!individual && (
                <>
                  <th scope="col" className={cell}>
                    {scenario} 95% interval
                  </th>
                  <th scope="col" className={cell}>
                    Baseline
                  </th>
                  <th scope="col" className={cell}>
                    Baseline 95% interval
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 50, (page + 1) * 50).map((row, index) => (
              <tr key={index} className="border-t border-rule">
                <th
                  scope="row"
                  className="sticky left-0 bg-white px-3 py-3 text-left font-medium tabular-nums"
                >
                  {row.year}
                </th>
                {panels.length > 1 && (
                  <td className="min-w-40 px-3">{row.group}</td>
                )}
                {individual && <td className="px-3">{row.simulation}</td>}
                <td className={cell}>{number(row.value)}</td>
                {!individual && (
                  <>
                    <td className={`${cell} text-muted`}>
                      {interval(row.lower, row.upper)}
                    </td>
                    <td className={cell}>{number(row.baselineValue)}</td>
                    <td className={`${cell} text-muted`}>
                      {interval(row.baselineLower, row.baselineUpper)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>
          {rows.length ? page * 50 + 1 : 0}–
          {Math.min((page + 1) * 50, rows.length)} of {rows.length} rows · CSV
          includes all rows
        </span>
        {rows.length > 50 && (
          <div className="flex gap-4">
            <button
              disabled={page === 0}
              onClick={() => setPagination({ selection, page: page - 1 })}
              className="disabled:opacity-40"
            >
              Previous rows
            </button>
            <button
              disabled={(page + 1) * 50 >= rows.length}
              onClick={() => setPagination({ selection, page: page + 1 })}
              className="disabled:opacity-40"
            >
              Next rows
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function ObservationsTable({
  panels,
  units,
}: {
  panels: FacetPanel[];
  units: string;
}) {
  const observations = panels.flatMap((panel) =>
    panel.observations.map((obs) => ({ ...obs, group: panel.facetLabel })),
  );
  const [page, setPage] = useState(0);
  const effectivePage = Math.min(
    page,
    Math.max(0, Math.ceil(observations.length / 50) - 1),
  );
  if (!observations.length)
    return (
      <p className="mt-4 text-sm text-muted">
        No observed data are included for this selection.
      </p>
    );
  return (
    <details className="mt-6 border-t border-rule pt-4">
      <summary className="cursor-pointer text-sm font-medium text-ink">
        Observed data and sources ({observations.length})
      </summary>
      <p className="my-3 text-sm text-muted">
        Reported observations used alongside the model estimates. Values in{' '}
        {units}; source definitions and coverage can differ.
      </p>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Scrollable observations table"
      >
        <table className="w-full text-left text-sm text-ink">
          <caption className="sr-only">
            Observed values and sources in {units}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="py-2">
                Year
              </th>
              {panels.length > 1 && <th scope="col">Population</th>}
              <th scope="col" className="px-3">
                Value
              </th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            {observations
              .slice(effectivePage * 50, (effectivePage + 1) * 50)
              .map((obs, i) => (
                <tr key={i} className="border-t border-rule">
                  <th scope="row" className="py-3 font-normal">
                    {obs.year}
                  </th>
                  {panels.length > 1 && (
                    <td className="min-w-40">{obs.group}</td>
                  )}
                  <td className="px-3 tabular-nums">{number(obs.value)}</td>
                  <td className="min-w-48">
                    {obs.url && /^https?:\/\//.test(obs.url) ? (
                      <a
                        className="underline underline-offset-4"
                        href={obs.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {obs.source}
                      </a>
                    ) : (
                      obs.source
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {observations.length > 50 && (
        <div className="mt-3 flex gap-4 text-sm text-muted">
          <button
            disabled={!effectivePage}
            onClick={() => setPage(effectivePage - 1)}
          >
            Previous observations
          </button>
          <span>
            {effectivePage * 50 + 1}–
            {Math.min((effectivePage + 1) * 50, observations.length)} of{' '}
            {observations.length}
          </span>
          <button
            disabled={(effectivePage + 1) * 50 >= observations.length}
            onClick={() => setPage(effectivePage + 1)}
          >
            Next observations
          </button>
        </div>
      )}
    </details>
  );
}
