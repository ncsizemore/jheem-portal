# Result switching and release-cost review

## Scope

Keep the small initial prerun download while removing avoidable loading flashes
and premature eviction during exploration. Add an offline cost preflight for
future data publications. No scientific data, release pins, storage objects,
infrastructure settings, or custom-simulation execution paths change.

## Implementation

- Read verified cache hits during rendering without mutating recency until the
  request effect commits. Results remain keyed by URL, hash and decoded size.
- Retain up to 64 plots under the existing 16 MiB decoded-payload budget, rather
  than evicting small summaries after six plots. This is not a measured JS heap
  limit; transformed/current results have additional working memory.
- Memoize index validation by payload, model and location.
- Reserve the previous chart/table height during an uncached load, with the
  status near the top. Hide stale values and disable exports until ready.
- Estimate additional PUTs and storage from local staged files and a saved
  inventory before publication. Document timestamp-safe uploads and limitations.
  UI deployments must not republish scientific artifacts.

## Background-loading decision

Measured the existing compressed staged artifacts for all 90 locations locally;
no CDN requests or uploads were needed for this comparison. Starting from the
default incidence view:

| Candidate | MSA | AJPH | CROI | CDC testing |
| --- | ---: | ---: | ---: | ---: |
| Other incidence scenarios: extra requests | 2 | 2 | 3 | 2 |
| Other incidence scenarios: median gzip bytes | 2,377 | 2,291 | 3,353.5 | 4,586 |
| All other whole-population mean results: requests | 41 | 41 | 55 | 23 |
| All other whole-population mean results: median gzip bytes | 54,716 | 50,398 | 66,955 | 50,566 |

These are payload/request counts, excluding HTTP overhead, not measured network
latencies or predictions of which results people will visit. Background loading
remains off: first-time selection still fetches one plot, and repeat exploration
now reuses more of what was actually viewed. Targeted loading of sibling scenarios
is a possible next experiment if first-time switching remains a material issue;
it would need request/byte limits, cancellation and data-saving behavior.

## Verification

- 57 non-browser regressions, type-check, lint, production build, pinned config
  verification and production dependency audit pass.
- Full 31-journey browser suite passed, followed by the new tall-table regression
  and focused desktop/mobile layout checks. The suite now contains 32 journeys.
- Revisiting all 14 outcomes produces no extra plot requests and no intermediate
  `aria-busy` transition, including flashes that disappear before an assertion.
- Delayed responses, retry, rapid selection/location changes, exports, state
  models and cached custom results retain their existing regression coverage.
- Desktop/mobile ready-state screenshots inspected. Tall-table loading checks
  measure the status text position, not only the containing paragraph's box.
- Fresh independent source review found one loading-status placement issue;
  corrected and covered by the tall-table test. No remaining blockers reported.
- The offline preflight against the four saved release inventories finds all
  104,394 objects already present with matching sizes: no new uploads/storage
  required for this UI release. Matching sizes do not certify remote integrity.

These are engineering and visual checks, not research with outside readers or a
full performance/heap benchmark. Account billing is checked separately; estimates
and alerts cannot guarantee a zero bill or enforce a hard spending cap.
