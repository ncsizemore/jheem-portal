# Ryan White ADAP Costing: Current Build and Corrected-Draft Review

**Review date:** 2026-07-14

**Status:** Current fresh-eyes review; supersedes prior application-design conclusions

**Inputs:** Current portal at commit `5db2cb0`, July 8 RData artifact, and Ryan's July 13 corrected manuscript/supplement package

## Bottom Line

The current build is thoughtful and technically capable, but it is not yet a shareable paper companion. It still reads as an exploratory dashboard assembled around the available data rather than as the clearest web expression of the paper's evidence and argument.

The next pass should be an alignment and editorial pass, not another additive feature pass. The primary page should closely reproduce the paper's analytical spine:

1. the full-horizon result and its scope;
2. Florida and modeled-jurisdiction cost trajectories shown together;
3. jurisdiction NCER distributions at 2035;
4. the four jurisdiction-context comparisons shown as a coherent set;
5. a compact sensitivity and methods treatment.

The global horizon control, all-jurisdiction crossover timeline, large price-decomposition section, and extensive public provenance table are interesting extensions, but they currently compete with the manuscript's story and introduce estimands the paper does not directly report. They should be removed from the primary reading path or demoted until the paper/application conventions are reconciled.

This conclusion comes from a new read of the current source and the corrected package. It does not rely on the older design reviews.

## Review Method and Limits

- The accepted text and tables were extracted independently from the two replacement DOCX files.
- The replacement documents were diffed against the prior draft.
- All embedded manuscript figures and the supplement's Figure S3 were inspected at native resolution.
- Corrected supplemental table values were compared with the current generated app data.
- The current React application, view model, generator, metadata, and generated JSON were inspected directly.
- The in-app browser was unavailable during this pass. Full rendered-page and interaction QA remains an explicit gate before sharing.
- LibreOffice is not installed in this environment, so the replacement Word files could not be paginated and inspected page by page. This review covers accepted text, tables, tracked content, and figures, not Word pagination.

## What Ryan's Update Actually Changes

The replacement package contains only a manuscript and supplement. It does not contain a new RData artifact or the corrected supplemental-table generation script.

The supplement changes materially:

- DC is added to Tables S6 and S7 and to the figures.
- Florida's annual and cumulative cost table is regenerated.
- State-level cost, net-cost, and NCER values are regenerated and reported with more precision.
- The main jurisdiction NCER values now use the pooled three-tier convention represented in the supplement.
- Figure 2 correlations change after adding DC and using the paper's pooled convention.

The update does not make all manuscript and supplement numbers consistent. Several important inconsistencies remain.

## Remaining Paper/Supplement Inconsistencies

| Issue | Corrected manuscript | Corrected supplement / arithmetic | Consequence |
| --- | --- | --- | --- |
| Florida cumulative care cost | `$2.83B [$0.69B-$4.09B]` | Table S5/S6: `$2.40B [$0.341B-$5.59B]` | The prose mixes the median-price trajectory value with the pooled NCER result. |
| Florida NCER translation | NCER `2.26` is described as `$2.26` in care cost per `$1` saved | Under the stated formula, gross care cost per dollar is `NCER + 1`, or `$3.26`; Table S6 values imply about `$3.25` | The main policy translation is arithmetically wrong. |
| Aggregate NCER translation | Discussion says each dollar saved incurs `$1.72` in downstream care cost | NCER `1.72` means `$1.72` net cost beyond the avoided dollar and `$2.72` gross care cost per dollar | Same definition error at aggregate level. |
| Florida crossover | Prose says costs surpass spending by 2032 | Table S5 first has median cumulative care above cumulative ADAP in 2030 (`$404.0M` vs `$396.1M`) | The timing claim is not tied to a stable convention. |
| Final spending claim | Final paragraph calls `$17.51B` "additional net healthcare spending" | Table S6 reports `$17.54B` gross care cost and `$11.07B` net cost | Gross cost and net cost remain conflated. |
| Suppressed-on-ADAP association | Results/Figure 2: rho `0.62` | Discussion: rho `0.54` | One correlation remains internally inconsistent. |
| Medicaid expansion | North Carolina is shown as non-expansion | North Carolina implemented expansion on December 1, 2023 | The 2025 classification, coloring, group ranges, and Wilcoxon comparison need rerunning. |
| Geographic aggregate | Figures say `US Total` | The model covers 30 states plus DC, not all US jurisdictions | The label overstates geographic coverage. |

The official North Carolina Medicaid source for the implementation date is: <https://medicaid.ncdhhs.gov/north-carolina-expands-medicaid>.

## Paper, Artifact, and App Are Using Different Conventions

The differences are not explained by rounding alone.

### Paper/supplement convention

- Table S6 pools all three ART-price tiers with model draws for state NCER summaries.
- Its aggregate is produced by the supplemental-table aggregation procedure rather than the RData `Total` draw pairing.
- It uses approximately `$6.45B` cumulative ADAP spending across the modeled jurisdictions.
- It reports aggregate care cost `$17.54B [$12.75B-$22.95B]` and NCER `1.72 [0.97-2.54]`.

### Current app convention

- The default is the fixed median ART-price scenario.
- The modeled total is the RData `Total`, preserving within-simulation jurisdiction pairing.
- The funding CSV is explicitly inflated from 2025 to 2026 with the medical-care CPI.
- At 2035 it reports care cost `$18.17B`, ADAP spending avoided `$6.58B`, net cost `$11.59B`, and NCER `1.76` under the median tier.
- Its pooled RData-total care estimate is `$15.98B` with a much wider interval because it preserves the joint model draws and pools tiers differently from the supplemental aggregate.

### Why this matters

The app cannot truthfully say it "reproduces" the manuscript while using the current default. Conversely, hard-coding the paper's values would discard the stronger provenance and validation of the artifact-derived pipeline.

The corrected calculation script or a machine-readable corrected result table is needed to reproduce Ryan's revised convention exactly. The replacement DOCX files alone are not a durable computational source.

## Current Application, Section by Section

### Opening / headline

**What works**

- The scope caveat is unusually good: it calls the scenario a stress test and avoids presenting the result as a federal budget score.
- Separating the modeled health pathway from the accounting comparison fixes an important conceptual problem.
- NCER is defined correctly in the app, including the `NCER + 1` gross-cost translation.

**What does not yet work**

- "Median" refers both to the median simulation result and to the median ART-price tier. That distinction is too subtle for the dominant headline.
- The headline convention does not match the paper's reported pooled result.
- NCER is still the largest number even though it is the least intuitive quantity for a general reader.
- The first screen asks the reader to process a headline, scope note, NCER card, horizon slider, sparkline, epidemiologic chain, and accounting chain before reaching the first figure.
- The global horizon control turns the page into a family of unreported interim analyses. It is not needed to communicate the paper's primary 2035 result.

**Recommendation**

Lead with the full-horizon gross care cost, ADAP spending comparator, and net consequence in plain language. Keep NCER as the manuscript metric immediately below. Remove the global horizon slider from the primary page; the time trajectory already explains timing.

### Section 1: Over time

**What works**

- The cumulative cost-versus-spending trajectory is the clearest representation of the paper's central argument.
- Interactive tooltips and a selected-jurisdiction view are useful web-native additions.

**What does not yet work**

- The paper places Florida and the aggregate side by side; the app makes the reader toggle between them.
- The chart shows one 95% band while the paper shows both 50% and 95% bands.
- The app uses a fixed price tier while the paper combines conventions across Figure 1, the prose, and Table S6.
- The crossover timeline is a large novel analysis. It makes annual median crossings look more exact and validated than the paper currently supports.
- The paper's own Florida crossover is inconsistent with its corrected table, so an all-jurisdiction crossover feature should not be prominent yet.

**Recommendation**

Show Florida and the modeled-jurisdiction total together as two linked panels at 2026-2035, matching Figure 1A/B. Add 50% and 95% bands only after the calculation convention is fixed. Remove the all-jurisdiction crossover timeline from the main path; a short, carefully defined crossover annotation is enough.

### Section 2: Jurisdiction variation

**What works**

- A ranked interval plot is easier to read than the paper's dense boxplot panel.
- Exact values and jurisdiction selection are useful and accessible.
- Correcting North Carolina's 2025 expansion status is substantively right.

**What does not yet work**

- The app's fixed median-price NCER values do not match the pooled jurisdiction values in Figure 1C and Table S6. Florida is `2.80` in the app default versus `2.26` in the corrected supplement.
- The paper's Table S6 emphasizes excess diagnoses and ART person-years; the app's exact table emphasizes excess infections and omits those two columns.
- The default selected view is the modeled total, which is not a row in the jurisdiction chart. The adjacent card therefore does not behave as a clear selected-jurisdiction explanation.
- The selected result card and baseline-context card expose more than twenty values at once.
- The fixed-2035 "draws above zero" column remains on screen even when the global horizon changes, creating a mixed-time table.

**Recommendation**

Use the finalized paper convention for the primary 2035 jurisdiction comparison. Show diagnosis, ART person-years, care cost, ADAP comparator, net cost, and NCER in the exact table; keep infections in the detail view. Default the detail panel to Florida or an explicit "select a jurisdiction" state. Reduce the visible detail to the handful of values needed to interpret the selected row.

### Section 3: Jurisdiction context

**What works**

- The app correctly avoids regression lines and causal language.
- It reports Spearman rho, sample size, point-size encoding, and expansion status.
- The interaction links jurisdiction selection across displays.

**What does not yet work**

- The paper's argument is the comparison among four panels. Hiding three behind an axis selector makes that comparison harder, not easier.
- The app says it reproduces the manuscript panels, but its current median-tier correlations are approximately `0.08`, `-0.59`, `0.59`, and `-0.60`; the corrected paper reports `0.11`, `-0.62`, `0.62`, and `-0.62`.
- Letting the global horizon change the correlations creates analyses not presented in the paper.
- Expansion status is encoded largely by color; shape or outline should also distinguish groups.
- The paper's North Carolina classification is wrong, so exact paper reproduction and correct policy labeling currently conflict.

**Recommendation**

Show all four plots as responsive small multiples at 2035, with linked hover/selection. Use neutral descriptive copy. Finalize the results convention, then recompute the four correlations and the expansion grouping together.

### Section 4: ART-price sensitivity

**What works**

- Separating fixed price scenarios from model-draw uncertainty is a scientific improvement over silently pooling them.
- Low/median/high selection is useful for a technical reader.

**What does not yet work**

- This secondary issue receives the same visual weight as the paper's principal figures.
- The pooled row is neither a true fourth scenario nor a probability distribution unless equal weights over tiers are explicitly justified.
- Comparing a 95% interval width with a low-to-high median shift looks like an uncertainty decomposition even though the copy disclaims that interpretation.
- The relationship between the paper-reported pooled estimate and the page-wide fixed-tier estimate remains confusing.

**Recommendation**

Replace the section with a compact 2035 sensitivity table or three-row interval display. Do not present the pooled tier mixture as ordinary probabilistic uncertainty. If the paper retains pooled results, label them explicitly as the paper's equal-weight reporting convention.

### Section 5: Methods and assumptions

**What works**

- Included and excluded costs are unusually explicit.
- The modified healthcare-system perspective and cost-consequence framing are correctly distinguished from cost-effectiveness analysis.
- Artifact provenance and hashes are valuable internally.

**What does not yet work**

- The public section reads like an engineering audit: ten dense blocks, cryptic parameter names, hashes, and generator details.
- The single most influential assumption—the elicited mean 65% decline in viral suppression, with 40%-90% IQR—is missing.
- Re-engagement is shown as `pi` and `lambda` instead of the paper's plain-language 60% within one year and 86% within five years.
- The meaning of the $18.5K/$33K/$47.4K tiers is not stable between manuscript and supplement wording.
- The section has no compact citation trail to the model, elicitation, cost inputs, or funding source.

**Recommendation**

Use four reader-facing method groups: scenario and core effect assumption; costing cohort and care engagement; accounting perspective and included/excluded costs; uncertainty and scope. Put file hashes and generator provenance in an expandable technical note or repository documentation.

## Recommended Primary Page

### 0. Orientation

- Complete ADAP-elimination stress test, 2026-2035.
- 30 modeled states plus DC; not an all-US estimate.
- Plain-language full-horizon care cost, ADAP comparator, net result, and NCER.
- One short sentence describing what is and is not counted.

### 1. The result over time

- Florida and modeled-jurisdiction total side by side.
- Same scales/conventions as Figure 1A/B, with linked tooltips.
- Clear uncertainty-band definition.

### 2. How jurisdictions vary

- Ranked 2035 NCER interval/box display for all 31 jurisdictions.
- Correct expansion classification.
- Compact selected-jurisdiction result.
- Expandable exact table aligned with Table S6.

### 3. What is associated with that variation

- Four 2035 small multiples matching Figure 2.
- Spearman rho and `n = 31`.
- Descriptive, non-causal copy.

### 4. Sensitivity and interpretation

- Compact low/median/high ART-price comparison.
- Plain-language accounting formula.
- Included/excluded costs and core assumptions.

### Technical appendix

- Data provenance, hashes, aggregation convention, validation checks, and downloadable exact values.

## Required Reconciliation Before Final Numeric Alignment

These are implementation decisions, not an adversarial scientific review:

1. Provide the corrected supplemental-table script or corrected machine-readable output.
2. Choose the public primary result: fixed median ART-price tier or pooled equal-weight tiers.
3. Choose the aggregate: RData within-simulation `Total` or independent jurisdiction resampling.
4. Confirm whether the funding CSV is nominal 2025 and should be inflated to 2026, as the supplement Methods says.
5. Correct the NCER translation in manuscript prose.
6. Reconcile Florida's `$2.83B` versus `$2.40B` care cost and its crossover year.
7. Correct the final `$17.51B` net-spending statement.
8. Reclassify North Carolina and rerun the expansion comparison.
9. Replace `US Total` with a modeled-jurisdiction label unless the authors deliberately accept the limitation.

## Engineering Assessment

### Strengths

- Runtime schemas and generated metadata make silent data drift less likely.
- The generated series is fetched lazily rather than embedded in the initial component.
- Pure view-model functions isolate much of the numerical transformation logic.
- URL state, accessible exact tables, reduced-motion handling, and source hashes are strong craft decisions.
- The data generator validates the RData `Total` against jurisdiction sums and distinguishes infections from diagnoses.

### Weaknesses and next SWE pass

- `RyanWhiteCostingApp.tsx` is about 2,000 lines and owns page state, data loading, copy, charts, tooltips, controls, and methods content.
- `view-model.ts` is about 900 lines and has no dedicated automated test suite.
- The 221 KB summary JSON is imported into the client bundle, including quantiles not needed on initial render.
- Several displays derive novel quantities from a global horizon state, increasing the test surface and the chance of mixed conventions.
- Color still carries important meaning in several places without a redundant encoding.
- The custom interactive SVG scatter points need keyboard/screen-reader verification in a real browser.

After the editorial structure is stable, split the application into section components, centralize the selected results convention, add unit tests for all ratios/aggregations/correlations, and add browser-level smoke tests for URL state, keyboard selection, responsive layouts, and chart/table agreement.

## Recommended Next Move

Do not add more plots. First simplify the primary page to the five-part paper companion above and keep the unresolved result convention explicit in code and metadata. Request Ryan's corrected script/machine-readable table as part of the eventual reconciliation note, but continue the structural/editorial implementation without waiting for every scientific decision.

Before sending Ryan a link, require:

- numeric convention chosen and reproduced;
- manuscript/app terminology reconciled;
- every section visually reviewed at desktop and mobile widths;
- table/chart agreement tests passing;
- the separate reconciliation note reduced to a short, neutral set of implementation questions.

## July 14 Implementation Checkpoint

The first structural slice from this review has now been applied in the working tree:

- the opening result leads with net cost, care cost, and the ADAP comparator before NCER;
- the health-pathway/accounting detail is collapsed by default;
- Florida and the modeled-jurisdiction trajectory are visible together;
- the all-jurisdiction crossover display is demoted to an optional detail;
- jurisdiction, context, and price-sensitivity comparisons are fixed to 2035 rather than changing with the exploratory budget window;
- the exact jurisdiction table now leads with excess diagnoses and ART person-years, matching the costing cohort in Table S6;
- selected-jurisdiction and baseline cards use progressive disclosure instead of showing every metric at once;
- all four manuscript context plots are visible as small multiples;
- the nonstandard comparison of interval width with price-tier shift has been removed;
- the methods section now foregrounds the 65% elicited suppression decline, plain-language care engagement, the accounting frame, and excluded costs; technical hashes are collapsed.

This slice retains the artifact-derived fixed-price convention while the corrected script and reporting choices remain unresolved. Production build, TypeScript, direct ESLint, and data-contract validation pass. Rendered browser QA remains outstanding because the in-app browser was unavailable.
