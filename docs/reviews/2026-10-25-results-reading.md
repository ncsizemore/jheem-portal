# Results reading and accessibility — 25 October 2026

This completes the bounded analytical-label and legend pass identified in the
October 23 visitor-journey review. The shared results components serve the
prerun city/state explorers and completed custom-simulation results. Model keys,
values, scenario definitions, timing, and export calculations are unchanged.

## Changes

- Present incidence as **New HIV infections**, retaining the technical term and
  annual meaning in the figure note. Other outcome metadata is preserved.
- Label the summaries **Average (mean)** and **Median**. A short note explains
  which summary is displayed and that shaded bands show the middle 95% of
  simulated estimates for each year. It updates with the selected statistic and
  interval visibility. A faceted grid gets one shared note; PNG exports include it.
- Replace the generated chart legend with a semantic text list and decorative
  line samples. Scenario, baseline, and observed-data labels follow the visible
  series, including individual-simulation mode. The inaccessible
  `[object Object] legend icon` labels are gone.
- Expand **95% CI** to **95% uncertainty interval** in Display and explain the
  intervals and units above the table. Hiding a chart layer does not discard
  values from the table.
- Use disclosure semantics for Display and restore focus to its trigger on
  Escape. Anchor the panel within the action row when it wraps on a phone.
- Explicitly set dark text on the white result selectors: the existing global
  dark-appearance media query previously made their inherited text nearly white.
  This is a contrast correction, not the introduction of a dark theme.

## Verification

- Browser regressions cover named legend text, decorative symbols, mean/median
  explanations, keyboard access and focus restoration, chart/table consistency,
  354px panel bounds, responsive scrolling, and at least 4.5:1 selector contrast
  with the OS dark-appearance preference active.
- All 12 browser journeys and 43 non-browser regressions passed. Lint and type
  checking passed. Production build/configuration checks are recorded with the PR.
- Manually inspected the chart, median selection, age panels, and display controls
  using the public Baltimore payload downloaded on October 25. The local browser
  timed out on direct CloudFront requests, so visual review used the unchanged
  payload through a temporary local route. The route and copied data were removed
  before the production build and are not release assets.

## Next

Keep the settled public-site identity. Use the short reader exercise in the
October 23 review to decide whether broader route names and entry instructions
need revision; this pass does not make a competing workflow/navigation redesign.
The all-metro provenance audit supports the current explicitly attributed portal
figure. Exact historical source reconciliation remains a separate follow-up.
