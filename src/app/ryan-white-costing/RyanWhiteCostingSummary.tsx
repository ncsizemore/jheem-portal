'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchRyanWhiteCostingSeries,
  ryanWhiteCostingMetadata,
  ryanWhiteCostingSummary,
  type AnnualCostPoint,
  type PooledFinalYearSummary,
  type RyanWhiteCostingSeries,
} from '@/data/ryan-white-costing';
import { STATE_CODE_TO_NAME } from '@/data/states';

const BLUE = '#2563a6';
const TEAL = '#0f766e';
const RUST = '#a94f16';
const TOTAL = 'Total';

type LocationKey = typeof TOTAL | string;

interface ChartPoint {
  year: number;
  care: number;
  savings: number;
}

function stateName(code: string): string {
  return STATE_CODE_TO_NAME[code] ?? code;
}

function formatDollars(value: number): string {
  const sign = value < 0 ? '−' : '';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000) return `${sign}$${Math.round(absolute / 1_000_000)}M`;
  if (absolute >= 1_000) return `${sign}$${Math.round(absolute / 1_000)}K`;
  return `${sign}$${Math.round(absolute)}`;
}

function formatCount(value: number): string {
  const absolute = Math.abs(value);
  const increment = absolute >= 10_000 ? 1_000 : absolute >= 1_000 ? 100 : absolute >= 100 ? 10 : 1;
  const rounded = Math.round(value / increment) * increment;
  return rounded.toLocaleString('en-US');
}

function formatAxisDollars(value: number): string {
  if (value === 0) return '$0';
  return `$${Math.round(value / 1_000_000_000)}B`;
}

function likelyRange(lower: number, upper: number): string {
  if (lower < 0 && upper > 0) {
    return `${formatDollars(Math.abs(lower))} in net savings to ${formatDollars(upper)} in net costs`;
  }
  if (upper <= 0) {
    return `${formatDollars(Math.abs(upper))} to ${formatDollars(Math.abs(lower))} in net savings`;
  }
  return `${formatDollars(lower)} to ${formatDollars(upper)} in net costs`;
}

function pooledFor(location: LocationKey): PooledFinalYearSummary {
  if (location === TOTAL) return ryanWhiteCostingSummary.national.pooledFinalYear;
  return ryanWhiteCostingSummary.states.find((item) => item.state === location)?.pooledFinalYear
    ?? ryanWhiteCostingSummary.national.pooledFinalYear;
}

function finalFor(location: LocationKey) {
  if (location === TOTAL) return ryanWhiteCostingSummary.national.finalYear;
  return ryanWhiteCostingSummary.states.find((item) => item.state === location)?.finalYear
    ?? ryanWhiteCostingSummary.national.finalYear;
}

function pointsFor(series: RyanWhiteCostingSeries | null, location: LocationKey): AnnualCostPoint[] {
  if (!series) return [];
  return location === TOTAL ? series.national : series.states[location] ?? [];
}

function ResultTile({ label, value, note, tone }: {
  label: string;
  value: string;
  note: string;
  tone: 'saving' | 'cost' | 'net';
}) {
  const colors = tone === 'saving'
    ? 'border-teal-200 bg-teal-50/70 text-teal-900'
    : tone === 'cost'
      ? 'border-blue-200 bg-blue-50/70 text-blue-950'
      : 'border-amber-200 bg-amber-50/70 text-amber-950';

  return (
    <div className={`border px-5 py-5 sm:px-6 ${colors}`}>
      <dt className="text-xs font-semibold uppercase tracking-[0.13em] opacity-70">{label}</dt>
      <dd className="mt-2 font-mono text-3xl font-semibold tabular-nums sm:text-4xl">{value}</dd>
      <p className="mt-2 text-sm leading-relaxed opacity-75">{note}</p>
    </div>
  );
}

function CostTooltip({ active, payload, label }: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string; value?: number }>;
}) {
  if (!active || !payload?.length) return null;
  const care = payload.find((item) => item.dataKey === 'care')?.value;
  const savings = payload.find((item) => item.dataKey === 'savings')?.value;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3.5 py-3 shadow-lg">
      <p className="text-xs font-semibold text-slate-500">Through {label}</p>
      <p className="mt-2 flex justify-between gap-8 text-sm text-slate-700">
        <span>HIV care costs</span>
        <span className="font-mono font-semibold tabular-nums">{care == null ? '—' : formatDollars(care)}</span>
      </p>
      <p className="mt-1 flex justify-between gap-8 text-sm text-slate-700">
        <span>ADAP savings</span>
        <span className="font-mono font-semibold tabular-nums">{savings == null ? '—' : formatDollars(savings)}</span>
      </p>
    </div>
  );
}

export default function RyanWhiteCostingSummary() {
  const [location, setLocation] = useState<LocationKey>(TOTAL);
  const [series, setSeries] = useState<RyanWhiteCostingSeries | null>(null);
  const [seriesError, setSeriesError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRyanWhiteCostingSeries()
      .then((data) => {
        if (!cancelled) setSeries(data);
      })
      .catch(() => {
        if (!cancelled) setSeriesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nationalFinal = ryanWhiteCostingSummary.national.finalYear;
  const nationalPooled = ryanWhiteCostingSummary.national.pooledFinalYear;
  const nationalCare = nationalPooled.cumulativeCareCost.median;
  const nationalSavings = nationalFinal.cumulativeAdapSpendingAvoided;
  const nationalNet = nationalPooled.cumulativeNetCostVsAdap.median;
  const nationalPerDollar = nationalCare / nationalSavings;
  const nationalLikelihood = Math.round(nationalPooled.shareNetCostPositiveVsAdap * 100);

  const selectedFinal = finalFor(location);
  const selectedPooled = pooledFor(location);
  const selectedCare = selectedPooled.cumulativeCareCost.median;
  const selectedSavings = selectedFinal.cumulativeAdapSpendingAvoided;
  const selectedNet = selectedPooled.cumulativeNetCostVsAdap.median;
  const selectedPerDollar = selectedCare / selectedSavings;
  const selectedLikelihood = Math.round(selectedPooled.shareNetCostPositiveVsAdap * 100);
  const selectedPoints = pointsFor(series, location);
  const chartPoints: ChartPoint[] = selectedPoints.map((point) => ({
    year: point.year,
    care: point.pooledCumulativeCareCost.median,
    savings: point.cumulativeAdapSpendingAvoided,
  }));
  const crossoverYear = chartPoints.find((point) => point.care > point.savings)?.year ?? null;
  const selectedLabel = location === TOTAL
    ? 'the 30 states and Washington, DC included in the analysis'
    : location === 'DC' ? 'the District of Columbia' : stateName(location);
  const options = [...ryanWhiteCostingSummary.states]
    .sort((a, b) => stateName(a.state).localeCompare(stateName(b.state)));

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header
        className="border-b border-slate-200 bg-[#f7fafc]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 62% 84% at 96% 0%, rgba(0,45,114,0.08), transparent 70%)',
        }}
      >
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ADAP costing analysis</p>
          <h1 className="mt-6 max-w-4xl font-serif text-4xl font-medium leading-[1.06] tracking-[-0.02em] text-slate-950 sm:text-6xl">
            What happens if ADAP funding ends?
          </h1>

          <div className="mt-9 max-w-4xl border-l-4 border-[#002D72] bg-white px-5 py-5 shadow-sm sm:px-6">
            <h2 className="text-sm font-semibold text-slate-950">What we did</h2>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-700">
              We compared two futures: one where ADAP funding stays the same, and one where ADAP ends in January 2026
              and does not return through 2035. Ending ADAP saves money on the program itself, but it also leads to more
              new HIV cases, and those people will need HIV care. We added up both sides to see how they compare.
            </p>
            <details className="group mt-4 border-t border-slate-200 pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-[#002D72]">
                How we did this <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3 space-y-4 text-sm leading-relaxed text-slate-600">
                <p>We modeled two scenarios from 2026 to 2035:</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="border-l-2 border-slate-200 pl-3">
                    <dt className="font-semibold text-slate-800">Baseline</dt>
                    <dd>No change to current ADAP funding.</dd>
                  </div>
                  <div className="border-l-2 border-slate-200 pl-3">
                    <dt className="font-semibold text-slate-800">Elimination</dt>
                    <dd>ADAP ends in January 2026 and is not restored through 2035.</dd>
                  </div>
                </dl>
                <p>
                  We projected new HIV infections and diagnoses under each scenario. The difference between the two
                  represents the additional cases associated with ending ADAP.
                </p>
                <p>
                  We estimated HIV medicine and routine care costs for these additional cases over time. We added those
                  care costs through 2035 and compared them with the savings from eliminating ADAP.
                </p>
                <p>All costs are shown in today’s dollars.</p>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Modeled result through 2035</p>
            <h2 className="mt-4 max-w-4xl font-serif text-3xl font-medium leading-tight text-slate-950 sm:text-5xl">
              Ending ADAP is projected to cost more than it saves
            </h2>
            <p className="mt-5 max-w-4xl text-xl leading-relaxed text-slate-700 sm:text-2xl">
              For every $1 saved by ending ADAP, about{' '}
              <strong className="font-semibold text-[#002D72]">${nationalPerDollar.toFixed(2)}</strong> comes back as
              new HIV care costs.
            </p>
            <p className="mt-5 max-w-4xl text-base leading-relaxed text-slate-600">
              Eliminating ADAP in 2026 would save about {formatDollars(nationalSavings)} in program spending through
              2035, but would add about {formatDollars(nationalCare)} in HIV care for people newly infected. That is
              about {formatDollars(nationalNet)} more spent.
            </p>

            <dl className="mt-9 grid gap-3 sm:grid-cols-3">
              <ResultTile label="Saved" value={formatDollars(nationalSavings)} note="ADAP program spending" tone="saving" />
              <ResultTile label="New HIV care costs" value={formatDollars(nationalCare)} note="Care for people newly infected" tone="cost" />
              <ResultTile label="Net" value={formatDollars(nationalNet)} note="More spent" tone="net" />
            </dl>

            <div className="mt-6 grid gap-5 border-y border-slate-200 py-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
              <p className="text-base leading-relaxed text-slate-700">
                Without ADAP, many people lose steady access to HIV medicine, and fewer keep their virus under control.
                By 2035, that means about{' '}
                <strong>{formatCount(nationalFinal.cumulativeExcessInfections.median)} more HIV infections</strong> and
                about <strong>{formatCount(nationalFinal.cumulativeExcessNewDiagnoses.median)} more diagnoses</strong>.
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                Care costs exceed ADAP savings in <strong className="text-slate-900">{nationalLikelihood} of every 100 modeled results</strong>.
                The likely range is {likelyRange(
                  nationalPooled.cumulativeNetCostVsAdap.lower,
                  nationalPooled.cumulativeNetCostVsAdap.upper
                )}. This covers 30 states and Washington, DC.
              </p>
            </div>

            <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Modeled pathway">
              {[
                ['01', 'ADAP ends', 'The scenario begins in January 2026.'],
                ['02', 'Fewer people remain virally suppressed', 'Loss of medication access changes HIV outcomes.'],
                ['03', 'More new infections occur', `${formatCount(nationalFinal.cumulativeExcessInfections.median)} additional infections are projected.`],
                ['04', 'More people need lifelong HIV care', 'Medicine and routine care create costs over time.'],
                ['05', 'Healthcare costs rise', 'Hospital stays and illnesses caused by weakened immunity are not included here.'],
              ].map(([number, title, note]) => (
                <li key={number} className="border-t-2 border-blue-900 pt-4">
                  <span className="font-mono text-xs text-slate-400">{number}</span>
                  <h3 className="mt-2 text-sm font-semibold leading-snug text-slate-900">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{note}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
            <div className="grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Jurisdiction results</p>
                <h2 className="mt-3 font-serif text-3xl font-medium text-slate-950 sm:text-4xl">What about your state?</h2>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Jurisdiction
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                >
                  <option value={TOTAL}>All 30 states + Washington, DC</option>
                  {options.map((item) => (
                    <option key={item.state} value={item.state}>{stateName(item.state)}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
              <article className="border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-live="polite">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {location === TOTAL ? 'Modeled-jurisdiction total' : stateName(location)}
                </p>
                <p className="mt-4 text-lg leading-relaxed text-slate-800">
                  In {selectedLabel}, ending ADAP is projected to result in about{' '}
                  <strong>{formatCount(selectedFinal.cumulativeExcessInfections.median)} additional HIV infections</strong>{' '}
                  through 2035. It would save about <strong>{formatDollars(selectedSavings)}</strong> in ADAP spending
                  and add about <strong>{formatDollars(selectedCare)}</strong> in new HIV care costs.
                </p>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  {selectedNet > 0 ? (
                    <>
                      That is about <strong className="text-slate-900">${selectedPerDollar.toFixed(2)} in new HIV care costs for every $1 saved</strong>.
                      {crossoverYear
                        ? ` New care costs overtake ADAP savings by ${crossoverYear}.`
                        : ' New care costs are larger than ADAP savings by 2035.'}
                    </>
                  ) : (
                    <>
                      ADAP savings remain larger than the modeled new HIV care costs through 2035, but ending ADAP is
                      still projected to result in additional HIV infections.
                    </>
                  )}
                </p>
                <p className="mt-5 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-500">
                  New HIV care costs are larger than ADAP savings in{' '}
                  {selectedLikelihood < 50 ? 'only ' : ''}<strong className="text-slate-700">{selectedLikelihood} of every 100 modeled results</strong>.
                </p>
              </article>

              <div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">When do the savings run out?</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Cumulative median costs and savings for {selectedLabel}.
                    </p>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                      {crossoverYear
                        ? `The savings are real at first. Through ${crossoverYear - 1}, ending ADAP saves money. From ${crossoverYear} on, new care costs are larger.`
                        : 'ADAP savings remain larger than new HIV care costs through 2035.'}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: BLUE }} /> HIV care</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: TEAL }} /> ADAP savings</span>
                  </div>
                </div>

                <div
                  className="mt-5 h-[310px] w-full"
                  role="img"
                  aria-label={`Line chart comparing cumulative HIV care costs and ADAP savings from 2026 through 2035 for ${selectedLabel}.`}
                >
                  {chartPoints.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartPoints} margin={{ top: 18, right: 16, bottom: 4, left: 4 }} accessibilityLayer>
                        <CartesianGrid stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                        <YAxis tickFormatter={formatAxisDollars} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={48} />
                        <Tooltip content={<CostTooltip />} />
                        {crossoverYear && (
                          <ReferenceLine
                            x={crossoverYear}
                            stroke={RUST}
                            strokeDasharray="4 4"
                            label={{ value: `Costs overtake savings · ${crossoverYear}`, fill: RUST, fontSize: 11, position: 'insideTopRight' }}
                          />
                        )}
                        <Line type="monotone" dataKey="care" stroke={BLUE} strokeWidth={3} dot={{ r: 2.5, fill: BLUE }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="savings" stroke={TEAL} strokeWidth={3} dot={{ r: 2.5, fill: TEAL }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      {seriesError ? 'The annual results could not be loaded.' : 'Loading annual results…'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Budget context</p>
              <h2 className="mt-3 font-serif text-3xl font-medium text-slate-950">Who pays?</h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                The savings occur in the ADAP budget. New costs could fall on Medicaid, Medicare, private insurers,
                hospitals, and other parts of the Ryan White program. In other words, savings in one budget can move
                costs to others. This analysis does not estimate each payer’s share.
              </p>
            </article>
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What is not counted</p>
              <h2 className="mt-3 font-serif text-3xl font-medium text-slate-950">Why this is likely an underestimate</h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                We counted only HIV medicine and routine care for people newly infected, through 2035. We did not count
                care for current ADAP clients who lose coverage, hospital stays, deaths, lost work or productivity, or
                any costs after 2035. The full economic cost could therefore be higher.
              </p>
            </article>
          </div>
        </section>

        <section className="bg-[#f7fafc]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-10 sm:px-6">
            <div>
              <h2 className="font-serif text-2xl font-medium text-slate-950">How was this analysis done?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Review assumptions, uncertainty, jurisdiction comparisons, price sensitivity, and technical provenance.
              </p>
            </div>
            <Link
              href="/ryan-white-costing/technical"
              className="inline-flex items-center rounded-full bg-[#002D72] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-950"
            >
              See full methods and technical results →
            </Link>
            <p className="basis-full text-xs leading-relaxed text-slate-500">
              The likely range reflects variation across model simulations and cost assumptions. Dollar amounts are in
              2026 US dollars and discounted at 3% per year. The aggregate covers{' '}
              {ryanWhiteCostingMetadata.modeledJurisdictionCount} modeled jurisdictions and is not an estimate for all
              US jurisdictions.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
