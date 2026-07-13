# Ryan White ADAP Costing: Paper/Application Reconciliation Questions

**Prepared:** 2026-07-13

**Audience:** Ryan and the analysis team

**Status:** Decisions requested before final scientific/editorial sign-off

## Purpose

These are the small number of analysis decisions needed to make the paper and web application describe the same quantities. They are framed as implementation choices rather than a scientific peer review.

The application currently uses explicit provisional conventions so engineering can continue. A decision below may change displayed values or language, but none requires rebuilding the application architecture.

## Decisions Needed

| Topic | Question for Ryan | Current application convention | Why it matters |
| --- | --- | --- | --- |
| Health outcome | Should the paper and application lead with incident infections, new diagnoses, or show both with diagnoses identified as the costing cohort? | Both are exported and shown separately. Excess diagnoses drive ART starts and downstream care costs because that is what the current costing code uses. | The July artifact gives different 2026-2035 modeled-jurisdiction medians: 143,347 excess infections and 105,730 excess diagnoses. |
| Headline values | Which artifact and aggregation convention should supply the paper's aggregate headline? | The application uses the July 8 RData `Total` location and median ART-price tier by default. At 2035 this yields $18.17B in downstream care cost and $11.59B net cost, rather than the draft manuscript's $17.54B and its stated intervals. | The app should not silently reproduce draft-paper values that differ from the latest provided artifact. |
| Ratio framing | Should NCER remain the primary outcome, with gross downstream care cost per $1 of ADAP spending avoided as an explanatory translation? | The application leads with NCER, defines it as net cost divided by ADAP spending avoided, and explains that gross care cost per $1 avoided equals NCER plus one. | The Florida Results paragraph currently interprets NCER 2.26 as $2.26 in care cost per $1 saved; under the stated formula, it corresponds to $3.26 in care cost per $1 saved. |
| National aggregation | Should the aggregate uncertainty preserve shared simulation draws across jurisdictions, or independently bootstrap jurisdiction summaries as in the draft supplement? | The `Total` location is used, which is the within-simulation sum of the 31 modeled jurisdictions. | The aggregation choice materially changes the national interval and must be named consistently. |
| ART price | Is the median ART-price tier the primary case, with low/high as sensitivity analyses? Should the pooled three-tier distribution remain anywhere? | Median price is the default and the selected tier applies page-wide. Pooled output is retained only for uncertainty comparison. | Three discrete price assumptions are scenarios, not automatically a probability distribution. |
| Geographic scope | Is DC ready for public interpretation, and should the paper's tables and geographic language be updated to include it? | DC is included in modeled outcomes, funding totals, and the 31-jurisdiction aggregate. The aggregate is labeled “modeled-jurisdiction total,” not “United States.” | The July 8 artifact added DC but does not add the other 20 states. |
| Dollar and funding conventions | Are the funding CSV values 2025 nominal dollars? Should funding be inflated to 2026 dollars, and should the routine-care input be converted from 2023 to 2026 dollars? Does `part_b` include ADAP? | Funding is adjusted from 2025 to 2026 with the medical-care CPI; routine care is adjusted from 2023 to 2026. ADAP is used as the principal comparator. | The draft prose and scripts do not use these conventions consistently. |
| Interpretation of heterogeneity | Which baseline variables should appear in the paper/application, and how strongly should their descriptive associations be characterized? Is Medicaid-expansion status intended as grouping context rather than a causal explanation? | The application treats associations as descriptive and does not fit regression lines. Strong causal language is avoided pending confirmation. | The state/jurisdiction sample is selected, small, and potentially confounded; plotted correlations do not establish policy mechanisms. |
| Medicaid expansion classification | Which policy-year classification should be used, and should the manuscript analysis be rerun with the corrected list? | The application uses ACA expansion status for the 2025 baseline year; North Carolina is classified as expansion. | The current figure script's `non_expansion` vector includes North Carolina and South Dakota despite both having implemented expansion before 2025. This can change colors, group ranges, and the reported Wilcoxon comparison. |

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
- The four manuscript context relationships can be reproduced from the latest artifact and source inputs at the median 2035 tier: transmission rate ρ = 0.08, ADAP spending per client ρ = -0.59, suppressed PWH supported through ADAP ρ = 0.59, and diagnosed-HIV-weighted urbanicity ρ = -0.60.

The former internal “Questions to resolve” panel has been removed from the public application. This document is the companion review artifact to share with the application link when the build is ready.
