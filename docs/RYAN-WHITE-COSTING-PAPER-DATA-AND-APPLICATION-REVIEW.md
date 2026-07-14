# Ryan White ADAP Costing: Manuscript, Data, and Application Review

**Review date:** 2026-07-13

**Status:** Historical July 13 snapshot. Superseded for current-build design decisions by `RYAN-WHITE-COSTING-CURRENT-BUILD-AND-CORRECTED-DRAFT-REVIEW.md`.

**Purpose:** Preserve the independent review of the July 2026 manuscript draft, supplement, updated RData, and current portal implementation.

## Executive Summary

The manuscript substantially clarifies the intended policy story and visual vocabulary for the costing application. The central direction is scientifically plausible and policy-relevant: a complete loss of ADAP support reduces viral suppression, increases transmission, and creates downstream HIV care costs that may exceed the program spending avoided.

The quantitative presentation is not yet stable enough to serve as an unquestioned source of truth for the portal. Several important discrepancies exist among the manuscript prose, supplement, RData, costing scripts, and current application:

- new HIV diagnoses are repeatedly labeled as incident infections;
- the net-cost-to-ADAP-expenditure ratio (NCER) is explained as though it were a gross care-cost-per-dollar ratio;
- national results use an independent state bootstrap even though important simulation draws are shared across states;
- three discrete ART price scenarios are sometimes pooled and treated as probabilistic uncertainty;
- cost, funding, inflation, and dollar-year conventions differ between prose and code;
- the current portal still uses the pre-DC dataset and contains hardcoded statements that DC is excluded;
- the portal exports the raw sexual-transmission numerator rather than the transmission rate used in the manuscript figure.

The application nevertheless has a strong structure. Its trajectory, horizon control, state drilldown, crossover view, and price-scenario decomposition are useful extensions of the paper. The right response is not to rebuild the application as a literal web copy of the manuscript. It is to preserve those strengths while correcting semantic and arithmetic errors, aligning the core displays with the paper's estimands, and keeping unresolved scientific choices visibly owned by the analysis team.

## Review Scope

### Materials reviewed

- Implementation plan: `docs/RYAN-WHITE-COSTING-ADAP-EXPLORER-IMPLEMENTATION-PLAN.md`
- Main manuscript: `/Users/cristina/Downloads/ADAP Ryan White Costing Paper/ADAP_costing_manuscript_MS_EPH_ATF_DSB_JJ.docx`
- Supplement: `/Users/cristina/Downloads/ADAP Ryan White Costing Paper/ADAP_costing_supplement_pk_rf_eph26JUNE2026.docx`
- Updated model artifact: `/Users/cristina/Downloads/ADAP_input_state_costing2026_2026-07-08.Rdata`
- Prior model artifact: `ryan_white_results_state_costing_ADAP2026_2026-04-03.Rdata`
- Costing and figure scripts under `jheem_analyses/applications/ryan_white/Ryan_white_costing/`
- Portal exporter, generated JSON, view model, and React application under this repository

Both Word documents were extracted, rendered, and inspected page by page. The RData files were loaded into isolated R environments and compared object by object. A temporary export using the new RData completed successfully without changing repository data artifacts.

An interactive in-app browser session was not available for the final July 13 pass. Application craft findings therefore combine the source/data inspection with the prior build and rendering reviews rather than a new click-through session.

## What the RData Contains

### It is an output snapshot, not a runnable simset

The updated RData contains nine numeric arrays:

1. `total.results`
2. `total.incidence`
3. `incidence.by.race`
4. `incidence.by.age`
5. `incidence.by.sex.risk`
6. `total.new`
7. `total.pop`
8. `total.sexual.transmission`
9. `all.parameters`

The arrays include 1,000 simulation draws, years 2010-2036, baseline and complete-ADAP-elimination interventions, aggregate outcomes, selected incidence subgroup margins, and 458 saved parameters.

The file contains no functions, environments, R6 objects, S4 model objects, external pointers, or `simset.collection`. It can support re-analysis of completed simulations, new summaries, costing calculations, and additional plots. It cannot by itself run a new intervention. Custom simulations require the JHEEM code, calibration/model workspace, and construction or retrieval of a simulation collection.

The upstream extraction script confirms the distinction: it constructs a `simset.collection`, calls `$get()` and `$get.parameters()`, then saves only arrays to RData.

### What "adds DC to the simset" means in practice

The updated artifact adds DC slices to every relevant outcome, incidence, and parameter array. It also recomputes the `Total` location to include DC.

The comparison was narrow and clean:

- all 270 existing state/object slices were hash-identical between the old and new artifacts;
- the 30 existing states were not recalibrated or otherwise changed;
- DC is the only new modeled jurisdiction;
- the updated dataset contains 30 states plus DC, or 31 modeled jurisdictions, plus `Total`;
- `Total` exactly equals the within-simulation sum of the 31 jurisdictions.

The filename is therefore somewhat misleading: this is predominantly completed model output plus saved parameter draws, not a model input or serialized simulation collection.

### What the artifact can and cannot support

It can support:

- separate cumulative infections and diagnoses;
- national/model-jurisdiction and state outcome trajectories;
- incidence summaries by age, race, or sex/risk margin;
- examination of saved intervention-effect and calibration parameters;
- recomputation of the costing cascade under alternative post-processing conventions.

It cannot support without new simulations:

- a partial ADAP reduction scenario;
- user-defined interventions;
- alternative intervention start dates or recovery policies;
- new intersectional outcome strata not saved in the arrays;
- causal sensitivity analyses requiring changes to the transmission model itself.

The portal should not simulate a partial cut by linearly interpolating the complete-elimination result. That would create an unsupported model result.

## Quantitative Reconciliation

### Diagnoses are being called infections

The model has distinct outcomes:

- `incidence`: new HIV infections;
- `new`: new HIV diagnoses.

The costing pipeline starts from `new`, then estimates immediate and delayed ART initiation. The manuscript's Florida headline of 16,193 therefore counts excess diagnoses, not infections.

| Quantity, 2026-2035 | Median | 95% interval |
|---|---:|---:|
| Florida excess infections | 21,483 | 2,823-32,075 |
| Florida excess diagnoses | 16,193 | 2,157-24,250 |
| 31-jurisdiction excess infections | 143,347 | 16,946-226,886 |
| 31-jurisdiction excess diagnoses | 105,730 | 12,599-167,856 |

The current portal hero labels `cumulativeExcessNewDiagnoses` as "Excess infections." This should be corrected regardless of broader scientific decisions because it is a direct data-semantics error.

### NCER and cost per dollar are different quantities

The paper defines:

```text
NCER = (cumulative downstream care cost - cumulative ADAP spending) / cumulative ADAP spending
```

Therefore:

```text
gross downstream care cost per $1 avoided = NCER + 1
```

If Florida has NCER 2.26, the corresponding gross care cost is $3.26 per $1 of ADAP spending avoided. NCER 2.26 can be described as $2.26 in net cost beyond the avoided dollar, but not as $2.26 in gross downstream care cost.

The application's gross per-dollar headline is easier to understand than NCER and should remain the primary public expression. NCER should remain available for manuscript/table alignment with its exact formula visible.

### The manuscript contains multiple national totals

The supplement reports approximately:

- $17.51B downstream care cost;
- $6.36B ADAP spending avoided;
- $11.12B net cost;
- NCER 1.75.

The main Results instead uses about $17.54B, $6.45B, and NCER 1.72. The Discussion treats NCER as gross care cost per dollar, while the final paragraph calls $17.51B additional net spending even though it is gross downstream care cost.

These should be reconciled before the portal attempts to reproduce manuscript headline values exactly.

### The national bootstrap discards modeled dependence

The supplemental-table code independently resamples each state's result before summing states. That assumes state independence.

The saved simulation parameters show that the principal ADAP-loss effect draws are identical across states within a simulation. State outcomes are consequently correlated. The RData `Total` preserves the within-simulation pairing; independent state bootstrapping does not.

The practical difference is large:

- independent-bootstrap diagnoses: 103,315 [79,428-125,646];
- within-simulation `Total`: 105,730 [12,599-167,856].

The independent-bootstrap interval is only about 30% as wide. The current portal's use of the RData `Total` is more faithful to the joint simulation design. This is an analysis-owner decision that should be confirmed with Ryan rather than silently changed in the manuscript or hidden in the application.

### Price scenarios are sensitivities, not probability draws

Low, median, and high ART prices are three discrete scenarios. Pooling all three values with the epidemiologic draws gives the scenarios arbitrary equal probability and blends two different concepts:

- uncertainty in epidemiologic/model draws;
- sensitivity to an assumed ART price tier.

The app's separate scenario rows are preferable. A median-price scenario can serve as the primary estimate, with low and high presented as sensitivity analyses. A pooled row can be retained only if clearly labeled as an equal-weight convention rather than a probabilistic 95% uncertainty distribution.

## Scientific Assessment

### Strengths and merit

- The policy question is important and timely.
- A dynamic transmission model is appropriate because loss of viral suppression creates downstream infections beyond current enrollees.
- Paired counterfactual simulations are a sensible design.
- State heterogeneity is substantively important and useful for policy interpretation.
- The time trajectory and crossover framing communicate why short budget windows can be misleading.
- The cost analysis explicitly identifies several omitted cost categories.
- The new DC result is transparent rather than being silently folded into an aggregate.

The central qualitative conclusion is credible as a complete-elimination stress test: the model projects substantial epidemiologic harm and downstream costs from fully eliminating ADAP.

### Principal limitations

1. **The intervention is an extreme stress test.** Complete, persistent elimination is not equivalent to current eligibility restrictions, formulary changes, caps, or partial reductions.
2. **The perspective is mixed.** ADAP savings are a government-program quantity; downstream costs are payer-agnostic healthcare-system costs. The result is a cost-consequence comparison, not a payer-specific budget impact.
3. **The viral-suppression effect is expert elicitation, not an observed causal effect of nationwide elimination.** The saved parameters also distinguish Medicaid expansion and non-expansion effect distributions more explicitly than the main Methods text.
4. **The care-entry proxy is indirect.** Immediate ART initiation is approximated using the state's baseline suppressed/diagnosed proportion, which is not the same quantity as immediate treatment initiation.
5. **ART retention is simplified.** Once excess cases begin ART in the post-processing model, they remain in the recurring cost stock; mortality and later disengagement are not applied to this stock.
6. **The dollar-year logic needs clarification.** Costs are labeled 2026 USD, then escalated using expenditure-growth rates while nominal ADAP funding is held flat, and subsequently discounted at 3%.
7. **The claim of a uniformly conservative lower bound is too strong.** Several omissions lower costs, but complete persistent elimination, limited substitution, recurring ART retention, and differential cost growth can increase them.
8. **The state-context analysis is ecological and descriptive.** It has 31 observations, unadjusted correlations, correlated predictors, and mathematical coupling between several predictors and the NCER denominator.
9. **DC is an influential new outlier.** Its low modeled effect and high spending per client should receive an explicit face-validity check before it becomes a central policy exception.

These limitations do not invalidate the application. They determine how confidently it should label and interpret the results.

## Paper and Application Visual Alignment

### The paper's intended visual story

The manuscript and supplement establish the following main displays:

1. Florida cumulative downstream care cost versus cumulative ADAP spending.
2. Modeled-jurisdiction cumulative downstream care cost versus cumulative ADAP spending.
3. State distributions of NCER at 2035, including Medicaid expansion status and DC.
4. NCER against four baseline characteristics:
   - average transmission rate;
   - ADAP spending per client;
   - proportion of suppressed PWH supported through ADAP;
   - diagnosed-HIV-weighted urbanicity.
5. A conceptual cascade from current ADAP enrollees, through suppression loss and incident infections, to care engagement and cost.
6. Florida annual outcomes/costs and a state-level results table.

### Current application inventory

The application currently presents:

1. A narrative hero with gross care cost per $1 of ADAP spending avoided.
2. An adjustable 2026-2035 budget window.
3. A headline cascade from purported infections to ART person-years, cost, ADAP spending, and net cost.
4. A selected-location cumulative care-cost-versus-ADAP trajectory.
5. A state crossover-year timeline.
6. A ranked state table matching most supplemental-table columns.
7. Selected-state result and baseline-context cards.
8. An expandable immediate/re-engaged/off-ART mechanism chart.
9. One heterogeneity scatter: NCER versus the proportion of suppressed PWH supported through ADAP.
10. A pooled-versus-price-tier uncertainty decomposition.
11. Methods and an internal questions panel.

### Alignment assessment

| Paper element | Current application analogue | Assessment |
|---|---|---|
| Florida and aggregate trajectories | Selected-location trajectory | Strong alignment and a useful generalization; retain. Make Florida an obvious quick selection. |
| 2035 state NCER boxplots | Ranked table, selected-state interval, probability column, crossover timeline | Not a literal match, but arguably more useful. A duplicate 31-state boxplot is not required if state uncertainty remains legible. |
| Four baseline-characteristic panels | One ADAP-dependence scatter | Incomplete alignment. Add an axis selector for the paper's four variables rather than four separate charts. |
| Conceptual costing framework | Hero cascade and mechanism chart | The hero is useful after semantic correction. The stacked mechanism chart currently overstates a clean partition and should be fixed or removed. |
| Florida annual table | Trajectory plus state detail | Adequate for the principal story; a second large annual table or plot is unnecessary. |
| State summary table | Ranked driver table | Strong alignment; retain and add DC/Medicaid context. |
| Pooled model-and-price uncertainty | Uncertainty decomposition | The app is better than the paper here; retain, but do not treat pooling as the scientifically preferred estimand. |

## Plot and Emphasis Recommendations

### Keep and emphasize

#### 1. Cumulative care cost versus ADAP spending trajectory

This is the closest match to Figure 1A/B and the clearest statement of the paper's argument. It should remain the main analytical chart.

Required fixes:

- use the new 31-jurisdiction dataset;
- call the aggregate a modeled-jurisdiction total, not a national total;
- make the selected price tier govern the trajectory and all associated headline values consistently;
- label the uncertainty band as epidemiologic/model uncertainty at a fixed price tier;
- keep crossover explicitly tied to the median of the selected scenario.

#### 2. Budget-window/horizon control

The paper's thesis depends on costs overtaking savings over time. The interactive horizon is a legitimate and valuable web-native extension. It should stay.

The control should not imply that the model forecasts beyond 2035 or that a shorter horizon is a different policy scenario. It is the same estimand evaluated at a different truncation point.

#### 3. Ranked state table and selected-state detail

This is a strong replacement for reproducing the supplement verbatim. It supports precise comparison, sorting, selection, and accessible lookup.

Recommended additions:

- DC;
- Medicaid expansion status;
- distinct infections and diagnoses where space permits;
- a clear indication that the state probability column is fixed at 2035 even when the budget window changes, or make it respond to the selected window;
- optional compact interval marks if state uncertainty needs to be compared across all rows.

#### 4. Price-scenario decomposition

This is an important scientific improvement over the manuscript. Keep it and position it as sensitivity analysis.

The median-price scenario should be the default primary result unless Ryan explicitly chooses another convention. Low and high should be visibly subordinate sensitivities. The pooled row should not be visually privileged or described as an ordinary probabilistic interval.

### Add or extend

#### 1. Separate infections from diagnoses in the cascade

The first part of the cascade should become:

```text
excess infections -> excess diagnoses -> ART person-years -> downstream care cost
```

The funding comparison then branches separately:

```text
downstream care cost versus ADAP spending avoided -> net cost / cost per dollar
```

This avoids both the infection/diagnosis error and the current implication that ADAP spending is another causal step in the epidemiologic cascade.

A separate incidence chart is not required initially. Correct values in the hero/cascade and state detail are sufficient unless Ryan specifically wants annual infections visualized.

#### 2. Complete the manuscript heterogeneity view with one selectable scatter

Do not add four full-size scatterplots. Extend the existing scatter with an axis selector for:

- transmission rate;
- ADAP spending per client;
- suppressed PWH supported through ADAP;
- diagnosed-HIV-weighted urbanicity.

Requirements:

- compute transmission rate as the transmission numerator divided by unsuppressed prevalence, matching the manuscript figure;
- source and document urbanicity and Medicaid expansion status reproducibly;
- show Spearman rho and sample size;
- describe every association as unadjusted and descriptive;
- avoid fitted lines and causal copy;
- consider a shape or outline for Medicaid expansion while retaining a separate uncertainty encoding.

The existing title, "Net cost per dollar tracks ADAP dependence," is too conclusive. A neutral title such as "How the modeled ratio varies with state context" better reflects the analysis.

#### 3. Make Florida easy to reach

The paper leads with Florida. The application does not need a separate duplicate Florida plot, but should offer a visible "Florida example" link or preset next to the modeled aggregate.

### Demote, rework, or remove

#### 1. Re-engagement mechanism chart

The current immediate/re-engaged/off-ART stacked chart should not remain in its present form.

Its components do not form a clean same-timepoint partition. The off-ART value reflects a timing/person-year convention that overlaps with within-year re-engagement, while the copy says every diagnosed person belongs to exactly one group. Component medians also need not sum to the median total.

Options, in preference order:

1. replace it with the corrected infection-to-diagnosis-to-ART cascade;
2. redefine every component at a common end-of-year timepoint and test that the partition closes within each simulation;
3. remove it until the analysis team confirms the intended interpretation.

Because it is not a principal manuscript figure, removing it would not reduce paper alignment.

#### 2. NCER as a headline

NCER is useful for manuscript correspondence and state comparison, but it is difficult to interpret and denominator-sensitive. Keep it in tables/details. Continue to lead with gross care cost per $1 avoided, provided the relationship `gross ratio = NCER + 1` is explicit.

#### 3. Strong causal state-driver language

The app currently says ADAP dependence is the trait that "does more damage" and explains why states differ. This goes beyond the descriptive analysis. Replace causal language with calibrated association language.

#### 4. Internal review panel in the public artifact

Move the working question list to a companion review document. The public page should retain resolved Methods, Data Scope, and Limitations. Unresolved choices that materially affect the displayed result must still be disclosed until resolved, but they should not appear as an internal workflow panel.

### Do not add at this stage

- a map solely for visual variety;
- a literal duplicate of every manuscript panel;
- a partial-cut slider derived by interpolating the elimination scenario;
- a fitted regression or causal "driver" model over 31 jurisdictions;
- additional subgroup plots merely because the RData contains subgroup incidence;
- a standalone annual Florida infections plot unless it answers a confirmed manuscript/app requirement.

The page is already analytically dense. Additions should repair alignment or answer a distinct reader question, not increase panel count.

## Handling Scientific Concerns as the Application Team

The application team should not attempt to become the scientific adjudicator. It also should not knowingly encode mislabeled outcomes, inconsistent arithmetic, or undocumented conventions. A useful boundary is to separate issues into three categories.

### Category A: implementation correctness -- application team owns

These can and should be fixed directly because they do not require a scientific judgment:

- label `new` as diagnoses and `incidence` as infections;
- calculate and explain NCER and gross cost per dollar correctly;
- update location counts and DC inclusion from data rather than hardcoding them;
- fix the transmission-rate derivation;
- avoid calling a 31-jurisdiction subtotal national;
- make selected scenario controls actually apply to every claimed consumer;
- remove stale provenance and scope copy;
- add tests for these invariants.

### Category B: analysis conventions -- Ryan/analysis team owns, application team must surface

These should be raised as neutral reconciliation questions with concrete consequences:

- within-simulation total versus independent state bootstrap;
- median price tier versus pooled price scenarios;
- payer/accounting perspective;
- funding source and ADAP comparator definition;
- dollar year, inflation, and discount convention;
- treatment of negative incremental outcomes;
- whether DC has passed face-validity review.

The application can implement the most internally coherent provisional convention, but it should record that choice in metadata and avoid claiming manuscript equivalence until confirmed.

### Category C: scientific interpretation -- Ryan/analysis team owns

Examples include:

- whether complete elimination is an appropriate policy analogue for current restrictions;
- how strongly to interpret rurality or Medicaid associations;
- whether the assumptions justify calling the result a conservative lower bound;
- whether partial-cut simulations are needed for publication or policy use.

The portal should use calibrated language and reproduce the approved interpretation. The application team can flag when copy exceeds what the displayed analysis supports, but should not substitute its own scientific conclusion.

### Recommended communication posture

Do not send Ryan an adversarial peer review. Send a concise "paper/app reconciliation" note organized around quantities the application must implement:

1. We found that 16,193 is diagnoses while incidence is 21,483. Which should the paper and app lead with?
2. Should the app retain gross care cost per $1 avoided while reporting NCER alongside it?
3. Which national aggregation convention should be authoritative?
4. Is median ART price the primary case, with low/high as sensitivities?
5. What exact label should describe the modeled geographic aggregate?
6. Are ADAP spending, inflation, and payer-perspective conventions final?
7. Is DC ready for public interpretation?

This framing respects scientific ownership while preventing the application from manufacturing answers to unresolved questions.

## Engineering and Reproducibility Follow-Through

### Required before regenerating repository artifacts

- Remove hardcoded assumptions stating "30 states" and "DC excluded."
- Generate scope language from `metadata.modeledStates`.
- Require and export both incidence and diagnoses.
- Correct `sexualTransmissionRate` to the manuscript definition.
- Decide whether the primary estimand is a fixed price tier or pooled convention.
- Add stable source identifiers, file hashes, analysis commit/ref, and generation timestamp rather than relying only on private absolute paths.
- Update schemas and cross-checks for DC and the new outcome fields.

### Minimum automated checks

1. `Total` equals the within-simulation jurisdiction sum for every required outcome and intervention.
2. Modeled-jurisdiction count in metadata equals the actual output count.
3. Infection and diagnosis fields are mapped from different source outcomes.
4. Gross per-dollar ratio equals NCER + 1 within rounding.
5. Transmission rate matches numerator divided by unsuppressed prevalence.
6. Price-tier selection changes every chart and headline that claims to use it.
7. Mechanism components close within simulation if the mechanism chart is retained.
8. No generated public copy contains stale DC-exclusion or 30-state-only statements.

## Recommended Product Decision

Do not expand the application into a larger dashboard. The current narrative architecture is fundamentally sound.

The recommended scope is:

1. correct the data semantics and DC scope;
2. preserve the trajectory, horizon, state table, and price sensitivity;
3. repair the cascade;
4. extend the existing heterogeneity scatter to the paper's four variables;
5. remove or redefine the mechanism chart;
6. move internal questions to a companion document;
7. obtain Ryan's decisions on the small set of analysis conventions that materially change displayed values.

That produces a focused companion to the paper rather than either a literal manuscript reproduction or an independent scientific analysis product.
