# Ryan White ADAP Costing Explorer Implementation Plan

## Purpose

Build a research-facing ADAP costing explorer for the JHEEM portal that supports Ryan's intended economic analysis without turning unresolved methodology questions into public-facing user controls.

The explorer should help reviewers and collaborators understand:

1. The projected downstream HIV care costs attributable to ADAP elimination.
2. How those costs compare with ADAP spending avoided.
3. Which states drive the national result.
4. Why states differ.
5. Which methodology questions remain unresolved before a paper-facing release.

This should be an interactive research product, not a generic modeling sandbox and not an accounting-frame workbench.

## Guidepost

The test for every design decision in this app:

> A skeptical reader should trust the paper more after using the app than after reading the paper alone.

Ryan's scripts produce the paper's evidence. The app's job is to make that evidence auditable and its logic legible. That is a different product than "his plots, but interactive." Presentation innovations are welcome wherever they are pure recombinations of quantities Ryan already computes; choices among his unresolved conventions, and new estimands, are not ours to make silently.

## Background

Ryan's original request described an economic analysis layered on top of state-level epidemiologic simulation output:

- source model output: `ryan_white_results_state_costing_ADAP2026_2026-04-03.Rdata`
- draft costing script: `Cost_saving_analysis_v1.R`
- funding input: `rw_funding_by_state.csv`
- related figure script: `ADAP_Cost_Saving_Figures_v1.R`
- supplemental table script: `ADAP_supplemental_tables.R`

The existing portal page at `/ryan-white-costing` began as a polished static data story. It presents national and state visual summaries, but it risks feeling less like the interactive tools elsewhere in the portal. A later experimental redesign overcorrected by exposing accounting-frame choices as if they were reader-facing controls. That direction should be discarded.

The implementation should now be rebuilt from first principles around the ADAP analysis Ryan appears to be developing.

## Source Review Findings

### RData Contents

The source `.Rdata` file contains more than the current web artifact uses:

- years: 2010-2036
- simulations: 1,000
- locations: 30 modeled states plus `Total`
- interventions:
  - `noint`
  - `adap.100.end.26`
- `total.results` outcomes:
  - `incidence`
  - `diagnosed.prevalence`
  - `new`
  - `rw.clients`
  - `non.adap.clients`
  - `oahs.clients`
  - `adap.clients`
  - `oahs.suppression`
  - `adap.suppression`
  - `suppression`
  - `population`
  - `hiv.mortality`
  - `sexual.transmission.rates`
  - `prep.uptake`
  - `testing`
- additional arrays:
  - `total.incidence`
  - `total.new`
  - `total.pop`
  - `total.sexual.transmission`
  - `incidence.by.age`
  - `incidence.by.race`
  - `incidence.by.sex.risk`
  - `all.parameters`

This means the web app can do more than show costs. It can explain state heterogeneity using baseline program-dependence and epidemic-context measures.

### Draft Costing Script

`Cost_saving_analysis_v1.R` is ADAP-centered. It computes:

- excess new diagnoses under ADAP elimination
- immediate starts and delayed re-engagement
- cumulative person-years on ART
- cumulative downstream HIV care costs
- cumulative ADAP spending avoided
- net cost against ADAP spending
- net cost against total RWHAP spending

However, the script also contains methodology issues that should be treated as internal review items, not app controls. Most notably, the funding CSV appears to be read and inflated, then read again without inflation, overwriting the inflated version. The portal exporter intentionally fixes this, but Ryan should confirm the intended convention.

### Figure Script

`ADAP_Cost_Saving_Figures_v1.R` is the strongest signal for product direction.

It builds:

- a trajectory of cumulative HIV care cost versus cumulative ADAP spending for Florida
- state-level net cost to ADAP expenditure ratio
- explanatory panels relating that ratio to:
  - baseline transmission rate
  - viral suppression percentage
  - proportion of suppressed PWH on ADAP
  - urbanicity
  - Medicaid expansion status

Product implication: the key interactive question is probably "why do states differ?", not "which accounting frame do you prefer?"

### Supplemental Table Script

`ADAP_supplemental_tables.R` defines a likely paper-supporting table:

- State
- New HIV cases through 2035
- Person-years on ART
- cumulative ART care cost
- cumulative ADAP spending avoided
- net cost: care minus ADAP
- net cost / ADAP spending ratio

Important: this script pools low, median, and high drug-cost scenarios into one combined distribution for the table. The current web artifact exposes low, median, and high as separate scenarios. That may be useful for exploration, but the headline result may need to use the pooled distribution if Ryan confirms this is the paper convention.

## Product Position

### The Paper's Argument

Strip away the mechanics and the paper argues: **eliminating ADAP does not save what it appears to save.** The budget line says you save the whole ADAP appropriation; the model says a large fraction of that — sometimes more than all of it — comes back as HIV care costs for the infections the cut causes.

The load-bearing rhetorical structure is a causal cascade:

`cut ADAP -> suppression drops -> excess infections -> ART starts (immediate + re-engagement lag) -> person-years accumulate -> downstream care cost -> comparison with claimed savings`

And the estimate is deliberately conservative for that claim:

- it counts only care costs of excess new infections — nothing for existing clients who lose coverage and get sicker
- it truncates at 2035, while care costs are still diverging from savings (an infection in 2034 accrues almost no cost; ADAP savings are credited linearly and in full)
- it lags cost accrual behind a re-engagement model

The conservatism is the paper's shield against the "advocacy dressed as economics" criticism. The app should make the cascade and the conservatism visible — not bury them in a methods accordion. A Word document structurally cannot do this; the app can, and that is where it earns its keep.

### Build This

An ADAP elimination cost-consequence explorer.

The primary analytic frame is:

`ADAP elimination -> excess infections -> ART person-years -> downstream HIV care cost -> comparison with ADAP spending avoided`

The app should be opinionated enough to support the paper's central analysis, but transparent enough for a skeptical reviewer to inspect drivers and assumptions.

### Do Not Build This

Do not build a generic accounting-frame workbench.

Avoid public controls for:

- ADAP versus total RWHAP comparator
- payer perspective
- dollar-year convention
- Part B / ADAP overlap
- DC inclusion strategy
- negative excess-infection handling

Those are methodology questions to resolve with Ryan unless he explicitly designates them as formal sensitivities.

Also hold the line on faithfulness:

- **No mortality.** `hiv.mortality` is in the RData and excess deaths would be powerful, but it changes the claim from an economics argument to a lives argument, and epi outcomes belong to the companion state-level analysis. Note the availability to Ryan; keep it out of the costing app.
- **No extrapolation beyond 2035**, even though the diverging curves invite it. The crossover framing (below) lets the truncation speak for itself.
- **No fitted lines or regression overlays** on the n=30 heterogeneity scatter. Ryan's figure panels are descriptive; the app must visibly stay descriptive.
- **No new headline-adjacent estimands without sign-off.** "Excess infections per $1M of ADAP funding cut" falls out of dividing two quantities Ryan already computes and is the most policy-portable number in the analysis — but it is a new estimand, so it goes on the questions-for-Ryan list, not silently into the app.

## Research And Design Principles

1. Lead with the intended ADAP analysis, not the caveats.
2. Keep unresolved methodology visible but not interactive.
3. Make state heterogeneity the primary interactive value.
4. Use visual controls only for formal sensitivities, not open questions.
5. Favor decision diagnostics over decorative charts.
6. Align web metrics with the supplemental table wherever possible.
7. Preserve scientific caution without weakening the core paper claim.
8. Apply the guidepost test: does this make a skeptical reader trust the paper more?
9. Presentation innovations that recombine Ryan's quantities are fair game; new estimands and convention choices require his sign-off.
10. Make the model's conservatism visible — it is credibility, not a caveat to hide.
11. The app earns "interactive" through the horizon control and linked-view craft (URL state, transitions, cross-highlighting) — not through methodology toggles or widgets for their own sake.

## Data Exporter Plan

Update `scripts/generate-ryan-white-costing-data.R` rather than forcing the current JSON artifacts to support the new explorer.

**This plan requires a full re-export.** The original exporter pulled only the costing slice of the RData; the current artifacts contain none of the pooled summaries, baseline context, or mechanism series this plan depends on. What they already support is scenario-level horizon scrubbing and crossover (per-year cumulatives per state are exported). The source RData (436MB, local) and funding CSV are both present, so regeneration is unblocked. The additions below are small relative to the existing artifacts (a few numbers per state-year); `series.json` stays well under 1MB.

### Keep Existing Outputs

Keep:

- `src/data/ryan-white-costing/metadata.json`
- `src/data/ryan-white-costing/summary.json`
- `public/data/ryan-white-costing/series.json`
- low / median / high scenario-specific results
- ADAP and total RWHAP fields, but use total RWHAP as a method note unless confirmed as a formal sensitivity

### Add Pooled Cost Distribution

Add a pooled distribution matching `ADAP_supplemental_tables.R`:

- pool low, median, and high cost scenarios with simulation draws
- generate national and state summaries
- include:
  - cumulative care cost
  - net cost versus ADAP
  - net cost / ADAP ratio
  - share above zero if computed from pooled draws
  - quantile curve if feasible
  - pooled annual values (cumulative care cost and net vs ADAP per year) if pooled becomes the primary estimand — the global horizon control needs them; per-year pooling is the same computation applied per year

Open question: should pooled be the default headline, with low/median/high shown as sensitivity rows?

Decision-proof this question rather than blocking on it: emit pooled **and** per-scenario summaries unconditionally, and key the UI headline off a metadata flag (e.g. `primaryEstimand: 'pooled' | 'median'` alongside the existing `defaultCostScenario`). Ryan's answer then becomes a one-line regeneration, not a rework.

### National Total Convention (Decide Explicitly)

Ryan's supplemental table builds its "Total (US)" row by **bootstrap-resampling each state's pooled draws independently and summing** (the script explicitly assumes independence across states). The exporter currently uses the RData's built-in `Total` location, which is the **within-sim sum across states** — and validates that convention (`check_total_equals_state_sum`). These produce different national uncertainty intervals: within-sim summation preserves whatever cross-state correlation the sim pairing implies; the bootstrap deliberately destroys it.

A pooled national headline computed the natural way from the current pipeline will therefore **not** reproduce the paper table's Total row. Do not pick silently — this is a question for Ryan (see Questions To Resolve). Until answered, compute national pooled summaries from the RData `Total` location and record the convention in metadata so the choice is auditable.

### Add Baseline Context Variables

Derive state-level baseline context from `.Rdata`, mostly using 2025 `noint`.

Candidate fields:

- diagnosed prevalence
- suppression
- viral suppression percentage: `suppression / diagnosed.prevalence`
- ADAP suppression
- proportion of suppressed PWH on ADAP: `adap.suppression / suppression`
- ADAP clients
- Ryan White clients
- ADAP client share: `adap.clients / rw.clients`
- OAHS clients
- testing
- sexual transmission rate
- baseline incidence or new diagnoses

These should be exported per state in `summary.json` or a separate context artifact.

Conventions:

- summarize context variables as the **median across simulations** of 2025 `noint` values (Ryan's own `care_fraction_2025` is per-sim, so the collapse must be explicit)
- the RData outcome name is `sexual.transmission.rates` (plural) — mind the mapping when naming the exported field

### Urbanicity

Urbanicity is used in `ADAP_Cost_Saving_Figures_v1.R`, but it depends on external county/urbanicity data and helper functions.

Do not block the main app on urbanicity. Add it only if the source pipeline is clean and reproducible in the portal repo.

### Medicaid Expansion

The figure script includes Medicaid expansion status, but the script comments suggest uncertainty in assignments.

Do not expose Medicaid expansion until the policy-year and source are confirmed.

## Data Contract Sketch

Extend the data shape conceptually like this:

```ts
interface PooledCostSummary {
  cumulativeCareCost: QuantileValue;
  cumulativeCareCostQuantiles?: QuantileCurve;
  cumulativeNetCostVsAdap: QuantileValue;
  cumulativeNetCostVsAdapQuantiles?: QuantileCurve;
  cumulativeNetCostRatioVsAdap: QuantileValue;
  shareNetCostPositiveVsAdap?: number;
}

interface BaselineContext {
  diagnosedPrevalence: number;
  suppression: number;
  viralSuppressionPct: number;
  adapSuppression: number;
  propSuppressedOnAdap: number;
  rwClients: number;
  adapClients: number;
  adapClientShare: number;
  oahsClients?: number;
  testing?: number;
  sexualTransmissionRate?: number;
  baselineNewDiagnoses?: number;
}

interface StateCostingSummary {
  state: string;
  finalYear: FinalYearSummary;
  pooledFinalYear?: PooledCostSummary;
  baselineContext?: BaselineContext;
}
```

Exact naming can follow existing local conventions.

## Interaction Model

The test for whether this feels like an app rather than an article: **does any user input change a computation, or only a view?** Selecting a state, choosing an x-axis, and sorting a table re-render precomputed numbers — necessary, but not sufficient. This app gets exactly one computation-bearing control, chosen because it is cheap, faithful, and is the paper's own argument made tangible. Everything else earns "interactive" through linked-view craft, not widgets.

### Global Horizon Control

An "evaluate the ledger through year ____" scrubber: 2027-2035, defaulting to 2035.

Every panel responds to it: the per-dollar headline, net cost and interval, crossover status, driver rankings, and which states sit above or below break-even. Dragging the horizon and watching states flip from "saves money" to "net costly" converts the paper's biggest conservatism — the 2035 truncation while costs are still diverging — from a methods sentence into something the user physically feels.

Why this is legitimate where the accounting-frame controls were not:

- it is the same estimand evaluated at different truncation points — standard time-horizon sensitivity in cost-effectiveness work
- it never extrapolates past the model's support (2035 stays the maximum)
- it dramatizes an assumption the paper already owns; it does not adjudicate an unresolved one

Implementation notes:

- scenario-level metrics ride on the existing annual series (`series.json` already carries every cumulative quantity per state per year)
- if pooled becomes the primary estimand, the exporter must add pooled annual values (see exporter plan)
- ratio and crossover are derived client-side (net / ADAP per year)

Design rules learned in Phase 3 (binding for future passes):

- **The control lives in the hero, not in chrome.** A thin top-bar slider reads as browser furniture and gets missed; the primary control is a labeled "budget window" block inside the hero, with the sticky bar demoted to a condensed echo that appears only after the hero control scrolls away.
- **The track is data-bearing**: year ticks, a break-even marker at the interpolated crossover, and appears-to-save / net-costly region shading. A control that displays data reads as part of the analysis and teaches the crossover before it is touched.
- **Sub-crossover states must narrate the truncation mechanism.** Early-horizon views legitimately show the cut "saving" — that is the paper's short-term-illusion argument, so keep the full range, but never render an early-year savings number without its direction of travel (break-even year + the 2035 per-dollar value alongside). A screenshot of any horizon state should argue for the paper, not against it. Flag this presentation choice to Ryan.
- **A section that poses a question answers it in words.** Computed from the data, in the section copy, with the graphic as evidence — never a puzzle the reader must solve (the uncertainty decomposition originally failed this; the owner couldn't parse it). Corollary: charts get a one-line "how to read this."
- **Overlay chrome must dock below the global nav.** The portal header is `sticky top-0 z-50`, 80px tall and always visible; anything `fixed top-0` with lower z-index is permanently hidden behind it (the echo bar was invisible for two review rounds this way). Fixed bars start at `top-20`; anchor targets need `scroll-mt` covering nav + bar. Note the page scrolls at the document level - `position: sticky` inside the app's overflow wrappers never engages.
- **A control implies a finding.** Offering four x-axis options implies four trends; when three are flat, fix the axis to the real one and name the flat ones in a footnote (the heterogeneity selector became a single dependence chart this way).
- **No redundant encodings across sections.** The beeswarm was retired once the driver table's certainty column and the heterogeneity scatter's color carried the same information; its one insight (the coin-flip states are all large ADAP programs) became a sentence. Prefer deleting redundancy and progressive disclosure (the mechanism chart sits behind an expander) over tabs — tabs dismember the narrative and hide caveats from reviewers.

### Craft Bar

What separates "figures with a dropdown" from an instrument:

- selection and horizon state encoded in the URL — a reviewer can send "look at Mississippi through 2032" as a link
- animated transitions when the horizon scrubs or the scatter x-axis switches
- instant cross-highlighting between scatter, driver table, and drilldown

This costs engineering attention, not new data, and matters more to perceived quality than any additional widget.

### Deferred: Subset Recomposition (v2, Gated)

Select a subset of states (the South, non-expansion states, states currently debating cuts) and recompute the aggregate ledger for that subset. This is the most genuinely app-like interaction available in this data, and the most policy-relevant.

- requires exporting final-year per-sim draws per state (30 x 1,000, quantized, roughly 100-200KB) so subsets can be summed within-sim
- sits directly on the unresolved national correlation convention — gated on Ryan's answer
- do not build in v1; design the exporter so adding the draws later is easy

## Page Structure

All sections below wire into the global horizon control; the descriptions state their default (through-2035) content.

### 1. National Cascade Hero

Purpose: communicate the main result by teaching the model's logic in ten seconds.

The hero is the causal cascade itself, with the national numbers at each link:

`X excess infections -> Y person-years on ART -> $Z downstream care cost` versus `$W ADAP spending avoided` -> net

Every downstream section of the page is then a zoom-in on one link of this chain.

Headline metric: **care cost per dollar of ADAP spending avoided** (= paper ratio + 1), phrased as "every $1 of ADAP spending cut returns $X.XX in downstream HIV care costs." This is algebraically identical to Ryan's (cost − ADAP)/ADAP ratio but does not straddle zero at break-even, so it reads without a paragraph of explanation. Keep the paper's ratio verbatim in the driver table for supplemental-table alignment.

Also include:

- uncertainty interval on the headline
- share of draws net-costly, if available
- horizon: 2026-2035
- a compact, visible "what this estimate deliberately leaves out (and why that is conservative)" treatment

Avoid:

- total RWHAP as a main toggle
- over-neutral language that weakens the intended paper claim

### 2. Cost Uncertainty Decomposition

Purpose: show what drives the uncertainty, not just its width.

The pooled distribution mixes two different things: epidemic uncertainty (simulation draws) and the drug-cost assumption (three discrete tiers). Presented only as a pooled median [95% UI], readers cannot tell which dominates — and the pooling convention is exactly the kind of choice reviewers will poke at.

Build:

- the three within-scenario intervals (low / median / high) stacked against the pooled interval
- so the reader can see whether the interval means "we are unsure about the epidemic" or "we are unsure what ART costs"
- headline choice (pooled vs median scenario) stays config-driven via `primaryEstimand`, pending Ryan

This should be a formal sensitivity view, not a generic user preference control. Making the decomposition visible is a defensive strength for the paper, not a hedge.

### 3. Trajectory And Crossover

Purpose: generalize Ryan's Florida figure — cumulative care cost versus cumulative ADAP savings — into the app's signature view, for the nation and every state.

The figure is really about when the lines cross. Build:

- cumulative care cost versus cumulative ADAP spending avoided over time, national and per state
- **crossover year**: the year downstream care costs overtake claimed savings; some states cross early, some never cross within the horizon
- a ranked crossover view across states
- let "still diverging at 2035" speak for itself — the truncation understates the long-run picture, and the chart shows that honestly without extrapolating

Crossover for the median scenario is computable client-side from the existing `series.json` (both cumulative series are already exported per state per year, in discounted dollars — label them as such). Pooled trajectories only if the exporter addition is cheap. Do not extrapolate beyond 2035.

### 4. State Drivers

Purpose: identify which states drive national cost consequences.

Core visuals:

- ranked bars/table by net cost versus ADAP
- optional secondary sorting by:
  - cumulative care cost
  - ADAP spending avoided
  - net cost / ADAP ratio
  - excess new diagnoses

Columns should align with `ADAP_supplemental_tables.R`:

- excess new diagnoses
- ART person-years
- care cost
- ADAP spending avoided
- net cost
- ratio

Selecting a state should update the state detail and trajectory.

### 5. Why States Differ

Purpose: provide the main interactive exploration layer.

Use baseline context from `.Rdata`.

Potential x-axis choices:

- transmission rate
- viral suppression percentage
- proportion of suppressed PWH on ADAP
- ADAP client share
- baseline ADAP spending

Potential y-axis choices:

- net cost / ADAP ratio
- net cost versus ADAP
- excess new diagnoses

Recommended first version:

- y-axis: net cost / ADAP ratio
- x-axis selector:
  - transmission rate
  - viral suppression percentage
  - proportion suppressed on ADAP
  - ADAP client share
- point size: cumulative ADAP spending avoided or excess diagnoses
- selected state syncs with the driver table and detail panel

This is likely the most valuable "app-like" interaction because it helps users reason about heterogeneity rather than just consume a result.

Guardrails:

- annotate as descriptive associations, not adjusted estimates; no fitted lines or regression overlays on n=30
- consider log or capped scaling for point size — Florida and California dominate any spending-sized encoding

### 6. State Drilldown

Purpose: give state-level detail after selection.

Content:

- trajectory: cumulative care cost versus ADAP spending, with crossover year (shared with Section 3)
- final-year net cost and interval
- excess diagnoses
- ART person-years
- ADAP spending avoided
- net cost / ADAP ratio
- baseline context card
- **mechanism decomposition**: stacked view of who is accruing cost — immediate starts / re-engaged (delayed) starts / still off ART. This generalizes Ryan's Florida supplemental table to all 30 states and makes the re-engagement model — the most assumption-laden component — inspectable per state.

Default focus state can remain Florida because it is a major driver and appears in Ryan's figure script.

### 7. Methods And Internal Review Notes

Purpose: make assumptions visible without designing unresolved questions into the public interface.

Include:

- data source paths
- 30 modeled states
- DC exclusion
- 2026-2035 horizon
- discount rate
- drug-cost tiers
- routine care cost
- re-engagement parameters
- CD4 weights
- funding adjustment currently applied in exporter
- deterministic funding comparators
- negative excess infections preserved

Separate "questions to resolve" from "methods used in this artifact".

Questions to resolve:

- Should pooled low/median/high cost uncertainty be the primary paper result?
- Is ADAP spending avoided definitely the primary comparator?
- **National interval convention**: should the Total row use the RData `Total` location (within-sim sum across states, current exporter convention) or the supplemental table's independent bootstrap across states? These give different national uncertainty intervals; the web cannot match both the RData and the paper table. Whether same-index sims across separately calibrated states carry meaningful correlation is itself worth a sentence from Ryan/Todd.
- **Funding inflation**: the exporter fixes the funding CSV read-twice overwrite (2025 -> 2026 inflation, ~1.9% on ADAP); Ryan's current script output uses un-inflated funding. Will the paper fix the script, or should the web match his current convention? "Align with the supplemental table" and "fix the bug" cannot both hold until he answers.
- Is **"excess infections per $1M of ADAP funding cut"** acceptable as a derived, policy-portable metric? (Pure recombination of his quantities, but a new headline-adjacent estimand — needs his nod.)
- Are funding CSV values nominal 2025 dollars?
- Does Part B include ADAP funding or exclude it?
- Should DC be excluded entirely?
- Should negative per-simulation excess infections be preserved, floored, or sensitivity-tested?
- Are the explanatory variables in `ADAP_Cost_Saving_Figures_v1.R` intended for the paper?

Additional internal review items for Ryan's pile (script bugs, not app decisions):

- FL supplemental table red-text flag is inverted: `sav_is_negative = sav_med > 0` in `ADAP_supplemental_tables.R` — red marks positive net cost in the FL table but negative net cost in the state table
- the state table footnote says "Costs in 2035 USD" while the costing script discounts to 2026 — direct evidence the dollar-year question is real
- `Cost_saving_analysis_v1.R` computes `cost_on_art_wtd_2026` (2023-to-2026 CPI deflation of routine care) but then uses the un-deflated `cost_on_art_wtd` in the cost grid; the exporter uses the deflated value (found during the Phase 2 cross-check; about +0.9% on median care cost, +0.2-0.5% on net vs ADAP)
- the figure script's explanatory panels may not hold in this artifact: across the 30 states, the net/ADAP ratio tracks ADAP dependence (Spearman ~0.5) but shows little or opposite-signed association with transmission rate (~ -0.4), viral suppression (~0), and client share (~0.2); program size dilutes per-dollar damage. If the paper's discussion leans on the transmission/suppression/urbanicity panels, Ryan should re-check them (found 2026-07-11 while building the heterogeneity view)

## Implementation Sequence

Exporter work comes before any UI rebuild so the component is built once against the final data contract, not twice.

**Status (2026-07-10): Phases 1-7 complete** (commits `0cf3437` exporter, `b412ede` shell/hero, `c45f676` budget-window control, `93a55e9` crossover, `fd5af5b` drivers/mechanism, `a35f128` heterogeneity, `4147ae5` methods). Cross-check passes on final artifacts (30/30 states + national within rounding). Workbench parked on `scrap/costing-frame-workbench`. Phase 8 outstanding items: in-browser visual pass (mobile rendering, tooltip readability, no horizontal overflow) - the automated checks (build, SSR render markers, numeric verification) are done.

### Phase 1: Working Tree Disposition

The uncommitted diff on `src/app/ryan-white-costing/RyanWhiteCostingApp.tsx` is the accounting-frame workbench (`FrameId = 'adap' | 'totalRwhap'` toggle, "Frame Test" task). It exists **only** in the working tree — a plain revert destroys it permanently.

- park it on a scrap branch (or stash) first; the frame-comparison logic may be salvageable later as an internal review tool
- then revert the working tree to HEAD (the 2026-07-06 editorial version)
- do not rebuild the component yet

Do not add accounting-frame controls in anything that follows.

### Phase 2: Exporter Extension

Update:

- `scripts/generate-ryan-white-costing-data.R`
- `src/data/ryan-white-costing/types.ts`
- `src/data/ryan-white-costing/schemas.ts`
- `src/data/ryan-white-costing/index.ts`

Add:

- pooled final-year summaries (national convention per the exporter section above, recorded in metadata)
- `primaryEstimand` metadata flag
- baseline context (median across sims, 2025 `noint`)
- annual mechanism series per state: immediate starts / delayed (re-engaged) starts / off-ART person-years — required for the drilldown mechanism decomposition; not currently exported
- any other annual series needed for selected-state trajectories

Regenerate:

- `src/data/ryan-white-costing/summary.json`
- `src/data/ryan-white-costing/metadata.json`
- `public/data/ryan-white-costing/series.json`

Numeric cross-check (do this before building UI on top):

- run Ryan's `build_state_summary()` (returns a data frame without writing Word) against the same RData and diff the pooled per-state rows against the exporter output
- per-state pooled medians/quantiles are deterministic (no bootstrap for single states) and should match to formatting precision
- the Total row is bootstrap-based and needs a tolerance
- this catches exactly the convention-drift failure class (pooling, discounting, funding inflation)

### Phase 3: App Shell, Horizon Control, And Cascade Hero

Build the shared interaction scaffolding first — every later panel wires into it:

- global horizon scrubber (2027-2035, default 2035)
- selection and horizon state in the URL
- national cascade hero with per-dollar headline framing, responsive to the horizon
- conservatism treatment
- pooled vs within-scenario uncertainty decomposition section

Keep this focused and paper-aligned.

### Phase 4: Trajectory And Crossover View

Build:

- national and per-state cumulative care cost vs ADAP savings trajectories
- crossover-year computation (client-side from series.json) and ranked crossover view
- horizon marker synced to the global scrubber

### Phase 5: State Drivers UI

Build:

- ranked state driver table/bars (paper's ratio verbatim, per supplemental table), recomputed against the selected horizon
- state selection state
- state detail metrics
- drilldown with mechanism decomposition (stacked immediate / re-engaged / off-ART)

### Phase 6: Heterogeneity Explorer

Build:

- scatterplot with x-axis context selector
- y-axis fixed initially to net cost / ADAP ratio
- point size by ADAP spending or excess diagnoses (log or capped scaling)
- descriptive-associations annotation, no fitted lines
- synchronized selected state

### Phase 7: Methods And Review Notes

Build:

- compact methods panel
- internal review questions
- provenance and artifact-generation notes

### Phase 8: Verification

Run:

- `npm run build`

Check:

- desktop rendering
- mobile rendering
- state selection
- no horizontal overflow
- tooltip readability
- labels match the current artifact and do not overstate settled methodology
- exporter cross-check from Phase 2 still passes on the final regenerated artifacts

## Current Repository State Warning

As of 2026-07-10, the working tree carries an uncommitted ~1,700-line diff on `RyanWhiteCostingApp.tsx`: the accounting-frame workbench (`FrameId = 'adap' | 'totalRwhap'`, "Frame Test" task). HEAD (`834cfe1`, 2026-07-06, "Refine Ryan White costing methods and chart labels") is the editorial uncertainty-first version, which keeps frame discussion in methods text only. "Revert" therefore means reverting to the 2026-07-06 editorial version, not the original static story.

See Phase 1 for disposition — park the workbench diff on a scrap branch or stash before reverting; a plain revert destroys it.

Existing unrelated dirty docs may also be present. Do not revert unrelated user changes.

## Acceptance Criteria

The implementation is successful when:

- the page clearly reads as an ADAP elimination costing explorer
- the causal cascade is the hero and teaches the model's logic at a glance
- the headline uses the per-dollar framing while the driver table preserves the paper's ratio verbatim
- ADAP spending avoided is the primary comparator
- national results are prominent and understandable
- uncertainty presentation distinguishes drug-price spread from epidemic uncertainty (not just a pooled blob)
- trajectory and crossover views are first-class for the nation and every state, with no extrapolation past 2035
- the global horizon control works and every panel responds to it
- selection and horizon state are URL-shareable
- state drivers are easy to identify
- users can explore why states differ using baseline context variables, framed as descriptive
- state drilldown is useful, synchronized, and makes the re-engagement mechanism inspectable
- the model's conservatism is visible, not buried
- unresolved methodology is visible as review context, not exposed as arbitrary app controls
- exporter output is numerically cross-checked against Ryan's `build_state_summary()`
- production build passes

## Senior Researcher / SWE Recommendation

The most important product decision is to resist adding controls just because a question exists. A good research app should make formal sensitivities inspectable, but it should not ask readers to adjudicate unresolved methodology. For this analysis, the most promising interactive layer is state heterogeneity: why some states have higher net cost relative to ADAP spending, and how baseline program dependence and epidemic context explain that pattern.

Build the app around the analysis Ryan is trying to publish. Use the richer model outputs to make that analysis more inspectable.

Faithful does not mean literal. The app is not a web version of Ryan's scripts and plots — it should deeply understand what the paper is driving at and, where the opportunity exists, present the same quantities better: the cascade hero, the per-dollar framing, the crossover year, and the uncertainty decomposition are all pure recombinations of his numbers that a static paper cannot deliver. The boundary is estimands and conventions: those are his, and anything new there goes through the questions list.

When in doubt, apply the guidepost: a skeptical reader should trust the paper more after using the app than after reading the paper alone.
