'use client';

import { useLayoutEffect } from 'react';
import styles from './FuturesIllustration.module.css';

// Starts the illustration's draw-in once it scrolls into view. On a full page load the
// inline script in FuturesIllustration does this before first paint (so the finished chart
// never flashes before animating); this covers client-side navigations, where React
// doesn't execute that script and the chart arrives still marked "static".
export default function FuturesAnimation({ targetId, threshold }: { targetId: string; threshold: number }) {
  useLayoutEffect(() => {
    const svg = document.getElementById(targetId);
    if (!svg || svg.getAttribute('data-anim') !== 'static') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    svg.setAttribute('data-anim', 'pending');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          svg.setAttribute('data-anim', 'run');
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(svg);

    return () => {
      observer.disconnect();
      // Don't leave the chart hidden if this effect is torn down before it ran.
      if (svg.getAttribute('data-anim') === 'pending') svg.setAttribute('data-anim', 'static');
    };
  }, [targetId, threshold]);

  const replay = () => {
    const svg = document.getElementById(targetId);
    if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    svg.setAttribute('data-anim', 'pending');
    // Flush the pending styles so the same CSS sequence restarts from the beginning.
    svg.getBoundingClientRect();
    svg.setAttribute('data-anim', 'run');
  };

  return (
    <div className={styles.replay}>
      <button type="button" onClick={replay} aria-controls={targetId} className="editorial-link inline-flex min-h-11 items-center gap-2 text-xs">
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M3 5a5.5 5.5 0 1 1-.5 5M3 1v4h4" />
        </svg>
        Replay illustration
      </button>
    </div>
  );
}
