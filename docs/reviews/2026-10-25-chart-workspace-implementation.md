# Chart workspace implementation

Implements the focused page specification in `2026-10-25-chart-workspace-review.md`.

## Completed

- Outcome-led presentation, restrained navy/gray/rust figure palette, grouped outcome selector, concise definitions for all 14 MSA outcomes, and a compact mobile layout. Secondary choices live under Adjust analysis.
- Selection state is validated against the current scenario and encoded in the URL. Compatible breakdowns survive summary/outcome/location changes; unavailable breakdowns receive an explicit fallback notice. Refresh and history restore the analysis.
- Breakdown resolution is independent of storage-key order. Payloads whose advertised dimensions are missing from their rows are excluded from the selector. A direct combination selector avoids inaccessible intermediate combinations.
- Requests cancel/supersede older loads, verify location identity, isolate model data URLs, and retain only the last location for five minutes. Loading/errors are announced and retryable.
- Numeric time axis with sensible year ticks. Service stop/resumption markers and figure/export prose use the same scenario metadata. Annual summaries remain unchanged; cross-outcome line morphing is disabled.
- Shared vertical scales by default, explicit separate-scale option, short panel headings, six-panel pagination, and one shared legend. Hidden observations no longer influence chart scale.
- PNG is composed from chart SVG with outcome/context/timeline/source information and explicit panel scope. Uses the existing image CSP without widening it. CSV includes all groups, bounds, units, release generation time, source URL, and observed values/sources. Individual simulation CSV/table rows are supported.
- Accessible observed-value inspection and a paginated source table. Results tables retain year context while horizontally scrolling, identify each scenario's interval columns, and render at most 50 rows per page. Location search supports arrow/Enter/Escape navigation and focus restoration.
- Shared state and cached custom-simulation consumers exercised alongside the MSA explorer. No custom compute is launched by result inspection.

## Definition decisions

The source definitions used were the local `jheem_analyses/applications/EHE/ehe_specification.R` and `applications/ryan_white/ryan_white_specification.R`, plus the rate-to-proportion implementation in `jheem2/R/SPECIFICATION_model_specification.R`.

Suppression explicitly refers to diagnosed HIV. PrEP uptake is a count of people prescribed PrEP in the past year. Testing describes annual adult testing; the detail identifies the adult population without HIV used for weighting when model testing rates are converted to proportions. ADAP participation names its non-ADAP-service client denominator, rather than implying all Ryan White clients. Client-count notes explain that modeled client populations after interruption do not imply continued funded service delivery. No outcome values, posterior summaries, or release artifacts were changed.

## Verification

- Production build, lint, typecheck, pinned configuration verification, and production dependency audit.
- Existing non-browser suite plus three result regressions: all released outcomes retain their original point estimates/bounds; facet aliases/malformed dimensional payloads; CSV observations, quoting, and individual simulations.
- Nineteen browser journeys, including all outcomes, URL/history, subgroup scales/pagination, actual PNG/CSV downloads, keyboard/mobile, late requests/cache hits, location-identity rejection/retry, CROI state timelines, and cached custom results.
- Desktop/mobile visual inspection and inspection of an actual downloaded PNG. Temporary local preview route and framework-generated AGENTS file removed before the production build.

## Deliberate follow-up

The existing large per-location payload is still fetched and parsed. Request safety, a bounded cache, and bounded rendering mitigate immediate issues; immutable outcome/scenario chunks remain a separate data-delivery task requiring numerical equivalence checks. This implementation does not claim a completed network/heap performance benchmark or full assistive-technology certification.

The shared definitions cover the known current outcome contract. A future model with a different meaning for the same storage key must supply an explicit definition override rather than silently reusing these descriptions.
