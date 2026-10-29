# Continuous results and direct-entry performance

## Outcome

Uncached plot changes retain the last complete scientific display until the requested replacement is verified. Figure/table, labels, definition, units, timeline and source context switch together. Requested controls remain separate; a visible caption identifies the displayed outcome/location/scenario even on mobile. Exports/share are blocked during pending or failed requests. Failed replacements preserve the old result and offer retry. Fast changes do not flash a loading message; updates lasting more than 150 ms show a short status in a reserved line.

Direct result routes avoid the initial map render, map summary/geometry fetches, Mapbox JavaScript and result-entry opacity transitions. Maps load on explicit use and retain their controls, geometry and viewport when the user returns. Hidden maps keep their layout box and are inert, so resizing during analysis does not break the map canvas.

Default plots start alongside their pinned location index using an offline-generated reference table. These are existing content-addressed files, not new data. Entries require an exact default selection and matching index hash. Other links use the index to resolve their selected plot. Data is displayed only after the existing hash, size and identity checks pass.

## Controlled production-build comparison

Baseline: main commit `bc8d334a13af9d4eb8046682116cedd914a11322` (PR 66). Local Chrome, five fresh browser contexts per build, the same Baltimore default URL, fixtures, and 150 ms delay per result-artifact request. All external HTTPS is intercepted; no AWS or Mapbox requests. `next start` serves each production build. Readiness means the selected chart region reports ready and a visible SVG exists; it is not a paint-completion, mobile-device or field-user measurement.

| Metric | Before | After |
| --- | ---: | ---: |
| Ready-time samples (ms) | 1187, 657, 633, 1104, 605 | 450, 417, 402, 406, 406 |
| Median ready time | 657 ms | 406 ms |
| Startup JavaScript encoded body bytes | 748,756 | 299,348 |
| Index → plot request-start gap | 180–205 ms | 0–1 ms |
| Normal default result requests | 2 | 2 |

The median improved by 38% in this controlled run, and startup JavaScript fell by 60%. These small local samples establish the removal of unnecessary work and a request dependency, not a universal speed guarantee. Fresh nondefault links still need the index first. Cached selections are separately covered by a fourteen-outcome browser regression requiring no repeat result requests or busy state.

Reproduce after `npm run build`:

```sh
npx playwright test --config=playwright.performance.config.ts
```

The optional `PERF_REPORT` environment variable changes the JSON output path; otherwise the report is written under Playwright's test output directory. The benchmark does not run in the normal browser suite.

## Validation and independent review

- Unit/contract suite: 58 tests, including every default entry's release pin and default selection, mismatched-pin/nondefault fallback, and fixture-index equality.
- Browser coverage: continuous chart/table at desktop/mobile widths; old-response races; outcome, scenario and location transitions; failed plot/index retry; CSV/PNG; URL/history; cache reuse; all four prerun families; lookup-only custom results; map return with preserved controls and resized canvas.
- A held-index test confirms the default plot starts concurrently but cannot display before index verification. Nondefault links must issue no speculative default request. Direct result links must issue no map-data requests.
- Independent source review checked atomic context, request races, export guards, release pins and cost boundaries. It prompted the visible mobile outcome caption and preservation of map state/layout across returns.
- Production build, TypeScript, lint, pinned model-config verification and production dependency audit pass.

## Cost and scope

No scientific values, release bindings or S3 artifacts change. No data upload, bucket inventory, CloudFront invalidation, Cost Explorer query, predictive outcome prefetch, email or simulation launch is part of this change. The new small reference table ships with the existing static portal bundle. Normal initial results still use two existing data requests; on a failed index, the concurrently requested default plot may already have arrived and is withheld from display.

Existing S3 storage and request charges remain governed by the separate data-release cost review and budget alerts. This change avoids new data storage or bulk publication charges; it is not a guarantee of a universally zero AWS bill.
