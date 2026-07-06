'use client';

import { useEffect, useMemo, useState } from 'react';
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
  buildRankedStates,
  buildReviewCards,
  buildScenarioEvidence,
  buildTrajectoryData,
  formatCompactDollars,
  formatNumber,
  formatPercent,
  LocationKey,
  RankedStatePoint,
  ReviewCard,
  ScenarioEvidencePoint,
  scenarioMetric,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  SCENARIO_SHORT_LABELS,
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
// Scenario tabs
// -----------------------------------------------------------------------------
function ScenarioTabs({ scenario, onChange }: { scenario: CostScenarioId; onChange: (s: CostScenarioId) => void }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 sm:inline-flex sm:w-auto sm:gap-6">
      {SCENARIO_ORDER.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cx(
            '-mb-px border-b-2 pb-2 text-sm font-medium transition-colors',
            scenario === item ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
          )}
        >
          {SCENARIO_SHORT_LABELS[item]}
          <span className="ml-1.5 text-[0.7rem] text-slate-400">drug cost</span>
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Hero
// -----------------------------------------------------------------------------
function Hero({
  scenario,
  onScenario,
  net,
  share,
  care,
  adap,
}: {
  scenario: CostScenarioId;
  onScenario: (s: CostScenarioId) => void;
  net: { median: number; lower: number; upper: number };
  share: number;
  care: number;
  adap: number;
}) {
  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto grid w-full max-w-full gap-x-14 gap-y-10 px-5 py-14 sm:max-w-6xl sm:px-6 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-20">
        <div className="min-w-0">
          <Eyebrow>
            Ryan White ADAP / Cost-consequence analysis / {ryanWhiteCostingMetadata.horizon.startYear}-
            {ryanWhiteCostingMetadata.horizon.endYear}
          </Eyebrow>
          <h1
            className={cx(
              SERIF,
              'mt-6 max-w-2xl text-[2.35rem] font-medium leading-[1.08] text-slate-900 sm:text-[3.3rem]'
            )}
          >
            ADAP cuts may cost more than they save.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
            Under the {SCENARIO_LABELS[scenario].toLowerCase()} scenario, the model projects a median{' '}
            <span className="font-semibold text-slate-900">{formatCompactDollars(net.median)}</span> net cost across 30
            states through 2035, downstream HIV care that outweighs the ADAP spending avoided in{' '}
            <span className="font-semibold text-slate-900">{formatPercent(share)}</span> of simulations.
          </p>

          <div className="mt-8 max-w-lg border-l-2 pl-4" style={{ borderColor: RUST }}>
            <p className="text-sm font-semibold text-slate-800">Interpretation depends on payer perspective.</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              This frame compares avoided ADAP spending with downstream HIV care costs; those care costs may themselves
              be ADAP/RWHAP-eligible under alternative counterfactuals.
            </p>
          </div>
        </div>

        <div className="min-w-0 lg:justify-self-end">
          <div className="flex min-w-0 flex-col gap-6">
            <div>
              <Eyebrow>Median net cost vs ADAP</Eyebrow>
              <p className="mt-3 font-mono text-6xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-7xl">
                {formatCompactDollars(net.median)}
              </p>
              <p className="mt-3 font-mono text-sm tabular-nums text-slate-500">
                {formatCompactDollars(net.lower)} to {formatCompactDollars(net.upper)} / 95% interval
              </p>
            </div>
            <div className="grid grid-cols-2 gap-5 border-t border-slate-200 pt-5 sm:grid-cols-3">
              <Figure label="Draws net-costly" value={formatPercent(share)} tint={RUST} />
              <Figure label="Care cost" value={formatCompactDollars(care)} />
              <Figure label="ADAP avoided" value={formatCompactDollars(adap)} tint={TEAL} />
            </div>
            <div className="pt-1">
              <ScenarioTabs scenario={scenario} onChange={onScenario} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Figure({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums" style={{ color: tint ?? INK }}>
        {value}
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Scenario evidence strip
// -----------------------------------------------------------------------------
function ScenarioStrip({
  points,
  selected,
  onSelect,
}: {
  points: ScenarioEvidencePoint[];
  selected: CostScenarioId;
  onSelect: (s: CostScenarioId) => void;
}) {
  const [hoveredScenario, setHoveredScenario] = useState<CostScenarioId | null>(null);
  const min = Math.min(0, ...points.map((p) => p.curve.p025));
  const max = Math.max(0, ...points.map((p) => p.curve.p975));
  const domainMin = Math.floor(min / 1e9) * 1e9;
  const domainMax = Math.ceil(max / 1e9) * 1e9;
  const at = (v: number) => ((v - domainMin) / (domainMax - domainMin)) * 100;
  const zero = at(0);
  const activeScenario = hoveredScenario ?? selected;

  return (
    <section className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
      <Reveal>
        <SectionHead
          n="01"
          eyebrow="Scenario evidence"
          title="Each drug-cost scenario leans net-costly, with a real tail toward savings"
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
          Rows are drug-cost assumptions; each band is the spread across 1,000 simulation draws. Left of the line is a
          net offset, right is a net cost.
        </SectionHead>

        <div className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {points.map((point) => {
            const isSel = point.scenario === selected;
            const isActive = point.scenario === activeScenario;
            return (
              <button
                key={point.scenario}
                type="button"
                onClick={() => onSelect(point.scenario)}
                onMouseEnter={() => setHoveredScenario(point.scenario)}
                onMouseLeave={() => setHoveredScenario(null)}
                onFocus={() => setHoveredScenario(point.scenario)}
                onBlur={() => setHoveredScenario(null)}
                aria-pressed={isSel}
                className={cx(
                  'group flex w-full flex-col gap-4 border-b border-slate-200 px-4 py-5 text-left transition-all last:border-b-0 sm:grid sm:grid-cols-[132px_minmax(0,1fr)_150px] sm:items-center sm:gap-6 sm:px-5',
                  isSel ? 'bg-slate-50' : 'hover:bg-slate-50/60',
                  isActive ? 'opacity-100' : 'opacity-60'
                )}
              >
                <div className="flex items-baseline justify-between sm:block sm:pl-1">
                  <p className={cx('text-sm font-semibold', isSel ? 'text-slate-900' : 'text-slate-600')}>{point.label}</p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-slate-400">
                    {formatCompactDollars(point.netMedian)} median
                  </p>
                </div>
                <div className="relative h-12 min-w-0 overflow-hidden rounded-md">
                  <span className="absolute inset-y-0 left-0 bg-teal-50/60" style={{ width: `${zero}%` }} />
                  <span className="absolute inset-y-0 right-0 bg-amber-50/60" style={{ width: `${100 - zero}%` }} />
                  <span className="absolute inset-y-0 w-px bg-slate-400" style={{ left: `${zero}%` }} />
                  <SplitBand at={at} lo={point.curve.p025} hi={point.curve.p975} thickness={4} opacity={isActive ? 0.24 : 0.16} />
                  <SplitBand at={at} lo={point.curve.p10} hi={point.curve.p90} thickness={8} opacity={isActive ? 0.46 : 0.28} />
                  <SplitBand at={at} lo={point.curve.p25} hi={point.curve.p75} thickness={isActive ? 16 : 12} opacity={isActive ? 0.9 : 0.55} />
                  <span
                    className="absolute top-1/2 w-[3px] -translate-y-1/2 rounded-full transition-all"
                    style={{ left: `${at(point.curve.p50)}%`, height: isActive ? 36 : 28, background: INK }}
                  />
                </div>
                <div className="flex items-baseline justify-between sm:block sm:text-right">
                  <p className="font-mono text-xl font-semibold tabular-nums" style={{ color: confColor(point.shareNetPositive) }}>
                    {formatPercent(point.shareNetPositive)}
                  </p>
                  <p className="text-[0.68rem] uppercase tracking-wide text-slate-400 sm:mt-0.5">draws net-costly</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[0.68rem] tabular-nums text-slate-400">
          <span>{formatCompactDollars(domainMin)}</span>
          <span className="hidden sm:inline">net offset / $0 / net cost</span>
          <span>{formatCompactDollars(domainMax)}</span>
        </div>
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
  const bracketY = Math.min(...tossUps.map((d) => d.cy - d.r)) - 14;
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
        const labelY = d.cy < (SWARM.padTop + axisY) / 2 ? d.cy - d.r - 6 : d.cy + d.r + 14;
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
              x={d.cx}
              y={labelY}
              textAnchor="middle"
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
    const r = 4 + (Math.sqrt(payload.excessDiagnoses) / Math.sqrt(maxDx)) * 10;
    const isSel = payload.state === selected;
    const isActive = payload.state === active;
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
        <motion.circle
          cx={x}
          cy={y}
          initial={false}
          animate={{ r: isSel || isActive ? r + 2 : r }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          fill={confColor(payload.shareNetPositive)}
          fillOpacity={isSel || isActive ? 1 : 0.8}
          stroke={isSel ? NAVY : isActive ? INK : '#ffffff'}
          strokeWidth={isSel ? 2.5 : isActive ? 1.6 : 1}
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
              stroke="#cbd5e1"
              strokeDasharray="5 5"
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
              <ErrorBar dataKey="careError" direction="y" stroke="#cbd5e1" width={3} />
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
// Model review
// -----------------------------------------------------------------------------
function ModelReview() {
  const final = ryanWhiteCostingSummary.national.finalYear;
  const cards = buildReviewCards(final);
  const p = ryanWhiteCostingMetadata.modelParameters;
  const questions = ryanWhiteCostingMetadata.reviewQuestions.slice(0, 6);

  const costCard: ReviewCard = {
    title: 'Cost assumptions',
    items: [
      { label: 'Drug tiers', value: SCENARIO_ORDER.map((s) => formatCompactDollars(p.artDrugCosts[s])).join(' / ') },
      { label: 'Routine care', value: formatCompactDollars(p.routineCareCost) },
      { label: 'Discount rate', value: formatPercent(p.discountRate) },
    ],
  };

  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
        <Reveal>
          <SectionHead n="03" eyebrow="Model review" title="Assumptions worth challenging">
            Left visible on purpose: these parameters can move the conclusion.
          </SectionHead>

          <div className="mt-10 grid gap-x-10 gap-y-8 border-t border-slate-200 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...cards, costCard].map((card) => (
              <div key={card.title}>
                <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                <dl className="mt-3 space-y-2">
                  {card.items.map((item) => (
                    <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-2">
                      <dt className="text-sm text-slate-500">{item.label}</dt>
                      <dd className="text-right font-mono text-sm font-medium tabular-nums text-slate-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                {card.note && <p className="mt-3 text-xs leading-relaxed text-slate-500">{card.note}</p>}
              </div>
            ))}
          </div>

          <div className="mt-10">
            <h3 className="text-sm font-semibold text-slate-900">Open questions for reviewers</h3>
            <ol className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {questions.map((q, i) => (
                <li key={q} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                  <span className="font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
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
  const [location, setLocation] = useState<LocationKey>(ryanWhiteCostingMetadata.defaultFocusState);
  const [hovered, setHovered] = useState<string | null>(null);
  const [series, setSeries] = useState<RyanWhiteCostingSeries | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);

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
  const scenarioEvidence = useMemo(() => buildScenarioEvidence(nationalFinal), [nationalFinal]);
  const rankedStates = useMemo(() => buildRankedStates(ryanWhiteCostingSummary.states, scenario), [scenario]);
  const selectedSeries = seriesForLocation(series, location);
  const trajectory = useMemo(() => buildTrajectoryData(selectedSeries, scenario), [selectedSeries, scenario]);

  const net = scenarioMetric(nationalFinal.cumulativeNetCostVsAdap, scenario);
  const care = scenarioMetric(nationalFinal.cumulativeCareCost, scenario);
  const share = nationalFinal.shareNetCostPositiveVsAdap[scenario];
  const selectedName = location === 'Total' ? 'National total' : stateName(location);
  const selectedPoint = rankedStates.find((s) => s.state === location) ?? rankedStates[0];
  const tossUps = rankedStates.filter((s) => s.shareNetPositive < 0.66);
  const likely = rankedStates.filter((s) => s.shareNetPositive >= 0.85).length;

  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto bg-white text-slate-900">
      <Hero
        scenario={scenario}
        onScenario={setScenario}
        net={net}
        share={share}
        care={care.median}
        adap={nationalFinal.cumulativeAdapSpendingAvoided}
      />

      <ScenarioStrip points={scenarioEvidence} selected={scenario} onSelect={setScenario} />

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
              pulse. State abbreviations are labeled; hover or focus any dot for detail.
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

      <ModelReview />

      <section className="bg-white">
        <div className="mx-auto w-full max-w-full px-5 py-16 sm:max-w-6xl sm:px-6">
          <Reveal>
            <SectionHead n="04" eyebrow="Detail" title="Trajectories and the full state table" />
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

      <footer className="mx-auto w-full max-w-full px-5 py-12 sm:max-w-6xl sm:px-6">
        <p className="text-xs leading-relaxed text-slate-400">
          30 modeled states. DC funding is excluded (no DC epidemiologic output). Funding comparators are deterministic;
          care-cost intervals are computed after per-simulation cumulative costing. Internal review preview; figures are
          provisional.
        </p>
      </footer>
    </div>
  );
}
