# Ryan White Costing Explorer: Final Implementation Plan

## Objective

Build a review-ready Ryan White ADAP costing explorer that is scientifically cautious, visually confident, and polished enough to share with the team.

The next pass should not be a generic dashboard refresh. It should turn the current implementation into a modern research product whose first viewport communicates:

- the national median result under the current accounting frame
- the zero-crossing uncertainty interval
- the payer-perspective caveat
- scenario sensitivity across low / median / high drug-cost assumptions
- the state-level finding that medians are mostly rankings, not state-by-state conclusions

## Data-Grounded Decisions

The current median drug-cost scenario has:

- ADAP spending avoided: `$6.48B`
- downstream care cost: median `$18.17B`, interval `$2.18B` to `$28.79B`
- net cost vs ADAP: median `$11.69B`, interval `-$4.31B` to `$22.30B`
- 28 of 30 modeled states with net-cost intervals crossing zero
- only Alabama and Tennessee bounded above zero at the state level
- all 30 state median net costs positive

Implications:

- Do not hatch every zero-crossing state on the map. It would mark 28/30 states and become visual noise.
- Do make `28 of 30 state intervals cross zero` an explicit state-level takeaway.
- Use a sequential/ranked map scale for median net-cost magnitude because all state medians are positive.
- Reserve zero-centered/diverging treatment for the national net-cost uncertainty hero and interval graphics.
- Treat state medians as rankings unless a state interval is bounded away from zero.

## Architecture

Keep the current architecture:

- static generated artifacts
- imported metadata/summary
- lazily fetched series data
- pure view-model transforms
- frontend-only deployment
- shared selected state across map, scatter, trajectory, and table

No backend or container work is required for this pass.

## Exporter Additions

Add final-year quantile curves and share statistics in the R exporter.

Add these fields to each final-year summary, national and state:

```ts
interface QuantileCurve {
  p025: number;
  p05: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p975: number;
}

interface ScenarioQuantileCurves {
  low: QuantileCurve;
  median: QuantileCurve;
  high: QuantileCurve;
}

interface ScenarioShares {
  low: number;
  median: number;
  high: number;
}
```

Fields:

- `cumulativeNetCostVsAdapQuantiles`
- `cumulativeCareCostQuantiles`
- `shareNetCostPositiveVsAdap`

The share should be computed from per-simulation cumulative net cost paths, not inferred from quantiles.

Contract hygiene:

- Keep existing `{ median, lower, upper }` fields for compatibility.
- Generate both the old three-point fields and the new quantile curves from the same per-simulation arrays.
- Validate in the exporter that `lower == p025`, `median == p50`, and `upper == p975` within rounding tolerance.

## First Viewport

Build an editorial hero, not an equal-weight card grid.

Hero copy:

```text
Ryan White ADAP Cost-Consequence Explorer · 2026-2035

Current accounting frame suggests positive median net cost, but uncertainty crosses zero.

Median net cost vs ADAP is $11.69B under the median drug-cost scenario; simulation interval ranges from -$4.31B to $22.30B.
```

Perspective caveat, adjacent to the headline:

```text
Interpretation depends on payer perspective. This frame compares avoided ADAP spending with downstream HIV care costs; those downstream costs may be ADAP/RWHAP-eligible under alternative counterfactual assumptions.
```

Primary visual:

- custom scenario evidence strip
- all three drug-cost scenarios visible without interaction
- zero-centered x-axis
- split-color interval bands at zero
- p2.5-p97.5 outer band
- p10-p90 middle band
- p25-p75 inner band
- median marker
- share of simulation draws above zero under current frame

The hero should show both:

- simulation uncertainty within each row
- structural/scenario uncertainty across rows

## Visual Semantics

Use one color dictionary:

- Hopkins blue: selected state / institutional anchor
- amber: positive net cost under current frame
- teal: negative net cost / offset under current frame
- slate/gray: neutral uncertainty band, axes, unmodeled states
- gold: selected highlight only

Avoid using teal for ADAP funding if teal also means negative net cost. ADAP can use Hopkins blue or neutral slate depending on context.

Use compact money formatting everywhere:

- `$667M`
- `$2.85B`
- `$18.2B`

Do not mix `$0.67B` and `$667M`.

## State Explorer

The state explorer should communicate that state medians are mostly rankings.

Map:

- title: `State contribution landscape`
- subtitle: `Median net-cost rankings across 30 modeled states`
- primary lenses:
  - `Net cost vs ADAP`
  - `Downstream care cost`
  - `Excess diagnoses`
- remove `Net-cost ratio` from primary lenses
- use ranked/quantile bins for readability
- show the actual value range for the selected/top bin so magnitude is not erased
- include explicit caption:

```text
28 of 30 state intervals cross zero; state medians are best read as rankings, not state-level conclusions.
```

Bounded-positive states:

- show Alabama and Tennessee in a small `Bounded positive` note/list
- do not hatch the 28 crossing states

Scatter:

- x-axis: ADAP spending avoided, deterministic
- y-axis: downstream care cost, uncertain
- diagonal: break-even line
- point size: excess diagnoses
- vertical whiskers: care-cost p10-p90 range
- selected state: strong stroke and label
- annotate major states where space permits
- caption that ADAP is deterministic here while downstream care cost varies across simulation draws

State detail rail:

- selected state
- net cost vs ADAP
- interval
- share of draws above zero
- bounded-positive / crosses-zero status
- downstream care cost
- ADAP spending avoided
- excess diagnoses

## Model Review Section

Add a polished review band, not a plain checklist.

Cards:

- current accounting frame
- engagement dynamics
- cost assumptions
- epidemiologic inputs
- open questions

The payer-perspective caveat appears both in the hero and in this section.

## Epi-To-Cost Chain

Do not preserve the current chain as-is.

Either:

- split it into `Epidemiologic pathway` and `Accounting comparison`, or
- defer it below the hero/state explorer and fold key values into the state rail/review section

For this pass, defer the chain if needed to protect the quality of the first viewport and state explorer.

## Build Sequence

1. Update the R exporter and regenerate artifacts.
2. Update TypeScript types and validators.
3. Extend view-model helpers:
   - quantile curves
   - share-of-draws display
   - scenario evidence rows
   - compact money formatting
   - ranked map bins
   - state uncertainty status
   - scatter whisker values
4. Rebuild the first viewport around the scenario evidence strip.
5. Rebuild state explorer around ranked map, uncertainty-aware scatter, and state detail rail.
6. Add model review band.
7. Run production build.
8. Verify desktop and true mobile/tablet viewport rendering.

## Acceptance Criteria

This pass is complete when:

- first viewport looks intentionally designed and modern
- all three scenarios are visible in the hero without interaction
- the hero shows quantile bands, median markers, zero line, and share of draws above zero
- payer-perspective caveat is adjacent to the headline metric
- map does not imply state-level certainty
- map uses sequential/ranked encoding for all-positive state median net costs
- state-level `28 of 30 intervals cross zero` finding is explicit
- scatter shows care-cost uncertainty with whiskers
- net-cost ratio is not a primary control
- model assumptions and review questions are findable within the first minute
- money formats and labels are consistent
- production build passes

## Not In Scope

- backend/container integration
- raw draw visualizations
- downloadable reports
- advanced ratio views
- full mobile parity for every lower-page detail
- elaborate animation

The page should be polished enough to share, but the polish should serve the analysis.
