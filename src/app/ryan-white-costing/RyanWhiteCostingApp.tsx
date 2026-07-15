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
  CostTrajectoryPoint,
  Crossover,
  crossoverForPoints,
  DecompositionRow,
  DriverRow,
  DriverSortKey,
  HeterogeneityPoint,
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

const ANALYSIS_SECTIONS = [
  { id: 'pathway', label: 'Model pathway' },
  { id: 'crossover', label: 'Over time' },
  { id: 'drivers', label: 'Jurisdictions' },
  { id: 'context', label: 'Context' },
  { id: 'robustness', label: 'Price sensitivity' },
  { id: 'methods', label: 'Methods' },
] as const;

type AnalysisSectionId = (typeof ANALYSIS_SECTIONS)[number]['id'];

function formatNcer(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAnnualCostInput(value: number): string {
  return `$${(value / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
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
  const point = payload.find((item) => item.payload)?.payload as CostTrajectoryPoint | undefined;
  if (!point) return null;
  const netPositive = point.netMedian >= 0;
  return (
    <div className="min-w-52 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-md">
      <p className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">Year {label}</p>
      <div className="mt-1.5 space-y-1.5 text-xs">
        <p className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: NAVY }} /> Care cost
          </span>
          <span className="font-mono tabular-nums text-slate-900">{formatCompactDollars(point.careMedian)}</span>
        </p>
        <p className="flex items-center justify-between gap-6 text-[0.7rem] text-slate-400">
          <span>95% interval</span>
          <span className="font-mono tabular-nums">
            {formatCompactDollars(point.careLower)} to {formatCompactDollars(point.careUpper)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: TEAL }} /> ADAP avoided
          </span>
          <span className="font-mono tabular-nums text-slate-900">{formatCompactDollars(point.adap)}</span>
        </p>
        <p className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1.5">
          <span className="text-slate-500">Median {netPositive ? 'net cost' : 'net offset'}</span>
          <span className="font-mono font-semibold tabular-nums" style={{ color: netPositive ? RUST : TEAL }}>
            {formatCompactDollars(Math.abs(point.netMedian))}
          </span>
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Budget-window control - the app's one computation-bearing input. The hero
// keeps it compact and explicit; the sticky bar below is a condensed echo once
// this control scrolls away.
// -----------------------------------------------------------------------------

function AnalysisNavigation({
  horizon,
  onHorizon,
  scenario,
  onScenario,
  activeSection,
  ready,
}: {
  horizon: number;
  onHorizon: (year: number) => void;
  scenario: CostScenarioId;
  onScenario: (scenario: CostScenarioId) => void;
  activeSection: AnalysisSectionId;
  ready: boolean;
}) {
  const tickYears = Array.from({ length: HORIZON_MAX - HORIZON_MIN + 1 }, (_, i) => HORIZON_MIN + i);
  const sentinelRef = useRef<HTMLSpanElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [fixed, setFixed] = useState(false);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setFixed(sentinel.getBoundingClientRect().top < 80);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const updateHeight = () => setNavHeight(Math.ceil(nav.getBoundingClientRect().height));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);
  const sectionLinks = (
    <>
      {ANALYSIS_SECTIONS.map((section) => {
        const active = activeSection === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={active ? 'location' : undefined}
            className={cx(
              'relative flex-shrink-0 whitespace-nowrap py-3 text-xs transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:transition-transform lg:text-[0.8rem]',
              active
                ? 'font-semibold text-slate-950 after:scale-x-100 after:bg-blue-900'
                : 'font-medium text-slate-500 after:scale-x-0 after:bg-transparent hover:text-slate-900'
            )}
          >
            {section.label}
          </a>
        );
      })}
    </>
  );

  const horizonSelect = (id: string) => (
    <label htmlFor={id} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <span>Headline through</span>
      <select
        id={id}
        value={horizon}
        disabled={!ready}
        onChange={(event) => onHorizon(Number(event.target.value))}
        className="rounded-full border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-wait disabled:opacity-40"
      >
        {tickYears.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </label>
  );

  const priceControl = (compact = false) => (
    <div className="flex items-center gap-1" role="group" aria-label="Drug-price assumption">
      {!compact && <span className="mr-1 text-xs font-medium text-slate-500">ART price</span>}
      {SCENARIO_ORDER.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onScenario(item)}
          aria-pressed={scenario === item}
          className={cx(
            'rounded-full px-2 py-1 font-mono text-[0.7rem] font-medium transition-colors',
            scenario === item
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          {SCENARIO_SHORT_LABELS[item]}
        </button>
      ))}
    </div>
  );

  return (
    <div id="analysis-navigation" className="relative" style={navHeight ? { height: navHeight } : undefined}>
      <span ref={sentinelRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-px" />
      <div
        ref={navRef}
        className={cx(
          'z-40 border-y border-slate-200 bg-white/95 backdrop-blur transition-[box-shadow,background-color] duration-200',
          fixed
            ? 'fixed inset-x-0 top-20 shadow-[0_6px_18px_rgba(15,23,42,0.08)]'
            : 'relative shadow-sm'
        )}
      >
      <div className="mx-auto hidden w-full max-w-6xl items-center gap-5 px-6 lg:flex">
        <span className="flex-shrink-0 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Sections
        </span>
        <nav aria-label="Analysis sections" className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
          {sectionLinks}
        </nav>
        <div className="flex flex-shrink-0 items-center gap-4 border-l border-slate-200 pl-5">
          {horizonSelect('analysis-window-desktop')}
          {priceControl()}
        </div>
      </div>

      <div className="lg:hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5">
          <span className="flex-shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Sections
          </span>
          <div className="relative min-w-0 flex-1 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-l after:from-white after:to-transparent">
            <nav aria-label="Analysis sections" className="flex min-w-0 items-center gap-4 overflow-x-auto pr-6">
              {sectionLinks}
            </nav>
          </div>
        </div>
        <details className="group px-5 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs text-slate-600 [&::-webkit-details-marker]:hidden">
            <span>
              Headline through <span className="font-mono font-semibold text-slate-900">{horizon}</span>
              {' '}· <span className="font-semibold text-slate-900">{SCENARIO_SHORT_LABELS[scenario]}</span> ART price
            </span>
            <span className="font-medium text-slate-500 group-open:hidden">Change assumptions</span>
            <span className="hidden font-medium text-slate-500 group-open:inline">Close</span>
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-2">
            {horizonSelect('analysis-window-mobile')}
            {priceControl(true)}
          </div>
        </details>
      </div>
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
}: {
  headline: HeadlineValues;
  estimand: CostScenarioId;
  horizon: number;
  share: number | null;
}) {
  const netPositive = headline.net.median > 0;

  return (
    <header
      className="relative overflow-hidden border-b border-slate-200 bg-[#fbfcfe]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 76% at 92% 4%, rgba(0, 45, 114, 0.055), transparent 68%)',
      }}
    >
        <div className="mx-auto w-full max-w-full px-5 py-10 sm:max-w-5xl sm:px-6 sm:py-14">
          <div>
            <h1 className={cx(SERIF, 'text-balance text-[2rem] font-medium leading-[1.08] text-slate-900 sm:text-[3rem]')}>
              When Cuts Cost More: Modeling ADAP Elimination Across Multiple US States
            </h1>
            <p className="mt-5 max-w-3xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              An interactive companion to a 2026-{HORIZON_MAX} modeled stress test of complete ADAP elimination across
              30 states and Washington, D.C.
            </p>

            <p className="mt-7 text-pretty text-xl leading-relaxed text-slate-800 sm:text-2xl">
              Under the {SCENARIO_SHORT_LABELS[estimand].toLowerCase()} drug-cost assumption and through {horizon},
              projected downstream care costs reach{' '}
              <strong className="font-semibold" style={{ color: NAVY }}>{formatCompactDollars(headline.care.median)}</strong>,
              compared with{' '}
              <strong className="font-semibold" style={{ color: TEAL }}>{formatCompactDollars(headline.adap)}</strong> in avoided
              ADAP spending—{netPositive ? 'a median net cost of ' : 'a median net offset of '}
              <strong className="font-semibold" style={{ color: netPositive ? RUST : TEAL }}>
                {formatCompactDollars(Math.abs(headline.net.median))}
              </strong>.
            </p>

            <dl className="mt-7 hidden grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-6 border-y border-slate-200 py-5 sm:grid">
              <div>
                <dt className="text-xs font-medium text-slate-500">Downstream care</dt>
                <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: NAVY }}>
                  {formatCompactDollars(headline.care.median)}
                </dd>
              </div>
              <span aria-hidden className="text-2xl text-slate-300">−</span>
              <div>
                <dt className="text-xs font-medium text-slate-500">ADAP spending avoided</dt>
                <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: TEAL }}>
                  {formatCompactDollars(headline.adap)}
                </dd>
              </div>
              <span aria-hidden className="text-2xl text-slate-300">=</span>
              <div>
                <dt className="text-xs font-medium text-slate-500">Median {netPositive ? 'net cost' : 'net offset'}</dt>
                <dd
                  className="mt-1 font-mono text-2xl font-semibold tabular-nums"
                  style={{ color: netPositive ? RUST : TEAL }}
                >
                  {formatCompactDollars(Math.abs(headline.net.median))}
                </dd>
              </div>
            </dl>

            <dl className="mt-7 grid grid-cols-[1fr_auto_1fr] items-end gap-x-4 gap-y-3 border-y border-slate-200 py-5 sm:hidden">
              <div>
                <dt className="text-xs font-medium text-slate-500">Downstream care</dt>
                <dd className="mt-1 font-mono text-xl font-semibold tabular-nums" style={{ color: NAVY }}>
                  {formatCompactDollars(headline.care.median)}
                </dd>
              </div>
              <span aria-hidden className="pb-0.5 text-xl text-slate-300">−</span>
              <div>
                <dt className="text-xs font-medium text-slate-500">ADAP avoided</dt>
                <dd className="mt-1 font-mono text-xl font-semibold tabular-nums" style={{ color: TEAL }}>
                  {formatCompactDollars(headline.adap)}
                </dd>
              </div>
              <div className="col-span-3 flex items-end gap-4 border-t border-slate-100 pt-3">
                <span aria-hidden className="pb-0.5 text-xl text-slate-300">=</span>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Median {netPositive ? 'net cost' : 'net offset'}</dt>
                  <dd
                    className="mt-1 font-mono text-xl font-semibold tabular-nums"
                    style={{ color: netPositive ? RUST : TEAL }}
                  >
                    {formatCompactDollars(Math.abs(headline.net.median))}
                  </dd>
                </div>
              </div>
            </dl>

            <p className="mt-4 max-w-4xl text-pretty text-xs leading-relaxed text-slate-600 sm:text-sm">
              Net-cost 95% interval {formatCompactDollars(headline.net.lower)} to{' '}
              {formatCompactDollars(headline.net.upper)}
              {share !== null ? <>; {formatPercent(share)} of simulations are above zero</> : null}. The comparison
              includes a restricted set of downstream HIV care costs and is not a federal budget score.
            </p>
          </div>
        </div>
    </header>
  );
}

function CascadeChain({ headline, horizon }: { headline: HeadlineValues; horizon: number }) {
  const netPositive = headline.net.median >= 0;
  const stages: Array<{ value: string; sub: string }> = [
    {
      value: 'Complete ADAP elimination',
      sub: 'Hypothetical stress test beginning January 1, 2026; not a forecast',
    },
    {
      value: '65% suppression decline',
      sub: 'Mean elicited effect among ADAP recipients; 40%–90% IQR',
    },
    {
      value: `${formatNumber(headline.excessInfections)} excess infections`,
      sub: 'Modeled relative to continued ADAP coverage',
    },
    {
      value: `${formatNumber(headline.excessDiagnoses)} excess diagnoses`,
      sub: 'The downstream costing cohort begins after diagnosis and care engagement',
    },
    {
      value: `${formatNumber(headline.personYears)} ART person-years`,
      sub: `Immediate and later ART starts accumulated through ${horizon}`,
    },
    {
      value: `${formatCompactDollars(headline.care.median)} downstream care`,
      sub: 'ART and routine care for the costed cohort',
    },
  ];

  return (
    <div aria-labelledby="modeled-pathway-title">
      <h2 id="modeled-pathway-title" className={cx(SERIF, 'text-2xl font-medium text-slate-900')}>
        How the model connects ADAP elimination to downstream cost
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
        Displayed outcomes are cumulative 2026-{horizon} medians across 1,000 simulations; avoided program spending
        enters in the final accounting comparison.
      </p>

      <ol
        className={cx(
          'relative mt-7 space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-slate-200',
          'lg:grid lg:grid-cols-6 lg:gap-5 lg:space-y-0 lg:before:bottom-auto lg:before:left-[6px] lg:before:right-[6px] lg:before:top-[6px] lg:before:h-px lg:before:w-auto'
        )}
      >
        {stages.map((stage) => (
          <li key={stage.value} className="relative min-w-0 pl-7 lg:pl-0 lg:pt-8">
            <span
              aria-hidden
              className="absolute left-0 top-1 z-10 h-3 w-3 rounded-full ring-4 ring-white lg:top-0"
              style={{ background: NAVY }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-slate-900">{stage.value}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{stage.sub}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-7 max-w-5xl border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-700">
        The pathway yields{' '}
        <strong className="font-semibold" style={{ color: NAVY }}>{formatCompactDollars(headline.care.median)}</strong>{' '}
        in downstream care. Compared with{' '}
        <strong className="font-semibold" style={{ color: TEAL }}>{formatCompactDollars(headline.adap)}</strong>{' '}
        in ADAP spending avoided, the accounting result is a median {netPositive ? 'net cost' : 'net offset'} of{' '}
        <strong className="font-semibold" style={{ color: netPositive ? RUST : TEAL }}>
          {formatCompactDollars(Math.abs(headline.net.median))}
        </strong>.
      </p>

      <p className="mt-3 max-w-4xl text-xs leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-700">Cost boundary:</span>{' '}
        costs begin only after an excess incident case is diagnosed and enters care; costs experienced by current ADAP
        enrollees who lose access are not included.
      </p>

      <details className="group mt-4 border-t border-slate-200 pt-3">
        <summary className="flex cursor-pointer select-none items-center gap-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-90">▸</span>
          Definitions and uncertainty
        </summary>
        <div className="grid gap-5 pt-4 text-xs leading-relaxed text-slate-500 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-slate-700">Outcome definitions</p>
            <p className="mt-1">
              Excess infections are modeled incident infections. Excess diagnoses define the cohort entering the cost
              model; person-years include immediate and later ART starts.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Uncertainty</p>
            <p className="mt-1">
              Care-cost 95% interval {formatCompactDollars(headline.care.lower)} to{' '}
              {formatCompactDollars(headline.care.upper)}. ADAP spending is deterministic in this analysis.
            </p>
          </div>
        </div>
      </details>
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
}: {
  rows: DecompositionRow[];
  scenario: CostScenarioId;
  onScenario: (s: CostScenarioId) => void;
  horizon: number;
}) {
  const [hoveredRow, setHoveredRow] = useState<EstimandId | null>(null);
  const scenarioRows = rows.filter((row) => !row.isPooled);
  const pooledRow = rows.find((row) => row.isPooled) ?? null;
  const lowRow = rows.find((row) => row.id === 'low');
  const highRow = rows.find((row) => row.id === 'high');
  const allScenarioIntervalsIncludeZero = scenarioRows.every((row) => row.net.lower <= 0 && row.net.upper >= 0);
  const min = Math.min(0, ...rows.map((row) => row.net.lower));
  const max = Math.max(0, ...rows.map((row) => row.net.upper));
  const domainMin = Math.floor(min / 1e9) * 1e9;
  const domainMax = Math.ceil(max / 1e9) * 1e9;
  const at = (v: number) => ((v - domainMin) / (domainMax - domainMin)) * 100;
  const zero = at(0);

  return (
    <section id="robustness" className="mx-auto w-full max-w-full scroll-mt-44 px-5 py-16 sm:max-w-6xl sm:px-6">
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
          Through {horizon}, median net cost rises from{' '}
          {lowRow ? formatCompactDollars(lowRow.net.median) : 'the low-tier estimate'} under the low ART-price tier to{' '}
          {highRow ? formatCompactDollars(highRow.net.median) : 'the high-tier estimate'} under the high tier.
          {allScenarioIntervalsIncludeZero && <> The 95% simulation interval includes zero in all three tiers.</>}{' '}
          Select a tier to update the app.
        </SectionHead>

        <div className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {scenarioRows.map((row) => {
            const isSel = !row.isPooled && row.id === scenario;
            const isActive = hoveredRow ? hoveredRow === row.id : isSel;
            const rowInner = (
              <>
                <div className="min-w-0 sm:pl-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {row.label}
                    {isSel && <span className="ml-2 text-xs font-normal text-slate-500"> selected</span>}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-slate-400">{row.detail}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold tabular-nums text-slate-800">
                      {formatCompactDollars(row.net.median)}
                    </span>{' '}
                    median net cost
                  </p>
                  <p className="mt-0.5 font-mono text-[0.68rem] tabular-nums text-slate-400">
                    95%: {formatCompactDollars(row.net.lower)} to {formatCompactDollars(row.net.upper)}
                  </p>
                </div>
                <div className="relative h-12 min-w-0 overflow-hidden rounded-md">
                  <span className="absolute inset-y-0 left-0 bg-teal-50/60" style={{ width: `${zero}%` }} />
                  <span className="absolute inset-y-0 right-0 bg-amber-50/60" style={{ width: `${100 - zero}%` }} />
                  <span className="absolute inset-y-0 w-px bg-slate-400" style={{ left: `${zero}%` }} />
                  <SplitBand
                    at={at}
                    lo={row.net.lower}
                    hi={row.net.upper}
                    thickness={isActive ? 14 : 11}
                    opacity={isActive ? 0.8 : 0.62}
                  />
                  <span
                    className="absolute top-1/2 w-[3px] -translate-y-1/2 rounded-full transition-all"
                    style={{ left: `${at(row.net.median)}%`, height: isActive ? 36 : 30, background: INK }}
                  />
                </div>
                <div className="min-w-0 sm:text-right">
                  <p className="font-mono text-xl font-semibold tabular-nums text-slate-900">
                    {formatPerDollar(row.perDollar)}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-slate-400">care cost per $1 of ADAP spending avoided</p>
                  {row.sharePositive !== null && (
                    <p className="mt-1 text-xs text-slate-500">{formatPercent(row.sharePositive)} of draws net-costly</p>
                  )}
                </div>
              </>
            );
            const rowClass = cx(
              'grid w-full gap-4 border-b border-slate-200 px-4 py-5 text-left transition-colors sm:grid-cols-[210px_minmax(0,1fr)_190px] sm:items-center sm:gap-6 sm:px-5',
              isSel ? 'bg-slate-50 shadow-[inset_3px_0_0_#002D72]' : 'hover:bg-slate-50/60'
            );

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
                aria-label={`${row.label} ART-price tier. Median net cost ${formatCompactDollars(row.net.median)}; 95% simulation interval ${formatCompactDollars(row.net.lower)} to ${formatCompactDollars(row.net.upper)}; care cost ${formatPerDollar(row.perDollar)} per $1 of ADAP spending avoided${row.sharePositive !== null ? `; ${formatPercent(row.sharePositive)} of draws net-costly` : ''}. Select this tier.`}
                className={rowClass}
              >
                {rowInner}
              </button>
            );
          })}
          {pooledRow && (
            <>
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 sm:px-5">
                <span className="font-semibold text-slate-700">Combined reporting summary.</span>{' '}
                Equal numbers of draws from each price tier are mixed with model-simulation variation. This is not a
                fourth price assumption or a probability-weighted forecast.
              </div>
              <div className="grid gap-4 bg-slate-50/50 px-4 py-5 text-left sm:grid-cols-[210px_minmax(0,1fr)_190px] sm:items-center sm:gap-6 sm:px-5">
                <div className="min-w-0 sm:pl-1">
                  <p className="text-sm font-semibold text-slate-900">{pooledRow.label}</p>
                  <p className="mt-0.5 text-[0.7rem] text-slate-400">{pooledRow.detail}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold tabular-nums text-slate-800">
                      {formatCompactDollars(pooledRow.net.median)}
                    </span>{' '}
                    median net cost
                  </p>
                  <p className="mt-0.5 font-mono text-[0.68rem] tabular-nums text-slate-400">
                    95%: {formatCompactDollars(pooledRow.net.lower)} to {formatCompactDollars(pooledRow.net.upper)}
                  </p>
                </div>
                <div className="relative h-12 min-w-0 overflow-hidden rounded-md">
                  <span className="absolute inset-y-0 left-0 bg-teal-50/60" style={{ width: `${zero}%` }} />
                  <span className="absolute inset-y-0 right-0 bg-amber-50/60" style={{ width: `${100 - zero}%` }} />
                  <span className="absolute inset-y-0 w-px bg-slate-400" style={{ left: `${zero}%` }} />
                  <SplitBand at={at} lo={pooledRow.net.lower} hi={pooledRow.net.upper} thickness={11} opacity={0.62} />
                  <span
                    className="absolute top-1/2 h-[30px] w-[3px] -translate-y-1/2 rounded-full"
                    style={{ left: `${at(pooledRow.net.median)}%`, background: INK }}
                  />
                </div>
                <div className="min-w-0 sm:text-right">
                  <p className="font-mono text-xl font-semibold tabular-nums text-slate-900">
                    {formatPerDollar(pooledRow.perDollar)}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-slate-400">care cost per $1 of ADAP spending avoided</p>
                  {pooledRow.sharePositive !== null && (
                    <p className="mt-1 text-xs text-slate-500">
                      {formatPercent(pooledRow.sharePositive)} of draws net-costly
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[0.68rem] tabular-nums text-slate-400">
          <span>{formatCompactDollars(domainMin)}</span>
          <span className="text-center font-sans">
            <span className="sm:hidden">$0 break-even</span>
            <span className="hidden sm:inline">net offset / $0 / net cost</span>
          </span>
          <span>{formatCompactDollars(domainMax)}</span>
        </div>
        {rows.some((row) => row.sharePositive === null) && (
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
// Jurisdiction comparison: a relative cost-consequence measure, expressed as
// an accessible interval plot plus an exact-value table.
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
          <h3 className="text-base font-semibold text-slate-900">
            Net cost relative to ADAP spending avoided (NCER)
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Median and 95% simulation interval at the fixed {horizonYear} endpoint under the{' '}
            {SCENARIO_LABELS[scenario].toLowerCase()} assumption. Jurisdictions are ordered by median NCER.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500" aria-label="Simulation interval legend">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Includes zero
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: RUST }} /> Interval above zero
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TEAL }} /> Interval below zero
          </span>
        </div>
      </div>

      <div className="mt-5 min-w-0">
        <div className="min-w-0">
          <div className="grid grid-cols-[76px_minmax(0,1fr)_44px] items-end gap-2 border-b border-slate-200 pb-2 text-[0.62rem] uppercase tracking-wide text-slate-400 sm:grid-cols-[104px_minmax(250px,1fr)_58px] sm:gap-3 sm:text-[0.65rem]">
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

          <div className="sm:max-h-[640px] sm:overflow-y-auto">
            {sorted.map((row) => {
              const isSelected = row.state === selected;
              const isHovered = row.state === hovered;
              const color = row.ratioLower > 0 ? RUST : row.ratioUpper < 0 ? TEAL : '#94a3b8';
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
                    'grid w-full grid-cols-[76px_minmax(0,1fr)_44px] items-center gap-2 border-b border-slate-100 py-2 text-left transition-colors last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-400 sm:grid-cols-[104px_minmax(250px,1fr)_58px] sm:gap-3',
                    isSelected ? 'bg-slate-100' : isHovered ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                  )}
                >
                  <span className="truncate text-xs font-medium text-slate-700" title={row.stateName}>
                    <span className="sm:hidden">{row.state}</span>
                    <span className="hidden sm:inline">
                      {row.stateName} <span className="text-slate-400">{row.state}</span>
                    </span>
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
        NCER = (downstream care cost − ADAP spending avoided) / ADAP spending avoided. Zero is break-even; 1.00 means
        $1 in net cost for each $1 of ADAP spending avoided. Gray intervals span both net offset and net cost.
      </p>
    </div>
  );
}

const DRIVER_COLUMNS: Array<{ key: DriverSortKey; label: string }> = [
  { key: 'excessDiagnoses', label: 'Excess diagnoses' },
  { key: 'personYears', label: 'ART person-years' },
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
        <table className="w-full min-w-[820px] text-left text-sm">
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
              <th className="py-2 pl-2 text-right font-medium" title="Share of draws with positive net cost at the 2035 horizon">
                Net-costly draws &rsquo;35
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
        Medians at the fixed {horizonYear} endpoint. The last column reports the share of draws with positive net cost;
        draw-level sign shares are available at 2035 only.
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
            Median crosses break-even in <span className="font-semibold text-slate-800">{row.crossoverYear}</span>
          </>
        ) : (
          'Median does not cross break-even by 2035'
        )}{' '}
        ·{' '}
        <span style={{ color: shareColor(row.shareNetPositive2035) }}>
          {formatPercent(row.shareNetPositive2035)}{' '}of &rsquo;35 draws are net-costly
        </span>
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
        {[
          ['NCER', formatNcer(row.ratio)],
          ['Care per $1 avoided', formatPerDollar(row.perDollar)],
          ['Downstream care', formatCompactDollars(row.careCost.median)],
          ['ADAP avoided', formatCompactDollars(row.adap)],
          [row.net.median >= 0 ? 'Median net cost' : 'Median net offset', formatCompactDollars(Math.abs(row.net.median))],
          ['NCER 95% interval', `${formatNcer(row.ratioLower)} to ${formatNcer(row.ratioUpper)}`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <details className="group mt-5 border-t border-slate-200 pt-4">
        <summary className="cursor-pointer select-none text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800">
          More result detail
        </summary>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
          {[
            ['Net-cost 95% interval', `${formatCompactDollars(row.net.lower)} to ${formatCompactDollars(row.net.upper)}`],
            ['Excess diagnoses', formatNumber(row.excessDiagnoses)],
            ['ART person-years', formatNumber(row.personYears)],
            ['Excess infections', formatNumber(row.excessInfections)],
            ['Window', `2026-${row.year}`],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
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
    ['Transmission rate', context.sexualTransmissionRate.toFixed(3)],
  ];
  const secondaryItems: Array<[string, string]> = [
    ['ADAP client share', formatPercent(context.adapClientShare)],
    ['ADAP clients', formatNumber(context.adapClients)],
    ['Ryan White clients', formatNumber(context.rwClients)],
    ['Diagnosed PWH', formatNumber(context.diagnosedPrevalence)],
    ['New infections', formatNumber(context.baselineNewInfections)],
    ['New diagnoses', formatNumber(context.baselineNewDiagnoses)],
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
      <details className="group mt-4 border-t border-slate-200 pt-3">
        <summary className="cursor-pointer select-none text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800">
          More baseline detail
        </summary>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
          {secondaryItems.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Context explorer - descriptive jurisdiction-level associations without a
// fitted causal model.
// -----------------------------------------------------------------------------
function HeterogeneityExplorer({
  rows,
  axisId,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  rows: DriverRow[];
  axisId: ContextAxisId;
  selected: LocationKey;
  hovered: string | null;
  onSelect: (state: string) => void;
  onHover: (state: string | null) => void;
}) {
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
  const ratioSpan = maxRatio - minRatio;
  const ratioStep = ratioSpan > 8 ? 2 : ratioSpan > 4 ? 1 : 0.5;
  const ratioDomain: [number, number] = [
    Math.floor((minRatio - ratioStep * 0.25) / ratioStep) * ratioStep,
    Math.ceil((maxRatio + ratioStep * 0.25) / ratioStep) * ratioStep,
  ];
  const ratioTicks = Array.from(
    { length: Math.round((ratioDomain[1] - ratioDomain[0]) / ratioStep) + 1 },
    (_, index) => ratioDomain[0] + index * ratioStep
  );
  const xDomain = axis.domain ?? [Math.max(0, minX - padX), maxX + padX];
  const alwaysLabel = new Set(['DC', 'TN', 'FL', 'NY']);
  const active = hovered ?? (selected !== 'Total' ? selected : null);

  const renderDot = (props: unknown) => {
    const { cx: x, cy: y, payload } = props as { cx?: number; cy?: number; payload?: HeterogeneityPoint };
    if (typeof x !== 'number' || typeof y !== 'number' || !payload) return <g />;
    const r = 4 + Math.sqrt(payload.adap / maxAdap) * 8;
    const isSel = payload.state === selected;
    const isActive = payload.state === active;
    const color = payload.medicaidExpansion ? EXPANSION : NON_EXPANSION;
    return (
      <g
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-pressed={isSel}
        aria-label={`${payload.stateName}: median NCER ${formatNcer(payload.ratio)}, ${axis.label} ${axis.format(payload.x)}, ${payload.medicaidExpansion ? 'Medicaid expansion' : 'Medicaid non-expansion'}`}
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
          <text
            x={x + r + 3}
            y={payload.state === 'NY' ? y - 7 : y + 4}
            fontSize={11}
            fill="#475569"
            fontWeight={isSel || isActive ? 700 : 500}
          >
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
          {axis.shortLabel} {axis.format(p.x)} · Median NCER {formatNcer(p.ratio)}
        </p>
        <p className="font-mono text-xs tabular-nums text-slate-500">ADAP avoided {formatCompactDollars(p.adap)}</p>
        <p className="text-xs text-slate-500">{p.medicaidExpansion ? 'Medicaid expansion' : 'Medicaid non-expansion'}</p>
      </div>
    );
  };

  return (
    <div className="min-w-0">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">{axis.label}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{axis.description}</p>
          </div>
          <div className="flex items-baseline gap-2 sm:block sm:text-right">
            <p className="font-mono text-base font-semibold tabular-nums text-slate-800">
              ρ = {rho === null ? '—' : rho.toFixed(2)}
            </p>
            <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">Spearman</p>
          </div>
        </div>
        <div className="mt-4 h-[300px] sm:h-[330px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 24, bottom: 22, left: 4 }}>
              <CartesianGrid stroke="#eef2f6" />
              <XAxis
                type="number"
                dataKey="x"
                domain={xDomain}
                ticks={axis.ticks}
                tickFormatter={axis.format}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: MUTED, fontSize: 11 }}
                label={{ value: axis.label, position: 'insideBottom', offset: -12, fill: MUTED, fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="ratio"
                domain={ratioDomain}
                ticks={ratioTicks}
                tickFormatter={(value: number) => value.toFixed(1)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: MUTED, fontSize: 11 }}
                width={48}
                label={{ value: 'Median NCER', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 12 }}
              />
              <ReferenceLine
                y={0}
                stroke="#94a3b8"
                strokeDasharray="5 5"
              />
              <Tooltip content={<HetTip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />
              <Scatter data={points} shape={renderDot} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
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
  error,
  crossover,
  horizon,
}: {
  trajectory: ReturnType<typeof buildTrajectoryData>;
  selectedName: string;
  error: string | null;
  crossover: Crossover | null;
  horizon: number;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">{selectedName}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {crossover
          ? `Median care cost exceeds avoided spending from ${crossover.year}.`
          : 'Median care cost remains below avoided spending through 2035.'}
      </p>
      <div className="mt-5 h-[320px] sm:h-[340px]">
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
                  label={{ value: 'median break-even', position: 'top', fill: RUST, fontSize: 10 }}
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
            . Jurisdictions past the window edge are dimmed. Select a jurisdiction to update the comparison trajectory
            above.
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
  const methodSections: ReviewCard[] = [
    {
      title: 'Scenario and core assumption',
      items: [
        { label: 'Policy scenario', value: 'Complete ADAP elimination on Jan 1, 2026' },
        { label: 'Suppression effect', value: 'Mean 65% decline among ADAP recipients' },
        { label: 'Elicited range', value: '40%–90% interquartile range' },
        { label: 'Comparator', value: '2025 ADAP coverage and spending continue' },
      ],
      note: 'The suppression effect comes from a survey of 180 Ryan White clinic and public-health respondents. Complete, persistent elimination is a stress test, not a forecast of a specific enacted restriction.',
    },
    {
      title: 'Modeled pathway and costing cohort',
      items: [
        { label: 'Excess infections', value: ryanWhiteCostingMetadata.outcomeDefinitions.infections.description },
        { label: 'Excess diagnoses', value: ryanWhiteCostingMetadata.outcomeDefinitions.diagnoses.description },
        { label: 'Immediate ART', value: 'Scaled to each jurisdiction\'s baseline suppressed share among diagnosed PWH' },
        { label: 'Delayed engagement', value: '60% within one year; 86% within five years after diagnosis' },
      ],
      note: 'Infections and diagnoses are distinct. The cost ledger begins only after an excess incident case is diagnosed, engages in care, and starts ART.',
    },
    {
      title: 'Costs and uncertainty',
      items: [
        { label: 'Annual ART tiers', value: SCENARIO_ORDER.map((s) => formatAnnualCostInput(p.artDrugCosts[s])).join(' / ') },
        { label: 'Routine care', value: `${formatAnnualCostInput(p.routineCareCost)} weighted annual baseline` },
        { label: 'Discount rate', value: formatPercent(p.discountRate) },
        { label: 'Model simulations', value: ryanWhiteCostingMetadata.simulationDraws.toLocaleString('en-US') },
      ],
      note: 'Displayed 95% intervals are the 2.5th–97.5th percentiles across epidemiologic model simulations at a fixed ART-price tier. Funding is deterministic under the current input convention.',
    },
    {
      title: 'Accounting and interpretation',
      items: [
        { label: 'Perspective', value: 'Modified healthcare system' },
        { label: 'Comparator', value: 'ADAP spending avoided' },
        { label: 'Net cost', value: 'Downstream care cost minus ADAP spending avoided' },
        { label: 'NCER', value: 'Net cost / ADAP spending avoided; break-even = 0' },
      ],
      note: 'The payer realizing ADAP savings may differ from the payer incurring downstream care costs. NCER is a cost-consequence ratio, not a cost-effectiveness ratio or payer-specific budget impact.',
    },
    {
      title: 'Scope and costs not counted',
      items: [
        { label: 'Geography', value: `${ryanWhiteCostingMetadata.modeledJurisdictionCount} modeled jurisdictions, including DC` },
        { label: 'Existing clients', value: 'Rebound, acute care, mortality, or replacement coverage' },
        { label: 'Before or after window', value: 'Off-ART costs and all care after 2035' },
        { label: 'Broader effects', value: 'Quality of life, productivity, prevention, and behavioral responses' },
      ],
      note: 'The app reports a restricted downstream-care ledger through 2035, not the total economic or health impact of ADAP elimination. “Modeled total” is the sum of covered jurisdictions, not an estimate for all US jurisdictions.',
    },
  ];

  return (
    <section id="methods" className="scroll-mt-44 border-t border-slate-200 bg-slate-50">
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
          <details className="group mt-6 rounded-lg border border-slate-200 bg-white px-5 py-4">
            <summary className="cursor-pointer select-none text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
              Technical data provenance
            </summary>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Generated', ryanWhiteCostingMetadata.generatedAt.slice(0, 10)],
                ['Model output', ryanWhiteCostingMetadata.sourceArtifacts.rData.fileName],
                ['Model SHA-256', ryanWhiteCostingMetadata.sourceArtifacts.rData.sha256],
                ['Funding input', ryanWhiteCostingMetadata.sourceArtifacts.fundingCsv.fileName],
                ['Funding SHA-256', ryanWhiteCostingMetadata.sourceArtifacts.fundingCsv.sha256],
                ['Context input', ryanWhiteCostingMetadata.sourceArtifacts.jurisdictionContextCsv.fileName],
                ['Context SHA-256', ryanWhiteCostingMetadata.sourceArtifacts.jurisdictionContextCsv.sha256],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-700">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              {ryanWhiteCostingMetadata.fundingAdjustment.description} Modeled-total summaries use the within-simulation
              jurisdiction sum stored in the RData Total location; generated values are checked against source arrays.
            </p>
          </details>
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
  const [location, setLocation] = useState<LocationKey>('FL');
  const [horizon, setHorizon] = useState<number>(HORIZON_MAX);
  const [hovered, setHovered] = useState<string | null>(null);
  const [series, setSeries] = useState<RyanWhiteCostingSeries | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AnalysisSectionId>(ANALYSIS_SECTIONS[0].id);
  const urlHydrated = useRef(false);

  const defaultScenario = ryanWhiteCostingSummary.sensitivity.primaryScenario;
  const defaultState: LocationKey = 'FL';
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

  // Keep the analysis navigation synchronized with the section currently
  // crossing beneath the site header and sticky analysis bar.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const anchor = 200;
      let current: AnalysisSectionId = ANALYSIS_SECTIONS[0].id;
      for (const section of ANALYSIS_SECTIONS) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= anchor) current = section.id;
        else break;
      }
      setActiveSection((previous) => (previous === current ? previous : current));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
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
      buildDecomposition(nationalFinal, {
        pooled: ryanWhiteCostingSummary.national.pooledFinalYear.shareNetCostPositiveVsAdap,
        scenarios: nationalFinal.shareNetCostPositiveVsAdap,
      }),
    [nationalFinal]
  );

  const nationalTrajectory = useMemo(
    () => buildTrajectoryData(seriesForLocation(series, 'Total'), scenario),
    [series, scenario]
  );
  const selectedTrajectoryLocation = location === 'Total' ? defaultState : location;
  const selectedTrajectory = useMemo(
    () => buildTrajectoryData(seriesForLocation(series, selectedTrajectoryLocation), scenario),
    [series, selectedTrajectoryLocation, scenario]
  );
  const selectedTrajectoryCrossover = useMemo(
    () => crossoverForPoints(seriesForLocation(series, selectedTrajectoryLocation), scenario),
    [series, selectedTrajectoryLocation, scenario]
  );
  const stateCrossovers = useMemo(() => buildStateCrossovers(series, scenario), [series, scenario]);
  const nationalCrossover = useMemo(
    () => crossoverForPoints(series?.national ?? [], scenario),
    [series, scenario]
  );

  const driverRows = useMemo(
    () => buildDriverRows(series, ryanWhiteCostingSummary.states, scenario, HORIZON_MAX, stateCrossovers),
    [series, scenario, stateCrossovers]
  );
  const nationalDriverRow = useMemo(
    () => buildNationalDriverRow(series, ryanWhiteCostingSummary, scenario, HORIZON_MAX),
    [series, scenario]
  );
  const selectedDriver =
    location === 'Total' ? nationalDriverRow : driverRows.find((row) => row.state === location) ?? nationalDriverRow;
  const selectedContext =
    location === 'Total'
      ? null
      : ryanWhiteCostingSummary.states.find((item) => item.state === location)?.baselineContext ?? null;
  const selectedName = location === 'Total' ? 'Modeled-jurisdiction total' : stateName(location);
  const selectedTrajectoryName = stateName(selectedTrajectoryLocation);
  const intervalsCrossingZero = driverRows.filter((row) => row.ratioLower <= 0 && row.ratioUpper >= 0).length;

  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-white text-slate-900">
      <CascadeHero
        headline={headline}
        estimand={scenario}
        horizon={nationalPoint.year}
        share={share}
      />

      <AnalysisNavigation
        horizon={horizon}
        onHorizon={setHorizon}
        scenario={scenario}
        onScenario={setScenario}
        activeSection={activeSection}
        ready={series !== null}
      />

      <section
        id="pathway"
        className="scroll-mt-44 border-b border-slate-200 bg-white"
        aria-label="How the result is constructed"
      >
        <div className="mx-auto w-full max-w-full px-5 py-10 sm:max-w-6xl sm:px-6 sm:py-12">
          <CascadeChain headline={headline} horizon={nationalPoint.year} />
        </div>
      </section>

      <section id="crossover" className="scroll-mt-44 border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="01"
              eyebrow="Over time"
              title="How does the accounting balance change over the projection window?"
            >
              Cumulative downstream HIV care costs and ADAP spending avoided under the{' '}
              {SCENARIO_LABELS[scenario].toLowerCase()}{' '}assumption.
              {horizonProfile?.crossoverYear != null && (
                <> The modeled-jurisdiction median reaches break-even around{' '}
                  <span className="font-semibold text-slate-700">{horizonProfile.crossoverYear}</span>.
                </>
              )}
              {horizon < HORIZON_MAX && (
                <> Both charts retain the complete 2026-{HORIZON_MAX} trajectory; the dashed marker shows the selected{' '}
                  accounting window.</>
              )}
            </SectionHead>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NAVY }} /> Care cost
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TEAL }} /> ADAP spending avoided
              </span>
              <span className="text-slate-400">
                Shading = year-specific 95% care-cost interval · ADAP spending fixed · discounted 2026 USD ·
                independent y-scales
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Trajectory
                trajectory={nationalTrajectory}
                selectedName="Modeled-jurisdiction total"
                error={seriesError}
                crossover={nationalCrossover}
                horizon={horizon}
              />
              <Trajectory
                trajectory={selectedTrajectory}
                selectedName={selectedTrajectoryName}
                error={seriesError}
                crossover={selectedTrajectoryCrossover}
                horizon={horizon}
              />
            </div>
            <details className="group mt-6">
              <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:text-slate-900">
                <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-90">▸</span>
                Change jurisdiction or compare median break-even timing
              </summary>
              <div className="mt-3">
                <CrossoverTimeline
                  crossovers={stateCrossovers}
                  horizon={horizon}
                  national={nationalCrossover}
                  selected={selectedTrajectoryLocation}
                  hovered={hovered}
                  onSelect={setLocation}
                  onHover={setHovered}
                />
              </div>
            </details>
          </Reveal>
        </div>
      </section>

      <section id="drivers" className="scroll-mt-44 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="02"
              eyebrow="Jurisdiction variation"
              title="How do projected cost consequences vary across jurisdictions?"
            >
              NCER describes net downstream care cost relative to ADAP spending avoided: zero is break-even, while
              1.00 means $1 in net cost for each $1 avoided. At the fixed 2035 endpoint under the selected price
              assumption, {intervalsCrossingZero} of {driverRows.length} jurisdiction intervals include zero,
              indicating uncertainty in the direction of net cost for most jurisdictions.
            </SectionHead>

            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.75fr)]">
              <div className="order-2 min-w-0 lg:order-1">
                <JurisdictionRatioPlot
                  rows={driverRows}
                  horizonYear={HORIZON_MAX}
                  scenario={scenario}
                  selected={location}
                  hovered={hovered}
                  onSelect={setLocation}
                  onHover={setHovered}
                />
              </div>
              <div className="order-1 min-w-0 lg:order-2">
                <StateDetailCard row={selectedDriver} crossoverKnown={series !== null} />
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
                  horizonYear={HORIZON_MAX}
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

      <section id="context" className="scroll-mt-44 border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="03"
              eyebrow="Jurisdiction context"
              title="Which baseline characteristics are associated with NCER?"
            >
              Spearman correlations compare four baseline characteristics with jurisdiction median NCER. These
              unadjusted jurisdiction-level associations do not incorporate within-jurisdiction simulation uncertainty
              or identify causal effects.
            </SectionHead>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-slate-200 py-3 text-xs text-slate-500">
              <span>Fixed 2035 endpoint · {SCENARIO_LABELS[scenario]} · n = {driverRows.length}</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: EXPANSION }} /> Medicaid expansion
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NON_EXPANSION }} /> Non-expansion
              </span>
              <span>NCER 0 = break-even.</span>
              <span>Dot size reflects cumulative ADAP spending avoided.</span>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {CONTEXT_AXES.map((axis) => (
                <HeterogeneityExplorer
                  key={axis.id}
                  rows={driverRows}
                  axisId={axis.id}
                  selected={location}
                  hovered={hovered}
                  onSelect={setLocation}
                  onHover={setHovered}
                />
              ))}
            </div>
            <details className="group mt-6">
              <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:text-slate-900">
                <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-90">▸</span>
                View baseline values for {selectedName}
              </summary>
              <div className="mt-3 max-w-xl">
                <BaselineContextCard context={selectedContext} stateLabel={selectedName} />
              </div>
            </details>
          </Reveal>
        </div>
      </section>

      <UncertaintyDecomposition
        rows={decompositionRows}
        scenario={scenario}
        onScenario={setScenario}
        horizon={HORIZON_MAX}
      />

      <ModelReview />
    </div>
  );
}
