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
  buildMechanismSeries,
  buildNationalDriverRow,
  buildRankedStates,
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
  MechanismSeriesPoint,
  pointForYear,
  RankedStatePoint,
  ReviewCard,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  seriesForLocation,
  sortDriverRows,
  StateCrossover,
  stateName,
} from './view-model';

// --- palette: cool academic base; warm reserved for data only -----------------
const NAVY = '#002D72';
const TEAL = '#0f766e'; // net offset (data)
const RUST = '#b45309'; // net cost (data)
const INK = '#0f172a'; // slate-900
const MUTED = '#64748b'; // slate-500
const FIELD = '#f8fafc';
const GRID = '#dbe5f0';
const ACCENT = '#0e7490';
const EASE = [0.22, 1, 0.36, 1] as const;
const SERIF = '[font-family:var(--font-serif)]';

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function hexLerp(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Confidence a state is net-costly: cool cyan (coin flip / unsure) to hot rust.
function confColor(share: number): string {
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
  payload?: Array<{ dataKey?: string; value?: number; stroke?: string; payload?: RankedStatePoint }>;
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
            Savings arrive early; costs arrive late. Drag to evaluate the ledger over a shorter window
            {profile?.crossoverYear != null && (
              <>
                {' '}
                - nationally it crosses break-even around{' '}
                <span className="font-semibold text-slate-900">{profile.crossoverYear}</span>
              </>
            )}
            . 2035 is the model horizon; nothing is extrapolated past it.
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
  const yMax = profile.maxPerDollar * 1.08;
  const y = (v: number) => H - padB - (v / yMax) * (H - padT - padB);
  const path = profile.years.map((year, i) => `${i === 0 ? 'M' : 'L'}${x(year).toFixed(1)},${y(profile.perDollar[i]).toFixed(1)}`).join(' ');
  const horizonIdx = profile.years.indexOf(horizon);

  return (
    <div className="min-w-0">
      <p className="text-[0.62rem] font-medium uppercase tracking-wide text-slate-400">Care cost per $1, by window end</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="mt-1 max-w-full"
        role="img"
        aria-label={`Care cost per dollar of ADAP cut rises from ${formatPerDollar(profile.perDollar[0])} to ${formatPerDollar(profile.finalPerDollar)} as the window extends to ${last}`}
      >
        <line x1={padL} x2={W - padR} y1={y(1)} y2={y(1)} stroke={GRID} strokeDasharray="3 3" />
        <text x={W - padR + 4} y={y(1) + 3.5} fontSize="10" fill={MUTED} className="font-mono">
          $1
        </text>
        <path d={path} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        {horizonIdx >= 0 && (
          <circle cx={x(horizon)} cy={y(profile.perDollar[horizonIdx])} r={3.5} fill={INK} stroke="#ffffff" strokeWidth={1.5} />
        )}
        <text x={W - padR + 4} y={y(profile.finalPerDollar) + 3.5} fontSize="10" fill={INK} fontWeight={600} className="font-mono">
          {formatPerDollar(profile.finalPerDollar)}
        </text>
      </svg>
    </div>
  );
}

function HorizonEcho({
  horizon,
  onHorizon,
  visible,
  ready,
}: {
  horizon: number;
  onHorizon: (year: number) => void;
  visible: boolean;
  ready: boolean;
}) {
  return (
    <div className="sticky top-0 z-30 h-0">
      <div
        aria-hidden={!visible}
        className={cx(
          'border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur transition-all duration-200',
          visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
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
            className="h-1.5 w-full max-w-[260px] min-w-[120px] flex-1 cursor-pointer accent-slate-900 disabled:opacity-40"
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
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Cascade hero - the causal chain is the headline
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
  const paperRatio = headline.perDollar.median - 1;
  const truncated = horizon < HORIZON_MAX;
  const appearsToSave = headline.net.median <= 0;
  const bold = (text: string) => <span className="font-semibold text-slate-900">{text}</span>;

  // A truncated view must carry its own rebuttal: name the mechanism (costs
  // haven't landed yet) and the direction of travel, never a bare number.
  const narrative = !truncated ? (
    <>
      Eliminating ADAP in 30 states avoids {bold(formatCompactDollars(headline.adap))} in spending through {horizon} -
      but the infections the cut causes generate {bold(formatCompactDollars(headline.care.median))} in downstream HIV
      care costs
      {share !== null ? <>, exceeding the avoided spending in {bold(formatPercent(share))} of simulations</> : null}.
    </>
  ) : appearsToSave ? (
    <>
      Through {horizon}, the cut still <em>appears</em> to save: {bold(formatCompactDollars(headline.adap))} avoided
      against {bold(formatCompactDollars(headline.care.median))} in care costs landed so far. The infections behind
      those costs have already happened
      {profile?.crossoverYear != null ? (
        <>
          ; the ledger crosses break-even around {bold(String(profile.crossoverYear))} and reaches{' '}
          {bold(`${formatPerDollar(profile.finalPerDollar)} per $1`)} by 2035
        </>
      ) : (
        <> - their costs simply haven&apos;t landed inside this window yet</>
      )}
      .
    </>
  ) : (
    <>
      By {horizon}, downstream care costs have already overtaken the avoided spending -{' '}
      {bold(formatCompactDollars(headline.care.median))} against {bold(formatCompactDollars(headline.adap))} - and the
      gap keeps widening
      {profile ? <> to {bold(`${formatPerDollar(profile.finalPerDollar)} per $1`)} by 2035</> : null}.
    </>
  );

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto w-full max-w-full px-5 py-14 sm:max-w-6xl sm:px-6 sm:py-16">
        <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
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
              Cutting ADAP doesn&apos;t save what it appears to save.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">{narrative}</p>

            <div className="mt-8 max-w-lg border-l-2 pl-4" style={{ borderColor: NAVY }}>
              <p className="text-sm font-semibold text-slate-800">This estimate is deliberately conservative.</p>
              <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-slate-500">
                <li>Counts only care costs of excess new infections - nothing for existing clients losing coverage.</li>
                <li>Stops at 2035 while costs are still accruing; avoided spending is credited in full.</li>
                <li>Delays cost accrual behind a re-engagement model.</li>
              </ul>
            </div>
          </div>

          <div className="min-w-0 lg:justify-self-end lg:text-right">
            <Eyebrow>Care cost per $1 of ADAP cut</Eyebrow>
            <p className="mt-3 font-mono text-6xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-7xl">
              {formatPerDollar(headline.perDollar.median)}
            </p>
            <p className="mt-3 font-mono text-sm tabular-nums text-slate-500">
              {formatPerDollar(headline.perDollar.lower)} to {formatPerDollar(headline.perDollar.upper)} / 95% interval
            </p>
            {truncated && profile && (
              <p className="mt-2 font-mono text-sm tabular-nums text-slate-600">
                <span aria-hidden style={{ color: RUST }}>
                  ↗
                </span>{' '}
                {formatPerDollar(profile.finalPerDollar)} per $1 by 2035
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {ESTIMAND_LABELS[estimand]} · paper metric: net cost / ADAP = {paperRatio.toFixed(2)}
            </p>
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
  const links: Array<{ label: string; value: string; sub: string; mark?: string }> = [
    {
      label: 'Excess infections',
      value: formatNumber(headline.excessDiagnoses),
      sub: 'caused by the cut',
    },
    {
      label: 'Person-years on ART',
      value: formatNumber(headline.personYears),
      sub: 'immediate + re-engaged starts',
    },
    {
      label: 'Downstream care cost',
      value: formatCompactDollars(headline.care.median),
      sub: `${formatCompactDollars(headline.care.lower)} to ${formatCompactDollars(headline.care.upper)}`,
      mark: NAVY,
    },
    {
      label: 'ADAP spending avoided',
      value: formatCompactDollars(headline.adap),
      sub: 'deterministic comparator',
      mark: TEAL,
    },
    {
      label: 'Net cost',
      value: formatCompactDollars(headline.net.median),
      sub: `${formatCompactDollars(headline.net.lower)} to ${formatCompactDollars(headline.net.upper)}`,
      mark: headline.net.median > 0 ? RUST : TEAL,
    },
  ];

  return (
    <div className="mt-12 border-t border-slate-200 pt-6">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
        The model&apos;s logic / cumulative 2026-{horizon}, medians across 1,000 simulations
      </p>
      <div className="mt-4 flex flex-wrap items-stretch gap-y-4">
        {links.map((link, index) => (
          <div key={link.label} className="flex min-w-0 items-center">
            {index > 0 && (
              <span aria-hidden className="mx-3 text-lg text-slate-300 sm:mx-4">
                {index === 3 ? 'vs' : '→'}
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">
                {link.mark && <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ background: link.mark }} />}
                {link.label}
              </p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">{link.value}</p>
              <p className="mt-0.5 font-mono text-[0.68rem] tabular-nums text-slate-400">{link.sub}</p>
            </div>
          </div>
        ))}
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

  return (
    <section className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
      <Reveal>
        <SectionHead
          n="01"
          eyebrow="Uncertainty decomposition"
          title="Is the uncertainty drug prices, or the epidemic?"
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
          The pooled row treats the drug-price assumption as a source of uncertainty, mixed with 1,000 epidemic draws.
          The scenario rows hold price fixed: spread within a row is epidemic uncertainty, spread across rows is the
          price assumption. Bands are 95% intervals of net cost through {horizon}; click a scenario row to focus the
          state views on it.
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
                    per $1 cut
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
      </Reveal>
    </section>
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
// State beeswarm - the uncertainty field
// -----------------------------------------------------------------------------
const SWARM = { w: 1000, h: 300, padL: 40, padR: 30, padTop: 42, padBottom: 50 };
const swarmX = (share: number) => SWARM.padL + ((share - 0.45) / 0.55) * (SWARM.w - SWARM.padL - SWARM.padR);

interface SwarmDot extends RankedStatePoint {
  cx: number;
  cy: number;
  r: number;
}

interface SwarmLabel {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  box: { left: number; right: number; top: number; bottom: number };
}

function computeSwarm(states: RankedStatePoint[]): SwarmDot[] {
  const maxNet = Math.max(1, ...states.map((s) => Math.abs(s.netCost)));
  const rOf = (net: number) => 6 + Math.sqrt(Math.abs(net) / maxNet) * 16;
  const midY = (SWARM.padTop + (SWARM.h - SWARM.padBottom)) / 2;
  const sorted = [...states].sort((a, b) => a.shareNetPositive - b.shareNetPositive);
  const placed: SwarmDot[] = [];
  for (const s of sorted) {
    const r = rOf(s.netCost);
    const x = swarmX(s.shareNetPositive);
    let y = midY;
    for (let k = 0; k < 260; k++) {
      const off = Math.ceil(k / 2) * (k % 2 ? -1 : 1) * 6;
      const cand = midY + off;
      if (placed.every((p) => Math.hypot(p.cx - x, p.cy - cand) >= p.r + r + 1.5)) {
        y = cand;
        break;
      }
    }
    placed.push({ ...s, cx: x, cy: y, r });
  }
  return placed;
}

function intersects(a: SwarmLabel['box'], b: SwarmLabel['box']): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function labelBox(x: number, y: number, anchor: SwarmLabel['anchor'], text: string): SwarmLabel['box'] {
  const width = text.length * 7.4 + 5;
  const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const right = anchor === 'middle' ? x + width / 2 : anchor === 'end' ? x : x + width;
  return { left, right, top: y - 11, bottom: y + 3 };
}

function labelCandidate(dot: SwarmDot, placement: 'top' | 'bottom' | 'left' | 'right'): SwarmLabel {
  const x =
    placement === 'left'
      ? dot.cx - dot.r - 7
      : placement === 'right'
      ? dot.cx + dot.r + 7
      : Math.max(14, Math.min(SWARM.w - 14, dot.cx));
  const y = placement === 'top' ? dot.cy - dot.r - 7 : placement === 'bottom' ? dot.cy + dot.r + 15 : dot.cy + 4;
  const anchor = placement === 'left' ? 'end' : placement === 'right' ? 'start' : 'middle';
  return { x, y, anchor, box: labelBox(x, y, anchor, dot.state) };
}

function computeSwarmLabels(dots: SwarmDot[], avoidBoxes: SwarmLabel['box'][]): Map<string, SwarmLabel> {
  const labels = new Map<string, SwarmLabel>();
  const boxes: SwarmLabel['box'][] = [...avoidBoxes];
  const midY = (SWARM.padTop + (SWARM.h - SWARM.padBottom)) / 2;
  const ordered = [...dots].sort((a, b) => b.r - a.r || a.cx - b.cx);

  for (const dot of ordered) {
    const placements: Array<'top' | 'bottom' | 'left' | 'right'> =
      dot.shareNetPositive < 0.66
        ? ['bottom', 'left', 'right', 'top']
        : dot.cy < midY
        ? ['top', 'bottom', 'right', 'left']
        : ['bottom', 'top', 'right', 'left'];
    const candidates = placements.map((placement) => labelCandidate(dot, placement));
    const chosen =
      candidates.find((candidate) => {
        const inBounds = candidate.box.left >= 4 && candidate.box.right <= SWARM.w - 4 && candidate.box.top >= 8 && candidate.box.bottom <= SWARM.h - 8;
        return inBounds && boxes.every((box) => !intersects(candidate.box, box));
      }) ?? candidates[0];
    labels.set(dot.state, chosen);
    boxes.push(chosen.box);
  }

  return labels;
}

function SwarmReadout({ dot }: { dot: SwarmDot }) {
  const lines = [
    `${formatPercent(dot.shareNetPositive)} of draws net-costly`,
    `Net ${formatCompactDollars(dot.netCost)} / care ${formatCompactDollars(dot.careCost)}`,
    `${formatCompactDollars(dot.netLower)} to ${formatCompactDollars(dot.netUpper)}`,
  ];
  const boxW = 264;
  const boxH = 72;
  let x = dot.cx + dot.r + 12;
  if (x + boxW > SWARM.w) x = dot.cx - dot.r - 12 - boxW;
  const y = Math.max(4, Math.min(dot.cy - boxH / 2, SWARM.h - boxH - 4));
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={boxW} height={boxH} rx={8} fill="#ffffff" stroke="#cbd5e1" />
      <rect x={x} y={y} width={3} height={boxH} rx={1.5} fill={confColor(dot.shareNetPositive)} />
      <text x={x + 16} y={y + 24} fontSize="15" fontWeight={700} fill={INK}>
        {dot.stateName}
      </text>
      {lines.map((line, i) => (
        <text key={line} x={x + 16} y={y + 24 + 15 * (i + 1)} fontSize="12.5" fill={MUTED} className="font-mono">
          {line}
        </text>
      ))}
    </g>
  );
}

function StateSwarm({
  states,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  states: RankedStatePoint[];
  selected: LocationKey;
  hovered: string | null;
  onSelect: (state: string) => void;
  onHover: (state: string | null) => void;
}) {
  const dots = useMemo(() => computeSwarm(states), [states]);
  const reduce = useReducedMotion() ?? false;
  const ticks = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const axisY = SWARM.h - SWARM.padBottom;
  const tossUps = dots.filter((d) => d.shareNetPositive < 0.66);
  const bracketL = Math.min(...tossUps.map((d) => d.cx - d.r));
  const bracketR = Math.max(...tossUps.map((d) => d.cx + d.r));
  const bracketY = Math.max(26, Math.min(...tossUps.map((d) => d.cy - d.r)) - 18);
  const bracketAvoid = tossUps.length
    ? [{ left: bracketL - 8, right: bracketR + 8, top: bracketY - 22, bottom: bracketY + 12 }]
    : [];
  const labels = useMemo(() => computeSwarmLabels(dots, bracketAvoid), [dots, bracketL, bracketR, bracketY]);
  const active = hovered ?? (selected !== 'Total' ? selected : null);
  const hoverDot = hovered ? dots.find((d) => d.state === hovered) ?? null : null;
  const pinged = dots.filter((d) => d.shareNetPositive < 0.66 || d.state === selected);

  return (
    <svg
      viewBox={`0 0 ${SWARM.w} ${SWARM.h}`}
      className="block w-full"
      role="img"
      aria-label="States by share of simulation draws that are net-costly"
    >
      <defs>
        <filter id="rw-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect x={0} y={0} width={SWARM.w} height={SWARM.h} rx={8} fill={FIELD} />
      <line x1={swarmX(0.5)} x2={swarmX(0.5)} y1={SWARM.padTop} y2={axisY} stroke={ACCENT} strokeOpacity={0.28} strokeDasharray="4 5" />
      <line x1={SWARM.padL} x2={SWARM.w - SWARM.padR} y1={axisY} y2={axisY} stroke={GRID} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={swarmX(t)} x2={swarmX(t)} y1={axisY - 5} y2={axisY + 5} stroke={GRID} />
          <text x={swarmX(t)} y={axisY + 28} textAnchor="middle" fontSize="14" fill={MUTED} className="font-mono">
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}
      <text x={swarmX(0.5)} y={SWARM.padTop - 18} textAnchor="middle" fontSize="13" fill={MUTED}>
        coin flip
      </text>
      <text x={swarmX(1.0)} y={SWARM.padTop - 18} textAnchor="end" fontSize="13" fill={MUTED}>
        all draws net-costly
      </text>

      {/* halos (glow) */}
      {dots.map((d) => (
        <circle key={`h-${d.state}`} cx={d.cx} cy={d.cy} r={d.r * 1.45} fill={confColor(d.shareNetPositive)} opacity={0.16} filter="url(#rw-glow)" />
      ))}

      {/* sonar pings on the uncertain states (+ selected) */}
      {!reduce &&
        pinged.map((d, i) => (
          <circle
            key={`p-${d.state}`}
            className="rw-ping"
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill="none"
            stroke={d.state === selected ? NAVY : confColor(d.shareNetPositive)}
            strokeWidth={1.4}
            style={{ animationDelay: `${(i % 5) * 0.5}s` }}
          />
        ))}

      {/* toss-up region annotation */}
      {tossUps.length > 0 && (
        <g>
          <path
            d={`M ${bracketL} ${bracketY + 6} L ${bracketL} ${bracketY} L ${bracketR} ${bracketY} L ${bracketR} ${bracketY + 6}`}
            fill="none"
            stroke={ACCENT}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <text x={(bracketL + bracketR) / 2} y={bracketY - 6} textAnchor="middle" fontSize="12.5" fill={ACCENT} fillOpacity={0.8}>
            large-ADAP toss-ups
          </text>
        </g>
      )}

      {dots.map((d) => {
        const isSel = d.state === selected;
        const isActive = d.state === active;
        const label = labels.get(d.state) ?? labelCandidate(d, 'bottom');
        return (
          <g
            key={d.state}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`${d.stateName}: ${formatPercent(d.shareNetPositive)} of draws net-costly`}
            onClick={() => onSelect(d.state)}
            onMouseEnter={() => onHover(d.state)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(d.state)}
            onBlur={() => onHover(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(d.state);
              }
            }}
          >
            <motion.circle
              initial={false}
              animate={{ cx: d.cx, cy: d.cy, r: isSel || isActive ? d.r + 2.5 : d.r }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
              fill={confColor(d.shareNetPositive)}
              fillOpacity={isSel || isActive ? 1 : 0.88}
              stroke={isSel ? NAVY : isActive ? INK : '#ffffff'}
              strokeWidth={isSel ? 2.5 : isActive ? 1.6 : 1}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              fontSize={isSel || isActive ? 13 : 11.5}
              fontWeight={isSel || isActive ? 800 : 650}
              fill={isSel || isActive ? INK : '#475569'}
              stroke={FIELD}
              strokeWidth={3}
              paintOrder="stroke"
              pointerEvents="none"
            >
              {d.state}
            </text>
          </g>
        );
      })}

      {hoverDot && <SwarmReadout dot={hoverDot} />}
    </svg>
  );
}

function SwarmLegend() {
  const stops = [0.5, 0.65, 0.8, 0.95, 1.0];
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-600">Draws net-costly</span>
        <span className="flex overflow-hidden rounded-full">
          {stops.map((s) => (
            <span key={s} className="h-2.5 w-7" style={{ background: confColor(s) }} />
          ))}
        </span>
        <span className="font-mono text-slate-400">50 to 100%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-600">Dot size</span>
        <svg width="46" height="18" aria-hidden>
          <circle cx="7" cy="9" r="4" fill="#94a3b8" />
          <circle cx="30" cy="9" r="8" fill="#94a3b8" />
        </svg>
        <span className="text-slate-400">median net cost</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// State drivers: ranked table (supplemental-table columns, at the window) and
// the selected-location drilldown
// -----------------------------------------------------------------------------
const DRIVER_COLUMNS: Array<{ key: DriverSortKey; label: string }> = [
  { key: 'excessDiagnoses', label: 'Excess dx' },
  { key: 'personYears', label: 'ART p-y' },
  { key: 'careCost', label: 'Care cost' },
  { key: 'adap', label: 'ADAP avoided' },
  { key: 'net', label: 'Net cost' },
  { key: 'ratio', label: 'Net / ADAP' },
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">Ranked drivers through {horizonYear}</h3>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-slate-400">
          click a column to re-rank
        </span>
      </div>
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
                    {formatNumber(row.excessDiagnoses)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">
                    {formatNumber(row.personYears)}
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
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-900">{row.ratio.toFixed(2)}</td>
                  <td
                    className="py-2 pl-2 text-right font-mono tabular-nums font-medium"
                    style={{ color: confColor(row.shareNetPositive2035) }}
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
        Columns follow the paper&apos;s supplemental table; ratio = (care cost &minus; ADAP avoided) / ADAP avoided.
        Values are medians at the selected budget window; the draws-net-costly share is a 2035 quantity.
      </p>
    </div>
  );
}

function StateDetailCard({ row, crossoverKnown }: { row: DriverRow; crossoverKnown: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Eyebrow>Selected {row.state === 'Total' ? 'view' : 'state'}</Eyebrow>
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
        <span style={{ color: confColor(row.shareNetPositive2035) }}>
          {formatPercent(row.shareNetPositive2035)} net-costly at &rsquo;35
        </span>
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
        {[
          ['Net cost vs ADAP', formatCompactDollars(row.net.median)],
          ['95% interval', `${formatCompactDollars(row.net.lower)} to ${formatCompactDollars(row.net.upper)}`],
          ['Downstream care', formatCompactDollars(row.careCost.median)],
          ['ADAP avoided', formatCompactDollars(row.adap)],
          ['Per $1 cut', formatPerDollar(row.perDollar)],
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
          Program-dependence and epidemic context are state-level measures; select a state to see them.
        </p>
      </div>
    );
  }

  const items: Array<[string, string]> = [
    ['Viral suppression', formatPercent(context.viralSuppressionPct)],
    ['Suppressed on ADAP', formatPercent(context.propSuppressedOnAdap)],
    ['ADAP client share', formatPercent(context.adapClientShare)],
    ['ADAP clients', formatNumber(context.adapClients)],
    ['Ryan White clients', formatNumber(context.rwClients)],
    ['Diagnosed PWH', formatNumber(context.diagnosedPrevalence)],
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
        2025 values under no intervention; medians across 1,000 simulations. These are the variables the heterogeneity
        view uses to explain why states differ.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mechanism decomposition - who is accruing cost after the cut
// -----------------------------------------------------------------------------
const MECH_IMMEDIATE = '#2563eb';
const MECH_REENGAGED = '#0d9488';
const MECH_OFFART = '#d97706';

const MECH_LABELS: Record<string, string> = {
  immediate: 'On ART - started immediately',
  reengaged: 'On ART - re-engaged after delay',
  offArt: 'Still off ART',
};

function MechTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((pl) => pl.dataKey && MECH_LABELS[pl.dataKey]);
  const total = rows.reduce((sum, pl) => sum + Number(pl.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-md">
      <p className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">Year {label}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((pl) => (
          <p key={pl.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ background: pl.stroke }} />
              {MECH_LABELS[pl.dataKey as string]}
            </span>
            <span className="font-mono tabular-nums text-slate-900">{formatNumber(Number(pl.value))}</span>
          </p>
        ))}
        <p className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1 text-xs">
          <span className="text-slate-500">Excess diagnosed to date</span>
          <span className="font-mono tabular-nums text-slate-900">{formatNumber(total)}</span>
        </p>
      </div>
    </div>
  );
}

function MechanismChart({
  series,
  selectedName,
  horizon,
  error,
}: {
  series: MechanismSeriesPoint[];
  selectedName: string;
  horizon: number;
  error: string | null;
}) {
  const reduce = useReducedMotion() ?? false;
  const legend = [
    [MECH_LABELS.immediate, MECH_IMMEDIATE],
    [MECH_LABELS.reengaged, MECH_REENGAGED],
    [MECH_LABELS.offArt, MECH_OFFART],
  ] as const;

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">Who is accruing cost / {selectedName}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Everyone diagnosed because of the cut is either on ART (immediately, or re-engaged after a delay) or still off
        ART. The on-ART stock is what drives care costs; this is the paper&apos;s re-engagement model made inspectable.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
        {legend.map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <div className="mt-4 h-[280px] sm:h-[300px]">
        {error ? (
          <div className="flex h-full items-center justify-center border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        ) : series.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading cost series…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 18, right: 16, bottom: 8, left: 6 }}>
              <CartesianGrid stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: MUTED, fontSize: 11 }} />
              <YAxis tickFormatter={formatNumber} tickLine={false} axisLine={false} tick={{ fill: MUTED, fontSize: 11 }} width={56} />
              <Tooltip content={<MechTip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
              {horizon < HORIZON_MAX && (
                <ReferenceLine
                  x={horizon}
                  stroke={INK}
                  strokeDasharray="4 4"
                  label={{ value: 'window', position: 'top', fill: MUTED, fontSize: 11 }}
                />
              )}
              <Area type="monotone" dataKey="immediate" stackId="mech" stroke={MECH_IMMEDIATE} strokeWidth={1.5} fill={MECH_IMMEDIATE} fillOpacity={0.45} isAnimationActive={!reduce} animationDuration={650} />
              <Area type="monotone" dataKey="reengaged" stackId="mech" stroke={MECH_REENGAGED} strokeWidth={1.5} fill={MECH_REENGAGED} fillOpacity={0.45} isAnimationActive={!reduce} animationDuration={650} />
              <Area type="monotone" dataKey="offArt" stackId="mech" stroke={MECH_OFFART} strokeWidth={1.5} fill={MECH_OFFART} fillOpacity={0.45} isAnimationActive={!reduce} animationDuration={650} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-400">
        Stocks are per-component medians across simulations, so layers need not sum exactly to the median total. The
        never-returning share of the re-engagement model (14%) accumulates in the off-ART layer.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Heterogeneity explorer - why states differ, against baseline context
// -----------------------------------------------------------------------------
function HeterogeneityExplorer({
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
  const [axisId, setAxisId] = useState<ContextAxisId>('sexualTransmissionRate');
  const axis = CONTEXT_AXES.find((item) => item.id === axisId) ?? CONTEXT_AXES[0];
  const points = useMemo(
    () => buildHeterogeneityPoints(rows, ryanWhiteCostingSummary.states, axisId),
    [rows, axisId]
  );
  const reduce = useReducedMotion() ?? false;
  const maxAdap = Math.max(1, ...points.map((point) => point.adap));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const padX = (maxX - minX) * 0.08 || 0.01;
  const minRatio = Math.min(0, ...points.map((point) => point.ratio));
  const maxRatio = Math.max(0, ...points.map((point) => point.ratio));
  const padY = (maxRatio - minRatio) * 0.1 || 0.1;
  const alwaysLabel = new Set(['FL', 'TX', 'CA', 'NY']);
  const active = hovered ?? (selected !== 'Total' ? selected : null);

  const renderDot = (props: unknown) => {
    const { cx: x, cy: y, payload } = props as { cx?: number; cy?: number; payload?: HeterogeneityPoint };
    if (typeof x !== 'number' || typeof y !== 'number' || !payload) return <g />;
    const r = 5 + Math.sqrt(payload.adap / maxAdap) * 12;
    const isSel = payload.state === selected;
    const isActive = payload.state === active;
    const color = confColor(payload.share2035);
    return (
      <g
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`${payload.stateName}: ratio ${payload.ratio.toFixed(2)}, ${axis.label} ${axis.format(payload.x)}`}
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
          {axis.shortLabel} {axis.format(p.x)} · ratio {p.ratio.toFixed(2)}
        </p>
        <p className="font-mono text-xs tabular-nums text-slate-500">ADAP avoided {formatCompactDollars(p.adap)}</p>
      </div>
    );
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {CONTEXT_AXES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAxisId(item.id)}
            aria-pressed={item.id === axisId}
            className={cx(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              item.id === axisId
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
            )}
          >
            {item.shortLabel}
          </button>
        ))}
        <span className="ml-1 text-xs text-slate-400">{axis.description}</span>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Net cost / ADAP ratio vs {axis.label.toLowerCase()}
          </h3>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-slate-400">
            through {horizonYear} · dot size = ADAP avoided
          </span>
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
                label={{ value: 'Net cost / ADAP', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 12 }}
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
        <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-400">
          Descriptive associations across 30 states - no fitted line, no adjustment. Color is the share of draws
          net-costly at 2035; the ratio is evaluated at the selected budget window.
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Trajectory - care cost racing claimed savings, with crossover + window markers
// -----------------------------------------------------------------------------
function Trajectory({
  trajectory,
  selectedName,
  scenario,
  error,
  crossover,
  horizon,
  isNational,
  onNational,
}: {
  trajectory: ReturnType<typeof buildTrajectoryData>;
  selectedName: string;
  scenario: CostScenarioId;
  error: string | null;
  crossover: Crossover | null;
  horizon: number;
  isNational: boolean;
  onNational: () => void;
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
        {!isNational && (
          <button
            type="button"
            onClick={onNational}
            className="rounded border border-slate-300 px-2 py-0.5 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            National view
          </button>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {crossover
          ? `Care cost overtakes the avoided spending in ${crossover.year} - and is still pulling away at 2035.`
          : 'Care cost stays below the avoided spending through 2035 in the median draw.'}
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
      <h3 className="text-base font-semibold text-slate-900">Break-even year, all 30 states</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {crossovers.length === 0 ? (
          'Loading annual series…'
        ) : (
          <>
            Within the current window,{' '}
            <span className="font-semibold text-slate-900">{crossedByHorizon} of 30</span> states cross break-even
            {national && (
              <>
                ; the national ledger crosses in <span className="font-semibold text-slate-900">{national.year}</span>
              </>
            )}
            . States past the window edge are dimmed. Click a state to focus it.
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
        Break-even = first year median cumulative care cost exceeds cumulative ADAP spending avoided. &ldquo;Not by
        &rsquo;35&rdquo; states remain net-saving in the median draw within the model horizon.
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
      title: 'Accounting frame',
      items: [
        { label: 'Comparator', value: 'ADAP spending avoided' },
        { label: 'Net metric', value: 'Care cost minus ADAP' },
      ],
      note: 'Interpretation remains payer-perspective dependent; downstream care may be ADAP/RWHAP-eligible under another counterfactual.',
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
      title: 'Data scope',
      items: [
        { label: 'Locations', value: '30 modeled states' },
        { label: 'Funding benchmark', value: 'Fixed state inputs' },
        { label: 'Horizon', value: `${ryanWhiteCostingMetadata.horizon.startYear}-${ryanWhiteCostingMetadata.horizon.endYear}` },
      ],
      note: 'DC funding is excluded because no DC epidemiologic output is present. Intervals reflect modeled epidemiologic and care-cost uncertainty, not funding uncertainty.',
    },
    {
      title: 'Provenance',
      items: [
        { label: 'Generated', value: ryanWhiteCostingMetadata.generatedAt.slice(0, 10) },
        { label: 'Model output', value: ryanWhiteCostingMetadata.sourceRData.split('/').pop() ?? '' },
        { label: 'Funding input', value: ryanWhiteCostingMetadata.sourceFundingCsv.split('/').pop() ?? '' },
      ],
      note: `${ryanWhiteCostingMetadata.fundingAdjustment.description} National summaries use the within-simulation state sum (RData Total location); the paper's supplemental table bootstraps states independently - convention pending confirmation. Exporter output is numerically cross-checked against the draft analysis pipeline (scripts/cross-check-ryan-white-costing.R).`,
    },
  ];

  return (
    <section className="border-t border-slate-200 bg-slate-50">
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
                      <dd className="mt-1 break-all font-mono text-sm font-medium tabular-nums text-slate-900">{item.value}</dd>
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

function QuestionsToResolve() {
  const questions = ryanWhiteCostingMetadata.reviewQuestions;

  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-full px-5 pb-4 sm:max-w-6xl sm:px-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50/45 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Questions to resolve</h2>
            <p className="text-[0.7rem] text-amber-700/80">
              Kept out of the interface on purpose: unresolved methodology is review context, not a user control.
            </p>
          </div>
          <ul className="mt-4 grid gap-x-8 gap-y-2 lg:grid-cols-2">
            {questions.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
export default function RyanWhiteCostingApp() {
  const [scenario, setScenario] = useState<CostScenarioId>(ryanWhiteCostingSummary.sensitivity.primaryScenario);
  const [location, setLocation] = useState<LocationKey>(ryanWhiteCostingMetadata.defaultFocusState);
  const [horizon, setHorizon] = useState<number>(HORIZON_MAX);
  const [hovered, setHovered] = useState<string | null>(null);
  const [series, setSeries] = useState<RyanWhiteCostingSeries | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const urlHydrated = useRef(false);
  const heroControlRef = useRef<HTMLDivElement | null>(null);
  const [echoVisible, setEchoVisible] = useState(false);

  const primaryEstimand = ryanWhiteCostingMetadata.primaryEstimand;
  const defaultScenario = ryanWhiteCostingSummary.sensitivity.primaryScenario;
  const defaultState = ryanWhiteCostingMetadata.defaultFocusState;
  const modeledStates = useMemo(() => new Set(ryanWhiteCostingSummary.states.map((item) => item.state)), []);

  // Shareable app state: read ?through/&state/&scenario once on mount, then
  // mirror changes back with replaceState (no history spam, no server round trip).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const through = Number(params.get('through'));
    if (Number.isInteger(through) && through >= HORIZON_MIN && through <= HORIZON_MAX) setHorizon(through);
    const state = params.get('state');
    if (state && (state === 'Total' || modeledStates.has(state))) setLocation(state);
    const urlScenario = params.get('scenario');
    if (urlScenario && (SCENARIO_ORDER as string[]).includes(urlScenario)) setScenario(urlScenario as CostScenarioId);
    urlHydrated.current = true;
  }, [modeledStates]);

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

  // The sticky bar is only an echo of the hero control - show it once the
  // hero control has scrolled above the viewport.
  useEffect(() => {
    const el = heroControlRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setEchoVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nationalFinal = ryanWhiteCostingSummary.national.finalYear;
  // The horizon control recomputes everything from the annual series; until it
  // loads (or if the URL preset a horizon), fall back to the 2035 summary.
  const nationalPoint = pointForYear(series?.national ?? [], horizon) ?? nationalFinal;
  const atFullHorizon = nationalPoint.year === HORIZON_MAX;
  const headline = useMemo(() => headlineAt(nationalPoint, primaryEstimand), [nationalPoint, primaryEstimand]);
  const horizonProfile = useMemo(
    () => buildHorizonProfile(series?.national ?? [], primaryEstimand),
    [series, primaryEstimand]
  );
  const share = atFullHorizon
    ? primaryEstimand === 'pooled'
      ? ryanWhiteCostingSummary.national.pooledFinalYear.shareNetCostPositiveVsAdap
      : nationalFinal.shareNetCostPositiveVsAdap[primaryEstimand]
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

  const rankedStates = useMemo(() => buildRankedStates(ryanWhiteCostingSummary.states, scenario), [scenario]);
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
  const mechanismSeries = useMemo(() => buildMechanismSeries(selectedSeries), [selectedSeries]);

  const selectedName = location === 'Total' ? 'National total' : stateName(location);
  const tossUps = rankedStates.filter((s) => s.shareNetPositive < 0.66);
  const likely = rankedStates.filter((s) => s.shareNetPositive >= 0.85).length;

  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto bg-white text-slate-900">
      <HorizonEcho horizon={horizon} onHorizon={setHorizon} visible={echoVisible} ready={series !== null} />

      <CascadeHero
        headline={headline}
        estimand={primaryEstimand}
        horizon={nationalPoint.year}
        share={share}
        profile={horizonProfile}
        onHorizon={setHorizon}
        ready={series !== null}
        controlRef={heroControlRef}
      />

      <UncertaintyDecomposition
        rows={decompositionRows}
        scenario={scenario}
        onScenario={setScenario}
        horizon={nationalPoint.year}
        estimand={primaryEstimand}
      />

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="02"
              eyebrow="Trajectory and crossover"
              title="When do the costs overtake the savings?"
            >
              Cumulative downstream care cost races the ADAP spending a cut would avoid, in discounted dollars. The
              question is not whether the lines cross, but when - and the answer moves with the drug-price row selected
              above ({SCENARIO_LABELS[scenario].toLowerCase()}). The budget window from the hero is marked on the chart.
            </SectionHead>
            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Trajectory
                trajectory={trajectory}
                selectedName={selectedName}
                scenario={scenario}
                error={seriesError}
                crossover={selectedCrossover}
                horizon={horizon}
                isNational={location === 'Total'}
                onNational={() => setLocation('Total')}
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

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="03"
              eyebrow="State drivers"
              title="Which states drive the national result?"
              right={<SwarmLegend />}
            >
              The table carries the paper&apos;s supplemental-table columns, recomputed at the selected budget window;
              re-rank it by any column. The field above it shows how certain each state&apos;s verdict is at 2035:{' '}
              {likely} of 30 states are net-costly in at least 85% of simulations, and the {tossUps.length} near a coin
              flip ({tossUps.map((s) => s.state).join(', ')}) are all large ADAP programs. Selecting a state updates the
              trajectory, the drilldown, and the mechanism view.
            </SectionHead>

            <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                  Uncertainty field / share of draws net-costly at 2035
                </span>
                <span className="font-mono text-[0.62rem] text-slate-400">
                  30 modeled states
                </span>
              </div>
              <StateSwarm states={rankedStates} selected={location} hovered={hovered} onSelect={setLocation} onHover={setHovered} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <DriverTable
                rows={driverRows}
                horizonYear={nationalPoint.year}
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

            <div className="mt-6">
              <MechanismChart
                series={mechanismSeries}
                selectedName={selectedName}
                horizon={horizon}
                error={seriesError}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="04"
              eyebrow="Why states differ"
              title="What separates the high-cost states from the rest?"
            >
              States don&apos;t differ because their models differ - they differ in program dependence and epidemic
              context. Pick a baseline variable from the model&apos;s 2025 no-intervention state and see how it lines up
              with the net cost / ADAP ratio. Selecting a state syncs every other view.
            </SectionHead>
            <div className="mt-10">
              <HeterogeneityExplorer
                rows={driverRows}
                horizonYear={nationalPoint.year}
                selected={location}
                hovered={hovered}
                onSelect={setLocation}
                onHover={setHovered}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <ModelReview />

      <QuestionsToResolve />

      <footer className="mx-auto w-full max-w-full px-5 py-12 sm:max-w-6xl sm:px-6">
        <p className="text-xs leading-relaxed text-slate-400">
          30 modeled states. DC funding is excluded because no DC epidemiologic output is present. Funding benchmarks are
          fixed state inputs; care-cost intervals are computed after per-simulation cumulative costing. Internal review
          preview; figures are provisional.
        </p>
      </footer>
    </div>
  );
}
