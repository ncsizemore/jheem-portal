// Schematic of how JHEEM projections are read: reported data the model learns from,
// diverging futures under different decisions, and uncertainty bands. Deliberately has no
// axis values so it can't be mistaken for (or screenshotted as) a real result.
//
// It draws itself in once when scrolled into view (see FuturesIllustration.module.css),
// in the order it should be read: the reported data point by point, the fitted past
// continuing into "no change", then a funding cut, then scaled-up prevention. The title,
// "Illustration, not real data" and axes are never animated, so a screenshot taken
// mid-animation still says what it is.

import type { CSSProperties } from 'react';
import FuturesAnimation from './FuturesAnimation';
import styles from './FuturesIllustration.module.css';

const PAST = '#002D72';
const FUNDING_CUT = '#B4532A';
const NO_CHANGE = '#6B7280';
const SCALE_UP = '#0F766E';

// Text sizes are in SVG units, which shrink with the drawing; phones get larger sizes so
// labels stay readable once scaled down.
const TITLE = 'text-[26px] sm:text-[19px]';
const LABEL = 'text-[25px] sm:text-[18px]';
const NOTE = 'text-[22px] sm:text-[16px]';

const OBSERVED: [number, number][] = [
  [18, 194],
  [47, 212],
  [76, 204],
  [105, 218],
  [134, 206],
  [163, 223],
  [192, 218],
];

// The fitted past and "no change" draw as one continuous stroke: the first eases in and
// ends at constant speed, the second starts at that speed and eases out.
const EASE_INTO_TODAY = 'cubic-bezier(0.5, 0, 0.7, 0.7)';
const EASE_FROM_TODAY = 'cubic-bezier(0.3, 0.3, 0.5, 1)';
const EASE_DRAW = 'cubic-bezier(0.45, 0, 0.25, 1)';

// Animation timeline in milliseconds (about 6.5s in total). Each range fades in as its
// line finishes, so it follows the line rather than leading it.
const DOT_STAGGER = 170;
const TIMELINE = {
  reportedLabel: { delay: 0, duration: 500 },
  pastLine: { delay: 1650, duration: 850, ease: EASE_INTO_TODAY },
  pastBand: { delay: 2150, duration: 700 },
  today: { delay: 2400, duration: 320 },
  noChange: { delay: 2500, duration: 850, ease: EASE_FROM_TODAY, handoff: 3350 },
  noChangeBand: { delay: 3000, duration: 700 },
  noChangeLabel: { delay: 3200, duration: 450 },
  fundingCut: { delay: 3750, duration: 1000, ease: EASE_DRAW },
  fundingCutBand: { delay: 4400, duration: 700 },
  fundingCutLabel: { delay: 4600, duration: 450 },
  scaleUp: { delay: 5150, duration: 1000, ease: EASE_DRAW },
  scaleUpBand: { delay: 5800, duration: 700 },
  scaleUpLabel: { delay: 6000, duration: 450 },
};

interface Step {
  delay: number;
  duration?: number;
  ease?: string;
  handoff?: number;
}

function timing({ delay, duration, ease, handoff }: Step): CSSProperties {
  return {
    '--delay': `${delay}ms`,
    ...(duration !== undefined && { '--duration': `${duration}ms` }),
    ...(ease && { '--ease': ease }),
    ...(handoff !== undefined && { '--handoff': `${handoff}ms` }),
  } as CSSProperties;
}

const SVG_ID = 'futures-illustration';
const START_THRESHOLD = 0.5;

// Runs as the page is parsed, before first paint: marks the chart "pending" (hidden) and
// starts it when it scrolls into view. Without this, a full page load would show the
// finished chart and then hide it to animate once React hydrates.
const START_SCRIPT = `(function(){var s=document.getElementById(${JSON.stringify(SVG_ID)});if(!s||!window.matchMedia||matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;s.setAttribute('data-anim','pending');var o=new IntersectionObserver(function(e){for(var i=0;i<e.length;i++){if(e[i].isIntersecting){s.setAttribute('data-anim','run');o.disconnect();return;}}},{threshold:${START_THRESHOLD}});o.observe(s);})();`;

export default function FuturesIllustration() {
  return (
    <>
      <svg
        id={SVG_ID}
        data-anim="static"
        // The start script changes data-anim before hydration.
        suppressHydrationWarning
        viewBox="0 0 600 400"
        role="img"
        aria-labelledby="futures-title futures-desc"
        className={`h-auto w-full font-sans ${styles.root}`}
      >
        <title id="futures-title">Illustration: three possible futures for new HIV infections</title>
        <desc id="futures-desc">
          Dots show past reported data that a model is fit to. From today, the projection splits into three
          futures: a funding cut, where new infections rise; no change, where they stay roughly level; and
          scaled-up prevention, where they fall. Shaded bands around each line widen over time to show the
          range of likely outcomes. Not real data.
        </desc>

        <text x="0" y="26" className={TITLE} fontWeight="500" fill="#374151">
          New HIV infections each year
        </text>
        <text x="0" y="58" className={NOTE} fontStyle="italic" fill="#6B7280">
          Illustration, not real data
        </text>

        <line x1="220" x2="220" y1="102" y2="360" stroke="#9CA3AF" strokeDasharray="4 5" />
        <text x="220" y="92" className={NOTE} fill="#4B5563" textAnchor="middle">
          Today
        </text>
        <line x1="8" x2="430" y1="360" y2="360" stroke="#D1D5DB" />
        <text x="114" y="390" className={NOTE} fill="#6B7280" textAnchor="middle">
          Past
        </text>
        <text x="325" y="390" className={NOTE} fill="#6B7280" textAnchor="middle">
          Future
        </text>

        {/* Bands sit beneath every line. */}
        <path
          d="M8,192 C80,196 150,210 220,216 L220,232 C150,226 80,212 8,208 Z"
          fill={PAST}
          fillOpacity="0.08"
          className={styles.fade}
          style={timing(TIMELINE.pastBand)}
        />
        <path
          d="M220,224 C284,224 357,224 430,222 L430,252 C357,243 284,232 220,224 Z"
          fill={NO_CHANGE}
          fillOpacity="0.13"
          className={styles.fade}
          style={timing(TIMELINE.noChangeBand)}
        />
        <path
          d="M220,224 C284,214 357,150 430,118 L430,170 C357,186 284,220 220,224 Z"
          fill={FUNDING_CUT}
          fillOpacity="0.13"
          className={styles.fade}
          style={timing(TIMELINE.fundingCutBand)}
        />
        <path
          d="M220,224 C284,231 357,272 430,290 L430,328 C357,302 284,242 220,224 Z"
          fill={SCALE_UP}
          fillOpacity="0.13"
          className={styles.fade}
          style={timing(TIMELINE.scaleUpBand)}
        />

        {/* 1. Reported data, one point at a time */}
        <text x="14" y="174" className={`${NOTE} ${styles.fade}`} style={timing(TIMELINE.reportedLabel)} fill="#6B7280">
          Reported data
        </text>

        {/* 2. The fitted past, continuing into "no change" */}
        <path
          d="M8,200 C80,204 150,218 220,224"
          pathLength={1}
          fill="none"
          stroke={PAST}
          strokeWidth="2.5"
          className={styles.draw}
          style={timing(TIMELINE.pastLine)}
        />
        {/* A dashed line can't be drawn in with a dash offset, so a solid copy draws in and
            then hands off to the dashed line. */}
        <path
          d="M220,224 C284,228 357,233 430,236"
          pathLength={1}
          fill="none"
          stroke={NO_CHANGE}
          strokeWidth="2.5"
          className={styles.noChangeDraw}
          style={timing(TIMELINE.noChange)}
          aria-hidden="true"
        />
        <path
          d="M220,224 C284,228 357,233 430,236"
          fill="none"
          stroke={NO_CHANGE}
          strokeWidth="2.5"
          strokeDasharray="7 5"
          className={styles.noChangeDashed}
          style={timing(TIMELINE.noChange)}
        />

        {/* 3. A funding cut, then 4. scaled-up prevention */}
        <path
          d="M220,224 C284,217 357,168 430,144"
          pathLength={1}
          fill="none"
          stroke={FUNDING_CUT}
          strokeWidth="2.5"
          className={styles.draw}
          style={timing(TIMELINE.fundingCut)}
        />
        <path
          d="M220,224 C284,236 357,286 430,308"
          pathLength={1}
          fill="none"
          stroke={SCALE_UP}
          strokeWidth="2.5"
          className={styles.draw}
          style={timing(TIMELINE.scaleUp)}
        />

        {OBSERVED.map(([cx, cy], i) => (
          <circle
            key={cx}
            cx={cx}
            cy={cy}
            r="4.5"
            fill={PAST}
            fillOpacity="0.55"
            className={styles.pop}
            style={timing({ delay: i * DOT_STAGGER })}
          />
        ))}
        <circle cx="220" cy="224" r="6" fill={PAST} className={styles.pop} style={timing(TIMELINE.today)} />

        <text
          x="442"
          y="243"
          className={`${LABEL} ${styles.fade}`}
          style={timing(TIMELINE.noChangeLabel)}
          fontWeight="500"
          fill={NO_CHANGE}
        >
          No change
        </text>
        <text
          x="442"
          y="151"
          className={`${LABEL} ${styles.fade}`}
          style={timing(TIMELINE.fundingCutLabel)}
          fontWeight="500"
          fill={FUNDING_CUT}
        >
          Funding cut
        </text>
        <text x="442" y="304" className={`${LABEL} ${styles.fade}`} style={timing(TIMELINE.scaleUpLabel)} fontWeight="500" fill={SCALE_UP}>
          Scaled-up
        </text>
        <text x="442" y="330" className={`${LABEL} ${styles.fade}`} style={timing(TIMELINE.scaleUpLabel)} fontWeight="500" fill={SCALE_UP}>
          prevention
        </text>
      </svg>
      <script dangerouslySetInnerHTML={{ __html: START_SCRIPT }} />
      <FuturesAnimation targetId={SVG_ID} threshold={START_THRESHOLD} />
    </>
  );
}
