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

// --- palette -----------------------------------------------------------------
const TEAL = '#0f766e';
const RUST = '#b45309';
const INK = '#1c1917';
const MUTED = '#78716c';
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

function shareColor(share: number): string {
  const t = Math.max(0, Math.min(1, (share - 0.5) / 0.5));
  return t <= 0.5 ? hexLerp('#fadcae', '#dd8a2c', t / 0.5) : hexLerp('#dd8a2c', '#7c2d12', (t - 0.5) / 0.5);
}

function useCountUp(target: number, enabled: boolean, duration = 550): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!enabled) {
      setVal(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, enabled, duration]);
  return enabled ? val : target;
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-stone-500">{children}</p>
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
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-stone-400">{n}</span>
          <span className="h-px w-8 bg-stone-300" />
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
        <h2 className={cx(SERIF, 'mt-4 text-3xl font-medium leading-[1.15] text-stone-900 sm:text-[2.1rem]')}>{title}</h2>
        {children && <p className="mt-3 text-[0.95rem] leading-relaxed text-stone-500">{children}</p>}
      </div>
      {right}
    </div>
  );
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// --- shared chart tooltips (kills the default Recharts look) ------------------
interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string; value?: number; stroke?: string; payload?: RankedStatePoint }>;
}

function ScatterTip({ active, payload }: TipProps) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 shadow-md">
      <p className="text-sm font-semibold text-stone-900">{p.stateName}</p>
      <p className="mt-1 font-mono text-xs tabular-nums text-stone-500">
        Care {formatCompactDollars(p.careCost)} · ADAP {formatCompactDollars(p.adapBenchmark)}
      </p>
      <p className="font-mono text-xs tabular-nums" style={{ color: shareColor(p.shareNetPositive) }}>
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
    <div className="rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 shadow-md">
      <p className="font-mono text-[0.7rem] uppercase tracking-wide text-stone-400">Year {label}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((pl) => (
          <p key={pl.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-stone-500">
              <span className="h-2 w-2 rounded-full" style={{ background: pl.stroke }} />
              {names[pl.dataKey as string]}
            </span>
            <span className="font-mono tabular-nums text-stone-900">{formatCompactDollars(Number(pl.value))}</span>
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
    <div className="inline-flex items-center gap-6 border-b border-stone-200">
      {SCENARIO_ORDER.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cx(
            '-mb-px border-b-2 pb-2 text-sm font-medium transition-colors',
            scenario === item ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'
          )}
        >
          {SCENARIO_SHORT_LABELS[item]}
          <span className="ml-1.5 text-[0.7rem] text-stone-400">drug cost</span>
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
  const reduce = useReducedMotion() ?? false;
  const animatedNet = useCountUp(net.median, !reduce);

  return (
    <header className="border-b border-stone-200/80">
      <div className="mx-auto grid w-full max-w-6xl gap-x-14 gap-y-10 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-24">
        <div>
          <Eyebrow>
            Ryan White ADAP · Cost-consequence analysis · {ryanWhiteCostingMetadata.horizon.startYear}–
            {ryanWhiteCostingMetadata.horizon.endYear}
          </Eyebrow>
          <h1 className={cx(SERIF, 'mt-7 max-w-2xl text-5xl font-medium leading-[1.06] text-stone-900 sm:text-[4.1rem]')}>
            Ending ADAP funding <span className="font-normal italic">likely</span> costs more than it saves.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-stone-600">
            Under the {SCENARIO_LABELS[scenario].toLowerCase()} scenario, the model projects a median{' '}
            <span className="font-semibold text-stone-900">{formatCompactDollars(net.median)}</span> net cost across 30
            states through 2035 — downstream HIV care that outweighs the ADAP spending avoided in{' '}
            <span className="font-semibold text-stone-900">{formatPercent(share)}</span> of simulations.
          </p>

          <div className="mt-9 max-w-lg border-l-2 border-amber-500/70 pl-4">
            <p className="text-sm font-semibold text-stone-800">Interpretation depends on payer perspective.</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              This frame compares avoided ADAP spending with downstream HIV care costs; those care costs may themselves
              be ADAP/RWHAP-eligible under alternative counterfactuals.
            </p>
          </div>
        </div>

        <div className="lg:justify-self-end">
          <div className="flex flex-col gap-6">
            <div>
              <Eyebrow>Median net cost vs ADAP</Eyebrow>
              <p className="mt-3 font-mono text-6xl font-semibold tabular-nums tracking-tight text-stone-900 sm:text-7xl">
                {formatCompactDollars(animatedNet)}
              </p>
              <p className="mt-3 font-mono text-sm tabular-nums text-stone-500">
                {formatCompactDollars(net.lower)} → {formatCompactDollars(net.upper)} · 95% interval
              </p>
            </div>
            <div className="grid grid-cols-3 gap-5 border-t border-stone-200 pt-5">
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
      <p className="text-[0.68rem] font-medium uppercase tracking-wide text-stone-400">{label}</p>
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
  const min = Math.min(0, ...points.map((p) => p.curve.p025));
  const max = Math.max(0, ...points.map((p) => p.curve.p975));
  const domainMin = Math.floor(min / 1e9) * 1e9;
  const domainMax = Math.ceil(max / 1e9) * 1e9;
  const at = (v: number) => ((v - domainMin) / (domainMax - domainMin)) * 100;
  const zero = at(0);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <Reveal>
        <SectionHead
          n="01"
          eyebrow="Scenario evidence"
          title="Every drug-cost scenario lands net-costly — with a real tail toward savings"
          right={
            <div className="flex items-center gap-5 text-xs font-medium text-stone-500">
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

        <div className="mt-10 divide-y divide-stone-200 border-y border-stone-200">
          {points.map((point) => {
            const isSel = point.scenario === selected;
            return (
              <button
                key={point.scenario}
                type="button"
                onClick={() => onSelect(point.scenario)}
                className={cx(
                  'flex w-full flex-col gap-3 py-6 text-left transition-colors sm:grid sm:grid-cols-[132px_minmax(0,1fr)_150px] sm:items-center sm:gap-6',
                  isSel ? 'bg-amber-50/40' : 'hover:bg-stone-50'
                )}
              >
                <div className="flex items-baseline justify-between sm:block sm:pl-1">
                  <p className={cx('text-sm font-semibold', isSel ? 'text-stone-900' : 'text-stone-600')}>{point.label}</p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-stone-400">
                    {formatCompactDollars(point.netMedian)} median
                  </p>
                </div>
                <div className="relative h-12">
                  <span className="absolute inset-y-0 left-0 bg-teal-50/70" style={{ width: `${zero}%` }} />
                  <span className="absolute inset-y-0 right-0 bg-amber-50/70" style={{ width: `${100 - zero}%` }} />
                  <span className="absolute inset-y-0 w-px bg-stone-400" style={{ left: `${zero}%` }} />
                  <SplitBand at={at} lo={point.curve.p025} hi={point.curve.p975} thickness={4} opacity={0.22} />
                  <SplitBand at={at} lo={point.curve.p10} hi={point.curve.p90} thickness={8} opacity={0.4} />
                  <SplitBand at={at} lo={point.curve.p25} hi={point.curve.p75} thickness={14} opacity={0.85} />
                  <span
                    className="absolute top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full"
                    style={{ left: `${at(point.curve.p50)}%`, background: INK }}
                  />
                </div>
                <div className="flex items-baseline justify-between sm:block sm:text-right">
                  <p className="font-mono text-xl font-semibold tabular-nums" style={{ color: shareColor(point.shareNetPositive) }}>
                    {formatPercent(point.shareNetPositive)}
                  </p>
                  <p className="text-[0.68rem] uppercase tracking-wide text-stone-400 sm:mt-0.5">draws net-costly</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[0.68rem] tabular-nums text-stone-400">
          <span>{formatCompactDollars(domainMin)}</span>
          <span className="hidden sm:inline">net offset ← $0 → net cost</span>
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
// State beeswarm — signature visual
// -----------------------------------------------------------------------------
const SWARM = { w: 1000, h: 300, padL: 36, padR: 28, padTop: 40, padBottom: 48 };
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
    `Net ${formatCompactDollars(dot.netCost)} · care ${formatCompactDollars(dot.careCost)}`,
    `${formatCompactDollars(dot.netLower)} → ${formatCompactDollars(dot.netUpper)}`,
  ];
  const boxW = 262;
  const boxH = 70;
  let x = dot.cx + dot.r + 10;
  if (x + boxW > SWARM.w) x = dot.cx - dot.r - 10 - boxW;
  const y = Math.max(4, Math.min(dot.cy - boxH / 2, SWARM.h - boxH - 4));
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={boxW} height={boxH} rx={8} fill="#ffffff" stroke="#e7e5e4" />
      <rect x={x} y={y} width={3} height={boxH} rx={1.5} fill={shareColor(dot.shareNetPositive)} />
      <text x={x + 15} y={y + 23} fontSize="15" fontWeight={700} fill={INK}>
        {dot.stateName}
      </text>
      {lines.map((line, i) => (
        <text key={line} x={x + 15} y={y + 23 + 15 * (i + 1)} fontSize="12.5" fill={MUTED} className="font-mono">
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
  const bracketY = Math.min(...tossUps.map((d) => d.cy - d.r)) - 12;
  const bigStates = new Set(['FL', 'TX']);
  const active = hovered ?? (selected !== 'Total' ? selected : null);
  const hoverDot = hovered ? dots.find((d) => d.state === hovered) ?? null : null;

  return (
    <svg viewBox={`0 0 ${SWARM.w} ${SWARM.h}`} className="block w-full" role="img" aria-label="States by probability of being net-costly">
      <line x1={swarmX(0.5)} x2={swarmX(0.5)} y1={SWARM.padTop} y2={axisY} stroke="#d6d3d1" strokeDasharray="4 4" />
      {ticks.map((t) => (
        <text key={t} x={swarmX(t)} y={axisY + 28} textAnchor="middle" fontSize="15" fill={MUTED} className="font-mono">
          {Math.round(t * 100)}%
        </text>
      ))}
      <text x={swarmX(0.5)} y={SWARM.padTop - 18} textAnchor="middle" fontSize="14" fill="#a8a29e">
        coin flip
      </text>
      <text x={swarmX(1.0)} y={SWARM.padTop - 18} textAnchor="end" fontSize="14" fill="#a8a29e">
        always net-costly →
      </text>

      {tossUps.length > 0 && (
        <g>
          <path
            d={`M ${bracketL} ${bracketY + 6} L ${bracketL} ${bracketY} L ${bracketR} ${bracketY} L ${bracketR} ${bracketY + 6}`}
            fill="none"
            stroke="#c4b7a4"
            strokeWidth={1}
          />
          <text x={(bracketL + bracketR) / 2} y={bracketY - 6} textAnchor="middle" fontSize="13" fill="#8a7f6d">
            large-ADAP toss-ups
          </text>
        </g>
      )}

      {dots.map((d) => {
        const isSel = d.state === selected;
        const isActive = d.state === active;
        return (
          <g
            key={d.state}
            className="cursor-pointer"
            onClick={() => onSelect(d.state)}
            onMouseEnter={() => onHover(d.state)}
            onMouseLeave={() => onHover(null)}
          >
            <motion.circle
              initial={false}
              animate={{ cx: d.cx, cy: d.cy, r: isSel || isActive ? d.r + 2.5 : d.r }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
              fill={isSel ? '#002D72' : shareColor(d.shareNetPositive)}
              fillOpacity={isSel || isActive ? 1 : 0.85}
              stroke={isSel ? '#F2C413' : isActive ? INK : '#ffffff'}
              strokeWidth={isSel ? 2.5 : isActive ? 1.8 : 1.2}
            />
            {(bigStates.has(d.state) || isSel) && (
              <text
                x={d.cx}
                y={d.cy - d.r - 5}
                textAnchor="middle"
                fontSize="14"
                fontWeight={isSel ? 700 : 500}
                fill={isSel ? '#002D72' : '#57534e'}
                pointerEvents="none"
              >
                {d.state}
              </text>
            )}
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
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-stone-500">
      <div className="flex items-center gap-2">
        <span className="font-medium text-stone-600">P(net-costly)</span>
        <span className="flex overflow-hidden rounded-full">
          {stops.map((s) => (
            <span key={s} className="h-2.5 w-7" style={{ background: shareColor(s) }} />
          ))}
        </span>
        <span className="font-mono text-stone-400">50→100%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-stone-600">Dot size</span>
        <svg width="46" height="18" aria-hidden>
          <circle cx="7" cy="9" r="4" fill="#c9b8a0" />
          <circle cx="30" cy="9" r="8" fill="#c9b8a0" />
        </svg>
        <span className="text-stone-400">median net cost</span>
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
    ? 'Very likely net-costly'
    : point.shareNetPositive >= 0.66
    ? 'Likely net-costly'
    : 'A genuine toss-up';
  return (
    <div className="border-l border-stone-200 pl-6">
      <Eyebrow>Selected state</Eyebrow>
      <h3 className={cx(SERIF, 'mt-2 text-3xl font-medium text-stone-900')}>{point.stateName}</h3>
      <p className="mt-1 text-sm font-medium" style={{ color: shareColor(point.shareNetPositive) }}>
        {verdict} · {formatPercent(point.shareNetPositive)} of draws
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
        {[
          ['Net cost vs ADAP', formatCompactDollars(point.netCost)],
          ['95% interval', `${formatCompactDollars(point.netLower)} → ${formatCompactDollars(point.netUpper)}`],
          ['Downstream care', formatCompactDollars(point.careCost)],
          ['ADAP avoided', formatCompactDollars(point.adapBenchmark)],
          ['Excess diagnoses', formatNumber(point.excessDiagnoses)],
          ['ART person-years', formatNumber(point.artPersonYears)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[0.68rem] font-medium uppercase tracking-wide text-stone-400">{label}</dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-stone-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Impact scatter — sqrt axes de-cluster the many small states
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

  const renderDot = (props: unknown) => {
    const { cx: x, cy: y, payload } = props as { cx?: number; cy?: number; payload?: RankedStatePoint };
    if (typeof x !== 'number' || typeof y !== 'number' || !payload) return <g />;
    const r = 4 + (Math.sqrt(payload.excessDiagnoses) / Math.sqrt(maxDx)) * 10;
    const isSel = payload.state === selected;
    const isActive = payload.state === active;
    return (
      <g onMouseEnter={() => onHover(payload.state)} onMouseLeave={() => onHover(null)}>
        <circle
          cx={x}
          cy={y}
          r={isSel || isActive ? r + 2 : r}
          fill={isSel ? '#002D72' : shareColor(payload.shareNetPositive)}
          fillOpacity={isSel || isActive ? 1 : 0.78}
          stroke={isSel ? '#F2C413' : isActive ? INK : '#ffffff'}
          strokeWidth={isSel ? 2.5 : isActive ? 1.6 : 1}
        />
        {(label.has(payload.state) || isSel || isActive) && (
          <text x={x + r + 3} y={y + 4} fontSize={11} fill="#57534e" fontWeight={isSel || isActive ? 700 : 500}>
            {payload.state}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="min-w-0">
      <h3 className="text-base font-semibold text-stone-900">Where downstream care meets avoided ADAP</h3>
      <p className="mt-1 text-sm leading-relaxed text-stone-500">
        Above the dashed break-even line, care cost exceeds avoided ADAP. Axes are square-root scaled to separate the
        many smaller states; whiskers span the 10th–90th percentile of care cost.
      </p>
      <div className="mt-4 h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 20, bottom: 22, left: 4 }}>
            <XAxis
              type="number"
              dataKey="adapBenchmark"
              scale="sqrt"
              domain={[0, maxAxis]}
              tickFormatter={formatCompactDollars}
              tickLine={false}
              axisLine={{ stroke: '#e7e5e4' }}
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
              axisLine={{ stroke: '#e7e5e4' }}
              tick={{ fill: MUTED, fontSize: 11 }}
              width={64}
              label={{ value: 'Downstream care cost', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 12 }}
            />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: maxAxis, y: maxAxis },
              ]}
              stroke="#d6d3d1"
              strokeDasharray="5 5"
            />
            <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray: '3 3', stroke: '#d6d3d1' }} />
            <Scatter
              data={data}
              shape={renderDot}
              onClick={(point: unknown) => {
                const payload = (point as { payload?: RankedStatePoint }).payload;
                if (payload?.state) onSelect(payload.state);
              }}
            >
              <ErrorBar dataKey="careError" direction="y" stroke="#d6d3d1" width={3} />
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
  return (
    <div className="min-w-0">
      <h3 className="text-base font-semibold text-stone-900">
        {selectedName} · {SCENARIO_LABELS[scenario].toLowerCase()}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-stone-500">
        Care cost (ink, with simulation band), avoided ADAP (teal), and the resulting net (rust) accumulate to 2035.
      </p>
      <div className="mt-4 h-[340px]">
        {error ? (
          <div className="flex h-full items-center justify-center border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        ) : trajectory.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-stone-400">Loading cost series…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trajectory} margin={{ top: 12, right: 16, bottom: 8, left: 6 }}>
              <CartesianGrid stroke="#f0efec" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#e7e5e4' }} tick={{ fill: MUTED, fontSize: 11 }} />
              <YAxis tickFormatter={formatCompactDollars} tickLine={false} axisLine={false} tick={{ fill: MUTED, fontSize: 11 }} width={64} />
              <Tooltip content={<TrajTip />} />
              <Area type="monotone" dataKey="careLower" stackId="care" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area type="monotone" dataKey="careBand" stackId="care" stroke="none" fill={INK} fillOpacity={0.08} isAnimationActive={false} />
              <Line type="monotone" dataKey="careMedian" stroke={INK} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="adap" stroke={TEAL} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="netMedian" stroke={RUST} strokeWidth={2} dot={false} />
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
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <Reveal>
        <SectionHead n="03" eyebrow="Model review" title="Assumptions worth challenging">
          Left visible on purpose — these parameters can move the conclusion.
        </SectionHead>

        <div className="mt-10 grid gap-x-10 gap-y-8 border-t border-stone-200 pt-8 sm:grid-cols-2 lg:grid-cols-3">
          {[...cards, costCard].map((card) => (
            <div key={card.title}>
              <h3 className="text-sm font-semibold text-stone-900">{card.title}</h3>
              <dl className="mt-3 space-y-2">
                {card.items.map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-stone-100 pb-2">
                    <dt className="text-sm text-stone-500">{item.label}</dt>
                    <dd className="text-right font-mono text-sm font-medium tabular-nums text-stone-900">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {card.note && <p className="mt-3 text-xs leading-relaxed text-stone-500">{card.note}</p>}
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h3 className="text-sm font-semibold text-stone-900">Open questions for reviewers</h3>
          <ol className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {questions.map((q, i) => (
              <li key={q} className="flex gap-3 text-sm leading-relaxed text-stone-600">
                <span className="font-mono text-stone-400">{String(i + 1).padStart(2, '0')}</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
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
    <div className="min-h-screen overflow-x-hidden overflow-y-auto bg-[#faf8f4] text-stone-900">
      <Hero
        scenario={scenario}
        onScenario={setScenario}
        net={net}
        share={share}
        care={care.median}
        adap={nationalFinal.cumulativeAdapSpendingAvoided}
      />

      <ScenarioStrip points={scenarioEvidence} selected={scenario} onSelect={setScenario} />

      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <Reveal>
            <SectionHead
              n="02"
              eyebrow="State breakdown"
              title="Most states are almost certainly net-costly — the doubt lives in a few large-ADAP states"
              right={<SwarmLegend />}
            >
              {likely} of 30 states show a net cost in at least 85% of simulations. Only {tossUps.length} —{' '}
              {tossUps.map((s) => s.state).join(', ')}, all large ADAP programs — sit near a coin flip. Hover any dot for
              detail.
            </SectionHead>

            <div className="mt-8">
              <StateSwarm states={rankedStates} selected={location} hovered={hovered} onSelect={setLocation} onHover={setHovered} />
            </div>

            <div className="mt-12 grid gap-12 border-t border-stone-200 pt-10 lg:grid-cols-[1fr_320px]">
              <ImpactScatter states={rankedStates} selected={location} hovered={hovered} onSelect={setLocation} onHover={setHovered} />
              <SelectedState point={selectedPoint} />
            </div>
          </Reveal>
        </div>
      </section>

      <ModelReview />

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <Reveal>
            <SectionHead n="04" eyebrow="Detail" title="Trajectories and the full state table" />
          </Reveal>
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_1fr]">
            <Reveal>
              <Trajectory trajectory={trajectory} selectedName={selectedName} scenario={scenario} error={seriesError} />
            </Reveal>
            <Reveal className="min-w-0">
              <h3 className="text-base font-semibold text-stone-900">All states, sorted by median net cost</h3>
              <div className="mt-4 max-h-[380px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white text-[0.68rem] uppercase tracking-wide text-stone-400">
                    <tr className="border-b border-stone-200">
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
                        className={cx(
                          'cursor-pointer border-b border-stone-100 transition-colors',
                          item.state === location ? 'bg-amber-50/50' : hovered === item.state ? 'bg-stone-100' : 'hover:bg-stone-50'
                        )}
                      >
                        <td className="py-2 pr-3 font-medium text-stone-900">
                          {item.stateName} <span className="text-stone-400">{item.state}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-stone-900">{formatCompactDollars(item.netCost)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-medium" style={{ color: shareColor(item.shareNetPositive) }}>
                          {formatPercent(item.shareNetPositive)}
                        </td>
                        <td className="py-2 pl-3 text-right font-mono tabular-nums text-stone-500">{formatCompactDollars(item.careCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-12">
        <p className="text-xs leading-relaxed text-stone-400">
          30 modeled states. DC funding is excluded (no DC epidemiologic output). Funding comparators are deterministic;
          care-cost intervals are computed after per-simulation cumulative costing. Internal review preview — figures are
          provisional.
        </p>
      </footer>
    </div>
  );
}
