'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
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
  type CostScenarioId,
  type RyanWhiteCostingSeries,
} from '@/data/ryan-white-costing';
import {
  buildDecomposition,
  buildRankedStates,
  buildTrajectoryData,
  DecompositionRow,
  ESTIMAND_LABELS,
  EstimandId,
  formatCompactDollars,
  formatNumber,
  formatPercent,
  formatPerDollar,
  HeadlineValues,
  headlineAt,
  HORIZON_MAX,
  HORIZON_MIN,
  LocationKey,
  pointForYear,
  RankedStatePoint,
  ReviewCard,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  seriesForLocation,
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

function ScatterTip({ active, payload }: TipProps) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-md">
      <p className="text-sm font-semibold text-slate-900">{p.stateName}</p>
      <p className="mt-1 font-mono text-xs tabular-nums text-slate-500">
        Care {formatCompactDollars(p.careCost)} / ADAP {formatCompactDollars(p.adapBenchmark)}
      </p>
      <p className="font-mono text-xs tabular-nums" style={{ color: confColor(p.shareNetPositive) }}>
        {formatPercent(p.shareNetPositive)} of draws net-costly
      </p>
    </div>
  );
}

function TrajTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const names: Record<string, string> = { careMedian: 'Care cost', adap: 'ADAP avoided', netMedian: 'Net cost' };
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
// Global horizon control - the app's one computation-bearing input
// -----------------------------------------------------------------------------
function HorizonBar({
  horizon,
  onHorizon,
  ready,
}: {
  horizon: number;
  onHorizon: (year: number) => void;
  ready: boolean;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 sm:max-w-6xl sm:px-6">
        <div className="flex items-baseline gap-2.5">
          <Eyebrow>Ledger through</Eyebrow>
          <span className="font-mono text-xl font-semibold tabular-nums text-slate-900">{horizon}</span>
        </div>
        <div className="flex min-w-[200px] flex-1 items-center gap-3">
          <span className="font-mono text-[0.68rem] tabular-nums text-slate-400">{HORIZON_MIN}</span>
          <input
            type="range"
            min={HORIZON_MIN}
            max={HORIZON_MAX}
            step={1}
            value={horizon}
            disabled={!ready}
            onChange={(event) => onHorizon(Number(event.target.value))}
            aria-label="Evaluate the ledger through year"
            aria-valuetext={`through ${horizon}`}
            className="h-1.5 w-full min-w-0 cursor-pointer accent-slate-900 disabled:cursor-wait disabled:opacity-40"
          />
          <span className="font-mono text-[0.68rem] tabular-nums text-slate-400">{HORIZON_MAX}</span>
        </div>
        <div className="flex items-center gap-3">
          {horizon !== HORIZON_MAX && (
            <button
              type="button"
              onClick={() => onHorizon(HORIZON_MAX)}
              className="rounded border border-slate-300 px-2 py-0.5 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
            >
              Full horizon
            </button>
          )}
          <p className="hidden text-[0.68rem] leading-tight text-slate-400 md:block">
            {ready
              ? 'Costs are still accruing at 2035 - the model horizon. No extrapolation.'
              : 'Loading annual series…'}
          </p>
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
}: {
  headline: HeadlineValues;
  estimand: EstimandId;
  horizon: number;
  share: number | null;
}) {
  const paperRatio = headline.perDollar.median - 1;
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
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              Eliminating ADAP in 30 states avoids{' '}
              <span className="font-semibold text-slate-900">{formatCompactDollars(headline.adap)}</span> in spending
              through {horizon} - but the infections the cut causes generate{' '}
              <span className="font-semibold text-slate-900">{formatCompactDollars(headline.care.median)}</span> in
              downstream HIV care costs
              {share !== null ? (
                <>
                  , exceeding the avoided spending in{' '}
                  <span className="font-semibold text-slate-900">{formatPercent(share)}</span> of simulations
                </>
              ) : null}
              .
            </p>

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
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {ESTIMAND_LABELS[estimand]} · paper metric: net cost / ADAP = {paperRatio.toFixed(2)}
            </p>
          </div>
        </div>

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
// Selected-state detail
// -----------------------------------------------------------------------------
function SelectedState({ point }: { point: RankedStatePoint }) {
  const verdict = point.boundedPositive
    ? 'Interval stays above zero'
    : point.shareNetPositive >= 0.85
    ? 'High share net-costly'
    : point.shareNetPositive >= 0.66
    ? 'Mostly net-costly draws'
    : 'Near a coin flip';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Eyebrow>Selected state</Eyebrow>
      <h3 className={cx(SERIF, 'mt-2 text-3xl font-medium text-slate-900')}>{point.stateName}</h3>
      <p className="mt-1 text-sm font-medium" style={{ color: confColor(point.shareNetPositive) }}>
        {verdict} / {formatPercent(point.shareNetPositive)} of draws net-costly
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
        {[
          ['Net cost vs ADAP', formatCompactDollars(point.netCost)],
          ['95% interval', `${formatCompactDollars(point.netLower)} to ${formatCompactDollars(point.netUpper)}`],
          ['Downstream care', formatCompactDollars(point.careCost)],
          ['ADAP avoided', formatCompactDollars(point.adapBenchmark)],
          ['Excess diagnoses', formatNumber(point.excessDiagnoses)],
          ['ART person-years', formatNumber(point.artPersonYears)],
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

// -----------------------------------------------------------------------------
// Impact scatter - sqrt axes de-cluster small states
// -----------------------------------------------------------------------------
function ImpactScatter({
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
  const data = states.map((s) => ({
    ...s,
    careError: [Math.max(0, s.careCost - s.careQuantiles.p10), Math.max(0, s.careQuantiles.p90 - s.careCost)],
  }));
  const maxAxis = Math.max(...states.map((s) => Math.max(s.adapBenchmark, s.careQuantiles.p90))) * 1.08;
  const maxDx = Math.max(...states.map((s) => s.excessDiagnoses));
  const label = new Set(['FL', 'TX', 'CA', 'NY']);
  const active = hovered ?? (selected !== 'Total' ? selected : null);
  const reduce = useReducedMotion() ?? false;

  const renderDot = (props: unknown) => {
    const { cx: x, cy: y, payload } = props as { cx?: number; cy?: number; payload?: RankedStatePoint };
    if (typeof x !== 'number' || typeof y !== 'number' || !payload) return <g />;
    const r = 5 + (Math.sqrt(payload.excessDiagnoses) / Math.sqrt(maxDx)) * 11;
    const isSel = payload.state === selected;
    const isActive = payload.state === active;
    const color = confColor(payload.shareNetPositive);
    return (
      <g
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`${payload.stateName}: ${formatCompactDollars(payload.careCost)} care cost`}
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
        <circle cx={x} cy={y} r={isSel || isActive ? r + 7 : r + 4} fill={color} fillOpacity={isSel || isActive ? 0.18 : 0.1} />
        {(isSel || isActive) && <circle cx={x} cy={y} r={r + 4} fill="none" stroke={isSel ? NAVY : INK} strokeOpacity={0.5} strokeWidth={1.4} />}
        <motion.circle
          cx={x}
          cy={y}
          initial={false}
          animate={{ r: isSel || isActive ? r + 2 : r }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          fill={color}
          fillOpacity={isSel || isActive ? 1 : 0.92}
          stroke={isSel ? NAVY : isActive ? INK : '#ffffff'}
          strokeWidth={isSel ? 3 : isActive ? 2 : 1.8}
        />
        {(label.has(payload.state) || isSel || isActive) && (
          <text x={x + r + 3} y={y + 4} fontSize={11} fill="#475569" fontWeight={isSel || isActive ? 700 : 500}>
            {payload.state}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">Where downstream care meets avoided ADAP</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Above the dashed break-even line, care cost exceeds avoided ADAP. Axes are square-root scaled to separate the
        many smaller states; whiskers span the 10th–90th percentile of care cost.
      </p>
      <div className="mt-4 h-[320px] sm:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 20, bottom: 22, left: 4 }}>
            <XAxis
              type="number"
              dataKey="adapBenchmark"
              scale="sqrt"
              domain={[0, maxAxis]}
              tickFormatter={formatCompactDollars}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: MUTED, fontSize: 11 }}
              label={{ value: 'ADAP spending avoided', position: 'insideBottom', offset: -12, fill: MUTED, fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="careCost"
              scale="sqrt"
              domain={[0, maxAxis]}
              tickFormatter={formatCompactDollars}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: MUTED, fontSize: 11 }}
              width={64}
              label={{ value: 'Downstream care cost', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 12 }}
            />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: maxAxis, y: maxAxis },
              ]}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              strokeWidth={1.4}
            />
            <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />
            <Scatter
              data={data}
              shape={renderDot}
              isAnimationActive={!reduce}
              animationDuration={650}
              onClick={(point: unknown) => {
                const payload = (point as { payload?: RankedStatePoint }).payload;
                if (payload?.state) onSelect(payload.state);
              }}
            >
              <ErrorBar dataKey="careError" direction="y" stroke="#cbd5e1" strokeOpacity={0.9} width={4} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Trajectory
// -----------------------------------------------------------------------------
function Trajectory({
  trajectory,
  selectedName,
  scenario,
  error,
}: {
  trajectory: ReturnType<typeof buildTrajectoryData>;
  selectedName: string;
  scenario: CostScenarioId;
  error: string | null;
}) {
  const reduce = useReducedMotion() ?? false;
  const legend = [
    ['Care cost', NAVY],
    ['ADAP avoided', TEAL],
    ['Net cost', RUST],
  ] as const;

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">
        {selectedName} / {SCENARIO_LABELS[scenario].toLowerCase()}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Care cost (navy, with simulation band), avoided ADAP (teal), and the resulting net (rust) accumulate to 2035.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
        {legend.map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <div className="mt-4 h-[320px] sm:h-[340px]">
        {error ? (
          <div className="flex h-full items-center justify-center border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        ) : trajectory.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading cost series…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trajectory} margin={{ top: 12, right: 16, bottom: 8, left: 6 }}>
              <CartesianGrid stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: MUTED, fontSize: 11 }} />
              <YAxis tickFormatter={formatCompactDollars} tickLine={false} axisLine={false} tick={{ fill: MUTED, fontSize: 11 }} width={64} />
              <Tooltip content={<TrajTip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="careLower" stackId="care" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area type="monotone" dataKey="careBand" stackId="care" stroke="none" fill={NAVY} fillOpacity={0.13} isAnimationActive={!reduce} animationDuration={650} />
              <Line type="monotone" dataKey="careMedian" stroke={NAVY} strokeWidth={3.25} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} isAnimationActive={!reduce} animationDuration={650} />
              <Line type="monotone" dataKey="adap" stroke={TEAL} strokeWidth={2.75} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} isAnimationActive={!reduce} animationDuration={650} />
              <Line type="monotone" dataKey="netMedian" stroke={RUST} strokeWidth={2.75} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} isAnimationActive={!reduce} animationDuration={650} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
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
  ];

  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
        <Reveal>
          <SectionHead n="04" eyebrow="Methods" title="Accounting frame and model assumptions">
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
                      <dd className="mt-1 font-mono text-sm font-medium tabular-nums text-slate-900">{item.value}</dd>
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
  const groups = [
    {
      label: 'Funding scope',
      items: [
        'Should DC be excluded, included as separate funding context, or modeled separately?',
        'Does Part B include ADAP funding in this CSV, or is it Part B excluding ADAP?',
        'Are the CSV dollar values 2025 nominal dollars, 2026 dollars, or another fiscal-year convention?',
      ],
    },
    {
      label: 'Perspective',
      items: [
        'Should the primary comparator be ADAP only, total RWHAP, or both?',
        'Which payer perspective should govern the net calculation?',
        'In the no-ADAP funding comparison, would downstream care for excess infections be ADAP/RWHAP-eligible?',
      ],
    },
    {
      label: 'Model choices',
      items: [
        'Should low, median, and high drug-cost assumptions be shown separately, pooled, or both?',
        'Should negative per-simulation excess infections be preserved, floored at zero, or shown as a sensitivity?',
      ],
    },
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-full px-5 pb-4 sm:max-w-6xl sm:px-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50/45 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Questions to resolve</h2>
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-amber-700/80">{group.label}</p>
                <ul className="mt-2 space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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

  const nationalFinal = ryanWhiteCostingSummary.national.finalYear;
  // The horizon control recomputes everything from the annual series; until it
  // loads (or if the URL preset a horizon), fall back to the 2035 summary.
  const nationalPoint = pointForYear(series?.national ?? [], horizon) ?? nationalFinal;
  const atFullHorizon = nationalPoint.year === HORIZON_MAX;
  const headline = useMemo(() => headlineAt(nationalPoint, primaryEstimand), [nationalPoint, primaryEstimand]);
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

  const selectedName = location === 'Total' ? 'National total' : stateName(location);
  const selectedPoint = rankedStates.find((s) => s.state === location) ?? rankedStates[0];
  const tossUps = rankedStates.filter((s) => s.shareNetPositive < 0.66);
  const likely = rankedStates.filter((s) => s.shareNetPositive >= 0.85).length;

  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto bg-white text-slate-900">
      <HorizonBar horizon={horizon} onHorizon={setHorizon} ready={series !== null} />

      <CascadeHero headline={headline} estimand={primaryEstimand} horizon={nationalPoint.year} share={share} />

      <UncertaintyDecomposition
        rows={decompositionRows}
        scenario={scenario}
        onScenario={setScenario}
        horizon={nationalPoint.year}
        estimand={primaryEstimand}
      />

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead
              n="02"
              eyebrow="State breakdown"
              title="Most states land net-costly in most draws; doubt clusters in large ADAP programs"
              right={<SwarmLegend />}
            >
              {likely} of 30 states show a net cost in at least 85% of simulations. Only {tossUps.length}:{' '}
              {tossUps.map((s) => s.state).join(', ')}, all large ADAP programs, sit near a coin flip, where the markers
              pulse. State abbreviations are labeled; hover or focus any dot for detail. Shown at the full 2035
              horizon.
            </SectionHead>

            <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                  Uncertainty field / share of draws net-costly
                </span>
                <span className="font-mono text-[0.62rem] text-slate-400">
                  30 modeled states
                </span>
              </div>
              <StateSwarm states={rankedStates} selected={location} hovered={hovered} onSelect={setLocation} onHover={setHovered} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <ImpactScatter states={rankedStates} selected={location} hovered={hovered} onSelect={setLocation} onHover={setHovered} />
              <SelectedState point={selectedPoint} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead n="03" eyebrow="Detail" title="Trajectories and the full state table" />
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Reveal>
              <Trajectory trajectory={trajectory} selectedName={selectedName} scenario={scenario} error={seriesError} />
            </Reveal>
            <Reveal className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-base font-semibold text-slate-900">All states, sorted by median net cost</h3>
              <div className="mt-4 max-h-[380px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white text-[0.68rem] uppercase tracking-wide text-slate-400">
                    <tr className="border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">State</th>
                      <th className="py-2 px-3 text-right font-medium">Net</th>
                      <th className="py-2 px-3 text-right font-medium">Draws &gt; 0</th>
                      <th className="py-2 pl-3 text-right font-medium">Care</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedStates.map((item) => (
                      <tr
                        key={item.state}
                        onClick={() => setLocation(item.state)}
                        onMouseEnter={() => setHovered(item.state)}
                        onMouseLeave={() => setHovered(null)}
                        tabIndex={0}
                        onFocus={() => setHovered(item.state)}
                        onBlur={() => setHovered(null)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setLocation(item.state);
                          }
                        }}
                        className={cx(
                          'cursor-pointer border-b border-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-300',
                          item.state === location ? 'bg-slate-100' : hovered === item.state ? 'bg-slate-50' : 'hover:bg-slate-50'
                        )}
                      >
                        <td className="py-2 pr-3 font-medium text-slate-900">
                          {item.stateName} <span className="text-slate-400">{item.state}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900">{formatCompactDollars(item.netCost)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-medium" style={{ color: confColor(item.shareNetPositive) }}>
                          {formatPercent(item.shareNetPositive)}
                        </td>
                        <td className="py-2 pl-3 text-right font-mono tabular-nums text-slate-500">{formatCompactDollars(item.careCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
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
