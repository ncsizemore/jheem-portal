'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import './explorer-atlas.css';

interface Props {
  id: string;
  eyebrow: string;
  title: string;
  description: ReactNode;
  calibrationHref?: string;
  children: ReactNode;
  legend: ReactNode;
  status?: string;
}

/** One reading column for the study, direct selection, and geographic key. */
export default function ExplorerMapPanel({
  id,
  eyebrow,
  title,
  description,
  calibrationHref,
  children,
  legend,
  status,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <aside
      className="atlas-panel"
      data-map-panel
      aria-label="Study and map guide"
    >
      <p className="atlas-eyebrow">{eyebrow}</p>
      <h1 className="atlas-title">{title}</h1>
      <p className="atlas-description">{description}</p>
      <div className="atlas-selector">{children}</div>
      {status && (
        <p className="atlas-status" role="status">
          {status}
        </p>
      )}
      <button
        className="atlas-guide-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
      >
        How to read the map{' '}
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      <div id={id} className={`atlas-guide ${expanded ? 'is-expanded' : ''}`}>
        <p className="atlas-mobile-description">{description}</p>
        {legend}
        {calibrationHref && (
          <Link href={calibrationHref} prefetch={false} className="atlas-calibration">
            See how this model fits observed data{' '}
            <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
