# Ryan White ADAP Costing: September 2026 Results Refresh and Summary Page

**Status:** Implemented and locally validated 2026-09-29

**Summary route:** `/ryan-white-costing`

**Technical route:** `/ryan-white-costing/technical`

**Compatibility redirect:** `/ryan-white-costing/summary` → `/ryan-white-costing`

## Purpose

This pass adds a plain-language landing page for policy and non-modeling audiences while preserving the detailed technical explorer. Both views consume the same regenerated data contract.

## Canonical analysis source

- Repository: `tfojo1/jheem_analyses`
- Commit: `6da16694bd7dfe0a1010d124f07321297ea10185` (`Updated for website use`, 2026-09-28)
- Analysis script: `applications/ryan_white/Ryan_white_costing/cost_saving_analysis_2.R`
- Supplemental script: `applications/ryan_white/Ryan_white_costing/ADAP_Supp_tables_figures.R`
- Model output: `ADAP_input_state_costing2026_2026-07-08.Rdata`

The updated analysis still loads the July 8 RData. The numerical refresh is caused by revised costing and aggregation code, not by a replacement simulation object.

## Methodological changes reproduced by the portal exporter

1. Immediate ART initiation uses the time-varying `suppression / diagnosed.prevalence` ratio from the ADAP-elimination intervention for each location, simulation, and year.
2. The state-specific ADAP-disruption multiplier is no longer applied a second time to immediate initiation.
3. Delayed return to care is disabled in the primary specification (`hel_pi = 0`).
4. The pooled modeled-jurisdiction total uses the RData's built-in `Total` simulation rows.
5. The previous independent jurisdiction bootstrap is removed.
6. Pooled summaries continue to give equal weight to all three ART-price tiers and all model simulations.

These changes are recorded in data-contract version `3.0.0` and in `metadata.json`.

## Effect on the headline result

All figures cover the 30 modeled states and Washington, DC through 2035 and use the equal-weight pooled convention.

| Measure | Previous portal result | Refreshed result |
| --- | ---: | ---: |
| ADAP spending avoided | $6.6B | $6.6B |
| Median HIV care cost | $14.9B | $11.2B |
| Median net cost | $8.3B | $4.7B |
| Net-cost middle 95% | $4.7B to $12.1B | −$4.9B to $16.1B |
| Pooled results with cost above savings | 100% | 81.1% |
| Median crossover year | 2032 | 2033 |

The refreshed median remains net-costly, but the modeled range now includes both net savings and net costs. Public copy therefore reports the median result together with “81 of every 100 modeled results” and a plainly labeled likely range.

## Public communication decisions

- The summary says “complete ADAP elimination” rather than treating the analysis as evidence about any partial cut.
- The 31-jurisdiction aggregate is not called a national or US total.
- “Modeled results” replaces “simulations” for pooled sign probabilities because pooling combines price assumptions and simulation variation.
- “Likely range” is defined in the page footnote as the middle 95% of pooled modeled results.
- Payer language is framed as a budget-incidence caution; payer shares are not modeled.
- Omitted costs are described as limits on the ledger rather than proof of a precise lower bound.
- Public values use one decimal for billions, whole thousands for large counts, and two decimals for the cost-per-dollar ratio.

## Shared implementation

- `scripts/generate-ryan-white-costing-data.R` remains the canonical portal exporter.
- `src/data/ryan-white-costing/summary.json` supplies final-year national and jurisdiction summaries.
- `public/data/ryan-white-costing/series.json` supplies annual paths for both pages.
- The summary derives state narratives, likelihood statements, and crossover years from those artifacts rather than hard-coded figures.
- The technical explorer retains detailed terminology, price-tier sensitivity, jurisdiction comparisons, context plots, and provenance.

## Verification completed

- Independent base-R reproduction for all 31 jurisdictions and the built-in `Total` rows.
- Data-contract validation for 31 jurisdictions, ten annual points, infections, diagnoses, funding closure, and pooled cost identities.
- TypeScript check, ESLint, and production Next.js build.
- Rendered browser QA at 1440 × 1000 and 390 × 844.
- State conditional checks for a net-costly jurisdiction (Tennessee) and a net-saving jurisdiction (District of Columbia).
- Summary redirect and summary/technical cross-links.
- No browser console warnings or errors and no document-level horizontal overflow.

## Review note

The figures supplied in the summary-page request (`$14.9B` care cost and `$8.3B` net cost) reproduce the earlier portal convention, not the September 28 analysis. Reviewers should evaluate the refreshed figures above when comparing the website with the next manuscript or supplement draft.
