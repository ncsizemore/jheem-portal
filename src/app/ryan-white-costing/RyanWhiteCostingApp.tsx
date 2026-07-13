'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchRyanWhiteCostingSeries,
  ryanWhiteCostingMetadata,
  ryanWhiteCostingSummary,
  type BaselineContext,
  type CostScenarioId,
  type RyanWhiteCostingSeries,
} from '@/data/ryan-white-costing';
import {
  buildDecomposition,
  buildDriverRows,
  buildHeterogeneityPoints,
  buildHorizonProfile,
  buildNationalDriverRow,
  buildStateCrossovers,
  buildTrajectoryData,
  CONTEXT_AXES,
  ContextAxisId,
  Crossover,
  crossoverForPoints,
  DecompositionRow,
  DriverRow,
  DriverSortKey,
  HeterogeneityPoint,
  ESTIMAND_LABELS,
  EstimandId,
  formatCompactDollars,
  formatNumber,
  formatPercent,
  formatPerDollar,
  HeadlineValues,
  headlineAt,
  HorizonProfile,
  HORIZON_MAX,
  HORIZON_MIN,
  LocationKey,
  pointForYear,
  ReviewCard,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  SCENARIO_SHORT_LABELS,
  seriesForLocation,
  sortDriverRows,
  spearmanRho,
  StateCrossover,
  stateName,
} from './view-model';

// --- palette: cool academic base; warm reserved for data only -----------------
const NAVY = '#002D72';
const TEAL = '#0f766e'; // net offset (data)
const RUST = '#b45309'; // net cost (data)
const INK = '#0f172a'; // slate-900
const MUTED = '#64748b'; // slate-500
const GRID = '#dbe5f0';
const EXPANSION = '#2e6b75';
const NON_EXPANSION = '#a8cdd1';
const EASE = [0.22, 1, 0.36, 1] as const;
const SERIF = '[font-family:var(--font-serif)]';

function formatNcer(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function hexLerp(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Share of draws with positive net cost: cool cyan near a coin flip to rust.
function shareColor(share: number): string {
  const t = Math.max(0, Math.min(1, (share - 0.5) / 0.5));
  return t <= 0.5 ? hexLerp('#149cb8', '#c9861f', t / 0.5) : hexLerp('#c9861f', '#a5320f', (t - 0.5) / 0.5);
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-full text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-500">{children}</p>
);

function SectionHead({
  n,
  eyebrow,
  title,
  children,
  right,
}: {
  n: string;
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-end justify-between gap-6">
      <div className="min-w-0 max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400">{n}</span>
          <span className="h-px w-8" style={{ background: NAVY, opacity: 0.4 }} />
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
        <h2 className={cx(SERIF, 'mt-4 text-3xl font-medium leading-[1.15] text-slate-900')}>{title}</h2>
        {children && <p className="mt-3 text-[0.95rem] leading-relaxed text-slate-500">{children}</p>}
      </div>
      {right && <div className="max-w-full">{right}</div>}
    </div>
  );
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('min-w-0', className)}>{children}</div>;
}

// --- shared chart tooltips ----------------------------------------------------
interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string; value?: number; stroke?: string; payload?: unknown }>;
}

function TrajTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const names: Record<string, string> = { careMedian: 'Care cost', adap: 'ADAP avoided' };
  const rows = payload.filter((pl) => pl.dataKey && names[pl.dataKey]);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-md">
      <p className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">Year {label}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((pl) => (
          <p key={pl.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ background: pl.stroke }} />
              {names[pl.dataKey as string]}
            </span>
            <span className="font-mono tabular-nums text-slate-900">{formatCompactDollars(Number(pl.value))}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Budget-window control - the app's one computation-bearing input. Lives in
// the hero (a top-bar slider reads as chrome and gets missed); the sticky bar
// below is only a condensed echo once the hero control scrolls away.
// -----------------------------------------------------------------------------
const THUMB_PX = 20;

const RANGE_THUMB_CLASSES =
  '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 ' +
  '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md ' +
  '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 [&::-moz-range-thumb]:bg-white ' +
  '[&::-moz-range-track]:bg-transparent';

function horizonPct(year: number): number {
  return ((year - HORIZON_MIN) / (HORIZON_MAX - HORIZON_MIN)) * 100;
}

function BudgetWindowControl({
  horizon,
  onHorizon,
  profile,
  ready,
  controlRef,
}: {
  horizon: number;
  onHorizon: (year: number) => void;
  profile: HorizonProfile | null;
  ready: boolean;
  controlRef: React.RefObject<HTMLDivElement | null>;
}) {
  const crossPct =
    profile?.crossoverPosition != null
      ? Math.max(0, Math.min(100, horizonPct(profile.crossoverPosition)))
      : null;
  const tickYears = Array.from({ length: HORIZON_MAX - HORIZON_MIN + 1 }, (_, i) => HORIZON_MIN + i);

  return (
    <div ref={controlRef} className="mt-10 rounded-lg border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
        <div className="min-w-0 max-w-md">
          <Eyebrow>Budget window</Eyebrow>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Avoided spending accrues immediately; care costs accrue later. Use the control to change the ledger window.
            {profile?.crossoverYear != null && (
              <>
                {' '}
                The modeled-total median reaches break-even around{' '}
                <span className="font-semibold text-slate-900">{profile.crossoverYear}</span>.
              </>
            )}
            {' '}Nothing is extrapolated past 2035.
          </p>
        </div>
        {profile && <PerDollarSparkline profile={profile} horizon={horizon} />}
      </div>

      <div className="relative mt-6 h-12">
        {/* Track layers, inset by half the thumb so tick positions align with thumb centers */}
        <div
          className="pointer-events-none absolute top-[15px]"
          style={{ left: THUMB_PX / 2, right: THUMB_PX / 2 }}
        >
          <div className="relative h-2 overflow-hidden rounded-full bg-teal-100">
            {crossPct !== null && (
              <span className="absolute inset-y-0 right-0 bg-amber-100" style={{ left: `${crossPct}%` }} />
            )}
          </div>
          {tickYears.map((year) => (
            <span
              key={year}
              className="absolute top-[-3px] h-[14px] w-px -translate-x-1/2 bg-slate-300"
              style={{ left: `${horizonPct(year)}%` }}
            />
          ))}
          {crossPct !== null && (
            <span
              className="absolute top-[-6px] h-[20px] w-[2px] -translate-x-1/2 rounded-full bg-slate-700"
              style={{ left: `${crossPct}%` }}
            />
          )}
        </div>
        <input
          type="range"
          min={HORIZON_MIN}
          max={HORIZON_MAX}
          step={1}
          value={horizon}
          disabled={!ready}
          onChange={(event) => onHorizon(Number(event.target.value))}
          aria-label="Budget window end year"
          aria-valuetext={`2026 through ${horizon}`}
          className={cx(
            'absolute inset-x-0 top-[5px] h-7 w-full min-w-0 cursor-grab appearance-none bg-transparent',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400',
            'disabled:cursor-wait disabled:opacity-40',
            RANGE_THUMB_CLASSES
          )}
        />
        <div
          className="pointer-events-none absolute bottom-0 font-mono text-[0.68rem] tabular-nums text-slate-400"
          style={{ left: THUMB_PX / 2, right: THUMB_PX / 2 }}
        >
          <span className="absolute left-0 -translate-x-1/2">{HORIZON_MIN}</span>
          {crossPct !== null && crossPct > 12 && crossPct < 88 && (
            <span className="absolute -translate-x-1/2 font-medium text-slate-600" style={{ left: `${crossPct}%` }}>
              break-even
            </span>
          )}
          <span className="absolute right-0 translate-x-1/2">{HORIZON_MAX}</span>
        </div>
      </div>
      {!ready && <p className="mt-2 text-[0.7rem] text-slate-400">Loading annual series…</p>}
    </div>
  );
}

function PerDollarSparkline({ profile, horizon }: { profile: HorizonProfile; horizon: number }) {
  const W = 230;
  const H = 68;
  const padL = 6;
  const padR = 36;
  const padT = 10;
  const padB = 8;
  const first = profile.years[0];
  const last = profile.years[profile.years.length - 1];
  const x = (year: number) => padL + ((year - first) / (last - first)) * (W - padL - padR);
  const values = profile.perDollar.map((value) => value - 1);
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(0, ...values);
  const ySpan = Math.max(yMax - yMin, 0.1);
  const y = (v: number) => H - padB - ((v - yMin) / ySpan) * (H - padT - padB);
  const path = profile.years.map((year, i) => `${i === 0 ? 'M' : 'L'}${x(year).toFixed(1)},${y(values[i]).toFixed(1)}`).join(' ');
  const horizonIdx = profile.years.indexOf(horizon);

  return (
    <div className="min-w-0">
      <p className="text-[0.62rem] font-medium uppercase tracking-wide text-slate-400">NCER by window end</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="mt-1 max-w-full"
        role="img"
        aria-label={`Net cost to ADAP expenditure ratio changes from ${formatNcer(values[0])} to ${formatNcer(values[values.length - 1])} as the window extends to ${last}`}
      >
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke={GRID} strokeDasharray="3 3" />
        <text x={W - padR + 4} y={y(0) + 3.5} fontSize="10" fill={MUTED} className="font-mono">
          0
        </text>
        <path d={path} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        {horizonIdx >= 0 && (
          <circle cx={x(horizon)} cy={y(values[horizonIdx])} r={3.5} fill={INK} stroke="#ffffff" strokeWidth={1.5} />
        )}
        <text x={W - padR + 4} y={y(values[values.length - 1]) + 3.5} fontSize="10" fill={INK} fontWeight={600} className="font-mono">
          {formatNcer(values[values.length - 1])}
        </text>
      </svg>
    </div>
  );
}

function HorizonEcho({
  horizon,
  onHorizon,
  scenario,
  onScenario,
  visible,
  ready,
}: {
  horizon: number;
  onHorizon: (year: number) => void;
  scenario: CostScenarioId;
  onScenario: (s: CostScenarioId) => void;
  visible: boolean;
  ready: boolean;
}) {
  // Fixed and docked BELOW the site nav: the global header is sticky top-0
  // z-50 (80px tall), so anything fixed at top-0 with a lower z-index sits
  // permanently hidden behind it.
  return (
    <div
      aria-hidden={!visible}
      className={cx(
        'fixed inset-x-0 top-20 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur transition-all duration-200',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'
      )}
    >
      <div className="mx-auto flex w-full max-w-full flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 sm:max-w-6xl sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Budget window</span>
          <span className="font-mono text-base font-semibold tabular-nums text-slate-900">2026-{horizon}</span>
        </div>
        <input
          type="range"
          min={HORIZON_MIN}
          max={HORIZON_MAX}
          step={1}
          value={horizon}
          disabled={!ready}
          tabIndex={visible ? 0 : -1}
          onChange={(event) => onHorizon(Number(event.target.value))}
          aria-label="Budget window end year"
          aria-valuetext={`2026 through ${horizon}`}
          className="h-1.5 w-full max-w-[220px] min-w-[110px] flex-1 cursor-pointer accent-slate-900 disabled:opacity-40"
        />
        {horizon !== HORIZON_MAX && (
          <button
            type="button"
            tabIndex={visible ? 0 : -1}
            onClick={() => onHorizon(HORIZON_MAX)}
            className="rounded border border-slate-300 px-2 py-0.5 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            Full horizon
          </button>
        )}
        <div className="flex items-center gap-1" role="group" aria-label="Drug-price assumption">
          <span className="mr-1 hidden text-[0.62rem] font-semibold uppercase tracking-wide text-slate-400 sm:inline">
            Price
          </span>
          {SCENARIO_ORDER.map((item) => (
            <button
              key={item}
              type="button"
              tabIndex={visible ? 0 : -1}
              onClick={() => onScenario(item)}
              aria-pressed={scenario === item}
              className={cx(
                'rounded px-1.5 py-0.5 font-mono text-[0.7rem] font-medium transition-colors',
                scenario === item
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {SCENARIO_SHORT_LABELS[item]}
            </button>
          ))}
        </div>
        <nav aria-label="Sections" className="ml-auto hidden items-center gap-4 lg:flex">
          {[
            ['Over time', '#crossover'],
            ['Jurisdictions', '#drivers'],
            ['Context', '#context'],
            ['Price sensitivity', '#robustness'],
            ['Methods', '#methods'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              tabIndex={visible ? 0 : -1}
              className="text-[0.7rem] font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Headline result and the two distinct paths behind it: modeled health effects
// and the accounting comparison used to calculate net cost.
// -----------------------------------------------------------------------------
function CascadeHero({
  headline,
  estimand,
  horizon,
  share,
  profile,
  onHorizon,
  ready,
  controlRef,
}: {
  headline: HeadlineValues;
  estimand: EstimandId;
  horizon: number;
  share: number | null;
  profile: HorizonProfile | null;
  onHorizon: (year: number) => void;
  ready: boolean;
  controlRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ncer = headline.perDollar.median - 1;
  const ncerLower = headline.perDollar.lower - 1;
  const ncerUpper = headline.perDollar.upper - 1;
  const truncated = horizon < HORIZON_MAX;
  const netPositive = headline.net.median > 0;
  const bold = (text: string) => <span className="font-semibold text-slate-900">{text}</span>;
  const jurisdictionCount = ryanWhiteCostingMetadata.modeledJurisdictionCount;

  const narrative = netPositive ? (
    <>
      Across {jurisdictionCount} modeled jurisdictions in the complete-elimination scenario, projected care costs for
      excess incident cases reach{' '}
      {bold(formatCompactDollars(headline.care.median))}, compared with{' '}
      {bold(formatCompactDollars(headline.adap))} in ADAP spending avoided
      {share !== null ? <>{' '}({bold(formatPercent(share))} of simulations have net cost above zero)</> : null}.
    </>
  ) : (
    <>
      Across {jurisdictionCount} modeled jurisdictions through {horizon}, projected accrued care costs are{' '}
      {bold(formatCompactDollars(headline.care.median))}, below the{' '}
      {bold(formatCompactDollars(headline.adap))} in ADAP spending avoided within this window
      {profile?.crossoverYear != null ? (
        <>
          ; the modeled-total median first exceeds the comparator in {bold(String(profile.crossoverYear))}
        </>
      ) : null}
      .
    </>
  );

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto w-full max-w-full px-5 py-14 sm:max-w-6xl sm:px-6 sm:py-16">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="min-w-0">
            <Eyebrow>
              Ryan White ADAP / Cost-consequence analysis / {ryanWhiteCostingMetadata.horizon.startYear}-{horizon}
            </Eyebrow>
            <h1
              className={cx(
                SERIF,
                'mt-6 max-w-2xl text-[2.35rem] font-medium leading-[1.08] text-slate-900 sm:text-[3.3rem]'
              )}
            >
              {netPositive
                ? `In the median projection, downstream care costs exceed ADAP spending avoided by ${horizon}.`
                : `In the median projection, ADAP spending avoided exceeds accrued care costs through ${horizon}.`}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">{narrative}</p>

            <div className="mt-8 max-w-xl border-l-2 pl-4" style={{ borderColor: NAVY }}>
              <p className="text-sm font-semibold text-slate-800">How to read this result</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                A modeled stress test across {jurisdictionCount} jurisdictions, not an estimate for all US jurisdictions
                or a federal budget score. The modified healthcare-system frame compares one program&apos;s avoided
                spending with a restricted set of downstream HIV care costs.
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Eyebrow>Primary outcome / Median NCER</Eyebrow>
              <span className="rounded bg-white px-2 py-1 text-[0.65rem] font-medium text-slate-500 shadow-sm">
                {ESTIMAND_LABELS[estimand]}
              </span>
            </div>
            <p className="mt-4 font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-6xl">
              {formatNcer(ncer)}
            </p>
            <p className="mt-2 font-mono text-sm tabular-nums text-slate-500">
              {formatNcer(ncerLower)} to {formatNcer(ncerUpper)} / 95% interval
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Net cost divided by ADAP spending avoided. An NCER above zero means projected downstream care costs
              exceed that comparator; {formatNcer(ncer)} corresponds to {formatPerDollar(headline.perDollar.median)} in
              care costs per $1 avoided.
            </p>
            {truncated && profile && (
              <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
                At the full 2035 horizon, the modeled-total median NCER is {formatNcer(profile.finalPerDollar - 1)}.
              </p>
            )}
          </div>
        </div>

        <BudgetWindowControl
          horizon={horizon}
          onHorizon={onHorizon}
          profile={profile}
          ready={ready}
          controlRef={controlRef}
        />

        <CascadeChain headline={headline} horizon={horizon} />
      </div>
    </header>
  );
}

function CascadeChain({ headline, horizon }: { headline: HeadlineValues; horizon: number }) {
  const healthLinks: Array<{ label: string; value: string; sub: string }> = [
    {
      label: 'Excess infections',
      value: formatNumber(headline.excessInfections),
      sub: 'modeled incident infections',
    },
    {
      label: 'Excess diagnoses',
      value: formatNumber(headline.excessDiagnoses),
      sub: 'cohort used for costing',
    },
    {
      label: 'Person-years on ART',
      value: formatNumber(headline.personYears),
      sub: 'immediate + re-engaged starts',
    },
  ];

  return (
    <div className="mt-12 border-t border-slate-200 pt-6">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
        Cumulative 2026-{horizon} · medians across 1,000 simulations
      </p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Modeled health pathway</p>
          <div className="mt-4 flex flex-wrap items-center gap-y-4">
            {healthLinks.map((link, index) => (
              <div key={link.label} className="flex min-w-0 items-center">
                {index > 0 && <span aria-hidden className="mx-3 text-lg text-slate-300">→</span>}
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">{link.label}</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">{link.value}</p>
                  <p className="mt-0.5 text-[0.68rem] leading-relaxed text-slate-400">{link.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Accounting comparison</p>
          <div className="mt-4 flex flex-wrap items-center gap-y-4">
            {[
              ['Downstream care', formatCompactDollars(headline.care.median), NAVY],
              ['ADAP avoided', formatCompactDollars(headline.adap), TEAL],
              ['Net cost', formatCompactDollars(headline.net.median), headline.net.median > 0 ? RUST : TEAL],
            ].map(([label, value, color], index) => (
              <div key={label} className="flex min-w-0 items-center">
                {index > 0 && <span aria-hidden className="mx-3 text-lg text-slate-300">{index === 1 ? '−' : '='}</span>}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">
                    <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ background: color }} />
                    {label}
                  </p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.7rem] leading-relaxed text-slate-400">
            Care-cost 95% interval {formatCompactDollars(headline.care.lower)} to{' '}
            {formatCompactDollars(headline.care.upper)}; funding is deterministic in this analysis.
          </p>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Uncertainty decomposition - pooled mixes drug price + epidemic; scenario rows
// isolate the epidemic component at a fixed price
// -----------------------------------------------------------------------------
function UncertaintyDecomposition({
  rows,
  scenario,
  onScenario,
  horizon,
  estimand,
}: {
  rows: DecompositionRow[];
  scenario: CostScenarioId;
  onScenario: (s: CostScenarioId) => void;
  horizon: number;
  estimand: EstimandId;
}) {
  const [hoveredRow, setHoveredRow] = useState<EstimandId | null>(null);
  const min = Math.min(0, ...rows.map((row) => row.net.lower));
  const max = Math.max(0, ...rows.map((row) => row.net.upper));
  const domainMin = Math.floor(min / 1e9) * 1e9;
  const domainMax = Math.ceil(max / 1e9) * 1e9;
  const at = (v: number) => ((v - domainMin) / (domainMax - domainMin)) * 100;
  const zero = at(0);

  const medianRow = rows.find((row) => row.id === 'median');
  const lowRow = rows.find((row) => row.id === 'low');
  const highRow = rows.find((row) => row.id === 'high');
  const epidemicWidth = medianRow ? medianRow.net.upper - medianRow.net.lower : 0;
  const priceShift = lowRow && highRow ? highRow.net.median - lowRow.net.median : 0;

  return (
    <section id="robustness" className="mx-auto w-full max-w-full scroll-mt-36 px-5 py-16 sm:max-w-6xl sm:px-6">
      <Reveal>
        <SectionHead
          n="04"
          eyebrow="Price sensitivity"
          title="How does the ART price assumption change the result?"
          right={
            <div className="flex items-center gap-5 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TEAL }} /> Net offset
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: RUST }} /> Net cost
              </span>
            </div>
          }
        >
          Net cost through {horizon} under the low, median, and high annual ART cost tiers. Within each tier, the band
          reflects variation across model simulations. The pooled row combines all three tiers and simulations; it is
          a summary distribution, not a fourth price assumption. Selecting a tier updates the app.
        </SectionHead>

        <div className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {rows.map((row) => {
            const isSel = !row.isPooled && row.id === scenario;
            const isPrimary = row.id === estimand;
            const isActive = hoveredRow ? hoveredRow === row.id : isSel || row.isPooled;
            const rowInner = (
              <>
                <div className="flex items-baseline justify-between sm:block sm:pl-1">
                  <p className={cx('text-sm font-semibold', isSel || row.isPooled ? 'text-slate-900' : 'text-slate-600')}>
                    {row.label}
                    {isPrimary && (
                      <span className="ml-2 rounded-sm bg-slate-100 px-1.5 py-0.5 align-middle text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
                        headline
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-slate-400">{row.detail}</p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-slate-400">
                    {formatCompactDollars(row.net.median)} median
                  </p>
                </div>
                <div className="relative h-12 min-w-0 overflow-hidden rounded-md">
                  <span className="absolute inset-y-0 left-0 bg-teal-50/60" style={{ width: `${zero}%` }} />
                  <span className="absolute inset-y-0 right-0 bg-amber-50/60" style={{ width: `${100 - zero}%` }} />
                  <span className="absolute inset-y-0 w-px bg-slate-400" style={{ left: `${zero}%` }} />
                  <SplitBand at={at} lo={row.net.lower} hi={row.net.upper} thickness={isActive ? 14 : 10} opacity={isActive ? 0.75 : 0.45} />
                  <span
                    className="absolute top-1/2 w-[3px] -translate-y-1/2 rounded-full transition-all"
                    style={{ left: `${at(row.net.median)}%`, height: isActive ? 36 : 28, background: INK }}
                  />
                </div>
                <div className="flex items-baseline justify-between sm:block sm:text-right">
                  <p className="font-mono text-xl font-semibold tabular-nums text-slate-900">
                    {formatPerDollar(row.perDollar)}
                  </p>
                  <p className="text-[0.68rem] uppercase tracking-wide text-slate-400 sm:mt-0.5">
                    care per $1 avoided
                    {row.sharePositive !== null && (
                      <span className="normal-case"> · {formatPercent(row.sharePositive)} net-costly</span>
                    )}
                  </p>
                </div>
              </>
            );
            const rowClass = cx(
              'flex w-full flex-col gap-4 border-b border-slate-200 px-4 py-5 text-left transition-all last:border-b-0 sm:grid sm:grid-cols-[168px_minmax(0,1fr)_190px] sm:items-center sm:gap-6 sm:px-5',
              row.isPooled && 'border-b-2 bg-slate-50/40',
              isSel && 'bg-slate-50',
              !row.isPooled && !isSel && 'hover:bg-slate-50/60',
              isActive ? 'opacity-100' : 'opacity-70'
            );

            if (row.isPooled) {
              return (
                <div key={row.id} className={rowClass} onMouseEnter={() => setHoveredRow(row.id)} onMouseLeave={() => setHoveredRow(null)}>
                  {rowInner}
                </div>
              );
            }

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onScenario(row.id as CostScenarioId)}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onFocus={() => setHoveredRow(row.id)}
                onBlur={() => setHoveredRow(null)}
                aria-pressed={isSel}
                className={rowClass}
              >
                {rowInner}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[0.68rem] tabular-nums text-slate-400">
          <span>{formatCompactDollars(domainMin)}</span>
          <span className="hidden sm:inline">net offset / $0 / net cost</span>
          <span>{formatCompactDollars(domainMax)}</span>
        </div>
        {rows[0]?.sharePositive === null && (
          <p className="mt-2 text-[0.7rem] text-slate-400">
            Shares of draws net-costly are reported at the full 2035 horizon only.
          </p>
        )}

        {medianRow && lowRow && highRow && (
          <div className="mt-8 max-w-xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-400">
              Two distinct sensitivity quantities
            </p>
            <div className="mt-2.5 space-y-2.5">
              <WidthBar
                label="95% simulation interval width, median price"
                value={epidemicWidth}
                max={Math.max(epidemicWidth, Math.abs(priceShift))}
                tone="#334155"
              />
              <WidthBar
                label="Low-to-high price-tier shift in the median"
                value={priceShift}
                max={Math.max(epidemicWidth, Math.abs(priceShift))}
                tone="#94a3b8"
              />
            </div>
            <p className="mt-2 text-[0.7rem] leading-relaxed text-slate-400">
              These magnitudes are shown side by side for orientation; they are not a formal variance decomposition.
            </p>
          </div>
        )}
      </Reveal>
    </section>
  );
}

// One magnitude per row: the correct form for comparing two numbers.
function WidthBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full rounded-full"
            style={{ width: `${(Math.abs(value) / Math.max(max, 1)) * 100}%`, background: tone }}
          />
        </span>
      </div>
      <p className="text-right font-mono text-sm font-semibold tabular-nums text-slate-900">
        {formatCompactDollars(value)}
      </p>
    </div>
  );
}

function SplitBand({
  at,
  lo,
  hi,
  thickness,
  opacity,
}: {
  at: (v: number) => number;
  lo: number;
  hi: number;
  thickness: number;
  opacity: number;
}) {
  const segs =
    lo < 0 && hi > 0
      ? [
          { a: lo, b: 0, c: TEAL },
          { a: 0, b: hi, c: RUST },
        ]
      : [{ a: lo, b: hi, c: hi <= 0 ? TEAL : RUST }];
  return (
    <>
      {segs.map((s) => (
        <motion.span
          key={`${s.a}-${s.b}`}
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          initial={false}
          animate={{ left: `${at(s.a)}%`, width: `${Math.max(0.5, at(s.b) - at(s.a))}%` }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{ height: thickness, background: s.c, opacity }}
        />
      ))}
    </>
  );
}

// -----------------------------------------------------------------------------
// Jurisdiction comparison: the manuscript's primary state-level outcome,
// expressed as an accessible ranked interval plot plus an exact-value table.
// -----------------------------------------------------------------------------
function JurisdictionRatioPlot({
  rows,
  horizonYear,
  scenario,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  rows: DriverRow[];
  horizonYear: number;
  scenario: CostScenarioId;
  selected: LocationKey;
  hovered: string | null;
  onSelect: (state: string) => void;
  onHover: (state: string | null) => void;
}) {
  const sorted = useMemo(() => [...rows].sort((a, b) => b.ratio - a.ratio), [rows]);
  const expansionByState = useMemo(
    () => new Map(ryanWhiteCostingSummary.states.map((item) => [item.state, item.baselineContext.medicaidExpansion])),
    []
  );
  const rawMin = Math.min(0, ...rows.map((row) => row.ratioLower));
  const rawMax = Math.max(0, ...rows.map((row) => row.ratioUpper));
  const domainMin = Math.floor(rawMin);
  const domainMax = Math.ceil(rawMax);
  const span = Math.max(domainMax - domainMin, 1);
  const at = (value: number) => ((value - domainMin) / span) * 100;
  const zero = at(0);

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">NCER by jurisdiction</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Median and 95% simulation interval through {horizonYear} under the{' '}
            {SCENARIO_LABELS[scenario].toLowerCase()} assumption, ordered by the median.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500" aria-label="Medicaid expansion legend">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: EXPANSION }} /> Expansion
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: NON_EXPANSION }} /> Non-expansion
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[440px]">
          <div className="grid grid-cols-[104px_minmax(250px,1fr)_58px] items-end gap-3 border-b border-slate-200 pb-2 text-[0.65rem] uppercase tracking-wide text-slate-400">
            <span>Jurisdiction</span>
            <div className="relative h-4 font-mono normal-case tracking-normal">
              <span className="absolute left-0">{domainMin}</span>
              <span className="absolute -translate-x-1/2" style={{ left: `${zero}%` }}>
                0
              </span>
              <span className="absolute right-0">{domainMax}</span>
            </div>
            <span className="text-right">Median</span>
          </div>

          <div className="max-h-[640px] overflow-y-auto">
            {sorted.map((row) => {
              const isSelected = row.state === selected;
              const isHovered = row.state === hovered;
              const color = expansionByState.get(row.state) ? EXPANSION : NON_EXPANSION;
              return (
                <button
                  key={row.state}
                  type="button"
                  onClick={() => onSelect(row.state)}
                  onMouseEnter={() => onHover(row.state)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(row.state)}
                  onBlur={() => onHover(null)}
                  aria-pressed={isSelected}
                  aria-label={`${row.stateName}: NCER ${formatNcer(row.ratio)}, 95% interval ${formatNcer(row.ratioLower)} to ${formatNcer(row.ratioUpper)}`}
                  className={cx(
                    'grid w-full grid-cols-[104px_minmax(250px,1fr)_58px] items-center gap-3 border-b border-slate-100 py-2 text-left transition-colors last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-400',
                    isSelected ? 'bg-slate-100' : isHovered ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                  )}
                >
                  <span className="truncate text-xs font-medium text-slate-700" title={row.stateName}>
                    {row.stateName} <span className="text-slate-400">{row.state}</span>
                  </span>
                  <span className="relative block h-7 overflow-hidden rounded-sm bg-slate-50">
                    <span className="absolute inset-y-0 w-px bg-slate-300" style={{ left: `${zero}%` }} />
                    <span
                      className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
                      style={{ left: `${at(row.ratioLower)}%`, width: `${Math.max(0.5, at(row.ratioUpper) - at(row.ratioLower))}%`, background: color }}
                    />
                    <span
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
                      style={{ left: `${at(row.ratio)}%`, background: color }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
                    {formatNcer(row.ratio)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-400">
        NCER = (downstream care cost − ADAP spending avoided) / ADAP spending avoided. Color uses ACA Medicaid
        expansion status for the 2025 baseline year.
      </p>
    </div>
  );
}

const DRIVER_COLUMNS: Array<{ key: DriverSortKey; label: string }> = [
  { key: 'excessInfections', label: 'Excess infections' },
  { key: 'careCost', label: 'Care cost' },
  { key: 'adap', label: 'ADAP avoided' },
  { key: 'net', label: 'Net cost' },
  { key: 'ratio', label: 'NCER' },
];

function DriverTable({
  rows,
  horizonYear,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  rows: DriverRow[];
  horizonYear: number;
  selected: LocationKey;
  hovered: string | null;
  onSelect: (state: string) => void;
  onHover: (state: string | null) => void;
}) {
  const [sortKey, setSortKey] = useState<DriverSortKey>('net');
  const sorted = useMemo(() => sortDriverRows(rows, sortKey), [rows, sortKey]);
  const maxNetAbs = Math.max(1, ...rows.map((row) => Math.abs(row.net.median)));

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">Exact jurisdiction values through {horizonYear}</h3>
      <div className="mt-4 max-h-[480px] overflow-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white text-[0.66rem] uppercase tracking-wide text-slate-400">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 font-medium">State</th>
              {DRIVER_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  aria-sort={sortKey === column.key ? 'descending' : 'none'}
                  className="py-2 px-2 text-right font-medium"
                >
                  <button
                    type="button"
                    onClick={() => setSortKey(column.key)}
                    className={cx(
                      'inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-slate-700',
                      sortKey === column.key ? 'font-semibold text-slate-800' : 'text-slate-400'
                    )}
                  >
                    {column.label}
                    {sortKey === column.key && <span aria-hidden>↓</span>}
                  </button>
                </th>
              ))}
              <th className="py-2 pl-2 text-right font-medium" title="Share of draws net-costly at the 2035 horizon">
                Draws&gt;0 &rsquo;35
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const barWidth = (Math.abs(row.net.median) / maxNetAbs) * 100;
              return (
                <tr
                  key={row.state}
                  onClick={() => onSelect(row.state)}
                  onMouseEnter={() => onHover(row.state)}
                  onMouseLeave={() => onHover(null)}
                  tabIndex={0}
                  onFocus={() => onHover(row.state)}
                  onBlur={() => onHover(null)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(row.state);
                    }
                  }}
                  className={cx(
                    'cursor-pointer border-b border-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-300',
                    row.state === selected ? 'bg-slate-100' : hovered === row.state ? 'bg-slate-50' : 'hover:bg-slate-50'
                  )}
                >
                  <td className="py-2 pr-3 font-medium text-slate-900">
                    {row.stateName} <span className="text-slate-400">{row.state}</span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">
                    {formatNumber(row.excessInfections)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">
                    {formatCompactDollars(row.careCost.median)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">
                    {formatCompactDollars(row.adap)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="font-mono font-medium tabular-nums text-slate-900">
                      {formatCompactDollars(row.net.median)}
                    </span>
                    <span className="mt-0.5 block h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="ml-auto block h-full rounded-full"
                        style={{
                          width: `${barWidth}%`,
                          background: row.net.median > 0 ? RUST : TEAL,
                          opacity: 0.75,
                        }}
                      />
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-900">{formatNcer(row.ratio)}</td>
                  <td
                    className="py-2 pl-2 text-right font-mono tabular-nums font-medium"
                    style={{ color: shareColor(row.shareNetPositive2035) }}
                  >
                    {formatPercent(row.shareNetPositive2035)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-400">
        Medians at the selected window. NCER uses the paper&apos;s primary definition; the last column remains a 2035
        quantity because draw-level sign shares are not exported annually.
      </p>
    </div>
  );
}

function StateDetailCard({ row, crossoverKnown }: { row: DriverRow; crossoverKnown: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Eyebrow>Selected {row.state === 'Total' ? 'view' : 'jurisdiction'}</Eyebrow>
      <h3 className={cx(SERIF, 'mt-2 text-3xl font-medium text-slate-900')}>{row.stateName}</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        {!crossoverKnown ? (
          'Break-even: …'
        ) : row.crossoverYear !== null ? (
          <>
            Crosses break-even in <span className="font-semibold text-slate-800">{row.crossoverYear}</span>
          </>
        ) : (
          'Does not cross break-even by 2035'
        )}{' '}
        ·{' '}
        <span style={{ color: shareColor(row.shareNetPositive2035) }}>
          {formatPercent(row.shareNetPositive2035)} net-costly at &rsquo;35
        </span>
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
        {[
          ['NCER', formatNcer(row.ratio)],
          ['NCER 95% interval', `${formatNcer(row.ratioLower)} to ${formatNcer(row.ratioUpper)}`],
          ['Net cost vs ADAP', formatCompactDollars(row.net.median)],
          ['95% interval', `${formatCompactDollars(row.net.lower)} to ${formatCompactDollars(row.net.upper)}`],
          ['Downstream care', formatCompactDollars(row.careCost.median)],
          ['ADAP avoided', formatCompactDollars(row.adap)],
          ['Care per $1 avoided', formatPerDollar(row.perDollar)],
          ['Excess infections', formatNumber(row.excessInfections)],
          ['Excess diagnoses', formatNumber(row.excessDiagnoses)],
          ['ART person-years', formatNumber(row.personYears)],
          ['Window', `2026-${row.year}`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BaselineContextCard({ context, stateLabel }: { context: BaselineContext | null; stateLabel: string }) {
  if (!context) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Eyebrow>Baseline context</Eyebrow>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Program-dependence and epidemic context are jurisdiction-level measures; select a jurisdiction to see them.
        </p>
      </div>
    );
  }

  const items: Array<[string, string]> = [
    ['Viral suppression', formatPercent(context.viralSuppressionPct)],
    ['Suppressed on ADAP', formatPercent(context.propSuppressedOnAdap)],
    ['ADAP spending / client', `$${Math.round(context.adapSpendingPerClient).toLocaleString('en-US')}`],
    ['HIV-weighted urbanicity', formatPercent(context.diagnosedHivWeightedUrbanicity)],
    ['Medicaid expansion', context.medicaidExpansion ? 'Expansion' : 'Non-expansion'],
    ['ADAP client share', formatPercent(context.adapClientShare)],
    ['ADAP clients', formatNumber(context.adapClients)],
    ['Ryan White clients', formatNumber(context.rwClients)],
    ['Diagnosed PWH', formatNumber(context.diagnosedPrevalence)],
    ['New infections', formatNumber(context.baselineNewInfections)],
    ['New diagnoses', formatNumber(context.baselineNewDiagnoses)],
    ['Transmission rate', context.sexualTransmissionRate.toFixed(3)],
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Eyebrow>Baseline context / {stateLabel}</Eyebrow>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[0.7rem] leading-relaxed text-slate-400">
        Model-based measures use the 2025 no-intervention baseline. Spending per client combines annual 2026-USD
        funding with mean baseline clients; urbanicity uses 2020 Census shares weighted by 2021 diagnosed prevalence.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Context explorer - descriptive jurisdiction-level associations from the
// manuscript, without a fitted causal model.
// -----------------------------------------------------------------------------
function HeterogeneityExplorer({
  rows,
  horizonYear,
  scenario,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  rows: DriverRow[];
  horizonYear: number;
  scenario: CostScenarioId;
  selected: LocationKey;
  hovered: string | null;
  onSelect: (state: string) => void;
  onHover: (state: string | null) => void;
}) {
  const [axisId, setAxisId] = useState<ContextAxisId>(CONTEXT_AXES[0].id);
  const axis = CONTEXT_AXES.find((item) => item.id === axisId) ?? CONTEXT_AXES[0];
  const points = useMemo(
    () => buildHeterogeneityPoints(rows, ryanWhiteCostingSummary.states, axis.id),
    [rows, axis.id]
  );
  const rho = useMemo(() => spearmanRho(points), [points]);
  const reduce = useReducedMotion() ?? false;
  const maxAdap = Math.max(1, ...points.map((point) => point.adap));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const padX = (maxX - minX) * 0.08 || 0.01;
  const minRatio = Math.min(0, ...points.map((point) => point.ratio));
  const maxRatio = Math.max(0, ...points.map((point) => point.ratio));
  const padY = (maxRatio - minRatio) * 0.1 || 0.1;
  const alwaysLabel = new Set(['DC', 'TN', 'FL', 'NY']);
  const active = hovered ?? (selected !== 'Total' ? selected : null);

  const renderDot = (props: unknown) => {
    const { cx: x, cy: y, payload } = props as { cx?: number; cy?: number; payload?: HeterogeneityPoint };
    if (typeof x !== 'number' || typeof y !== 'number' || !payload) return <g />;
    const r = 5 + Math.sqrt(payload.adap / maxAdap) * 12;
    const isSel = payload.state === selected;
    const isActive = payload.state === active;
    const color = payload.medicaidExpansion ? EXPANSION : NON_EXPANSION;
    return (
      <g
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`${payload.stateName}: NCER ${formatNcer(payload.ratio)}, ${axis.label} ${axis.format(payload.x)}, ${payload.medicaidExpansion ? 'Medicaid expansion' : 'Medicaid non-expansion'}`}
        onClick={() => onSelect(payload.state)}
        onMouseEnter={() => onHover(payload.state)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(payload.state)}
        onBlur={() => onHover(null)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(payload.state);
          }
        }}
      >
        <circle cx={x} cy={y} r={r + 4} fill={color} fillOpacity={isSel || isActive ? 0.18 : 0.08} />
        {(isSel || isActive) && (
          <circle cx={x} cy={y} r={r + 4} fill="none" stroke={isSel ? NAVY : INK} strokeOpacity={0.5} strokeWidth={1.4} />
        )}
        <motion.circle
          cx={x}
          cy={y}
          initial={false}
          animate={{ r: isSel || isActive ? r + 2 : r }}
          transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
          fill={color}
          fillOpacity={isSel || isActive ? 1 : 0.9}
          stroke={isSel ? NAVY : isActive ? INK : '#ffffff'}
          strokeWidth={isSel ? 2.5 : isActive ? 1.8 : 1.4}
        />
        {(alwaysLabel.has(payload.state) || isSel || isActive) && (
          <text x={x + r + 3} y={y + 4} fontSize={11} fill="#475569" fontWeight={isSel || isActive ? 700 : 500}>
            {payload.state}
          </text>
        )}
      </g>
    );
  };

  const HetTip = ({ active: tipActive, payload }: TipProps) => {
    if (!tipActive || !payload?.length || !payload[0].payload) return null;
    const p = payload[0].payload as unknown as HeterogeneityPoint;
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-md">
        <p className="text-sm font-semibold text-slate-900">{p.stateName}</p>
        <p className="mt-1 font-mono text-xs tabular-nums text-slate-500">
          {axis.shortLabel} {axis.format(p.x)} · NCER {formatNcer(p.ratio)}
        </p>
        <p className="font-mono text-xs tabular-nums text-slate-500">ADAP avoided {formatCompactDollars(p.adap)}</p>
        <p className="text-xs text-slate-500">{p.medicaidExpansion ? 'Medicaid expansion' : 'Medicaid non-expansion'}</p>
      </div>
    );
  };

  return (
    <div className="min-w-0">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">NCER vs {axis.label.toLowerCase()}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{axis.description}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-base font-semibold tabular-nums text-slate-800">
              ρ = {rho === null ? '—' : rho.toFixed(2)}
            </p>
            <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">Spearman · n = {points.length}</p>
            <p className="mt-1 text-[0.65rem] text-slate-400">{SCENARIO_LABELS[scenario]} · through {horizonYear}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Jurisdiction context variable">
          {CONTEXT_AXES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAxisId(item.id)}
              aria-pressed={axis.id === item.id}
              className={cx(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
                axis.id === item.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
              )}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>
        <div className="mt-4 h-[340px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 24, bottom: 22, left: 4 }}>
              <CartesianGrid stroke="#eef2f6" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[minX - padX, maxX + padX]}
                tickFormatter={axis.format}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: MUTED, fontSize: 11 }}
                label={{ value: axis.label, position: 'insideBottom', offset: -12, fill: MUTED, fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="ratio"
                domain={[minRatio - padY, maxRatio + padY]}
                tickFormatter={(value: number) => value.toFixed(1)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: MUTED, fontSize: 11 }}
                width={48}
                label={{ value: 'NCER', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 12 }}
              />
              <ReferenceLine
                y={0}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label={{ value: 'break-even', position: 'insideTopRight', fill: MUTED, fontSize: 11 }}
              />
              <Tooltip content={<HetTip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />
              <Scatter data={points} shape={renderDot} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] leading-relaxed text-slate-400">
          <p>
            Descriptive, unadjusted association through {horizonYear}; no fitted line or causal interpretation. Dot size
            = cumulative ADAP spending avoided.
          </p>
          <div className="flex gap-4 text-slate-500" aria-label="Medicaid expansion legend">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: EXPANSION }} /> Expansion
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: NON_EXPANSION }} /> Non-expansion
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Trajectory - cumulative care cost and avoided spending, with crossover and
// selected-window markers.
// -----------------------------------------------------------------------------
function Trajectory({
  trajectory,
  selectedName,
  scenario,
  error,
  crossover,
  horizon,
  selectedLocation,
  onLocation,
}: {
  trajectory: ReturnType<typeof buildTrajectoryData>;
  selectedName: string;
  scenario: CostScenarioId;
  error: string | null;
  crossover: Crossover | null;
  horizon: number;
  selectedLocation: LocationKey;
  onLocation: (location: LocationKey) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const legend = [
    ['Care cost', NAVY],
    ['ADAP avoided', TEAL],
  ] as const;

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold text-slate-900">
          {selectedName} / {SCENARIO_LABELS[scenario].toLowerCase()}
        </h3>
        <div className="flex items-center gap-1" role="group" aria-label="Trajectory preset">
          {[
            ['Total', 'Modeled total'],
            ['FL', 'Florida example'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onLocation(value)}
              aria-pressed={selectedLocation === value}
              className={cx(
                'rounded border px-2 py-1 text-[0.7rem] font-medium transition-colors',
                selectedLocation === value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {crossover
          ? `Care cost exceeds avoided spending from ${crossover.year}.`
          : 'The median care-cost trajectory remains below avoided spending through 2035.'}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
        {legend.map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="text-slate-400">band = 95% simulation interval · discounted dollars</span>
      </div>
      <div className="mt-4 h-[320px] sm:h-[340px]">
        {error ? (
          <div className="flex h-full items-center justify-center border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        ) : trajectory.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading cost series…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trajectory} margin={{ top: 18, right: 16, bottom: 8, left: 6 }}>
              <CartesianGrid stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: MUTED, fontSize: 11 }} />
              <YAxis tickFormatter={formatCompactDollars} tickLine={false} axisLine={false} tick={{ fill: MUTED, fontSize: 11 }} width={64} />
              <Tooltip content={<TrajTip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
              {horizon < HORIZON_MAX && (
                <ReferenceLine
                  x={horizon}
                  stroke={INK}
                  strokeDasharray="4 4"
                  label={{ value: 'window', position: 'top', fill: MUTED, fontSize: 11 }}
                />
              )}
              {crossover && (
                <ReferenceLine
                  x={crossover.year}
                  stroke={RUST}
                  strokeWidth={1.4}
                  label={{ value: 'crosses', position: 'top', fill: RUST, fontSize: 11 }}
                />
              )}
              <Area type="monotone" dataKey="careLower" stackId="care" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area type="monotone" dataKey="careBand" stackId="care" stroke="none" fill={NAVY} fillOpacity={0.13} isAnimationActive={!reduce} animationDuration={650} />
              <Line type="monotone" dataKey="careMedian" stroke={NAVY} strokeWidth={3.25} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} isAnimationActive={!reduce} animationDuration={650} />
              <Line type="monotone" dataKey="adap" stroke={TEAL} strokeWidth={2.75} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} isAnimationActive={!reduce} animationDuration={650} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Crossover timeline - every state's break-even year, ranked along the horizon
// -----------------------------------------------------------------------------
function CrossoverTimeline({
  crossovers,
  horizon,
  national,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  crossovers: StateCrossover[];
  horizon: number;
  national: Crossover | null;
  selected: LocationKey;
  hovered: string | null;
  onSelect: (state: string) => void;
  onHover: (state: string | null) => void;
}) {
  const crossedYears = crossovers.filter((c) => c.crossoverYear !== null).map((c) => c.crossoverYear as number);
  const firstYear = Math.min(HORIZON_MIN, ...(crossedYears.length ? crossedYears : [HORIZON_MIN]));
  const years = Array.from({ length: HORIZON_MAX - firstYear + 1 }, (_, i) => firstYear + i);
  const never = crossovers.filter((c) => c.crossoverYear === null);
  const crossedByHorizon = crossovers.filter((c) => c.crossoverYear !== null && (c.crossoverYear as number) <= horizon).length;

  const chip = (item: StateCrossover, muted: boolean) => {
    const isSel = item.state === selected;
    const isHover = item.state === hovered;
    return (
      <button
        key={item.state}
        type="button"
        onClick={() => onSelect(item.state)}
        onMouseEnter={() => onHover(item.state)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(item.state)}
        onBlur={() => onHover(null)}
        aria-label={`${item.stateName}: ${
          item.crossoverYear !== null ? `crosses break-even in ${item.crossoverYear}` : 'does not cross break-even by 2035'
        }`}
        className={cx(
          'rounded border px-1.5 py-0.5 font-mono text-[0.72rem] font-medium transition-all',
          isSel
            ? 'border-[#002D72] bg-slate-100 text-slate-900'
            : isHover
            ? 'border-slate-500 bg-white text-slate-900'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400',
          muted && !isSel && !isHover && 'opacity-45'
        )}
      >
        {item.state}
      </button>
    );
  };

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">
        Median break-even year, all {crossovers.length || ryanWhiteCostingMetadata.modeledJurisdictionCount} jurisdictions
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {crossovers.length === 0 ? (
          'Loading annual series…'
        ) : (
          <>
            Within the current window,{' '}
            <span className="font-semibold text-slate-900">{crossedByHorizon} of {crossovers.length}</span>{' '}
            jurisdictions cross break-even
            {national && (
              <>
                ; the modeled-total ledger crosses in <span className="font-semibold text-slate-900">{national.year}</span>
              </>
            )}
            . Jurisdictions past the window edge are dimmed.
          </>
        )}
      </p>
      {crossovers.length > 0 && (
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex min-w-[520px] gap-1.5">
            {years.map((year) => {
              const items = crossovers
                .filter((c) => c.crossoverYear === year)
                .sort((a, b) => a.state.localeCompare(b.state));
              const outsideWindow = year > horizon;
              return (
                <div key={year} className="min-w-0 flex-1">
                  <p
                    className={cx(
                      'border-b pb-1 text-center font-mono text-[0.7rem] tabular-nums',
                      outsideWindow ? 'border-slate-100 text-slate-300' : 'border-slate-300 text-slate-600'
                    )}
                  >
                    {String(year).slice(2)}
                  </p>
                  <div className="mt-1.5 flex flex-col items-center gap-1">
                    {items.length === 0 ? (
                      <span className="text-[0.7rem] text-slate-200">·</span>
                    ) : (
                      items.map((item) => chip(item, outsideWindow))
                    )}
                  </div>
                </div>
              );
            })}
            <div className="min-w-0 flex-1 border-l border-dashed border-slate-200 pl-1.5">
              <p className="border-b border-teal-200 pb-1 text-center text-[0.7rem] font-medium text-teal-700">
                not by &rsquo;35
              </p>
              <div className="mt-1.5 flex flex-col items-center gap-1">
                {never.length === 0 ? (
                  <span className="text-[0.7rem] text-slate-200">·</span>
                ) : (
                  never.sort((a, b) => a.state.localeCompare(b.state)).map((item) => chip(item, false))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-400">
        Break-even = first year the median cumulative care cost exceeds cumulative ADAP spending avoided.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Methods and assumptions
// -----------------------------------------------------------------------------
function ModelReview() {
  const p = ryanWhiteCostingMetadata.modelParameters;
  const cd4Mix = Object.entries(p.cd4Weights)
    .map(([label, value]) => `${label} ${formatPercent(value)}`)
    .join(' / ');
  const methodSections: ReviewCard[] = [
    {
      title: 'Study design',
      items: [
        { label: 'Policy scenario', value: 'Complete ADAP elimination on Jan 1, 2026' },
        { label: 'Comparator', value: 'ADAP continues at fixed baseline funding' },
        { label: 'Projection', value: '2026-2035; no extrapolation beyond 2035' },
        { label: 'Perspective', value: 'Modified healthcare system' },
      ],
      note: 'This is a deliberately extreme counterfactual used to estimate cost consequences, not a forecast of a specific enacted policy.',
    },
    {
      title: 'Outcome definitions',
      items: [
        { label: 'Excess infections', value: ryanWhiteCostingMetadata.outcomeDefinitions.infections.description },
        { label: 'Excess diagnoses', value: ryanWhiteCostingMetadata.outcomeDefinitions.diagnoses.description },
        { label: 'Costing cohort', value: ryanWhiteCostingMetadata.outcomeDefinitions.costingCohort },
      ],
      note: 'Infections and diagnoses are distinct model outcomes; downstream costs begin only after excess incident cases are diagnosed and initiate ART.',
    },
    {
      title: 'Accounting frame',
      items: [
        { label: 'Comparator', value: 'ADAP spending avoided' },
        { label: 'Net metric', value: 'Care cost minus ADAP' },
        { label: 'NCER', value: '(Care cost − ADAP avoided) / ADAP avoided' },
        { label: 'Break-even', value: 'NCER = 0' },
      ],
      note: 'The payer that realizes ADAP savings may not be the payer that incurs downstream care costs. NCER is a cost-consequence ratio, not a cost-effectiveness ratio.',
    },
    {
      title: 'Costing assumptions',
      items: [
        { label: 'Drug tiers', value: SCENARIO_ORDER.map((s) => formatCompactDollars(p.artDrugCosts[s])).join(' / ') },
        { label: 'Routine care', value: formatCompactDollars(p.routineCareCost) },
        { label: 'Discount rate', value: formatPercent(p.discountRate) },
      ],
    },
    {
      title: 'Engagement model',
      items: [
        { label: 'Reengagement', value: `pi ${p.reengagementPi} / lambda ${p.reengagementLambda}` },
        { label: 'CD4 mix', value: cd4Mix },
      ],
      note: p.immediateStartCareFractionDescription,
    },
    {
      title: 'Costs not counted',
      items: [
        { label: 'Existing clients', value: 'Treatment interruption, rebound, hospitalization, mortality, or higher replacement prices' },
        { label: 'Before ART', value: 'Costs accrued while excess incident cases remain undiagnosed or off ART' },
        { label: 'After 2035', value: 'All later care costs from infections occurring within the horizon' },
        { label: 'Broader effects', value: 'Non-HIV care, productivity, quality of life, and behavioral responses' },
      ],
      note: 'The app therefore reports a restricted downstream-care ledger, not the total economic or health impact of ADAP elimination.',
    },
    {
      title: 'Uncertainty',
      items: [
        { label: 'Model draws', value: ryanWhiteCostingMetadata.simulationDraws.toLocaleString('en-US') },
        { label: 'Displayed interval', value: '2.5th to 97.5th percentile' },
        { label: 'ART price tiers', value: 'Low / median / high' },
        { label: 'Funding', value: 'Deterministic under current inputs' },
      ],
      note: 'Scenario-specific intervals vary model draws at a fixed ART price. The pooled distribution additionally combines all three ART price tiers.',
    },
    {
      title: 'Jurisdiction context',
      items: [
        { label: 'Spending per client', value: ryanWhiteCostingMetadata.contextDefinitions.adapSpendingPerClient },
        { label: 'Urbanicity', value: ryanWhiteCostingMetadata.contextDefinitions.diagnosedHivWeightedUrbanicity },
        { label: 'Medicaid status', value: ryanWhiteCostingMetadata.contextDefinitions.medicaidExpansion },
      ],
      note: 'Spearman correlations are descriptive, unadjusted jurisdiction-level associations and should not be interpreted causally.',
    },
    {
      title: 'Data scope',
      items: [
        {
          label: 'Locations',
          value: `${ryanWhiteCostingMetadata.modeledJurisdictionCount} modeled jurisdictions`,
        },
        { label: 'Funding benchmark', value: 'Fixed jurisdiction inputs' },
        { label: 'Horizon', value: `${ryanWhiteCostingMetadata.horizon.startYear}-${ryanWhiteCostingMetadata.horizon.endYear}` },
      ],
      note: 'DC is included in modeled outcomes and funding totals. “Modeled total” means the sum of these jurisdictions, not a national all-jurisdiction estimate.',
    },
    {
      title: 'Provenance',
      items: [
        { label: 'Generated', value: ryanWhiteCostingMetadata.generatedAt.slice(0, 10) },
        { label: 'Model output', value: ryanWhiteCostingMetadata.sourceArtifacts.rData.fileName },
        { label: 'Model SHA-256', value: ryanWhiteCostingMetadata.sourceArtifacts.rData.sha256.slice(0, 12) },
        { label: 'Funding input', value: ryanWhiteCostingMetadata.sourceArtifacts.fundingCsv.fileName },
        { label: 'Funding SHA-256', value: ryanWhiteCostingMetadata.sourceArtifacts.fundingCsv.sha256.slice(0, 12) },
        { label: 'Context input', value: ryanWhiteCostingMetadata.sourceArtifacts.jurisdictionContextCsv.fileName },
        { label: 'Context SHA-256', value: ryanWhiteCostingMetadata.sourceArtifacts.jurisdictionContextCsv.sha256.slice(0, 12) },
      ],
      note: `${ryanWhiteCostingMetadata.fundingAdjustment.description} Modeled-total summaries use the within-simulation jurisdiction sum stored in the RData Total location. Exported values are checked against source arrays and the draft costing pipeline.`,
    },
  ];

  return (
    <section id="methods" className="scroll-mt-36 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
        <Reveal>
          <SectionHead n="05" eyebrow="Methods" title="Accounting frame and model assumptions">
            Cost, engagement, scope, and uncertainty conventions for interpreting the figures.
          </SectionHead>

          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200 bg-white">
            {methodSections.map((section) => (
              <div key={section.title} className="grid gap-4 px-4 py-5 sm:grid-cols-[190px_minmax(0,1fr)] sm:px-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                  {section.note && <p className="mt-2 text-xs leading-relaxed text-slate-500">{section.note}</p>}
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="min-w-0">
                      <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-400">{item.label}</dt>
                      <dd className="mt-1 break-words font-mono text-sm font-medium tabular-nums text-slate-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
export default function RyanWhiteCostingApp() {
  const [scenario, setScenario] = useState<CostScenarioId>(ryanWhiteCostingSummary.sensitivity.primaryScenario);
  const [location, setLocation] = useState<LocationKey>('Total');
  const [horizon, setHorizon] = useState<number>(HORIZON_MAX);
  const [hovered, setHovered] = useState<string | null>(null);
  const [series, setSeries] = useState<RyanWhiteCostingSeries | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const urlHydrated = useRef(false);
  const heroControlRef = useRef<HTMLDivElement | null>(null);
  const [echoVisible, setEchoVisible] = useState(false);

  const defaultScenario = ryanWhiteCostingSummary.sensitivity.primaryScenario;
  const defaultState: LocationKey = 'Total';
  const modeledJurisdictions = useMemo(() => new Set(ryanWhiteCostingSummary.states.map((item) => item.state)), []);

  // Shareable app state: read ?through/&state/&scenario once on mount, then
  // mirror changes back with replaceState (no history spam, no server round trip).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const through = Number(params.get('through'));
    if (Number.isInteger(through) && through >= HORIZON_MIN && through <= HORIZON_MAX) setHorizon(through);
    const state = params.get('state');
    if (state && (state === 'Total' || modeledJurisdictions.has(state))) setLocation(state);
    const urlScenario = params.get('scenario');
    if (urlScenario && (SCENARIO_ORDER as string[]).includes(urlScenario)) setScenario(urlScenario as CostScenarioId);
    urlHydrated.current = true;
  }, [modeledJurisdictions]);

  useEffect(() => {
    if (!urlHydrated.current) return;
    const params = new URLSearchParams();
    if (horizon !== HORIZON_MAX) params.set('through', String(horizon));
    if (location !== defaultState) params.set('state', location);
    if (scenario !== defaultScenario) params.set('scenario', scenario);
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }, [horizon, location, scenario, defaultState, defaultScenario]);

  useEffect(() => {
    let cancelled = false;
    fetchRyanWhiteCostingSeries()
      .then((data) => !cancelled && (setSeries(data), setSeriesError(null)))
      .catch((error) => !cancelled && setSeriesError(error instanceof Error ? error.message : 'Unable to load series'));
    return () => {
      cancelled = true;
    };
  }, []);

  // The fixed bar is only an echo of the hero control - show it once the
  // hero control has scrolled up under the 80px sticky site nav.
  useEffect(() => {
    const el = heroControlRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setEchoVisible(!entry.isIntersecting && entry.boundingClientRect.top < 80),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nationalFinal = ryanWhiteCostingSummary.national.finalYear;
  // The horizon control recomputes everything from the annual series; until it
  // loads (or if the URL preset a horizon), fall back to the 2035 summary.
  const nationalPoint = pointForYear(series?.national ?? [], horizon) ?? nationalFinal;
  const atFullHorizon = nationalPoint.year === HORIZON_MAX;
  const headline = useMemo(() => headlineAt(nationalPoint, scenario), [nationalPoint, scenario]);
  const horizonProfile = useMemo(
    () => buildHorizonProfile(series?.national ?? [], scenario),
    [series, scenario]
  );
  const share = atFullHorizon
    ? nationalFinal.shareNetCostPositiveVsAdap[scenario]
    : null;
  const decompositionRows = useMemo(
    () =>
      buildDecomposition(
        nationalPoint,
        atFullHorizon
          ? {
              pooled: ryanWhiteCostingSummary.national.pooledFinalYear.shareNetCostPositiveVsAdap,
              scenarios: nationalFinal.shareNetCostPositiveVsAdap,
            }
          : null
      ),
    [nationalPoint, atFullHorizon, nationalFinal]
  );

  const selectedSeries = seriesForLocation(series, location);
  const trajectory = useMemo(() => buildTrajectoryData(selectedSeries, scenario), [selectedSeries, scenario]);
  const selectedCrossover = useMemo(() => crossoverForPoints(selectedSeries, scenario), [selectedSeries, scenario]);
  const stateCrossovers = useMemo(() => buildStateCrossovers(series, scenario), [series, scenario]);
  const nationalCrossover = useMemo(
    () => crossoverForPoints(series?.national ?? [], scenario),
    [series, scenario]
  );

  const driverRows = useMemo(
    () => buildDriverRows(series, ryanWhiteCostingSummary.states, scenario, horizon, stateCrossovers),
    [series, scenario, horizon, stateCrossovers]
  );
  const nationalDriverRow = useMemo(
    () => buildNationalDriverRow(series, ryanWhiteCostingSummary, scenario, horizon),
    [series, scenario, horizon]
  );
  const selectedDriver =
    location === 'Total' ? nationalDriverRow : driverRows.find((row) => row.state === location) ?? nationalDriverRow;
  const selectedContext =
    location === 'Total'
      ? null
      : ryanWhiteCostingSummary.states.find((item) => item.state === location)?.baselineContext ?? null;
  const selectedName = location === 'Total' ? 'Modeled-jurisdiction total' : stateName(location);
  const intervalsCrossingZero = driverRows.filter((row) => row.ratioLower <= 0 && row.ratioUpper >= 0).length;

  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto bg-white text-slate-900">
      <HorizonEcho
        horizon={horizon}
        onHorizon={setHorizon}
        scenario={scenario}
        onScenario={setScenario}
        visible={echoVisible}
        ready={series !== null}
      />

      <CascadeHero
        headline={headline}
        estimand={scenario}
        horizon={nationalPoint.year}
        share={share}
        profile={horizonProfile}
        onHorizon={setHorizon}
        ready={series !== null}
        controlRef={heroControlRef}
      />

      <section id="crossover" className="scroll-mt-36 border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="01"
              eyebrow="Over time"
              title="How does the accounting balance change over the projection window?"
            >
              Cumulative downstream HIV care costs and ADAP spending avoided under the{' '}
              {SCENARIO_LABELS[scenario].toLowerCase()} assumption. The Florida preset mirrors the manuscript example;
              the modeled total is the app default.
            </SectionHead>
            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Trajectory
                trajectory={trajectory}
                selectedName={selectedName}
                scenario={scenario}
                error={seriesError}
                crossover={selectedCrossover}
                horizon={horizon}
                selectedLocation={location}
                onLocation={setLocation}
              />
              <CrossoverTimeline
                crossovers={stateCrossovers}
                horizon={horizon}
                national={nationalCrossover}
                selected={location}
                hovered={hovered}
                onSelect={setLocation}
                onHover={setHovered}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="drivers" className="scroll-mt-36 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="02"
              eyebrow="Jurisdiction variation"
              title="How do projected cost consequences vary across jurisdictions?"
            >
              NCER is the manuscript&apos;s primary jurisdiction-level outcome. At the selected window and price tier,{' '}
              {intervalsCrossingZero} of {driverRows.length} jurisdiction intervals include zero; medians describe
              modeled magnitude, while intervals show substantial within-jurisdiction uncertainty.
            </SectionHead>

            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.75fr)]">
              <JurisdictionRatioPlot
                rows={driverRows}
                horizonYear={nationalPoint.year}
                scenario={scenario}
                selected={location}
                hovered={hovered}
                onSelect={setLocation}
                onHover={setHovered}
              />
              <div className="flex min-w-0 flex-col gap-6">
                <StateDetailCard row={selectedDriver} crossoverKnown={series !== null} />
                <BaselineContextCard context={selectedContext} stateLabel={selectedName} />
              </div>
            </div>

            <details className="group mt-6">
              <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:text-slate-900">
                <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-90">
                  ▸
                </span>
                View exact jurisdiction table
              </summary>
              <div className="mt-3">
                <DriverTable
                  rows={driverRows}
                  horizonYear={nationalPoint.year}
                  selected={location}
                  hovered={hovered}
                  onSelect={setLocation}
                  onHover={setHovered}
                />
              </div>
            </details>
          </Reveal>
        </div>
      </section>

      <section id="context" className="scroll-mt-36 border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="03"
              eyebrow="Jurisdiction context"
              title="Which baseline characteristics are associated with NCER?"
            >
              The four comparisons presented in the manuscript, reproduced as selectable views. Correlations summarize
              unadjusted jurisdiction-level patterns; they do not identify why jurisdictions differ or estimate causal
              effects of the baseline characteristics.
            </SectionHead>
            <div className="mt-10">
              <HeterogeneityExplorer
                rows={driverRows}
                horizonYear={nationalPoint.year}
                scenario={scenario}
                selected={location}
                hovered={hovered}
                onSelect={setLocation}
                onHover={setHovered}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <UncertaintyDecomposition
        rows={decompositionRows}
        scenario={scenario}
        onScenario={setScenario}
        horizon={nationalPoint.year}
        estimand={scenario}
      />

      <ModelReview />

      <footer className="mx-auto w-full max-w-full px-5 py-12 sm:max-w-6xl sm:px-6">
        <p className="text-xs leading-relaxed text-slate-400">
          {ryanWhiteCostingMetadata.modeledJurisdictionCount} modeled jurisdictions, including DC. Funding benchmarks are
          fixed jurisdiction inputs; care-cost intervals are computed after per-simulation cumulative costing. Figures
          use the latest provided model artifact and are labeled by the selected horizon and ART price tier.
        </p>
      </footer>
    </div>
  );
}
