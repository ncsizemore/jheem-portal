# First-chart rendering

## Change

The chart now draws each uncertainty band directly from its published lower and upper bounds. Previously each band required an invisible stacked area plus a visible area. This removes two graphical series per summary chart and their stacking work. Explicit year ticks bypass redundant numeric tick generation; the five vertical ticks fit the existing chart heights without collision measurement.

Closed result details and observation tables mount their content when first opened. Once opened, their content remains mounted and continues to update with its result. Fixed English model-time captions and facet labels no longer initialize locale formatters during startup. UTC month rounding and the user-visible labels remain the same.

No dependency, data-release, download-policy or infrastructure change is required. Production source maps remain disabled; they were temporarily enabled locally to attribute CPU samples.

## Controlled measurements

Measured November 4 using local production builds in fresh Chrome contexts, 1280 × 800. Every result request has a fixed 150 ms fixture delay; external services are blocked. Readiness is the frame after every visible panel has a model line and the result is no longer busy. The browser is reused across fresh contexts, so this is not a new browser-process measurement. Medians use five samples with 4× CPU throttling and three on the normal desktop CPU. Final comparisons have CPU sampling disabled.

| Baltimore result | Desktop before | Desktop after | 4× CPU before | 4× CPU after |
| --- | ---: | ---: | ---: | ---: |
| Default incidence | 332 ms | 310 ms | 1,237 ms | 1,097 ms |
| Suppression with observations | 508 ms | 471 ms | 1,473 ms | 1,314 ms |
| Incidence, six population panels | 604 ms | 539 ms | 1,900 ms | 1,596 ms |

The throttled medians improve about 11%, 11% and 16%. These are small controlled comparisons, not field percentiles, real-phone timings or a claim that all startup latency is resolved. React, module initialization and chart-library work remain substantial; data validation was a relatively small contributor in these profiles.

## Correctness and verification

The before/after geometry captures match exactly for all three examples: uncertainty-band paths, model-line paths, tick labels/coordinates, and observed-point labels/coordinates. A new browser regression independently uses the axes to check the rendered band against published lower/upper values and the first year of each series. Another checks that deferred details open with the correct generation date and observations, and that changing outcomes removes the previous observation table. UTC month rounding is covered at year boundaries.

The 63 unit/contract checks and 51 production browser checks pass, along with build, type checking and lint. Existing browser coverage includes all model families, outcomes, chart/table continuity, exports, mobile layouts, scientific identity failures, races and exact initial request counts. The new rendering/disclosure checks also run in the production CI gate.

No S3 writes, bucket inventories, invalidations, result republishing, simulations or emails were used. Profiling and comparisons use local fixtures. Default result entry still downloads exactly its existing index and selected plot.

## Reproduction

After `npm run build`:

```sh
CHART_REPORT_DIR=/tmp/chart-cpu4 npx playwright test --config=playwright.performance.config.ts first-chart
CHART_CPU=1 CHART_RUNS=3 CHART_REPORT_DIR=/tmp/chart-desktop npx playwright test --config=playwright.performance.config.ts first-chart
npx playwright test --config=playwright.production.config.ts
```

Set `PROFILE_CHART=1` to save a Chromium CPU profile for the first sample of each result type. For source attribution, enable Next's `productionBrowserSourceMaps` locally for that diagnostic build, then remove it before release. Profiled runs are diagnostic and should not be mixed into timing comparisons.
