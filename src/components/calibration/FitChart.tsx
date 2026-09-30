'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatValue, observationSource, type Observation, type Posterior } from '@/utils/calibration';

export default function FitChart({ posterior, observations, unit, label }: {
  posterior: Posterior[]; observations: Observation[]; unit: string; label: string;
}) {
  const id = useId();
  const container = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(280, entries[0].contentRect.width)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [posterior.length, observations.length]);
  if (!posterior.length || !observations.length) return <p className="p-8 text-slate-600">No overlapping model and observed data are available for this selection.</p>;
  const years = [...posterior, ...observations].map(p => p.year);
  const start = Math.min(...years), end = Math.max(...years);
  const low = Math.min(0, ...posterior.map(p => p.q025), ...observations.map(p => p.value));
  const high = Math.max(1e-6, ...posterior.map(p => p.q975), ...observations.map(p => p.value)) * 1.08;
  const right = width - 24;
  const x = (year: number) => start === end ? (78 + right) / 2 : 78 + (year - start) / (end - start) * (right - 78);
  const y = (value: number) => 256 - (value - low) / (high - low) * 224;
  const line = (key: 'q025' | 'q250' | 'q500' | 'q750' | 'q975') => posterior.map(p => `${x(p.year)},${y(p[key])}`).join(' ');
  const ribbon = (lower: 'q025' | 'q250', upper: 'q750' | 'q975') => `${line(upper)} ${[...posterior].reverse().map(p => `${x(p.year)},${y(p[lower])}`).join(' ')}`;
  const tickCount = width < 480 ? 2 : 5;
  const ticks = [...new Set([start, ...Array.from({length: tickCount-1}, (_,i) => Math.round(start + (end-start)*(i+1)/tickCount)), end])];
  const sources = [...new Set(observations.map(observationSource))].sort();
  return <figure ref={container}>
    <svg viewBox={`0 0 ${width} 300`} className="w-full" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{label}: model fit and observed data</title>
      <desc id={`${id}-description`}>Median model estimates, 50% and 95% posterior intervals, and observed points from {start} to {end}. Exact displayed values are available in the data table below.</desc>
      {[0,1,2,3,4].map(i => {
        const value = low + (high-low)*i/4;
        return <g key={i}><line x1="78" x2={right} y1={y(value)} y2={y(value)} stroke="#e2e8f0"/><text x="68" y={y(value)+4} textAnchor="end" fontSize="11" fill="#475569">{formatValue(value, unit)}</text></g>;
      })}
      <polygon points={ribbon('q025','q975')} fill="#d7e6f5"/>
      <polygon points={ribbon('q250','q750')} fill="#8db3d9"/>
      <polyline points={line('q500')} fill="none" stroke="#123d70" strokeWidth="2.5"/>
      {posterior.length === 1 && <g aria-label="Single-year model estimate and intervals">
        <line x1={x(posterior[0].year)} x2={x(posterior[0].year)} y1={y(posterior[0].q025)} y2={y(posterior[0].q975)} stroke="#d7e6f5" strokeWidth="14"/>
        <line x1={x(posterior[0].year)} x2={x(posterior[0].year)} y1={y(posterior[0].q250)} y2={y(posterior[0].q750)} stroke="#8db3d9" strokeWidth="8"/>
        <line x1={x(posterior[0].year)-8} x2={x(posterior[0].year)+8} y1={y(posterior[0].q500)} y2={y(posterior[0].q500)} stroke="#123d70" strokeWidth="2.5"/>
      </g>}
      {observations.map((p,i) => {
        const shape = sources.indexOf(observationSource(p)) % 3;
        return <g key={i} fill="white" stroke="#9a4b13" strokeWidth="2"><title>{p.year} · {p.stratum.location ?? 'Observed'} · {observationSource(p)}: {formatValue(p.value,unit)}</title>
          {shape === 0 ? <circle cx={x(p.year)} cy={y(p.value)} r="4"/> : shape === 1 ? <rect x={x(p.year)-3.5} y={y(p.value)-3.5} width="7" height="7"/> : <polygon points={`${x(p.year)},${y(p.value)-4.5} ${x(p.year)-4.5},${y(p.value)+3.5} ${x(p.year)+4.5},${y(p.value)+3.5}`}/>}
        </g>;
      })}
      {ticks.map(year => <text key={year} x={x(year)} y="280" textAnchor="middle" fontSize="12" fill="#475569">{year}</text>)}
    </svg>
    <figcaption className="flex flex-wrap gap-x-5 gap-y-2 px-2 text-xs text-slate-600">
      <span>━ Model median</span><span><span className="inline-block h-2.5 w-3 bg-[#8db3d9]"/> 50% interval</span><span><span className="inline-block h-2.5 w-3 bg-[#d7e6f5]"/> 95% interval</span>{sources.map((source,i) => <span key={source} className="text-[#9a4b13]">{['○','□','△'][i%3]} {source}</span>)}
    </figcaption>
    <details className="mt-5 border-t border-slate-200 pt-4">
      <summary className="cursor-pointer text-sm font-medium text-hopkins-blue">View data table</summary>
      <div className="mt-3 max-h-80 overflow-auto" tabIndex={0} aria-label="Scrollable calibration data">
        <table className="w-full text-left text-xs tabular-nums">
          <caption className="py-2 text-left">Model summaries and each observed point. Values are rounded for display; the source JSON retains full precision.</caption>
          <thead><tr>{['Year','Series / geography','Median / value','50% interval','95% interval'].map(h => <th key={h} className="p-2 border-b font-medium">{h}</th>)}</tr></thead>
          <tbody>{posterior.map((p,i) => <tr key={`p${i}`}><td className="p-2">{p.year}</td><td className="p-2">Model</td><td className="p-2">{formatValue(p.q500,unit)}</td><td className="p-2">{formatValue(p.q250,unit)}–{formatValue(p.q750,unit)}</td><td className="p-2">{formatValue(p.q025,unit)}–{formatValue(p.q975,unit)}</td></tr>)}
          {observations.map((p,i) => <tr key={`o${i}`} className="bg-amber-50/60"><td className="p-2">{p.year}</td><td className="p-2">{observationSource(p)} · {p.stratum.location}</td><td className="p-2">{formatValue(p.value,unit)}</td><td className="p-2">—</td><td className="p-2">—</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </figure>;
}
