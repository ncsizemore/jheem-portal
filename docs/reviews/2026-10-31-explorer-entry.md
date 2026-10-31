# Explorer entry performance and map refinement

## Changes

The static explorer HTML now hints the pinned location index and, only for an exact default selection, its existing plot. Requests can start before React hydration. These are fetch hints, not trusted data: the normal byte-size, hash and identity checks still run. Client-side navigation uses the existing loader. No other location or outcome is prefetched.

Map controls load independently of the mapping library. Coverage comes from model configuration, so slow or failed summaries cannot block location selection. State summaries and the map start concurrently. Missing city summaries use neutral markers, never invented suppression or population estimates. Summary errors are local to the map information, and state summary requests now time out and cancel on unmount.

The map uses Mapbox Light in a Mercator projection, fits continental study coverage around the control panel, and offers a reset. Instructions start collapsed on narrow screens. Shorter copy, quieter panels and numeric state-legend endpoints make the modeled information more prominent. CDC copy no longer describes Ryan White services or links to Ryan White calibration. Camera movements no longer update React state on every frame; map state still survives visits to the results view.

Boundary coordinates were rounded to three decimals and unused feature properties removed. All 52 features, 51,693 vertices, ring ordering and names remain; maximum coordinate change is 0.0005 degrees and no ring becomes degenerate. Local gzip size falls from 436,438 to 220,641 bytes. This changes cartographic precision, not model values.

Result changes retain chart instances for the same population breakdown. Derived panels use a WeakMap keyed by the verified plot, so eviction is not prevented by the transform cache. Observation tooltips reset when the plot or observation visibility changes, including a return to a cached plot. The complete scientific display continues to switch atomically.

## Controlled entry measurements

Local production builds, three fresh Chrome contexts per case, 1280 × 800 viewport. Result requests have a fixed 150 ms delay; summaries have a fixed 600 ms delay. All external requests are intercepted. CPU throttling is a diagnostic, not a representative mobile device or field measurement.

Readiness means a frame after a readable chart appears, or a usable location selector is present and unobscured. **Map numbers do not measure tile completion.** No claim about Mapbox service latency follows from this experiment.

| Entry | Desktop before | Desktop after | 4× CPU before | 4× CPU after |
| --- | ---: | ---: | ---: | ---: |
| Baltimore default plot | 422 ms | 339 ms | 1,174 ms | 1,196 ms |
| City location selection | 1,089 ms | 177 ms | 1,463 ms | 630 ms |
| State location selection | 1,087 ms | 194 ms | 1,533 ms | 667 ms |

Default data requests move from roughly 550 ms after navigation to roughly 85 ms in the throttled case. They are still exactly two requests. First-plot CPU work remains the limiting factor in that case; the small timing difference is not evidence of an improvement. A fully lazy chart import was tested and rejected because it delayed first-plot rendering.

A separate single-run interaction diagnostic found no SVG remount on whole-population outcome changes. Five cached switches took 31–42 ms on desktop and 148–191 ms at 4× CPU. Changing the population breakdown still mounts different panels. These small samples are diagnostic evidence, not an INP or percentile claim.

Reproduce after building:

```sh
ENTRY_REPORT=/tmp/entry.json npx playwright test --config=playwright.performance.config.ts explorer-entry
npx playwright test --config=playwright.production.config.ts results-workspace
```

## Verification and cost boundaries

Integration coverage includes all model families; no map-data requests on direct result links; exactly two initial result responses; no speculative default plot for nondefault links; hash/identity failures; races; retries; chart/table continuity; history; exports; retained map layout; navigation with indefinitely stalled summaries; and retained chart identity without stale observation tooltips. Unit checks cover entry hints for all four models. A held-JavaScript test proves both pinned data requests start before hydration and are reused afterward. The 62 unit/contract checks and 49 production browser checks pass, along with build, lint, pinned configuration verification and the production dependency audit. Desktop/mobile map rendering was also checked with real Mapbox assets and locally cached public summaries.

There is no result-data publication, S3 write, bucket inventory, CloudFront invalidation, new service, simulation launch or email. Two small public summaries were downloaded once for visual checks and reused locally. Mapbox remains the existing mapping provider. A zero AWS bill is not guaranteed by these UI changes, but normal result request counts and scientific release bindings are unchanged.

## Remaining priorities

First-plot rendering under CPU constraint remains the next performance target. Profile chart initialization before adding more data packaging or prefetching; the early data hints have already removed the initial request-start dependency. The previous offline common-result bundle experiment remains a candidate for uncached switching, not a proven first-render improvement.

The lighter Mapbox presentation preserves current geographic navigation with limited implementation risk. If tiles remain the dominant visible delay in production, compare a compact vector geographic selector against this version before replacing the renderer. Separate first usable selection, first geographic content, and completed tiles in that comparison.
