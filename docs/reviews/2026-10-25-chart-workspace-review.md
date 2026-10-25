# Chart workspace: design and engineering review

Reviewed October 25, 2026. Production: https://jheem.org/ryan-white/explorer, following PR #61.

## Judgment

The chart workspace has a useful foundation, but the previous reading-clarity pass was too narrow to count as a finished experience. It improved the default incidence view without establishing a consistent system for the other outcomes, comparisons, exports, or interactions.

The main design problem is hierarchy and coherence, rather than a shortage of visual styling. The page currently presents the machinery of analysis before it establishes the question, the meaning of the selected measure, and how to compare the results. Its controls, chart cards, scientific language, and export behavior feel assembled separately. More ornament, a new font, or more explanatory paragraphs would not resolve that.

There are also functional defects that should be addressed before considering this page finished. The appropriate next unit of work is a complete results-workspace pass, delivered in bounded stages with one shared specification.

## What was reviewed

- Production Baltimore charts: all 14 outcome selections; mean/median switching; cessation and brief-interruption scenarios; subgroup comparisons; chart and table views; display controls; location search; keyboard behavior; PNG and CSV actions.
- Desktop and 390 × 844 mobile layouts. Temporary viewport override was reset afterward.
- The complete published Baltimore payload: 954 plot combinations across three scenarios and two summaries. Structural inspection is not a fresh scientific audit of every value.
- Shared rendering, transformation, selection, loading, export, and browser-test code. Shared components also serve state explorers, custom simulations, and the older plot overlay. Those other workflows were traced in code, not all exercised live.
- Local R outcome definitions for terminology and denominator checks. These are useful primary implementation sources; their current checkout is not assumed to be the exact historical release source.

Evidence distinctions below: **observed** means reproduced in the production UI or downloaded artifact; **source** means established from implementation/data inspection; **judgment** means a design recommendation. The request race is a source finding, not a claim that an incorrect city result was observed in this session.

## Retain

- The immediate scenario-versus-baseline comparison, with both line style and color distinguishing the series.
- Uncertainty shown by default, with a plain-language explanation.
- A real data table and downloadable numerical results.
- The ability to investigate population groups and move between locations.
- The restrained institutional masthead and the separation of modeling tools from collaboration content.
- The shared component foundation. This does not call for a replacement charting framework or a new design identity.

## Findings that affect trust or functionality

### 1. An older location request can overwrite the current result — priority 1, source

`src/hooks/useCityData.ts:101` starts each request independently and commits its result without checking whether that request is still current. A slow request for A can complete after B and replace B's data. The location heading comes separately from the selected location in `src/components/AnalysisView.tsx:95`, so the page can pair B's heading with A's results. A late failure can also clear a newer successful result.

The cache-hit branch does not clear loading, and does not invalidate an earlier request. The 30-second timer is cleared after response headers, before body parsing, so it does not bound the whole operation.

**Required:** request identity plus cancellation, cleanup in all paths, an explicit loading/error/success state tied to model + location + release, validation of payload identity, and a retry action. A cached selection must supersede outstanding requests too. Test delayed success and failure in both orders and uncached-to-cached switching.

### 2. Published combined breakdowns cannot be selected — priority 1, observed + source

For incidence, selecting Sex disables Risk. The published data contains `sex+risk`. The UI sorts dimension names alphabetically and looks for `risk+sex`, which does not exist. The same problem affects combinations such as `age+sex+risk`.

Replaying the current selection-key algorithm against the Baltimore cessation payload leaves 4 of 16 incidence combinations unreachable. Similar failures occur for diagnosed prevalence, new diagnoses, suppression, and other outcomes. Awareness has an additional issue: some stored combination names have no valid sequence of single-toggle intermediate states. Furthermore, some awareness payloads do not actually contain all the dimensions suggested by their file key.

References: `src/hooks/useAnalysisState.ts:102`, `:132`, `:144`; `src/components/AnalysisView.tsx:62` also derives availability from the first scenario rather than the selected one.

**Required:** normalize dimension identities independently from storage-key order, resolve to the actual published key, and validate effective dimensions in the payload. Support choosing a valid combination directly rather than requiring a path through unavailable intermediates. Do not simply enable every file key without checking what its data contains.

### 3. PNG export fails on production — priority 1, observed

Clicking PNG produced no image and raised an error. The browser console reports: `Attempting to parse an unsupported color function "lab"`. The implementation uses html2canvas and copies computed colors without resolving its unsupported color formats (`src/utils/exportPng.ts:35`).

CSV did download successfully. The browser automation's download event did not return the file path, but the actual newly downloaded CSV was found and inspected. It contained the expected suppression values and bounds. This is not a CSV-download failure.

**Required:** a dependable figure export with a defined layout and compatible styling, an actionable inline error instead of a blocking alert, and an actual download test that validates the PNG signature, dimensions, and rendered content. Test the generated file, not merely the existence of the export button.

### 4. The figure and scenario description use different timing — priority 1, observed + source

The scenario description gives July 2025 for the service interruption and October 2025 for the modeled suppression change. The chart draws a single “Cessation Start” or “Brief Interruption Start” marker at the legacy integer 2025. It does not mark resumption or recovery for interruption scenarios.

References: `src/config/model-configs.ts:123`, `:129`, `:151`; `src/components/AnalysisView.tsx:257`; `src/components/NativeSimulationChart.tsx:289`.

**Required:** one scenario timeline contract for the prose, chart annotations, and exports. Show service interruption and resumption intelligibly, with recovery detail available when relevant. Annual model values must remain annual values: do not imply that the chart resolves a daily or monthly trajectory merely because an event has a precise date. Review the categorical x-axis before placing fractional-year reference marks.

### 5. Subgroup comparisons silently change scale — priority 1 for the comparison design, observed + source

The incidence race panels have upper ticks of roughly 787, 169, and 181 in the reviewed cessation view. Similar-looking shapes therefore represent substantially different counts. Independent scales can be useful for examining trends, but the interface does not identify the choice or offer a common-scale comparison.

`src/components/NativeSimulationChart.tsx:162` calculates a domain independently for every panel. `src/utils/transformPlotData.ts:277` also includes observations in that calculation even when they are hidden.

**Required:** common scales by default for comparisons of the same outcome and unit; an explicit “Separate scales” option for examining smaller groups; clear labels in both UI and export. Bounds and visible observations need a deliberate, consistent domain policy. Percentage axes should use sensible bounds without clipping unexpected data or silently forcing ratio measures into 0–100%.

### 6. Only one outcome is defined — priority 1 for completion, observed

All 14 outcomes render, but only incidence receives an outcome-specific explanation. The other 13 receive the generic simulation-summary and interval text. “Suppression,” “PrEP Uptake,” “Proportion Tested,” “ADAP,” “OAHS,” and “PWH” place too much interpretive work on the reader.

This is not solved by adding 13 ad hoc conditionals. Establish a model-aware outcome registry with a short label, definition, units, population/denominator, time basis, useful acronym expansion, and source reference. Use it in the selector, figure, table, tooltips, and export. Check every available outcome for coverage.

`src/components/analysis/AnalysisResults.tsx:103` currently special-cases incidence. The production payload carries display name, units, and percent flag, but omits the richer descriptions found in the R model source.

## Outcome content specification

These are proposed directions, not approved replacement labels. Source reconciliation is a bounded content task; it should not restart the wider historical simulation-provenance audit.

| Outcome key | Reader-facing direction | Definition or qualification needed |
| --- | --- | --- |
| `incidence` | New HIV infections | New infections each year; distinguish from new diagnoses. Preserve the technical term incidence in the explanation. |
| `new` | New HIV diagnoses | Newly diagnosed people each year; an infection may have occurred earlier. |
| `diagnosed.prevalence` | People living with diagnosed HIV | Total diagnosed population represented by the measure, not newly diagnosed people. Confirm the annual aggregation basis before calling it a year-end count. |
| `awareness` | HIV diagnosis awareness | Proportion of people with HIV who know their diagnosis. State the denominator and explain which population breakdowns are genuinely available. |
| `suppression` | Viral suppression | The local source defines the denominator as people with **diagnosed** HIV. Do not describe it as all people with HIV. Explain viral suppression briefly. |
| `testing` | HIV testing in the past year | Specify age range, eligible population, and time window. The local source uses an over-18 testing rate and an uninfected-population denominator while its description says general population. Reconcile that detail before publishing a definitive denominator. |
| `prep.uptake` | People prescribed PrEP | The local definition is people receiving a PrEP prescription in the past year, not a percentage or number of prescriptions. Expand pre-exposure prophylaxis in the explanation. |
| `rw.clients` | Ryan White clients | Explain what the modeled client count represents, especially after a cessation of funding. |
| `adap.clients` | ADAP clients | Expand AIDS Drug Assistance Program; apply the same post-interruption interpretation check. |
| `non.adap.clients` | Clients receiving other Ryan White services | The source describes receipt of non-ADAP services. Do not imply these people necessarily receive no ADAP services; categories can overlap. |
| `oahs.clients` | Outpatient care clients (OAHS) | Expand Outpatient Ambulatory Health Services and retain the specific program scope. |
| `adap.proportion` | ADAP participation — wording needs reconciliation | The current display label implies all Ryan White clients as denominator; the local model divides by `non.adap.clients`. Do not casually publish “percentage of all Ryan White clients.” |
| `adap.suppression` | Viral suppression among ADAP clients | State the denominator and expand the acronym nearby. |
| `oahs.suppression` | Viral suppression among outpatient care clients | State the OAHS denominator and program scope. |

Client counts in the published cessation scenario remain nonzero after services stop. For example, Baltimore's modeled Ryan White count is about 14,490 in 2030. This is not by itself evidence of a numerical error; it means a definition claiming that all those people are still *receiving funded services* needs source confirmation. Explain the modeled quantity accurately rather than extrapolating from a short legacy label.

Source locations: `jheem_analyses/applications/ryan_white/ryan_white_specification.R:204–330` and `jheem_analyses/applications/EHE/ehe_specification.R:1889–2116` in the local modeling checkout. These references are internal review evidence, not proposed public links to local files.

Organize the selector into a few meaningful groups—HIV outcomes, prevention/testing, and Ryan White service measures—with the broadly useful outcomes first. Keep all legitimate measures available. The goal is a shorter route to the right result, not an indiscriminate removal of technical detail.

## Design and interaction findings

### The reading order is inverted

On mobile, the masthead/navigation and controls occupy most of the first screen; the plot begins around 670 pixels down. In the single-chart view the explanation arrives beneath a 500-pixel plot. A reader sees “Proportion Tested” and an axis marked “%” long before learning what population and period are represented.

On desktop, a full-width control strip sits above a narrower chart card, creating a large expanse of utility UI. The outcome and summary selectors have equal visual weight, although one chooses the question and the other adjusts how simulations are summarized. Repeated headings concatenate outcome, long metropolitan name, scenario, and group, hiding the useful panel distinction at the end.

**Direction:** give the selected outcome and its concise definition the lead. Keep location and scenario close to that title; place summary, breakdown, and display choices in a quieter adjustment layer. Use one figure heading and shared legend, with concise group names on the small multiples. Use spacing, rules, and typographic hierarchy to connect the page to the institutional design; retain a practical sans-serif for controls and numerical labels. Do not add a marketing hero or decorative cards.

### Selections are too fragile

Changing mean to median resets the selected breakdown, reproduced live. Changing outcomes also clears it; changing locations resets scenario, outcome, summary, and breakdown. Prerun explorer state is not represented in the URL.

**Direction:** preserve compatible selections and explain any necessary fallback. Encode model/location/scenario/outcome/summary/breakdown in a validated URL, with refresh and browser back/forward support. A reader should be able to send a colleague the exact analysis they are viewing.

### Scientific changes should not morph between unrelated values

During incidence-to-suppression switching, the line briefly retained the old shape while the new percentage axes and uncertainty bands were already visible. It settled to the correct result. Summary lines use Recharts animation defaults, while bands explicitly disable animation.

**Direction:** replace data and axes atomically. Avoid shape interpolation across outcomes, locations, or incompatible scales; any subtle transition should preserve meaning and honor reduced motion. This does not imply that tasteful motion elsewhere on the site is undesirable.

### Group terminology needs the same care as outcome terminology

Incidence's “Sex” breakdown includes Female, Heterosexual Male, and MSM; suppression's includes Female and Male. “Risk” includes injection-drug-use categories, not a general risk score. “Race” includes Hispanic and Other. Raw composite labels are not individually formatted by the current formatter.

**Direction:** use outcome-specific dimension labels and definitions. Expand unfamiliar abbreviations, format each dimension value independently, identify the meaning of Other from source documentation, and avoid relabeling mixed model strata as a simple demographic variable.

### Accessibility is partly implemented

The semantic legend and accessible chart description from the last pass are useful. However, observed-data dots expose their source only on mouse hover; they have no focus/touch equivalent, and observations are absent from the table and CSV. The location search accepts typing and Escape, but Arrow Down does not navigate its listbox options, and selecting an option has no explicit focus restoration. Loading/error changes have no dedicated status announcement.

**Direction:** a proper searchable location control; accessible observation inspection with source links and a table alternative; announced loading/errors; clear keyboard focus; readable contrast for data-bearing lines and annotations. Perform keyboard and assistive-technology journeys, not only an ARIA attribute check.

### Table and export need one explicit contract

The table contains modeled values and intervals even when the corresponding chart layers are hidden. That can be a sensible design, but Display remains present in table mode without changing the table. The mobile table requires horizontal scrolling and loses the row's year context as the reader moves across it. The two interval columns have identical labels without grouped scenario headers.

PNG captures the current chart DOM: a faceted view initially shows only nine panels, while CSV includes all panels. That difference is not expressed by the export action. The current CSV has location/scenario/outcome/statistic/date metadata but lacks units, interval definition, model/release identity, and a link to the actual selection. It does not include observations. Individual-simulation mode is supported by the shared renderer, but its table and CSV paths read `panel.data`, which is empty for that mode; the reviewed MSA release exposes only mean and median, so this is a shared-component issue rather than an observed MSA failure.

**Direction:** clearly distinguish modeled results from observed data; define export scope; retain year/group context while scrolling; group scenario/baseline headers; include the measure, units, summary, interval meaning, scenario assumptions, release/source, and shareable URL in exports. Provide meaningful support or explicitly disable unsupported individual-simulation exports. Do not derive uncertainty for differences by subtracting marginal interval endpoints.

## Loading and performance

The public Baltimore response declares a gzip content length of **16,159,642 bytes** (about 15.4 MiB). The decoded JSON is **218,449,060 bytes** (about 208.3 MiB). This is not a claim of a 208 MB network transfer or a measured JS heap size. The browser eagerly parses the whole location bundle, and the module-level cache retains every location without eviction.

This is substantial for a mobile scientific tool and can amplify the request-race and responsiveness issues. Rendering all breakdown panels and thousands of table rows is another avoidable cost.

**Immediate:** correct request lifecycle, bounded cache, meaningful loading/retry states, and bounded rendering of panels/rows. Measure transfer, parse time, interaction responsiveness, and memory on realistic device/network conditions.

**Separate bounded infrastructure follow-up:** a small location manifest plus immutable, versioned outcome/scenario chunks, fetched as needed. Prefer precomputed static objects on the existing delivery stack; this does not require introducing a paid service. Validate numerical equivalence before changing packaging. Do not make full data repackaging a prerequisite for fixing export, copy, or chart comparison behavior.

## A coherent target page

1. **Context:** a compact location/scenario row with an intelligible scenario description and timeline detail.
2. **Question:** a clear outcome title, one short definition, and the unit/denominator/time basis. Outcome selection has primary weight.
3. **Figure:** a large, readable plot, a precise timeline, one shared legend, and useful value/interval inspection. Group panels have short headings and explicit scale behavior.
4. **Adjustments:** summary, population breakdowns, and chart display options remain readily accessible but secondary. Mobile has full-width primary selection and a compact disclosure for secondary controls, rather than a desktop toolbar squeezed into narrow columns.
5. **Evidence and reuse:** chart/data switch, trustworthy downloads, shareable analysis link, observed-data sources, and a concise model/source disclosure. Detailed methods belong in an expandable section or linked page.

The page should feel like a well-edited scientific figure with useful instruments around it. Its interest should come from the evidence and the ease of exploring it.

## Implementation sequence and completion criteria

### Stage 1 — establish the contracts and fix demonstrable defects

- Create shared, model-aware outcome and analysis-context definitions.
- Fix request ownership, cancellation, cache behavior, payload identity checks, and retry.
- Resolve facet keys independently of dimension order and inspect actual dimensional content.
- Repair PNG generation and add a real exported-file regression test.
- Remove misleading cross-outcome morphing; reconcile figure timeline with scenario metadata.

These changes can be tested independently, while remaining part of the same page specification.

### Stage 2 — implement the complete workspace presentation

- Restructure the reading hierarchy for both desktop and mobile.
- Complete all outcome definitions and group terminology, with a small explicit list of source questions resolved before final wording.
- Introduce consistent subgroup scales, shared context/legend, compact panel headings, and bounded panel navigation.
- Preserve selections; implement validated shareable URLs and history behavior.
- Bring table, observation inspection, keyboard interaction, and export scope into the same contract.

### Stage 3 — verify the whole experience and release

Use realistic release fixtures covering all 14 MSA outcomes, count and percentage measures, missing observations, all three scenarios, both summaries, and mixed facet availability. Include representative state/custom results because the renderer is shared. Tests should cover user-visible outcomes and numerical correspondence, not enforce incidental CSS dimensions.

Required checks:

- Reordering slow requests cannot mismatch location headings and values, including cache hits and errors.
- Valid dimensions remain selected across compatible changes; all supported combinations are reachable.
- Every outcome has accurate definition, units, denominator/time basis where applicable, and sensible labeling in every view.
- Chart, tooltip, table, and exported numeric values agree for the same selection and release.
- PNG opens correctly; CSV has usable metadata; export scope is explicit; figures remain understandable outside the website.
- Common versus separate scales are deliberate; event annotations agree with scenario text.
- Observed values and sources can be reached by keyboard and touch, with a table alternative.
- Small screens, long location names, keyboard navigation, zoom, and reduced motion work without clipped controls or lost context.
- Direct links, refresh, and back/forward restore the analysis.
- Measure realistic load/interaction costs; then pursue dataset chunking as its own bounded task if the current bundle remains the bottleneck.

After this, a short reader exercise can test remaining comprehension questions. It should validate a complete experience, not substitute for addressing defects already identified here.

## Evidence files and limits

- Mobile layout: `/Users/cristina/.codex/visualizations/2026/10/12/01a12fbd-96a0-75c3-981c-8b30afe134a9/chart-review-mobile.png`
- Subgroup comparison: `/Users/cristina/.codex/visualizations/2026/10/12/01a12fbd-96a0-75c3-981c-8b30afe134a9/chart-review-subgroups.png`
- Public data inspected: `https://d320iym4dtm9lj.cloudfront.net/ryan-white/C.12580.json`, generated March 2, 2026.

No production code, scientific results, or deployments were changed during this review. No new runtime tests were added or executed; the existing browser-test coverage was inspected, live interactions were exercised, a real CSV was inspected, and structural payload checks were run. Performance timings, full assistive-technology testing, other geography releases, and the request race still require targeted verification during implementation.
