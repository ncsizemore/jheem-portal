'use client';

import { useLayoutEffect } from 'react';

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

  return null;
}
