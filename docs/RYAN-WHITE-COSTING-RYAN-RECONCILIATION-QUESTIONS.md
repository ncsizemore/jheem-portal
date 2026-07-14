# Ryan White ADAP Costing: Paper/Application Reconciliation Questions

**Prepared:** 2026-07-13; updated 2026-07-14 for Ryan's corrected draft

**Audience:** Internal working draft; eventually Ryan and the analysis team

**Status:** Not ready to send. Reduce and polish after the next application pass.

## Purpose

These are the small number of analysis decisions needed to make the paper and web application describe the same quantities. They are framed as implementation choices rather than a scientific peer review.

The application currently uses explicit provisional conventions so engineering can continue. Ryan's replacement package contains revised Word documents but not the corrected supplemental-table script or a new RData artifact. A decision below may change displayed values or language, but none requires rebuilding the application architecture.

## Decisions Needed

| Topic | Question for Ryan | Current application convention | Why it matters |
| --- | --- | --- | --- |
| Reproducible corrected output | Could you share the corrected supplemental-table generation script or its machine-readable output? | The app is generated directly from the July 8 RData and the provided funding/context inputs. | The replacement supplement changes state cost results, but DOCX tables are not a durable computational source and the revised script is needed to reproduce the change exactly. |
| Health outcome | Should the paper and application lead with incident infections, new diagnoses, or show both with diagnoses identified as the costing cohort? | Both are exported and shown separately. Excess diagnoses drive ART starts and downstream care costs because that is what the current costing code uses. | The July artifact gives different 2026-2035 modeled-jurisdiction medians: 143,347 excess infections and 105,730 excess diagnoses. |
| Headline values | Which artifact, ART-price convention, and aggregation convention should supply the aggregate headline? | The application uses the July 8 RData `Total` location and median ART-price tier by default. At 2035 this yields $18.17B in downstream care cost, $6.58B in ADAP spending avoided, and $11.59B net cost. | The corrected paper reports $17.54B, $6.45B, and $11.07B under a different combined convention. The app should not silently claim those are the same result. |
| Ratio framing | Should NCER remain the primary outcome, with gross downstream care cost per $1 of ADAP spending avoided as an explanatory translation? | The application leads with NCER, defines it as net cost divided by ADAP spending avoided, and explains that gross care cost per $1 avoided equals NCER plus one. | The Florida Results paragraph currently interprets NCER 2.26 as $2.26 in care cost per $1 saved; under the stated formula, it corresponds to $3.26 in care cost per $1 saved. |
| Florida values and crossover | Should the Florida example use the fixed median-price trajectory or the pooled result? What is the intended first crossover year? | The app keeps a selected price tier internally consistent across cost, net cost, NCER, and crossover. | The corrected manuscript still gives $2.83B care cost and NCER 2.26, while corrected Table S5/S6 gives $2.40B with NCER 2.26. Table S5 first exceeds median spending in 2030, while the prose says 2032. |
| Aggregate construction | Should aggregate uncertainty preserve shared simulation draws across jurisdictions, or independently resample jurisdiction results as in the supplement? | The RData `Total` is used, which is the within-simulation sum of the 31 modeled jurisdictions. | The choice materially changes the aggregate interval and must be named consistently. |
| ART price | Is the median ART-price tier the primary case, with low/high as sensitivities? If equal-weight pooling is retained for the paper, where should it appear in the app? | Median price is the default and the selected tier applies page-wide. Pooled output is retained only for comparison. | Three discrete price assumptions are scenarios, not automatically a probability distribution. The corrected Table S6 jurisdiction values use the pooled convention. |
| Geographic scope | Is DC ready for public interpretation, and should the paper's tables and geographic language be updated to include it? | DC is included in modeled outcomes, funding totals, and the 31-jurisdiction aggregate. The aggregate is labeled “modeled-jurisdiction total,” not “United States.” | The July 8 artifact added DC but does not add the other 20 states. |
| Dollar and funding conventions | Are the funding CSV values 2025 nominal dollars, and should they be inflated to 2026 as the supplement Methods says? Should the routine-care input be converted from 2023 to 2026? Does `part_b` include ADAP? | Funding is adjusted from 2025 to 2026 with the medical-care CPI; routine care is adjusted from 2023 to 2026. ADAP is used as the principal comparator. | Corrected Table S6 uses about $6.45B cumulative ADAP spending; the CPI-adjusted app uses $6.58B. The convention changes every ratio. |
| Interpretation of heterogeneity | Which baseline variables should appear in the paper/application, and how strongly should their descriptive associations be characterized? Is Medicaid-expansion status intended as grouping context rather than a causal explanation? | The application treats associations as descriptive and does not fit regression lines. Strong causal language is avoided pending confirmation. | The state/jurisdiction sample is selected, small, and potentially confounded; plotted correlations do not establish policy mechanisms. |
| Medicaid expansion classification | Should the manuscript analysis be rerun using expansion status at the 2025 baseline? | The application classifies North Carolina as expansion. | The corrected figure/table still classify North Carolina as non-expansion even though implementation began December 1, 2023. This can change colors, group ranges, correlations, and the Wilcoxon comparison. |

## Secondary Confirmations

These do not currently block implementation, but should be settled in methods or limitations:

1. What payer perspective governs the net-cost calculation, given that some downstream care could itself be ADAP/RWHAP eligible?
2. Should negative per-simulation incremental outcomes remain preserved, as they are now, or be handled in a sensitivity analysis?
3. Should results be described as conservative lower bounds, and if so, which omitted costs justify that characterization?
4. Should the complete-elimination intervention be described strictly as a stress test rather than a direct analogue for partial funding restrictions?

## Implementation Facts for Reference

- The July 8 RData is a completed-output snapshot, not a runnable simulation collection.
- It contains 1,000 draws for 30 states plus DC and a `Total` location.
- Existing jurisdiction slices are unchanged from the April artifact; DC is the only newly added jurisdiction.
- `total.incidence` matches the `incidence` outcome in `total.results` exactly.
- `total.new` matches the `new` outcome in `total.results` exactly.
- The application's aggregate uses the RData `Total`, which exactly equals the within-simulation jurisdiction sum.
- The corrected package contains replacement manuscript and supplement DOCX files only; it does not provide a new RData or corrected table-generation script.
- Corrected Table S6 reports aggregate care cost $17.54B [$12.75B-$22.95B], ADAP spending $6.45B, net cost $11.07B, and NCER 1.72 [0.97-2.54].
- Corrected Table S5/S6 reports Florida care cost $2.40B [$0.341B-$5.59B], ADAP spending $737.7M, net cost $1.66B, and NCER 2.26 [-0.54-6.58]. The manuscript prose retains the prior $2.83B care-cost value.
- At the app's median-price 2035 convention, the four context relationships are transmission rate rho = 0.08, ADAP spending per client rho = -0.59, suppressed PWH supported through ADAP rho = 0.59, and diagnosed-HIV-weighted urbanicity rho = -0.60. The corrected paper's pooled convention reports 0.11, -0.62, 0.62, and -0.62.

The former internal “Questions to resolve” panel has been removed from the public application. Before sharing this document, reduce it to the smallest set of decisions still unresolved after the next build pass.
