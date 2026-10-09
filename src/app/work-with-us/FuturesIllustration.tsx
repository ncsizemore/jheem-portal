// Schematic of how JHEEM projections are read: reported data the model learns from,
// diverging futures under different decisions, and uncertainty bands. Deliberately has no
// axis values so it can't be mistaken for (or screenshotted as) a real result.

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

export default function FuturesIllustration() {
  return (
    <svg viewBox="0 0 600 400" role="img" aria-labelledby="futures-title futures-desc" className="h-auto w-full font-sans">
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

      <path d="M8,192 C80,196 150,210 220,216 L220,232 C150,226 80,212 8,208 Z" fill={PAST} fillOpacity="0.08" />
      <path d="M8,200 C80,204 150,218 220,224" fill="none" stroke={PAST} strokeWidth="2.5" />
      {OBSERVED.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="4.5" fill={PAST} fillOpacity="0.55" />
      ))}
      <text x="14" y="174" className={NOTE} fill="#6B7280">
        Reported data
      </text>

      <path
        d="M220,224 C284,214 357,150 430,118 L430,170 C357,186 284,220 220,224 Z"
        fill={FUNDING_CUT}
        fillOpacity="0.13"
      />
      <path
        d="M220,224 C284,224 357,224 430,222 L430,252 C357,243 284,232 220,224 Z"
        fill={NO_CHANGE}
        fillOpacity="0.13"
      />
      <path
        d="M220,224 C284,231 357,272 430,290 L430,328 C357,302 284,242 220,224 Z"
        fill={SCALE_UP}
        fillOpacity="0.13"
      />
      <path d="M220,224 C284,217 357,168 430,144" fill="none" stroke={FUNDING_CUT} strokeWidth="2.5" />
      <path
        d="M220,224 C284,228 357,233 430,236"
        fill="none"
        stroke={NO_CHANGE}
        strokeWidth="2.5"
        strokeDasharray="7 5"
      />
      <path d="M220,224 C284,236 357,286 430,308" fill="none" stroke={SCALE_UP} strokeWidth="2.5" />
      <circle cx="220" cy="224" r="6" fill={PAST} />

      <text x="442" y="151" className={LABEL} fontWeight="500" fill={FUNDING_CUT}>
        Funding cut
      </text>
      <text x="442" y="243" className={LABEL} fontWeight="500" fill={NO_CHANGE}>
        No change
      </text>
      <text x="442" y="304" className={LABEL} fontWeight="500" fill={SCALE_UP}>
        Scaled-up
      </text>
      <text x="442" y="330" className={LABEL} fontWeight="500" fill={SCALE_UP}>
        prevention
      </text>
    </svg>
  );
}

// Legend keys shown under the illustration.

const KEY_CLASS = 'h-6 w-11 flex-shrink-0';

export function DotsKey() {
  return (
    <svg viewBox="0 0 44 24" className={KEY_CLASS} aria-hidden="true">
      <path d="M2,10 C14,11 30,14 42,15" fill="none" stroke={PAST} strokeWidth="1.5" />
      {[
        [6, 6],
        [16, 15],
        [26, 9],
        [36, 18],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="2.5" fill={PAST} fillOpacity="0.6" />
      ))}
    </svg>
  );
}

export function FuturesKey() {
  return (
    <svg viewBox="0 0 44 24" className={KEY_CLASS} aria-hidden="true">
      <path d="M2,12 C16,11 28,5 42,2" fill="none" stroke={FUNDING_CUT} strokeWidth="1.75" />
      <path d="M2,12 C16,12 28,13 42,13" fill="none" stroke={NO_CHANGE} strokeWidth="1.75" strokeDasharray="3 2.5" />
      <path d="M2,12 C16,13 28,19 42,22" fill="none" stroke={SCALE_UP} strokeWidth="1.75" />
      <circle cx="2.5" cy="12" r="2" fill={PAST} />
    </svg>
  );
}

export function RangeKey() {
  return (
    <svg viewBox="0 0 44 24" className={KEY_CLASS} aria-hidden="true">
      <path d="M2,12 C16,9 28,4 42,2 L42,20 C28,18 16,15 2,12 Z" fill={SCALE_UP} fillOpacity="0.16" />
      <path d="M2,12 C16,12 28,11 42,11" fill="none" stroke={SCALE_UP} strokeWidth="1.75" />
    </svg>
  );
}
