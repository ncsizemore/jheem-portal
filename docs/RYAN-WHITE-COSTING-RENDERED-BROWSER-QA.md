# Ryan White ADAP Costing: Rendered Browser QA

**Status:** Required pre-share gate; first rendered run completed, final gate still open

**Route:** `/ryan-white-costing`

**Local target:** `http://localhost:3000/ryan-white-costing`

## Purpose

This is the repeatable rendered-browser acceptance pass for the costing application. A successful production build and valid data contract are necessary but not sufficient: this gate checks actual layout, chart rendering, responsive behavior, linked interactions, URL state, and agreement among displayed values.

The application is not ready to share with Ryan until all blocking checks below pass and the evidence table records the tested build.

## Test Environment

Run the current working tree locally on an available port:

```text
npm run dev
```

Use the supported in-app Browser so screenshots and interaction evidence remain attached to the review session.

Use `localhost`, not `127.0.0.1`, for this QA surface. In the first in-app Browser run, the page shell loaded at the `127.0.0.1` address but the annual-series JSON request was blocked, leaving the time-series controls and charts in their loading state. The same build loaded completely at `localhost` with no application console errors.

### Required viewports

| View | Width | Height | Purpose |
| --- | ---: | ---: | --- |
| Desktop | 1440 | 1000 or taller | Primary editorial and chart review |
| Tablet | 834 | 1112 | Intermediate wrapping and two-column behavior |
| Mobile | 390 | 844 | Stacking, horizontal overflow, touch-target, and chart-label review |

Take a full-page screenshot at desktop and mobile widths after the default-state checks pass. If the browser backend tiles fixed or sticky elements across a full-page capture, use a complete set of anchor-aligned viewport captures instead. Take focused screenshots for any defect or material alternative being discussed.

## Blocking Acceptance Checks

### A. Initial render and orientation

- [ ] Route loads without console errors, failed requests, hydration warnings, or blank chart regions after data settles.
- [ ] The page identifies the analysis as a complete-elimination stress test covering 30 states plus DC.
- [ ] The default result is clearly labeled as the median ART-price scenario rather than a pooled paper estimate.
- [ ] Net cost, downstream care cost, ADAP spending avoided, NCER, and care cost per dollar are visually distinguishable.
- [ ] The health-pathway/accounting detail is collapsed initially and opens without layout shift or clipping.
- [ ] The page has no document-level horizontal overflow at any required viewport.

### B. Arithmetic and labeling invariants

For the default 2035 view, confirm displayed rounded values remain consistent with the underlying exact values:

- [ ] `net cost = downstream care cost - ADAP spending avoided`.
- [ ] `NCER = net cost / ADAP spending avoided`.
- [ ] `care cost per $1 avoided = NCER + 1`.
- [ ] Excess infections and excess diagnoses are distinct and correctly labeled.
- [ ] The jurisdiction table leads with excess diagnoses and ART person-years, matching the costing cohort.
- [ ] “Modeled-jurisdiction total” is never presented as a complete US estimate.

### C. Budget-window behavior

- [ ] Move the budget window to 2026, 2030, and 2035.
- [ ] The opening ledger and selected-window markers update at each position.
- [ ] Jurisdiction, context, and price-sensitivity sections remain explicitly fixed to 2035.
- [ ] The sticky window/scenario echo appears below the global navigation without obscuring content.
- [ ] “Full horizon” returns to 2035.
- [ ] The URL `through` parameter is added, updated without history spam, and removed at the default.

### D. Scenario behavior

- [ ] Select low, median, and high ART-price tiers from both the sticky control and sensitivity section.
- [ ] The hero, both trajectories, jurisdiction comparison, selected-jurisdiction card, and context panels all update to the selected tier.
- [ ] The sensitivity section itself stays at 2035.
- [ ] The equal-weight pooled row cannot be selected as a fourth price scenario.
- [ ] The URL `scenario` parameter round-trips on reload and disappears at the default.

### E. Trajectory section

- [ ] Florida and modeled-jurisdiction panels are simultaneously visible on desktop and stack cleanly on mobile.
- [ ] Each panel uses the same selected price tier and labels its independent y-axis clearly enough to avoid false visual comparison.
- [ ] Care-cost interval bands, median care lines, ADAP comparator lines, hover tooltips, crossover annotations, and selected-window markers are legible.
- [ ] Tooltip values agree with the selected year and do not overflow chart/card boundaries.
- [ ] The optional all-jurisdiction crossover detail is collapsed initially, opens correctly, and is clearly secondary.

### F. Jurisdiction variation

- [ ] The interval plot includes all 31 jurisdictions and clearly marks NCER zero.
- [ ] Interval marks and medians remain legible at desktop; the internal horizontal scroller works on mobile without causing page overflow.
- [ ] Select Florida, Tennessee, DC, and New York to exercise high, low, negative, and near-zero results.
- [ ] Selection updates the result card, baseline-context card, context-panel highlights, and URL `state` parameter.
- [ ] North Carolina is labeled as Medicaid expansion in the application.
- [ ] The exact table opens, sorts by every column, retains correct row values, and supports keyboard row selection.
- [ ] The 2035 sign-share column is not presented as responding to the budget-window control.

### G. Jurisdiction context small multiples

- [ ] All four manuscript variables are visible together: transmission rate, ADAP spending per client, suppressed PWH on ADAP, and diagnosed-HIV-weighted urbanicity.
- [ ] Each panel reports Spearman rho, `n = 31`, selected price tier, and 2035 endpoint.
- [ ] Point sizes, expansion-status encoding, labels, zero line, and axes remain distinguishable.
- [ ] Linked hover/selection works across all four panels and agrees with the jurisdiction detail cards.
- [ ] Panels form a balanced 2 x 2 desktop layout and a readable one-column mobile stack.
- [ ] No copy implies a causal or adjusted association.

### H. Price sensitivity

- [ ] Low, median, and high rows display comparable net-cost intervals and care-per-dollar values.
- [ ] The selected tier is visually unambiguous and keyboard-selectable.
- [ ] The pooled row is labeled as an equal-weight reporting convention, not a probability-weighted fourth scenario.
- [ ] The zero reference and net-offset/net-cost color treatment remain readable without relying only on color.

### I. Methods, provenance, and scope

- [ ] The 65% mean suppression decline and 40%-90% IQR are visible without opening technical provenance.
- [ ] Immediate ART and delayed engagement are described in plain language.
- [ ] Included/excluded costs and the modified healthcare-system perspective are easy to locate.
- [ ] Technical provenance is collapsed initially; opening it does not create overflow from filenames or hashes.
- [ ] Footer scope and endpoint conventions agree with the visible behavior.

### J. Accessibility and interaction

- [ ] Tab order follows the visual reading order.
- [ ] Range controls, scenario buttons, disclosure summaries, plot/table selections, and linked points have visible focus.
- [ ] Enter/Space activates table rows and interactive plot points where supported.
- [ ] Every interactive element has a meaningful accessible name and pressed/expanded state.
- [ ] The page remains usable with reduced motion enabled.
- [ ] Text and important marks have adequate contrast; Medicaid and sign encodings have a non-color cue or accompanying text.

## Nonblocking Editorial Review

Record these separately from functional defects so the collaborative section-by-section review can evaluate alternatives without conflating preference with failure:

- opening hierarchy and density;
- whether the budget-window control belongs in the primary path;
- whether the crossover detail should remain at all;
- interval-plot versus boxplot treatment for jurisdiction NCER;
- label density and annotation strategy in the four context panels;
- relative visual weight of price sensitivity and methods;
- desktop/mobile rhythm, whitespace, and card repetition.

## First Rendered Run — 2026-07-14

### Verified

- The annual data settle and all nine SVG charts render at the `localhost` target without application console errors.
- The page has no document-level horizontal overflow at 1440 × 1000, 834 × 1112, or 390 × 844.
- The opening hierarchy, accounting card, collapsed health pathway, and expanded pathway render without clipping at all three widths.
- Florida and modeled-jurisdiction trajectories form two desktop columns and a clean mobile stack. The Florida 2035 tooltip reports $2.9B care cost and $752M ADAP avoided, matching the jurisdiction card and table.
- The jurisdiction plot contains 31 selectable jurisdictions and a visible zero reference. Its mobile horizontal scroll remains inside the card.
- Florida, Tennessee, DC, and New York selections update the jurisdiction cards and the `state` URL parameter.
- The exact table contains 31 rows, sorts by every sortable numeric column, and supports Enter-key row selection.
- All four manuscript context variables render as a 2 × 2 desktop grid and one-column mobile stack. Selection propagates from a context point to the page state.
- Low, median, and high selections work from both the fixed control and sensitivity rows; selected values propagate to the jurisdiction results and the `scenario` URL parameter. Returning to median removes the default query parameter.
- Direct `through=2030` navigation round-trips correctly and updates both window controls and the opening result while the comparison sections remain labeled as 2035 endpoints.
- Methods expose the 65% suppression decline, 40%–90% IQR, engagement timing, costing frame, exclusions, and modified healthcare-system perspective without opening technical provenance.

### Defects found and corrected in the working tree

- The opening headline previously continued to say “median projection” after low or high price selection. It now names the selected drug-cost scenario.
- Several adjacent JSX text nodes produced missing accessible spaces, including `31jurisdictions`, `costassumption`, `%net-costly`, and `Medianheadline`.
- Context headings lowercased scientific acronyms such as ADAP, PWH, and HIV.
- Selected context-chart points had a visual outline but did not expose `aria-pressed`.

### Still open before the gate can pass

- Recheck the native budget slider by manual drag/keyboard input. The in-app automation could verify URL hydration but did not dispatch a state-changing event through the range control.
- Complete a systematic keyboard tab-order and visible-focus pass across every interactive chart point and disclosure.
- Run a focused contrast audit, especially for the small slate-gray labels and inactive price-sensitivity rows.
- Retake the final desktop/mobile evidence after the collaborative section-by-section editorial pass, because that pass is expected to change layout and emphasis.

## Evidence Record

| Field | Result |
| --- | --- |
| Tested commit | `477fb71` (`Refine Ryan White costing narrative and QA`) |
| Test date | 2026-07-14 |
| Browser surface | In-app Browser at `localhost:3000` |
| Desktop screenshot | Opening and section-aligned captures inspected at 1440 px |
| Mobile screenshot | Opening and section-aligned captures inspected at 390 px |
| Console errors | None after annual data settled |
| Blocking defects | Four corrected; slider event, keyboard sweep, and contrast audit remain |
| Nonblocking observations | Reserved for collaborative section-by-section review |
| Gate status | **Open — rendered mechanics substantially pass; final accessibility and editorial passes remain** |

## Completion Rule

The rendered gate passes only when:

1. all blocking checks are marked complete;
2. arithmetic and table/chart agreement are verified in at least the default, Florida, DC, and one sensitivity state;
3. desktop and mobile full-page screenshots have been inspected at native resolution;
4. all blocking defects have been fixed and rechecked;
5. remaining observations are explicitly classified as collaborative editorial decisions rather than hidden defects.
