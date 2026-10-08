# Portal Figures vs. Published Papers: Discrepancies to Reconcile

Status: open, review later (noted 2026-10-08 while building `/work-with-us`).
Neither item blocks current work; both are places where the portal shows numbers
that differ from the published papers.

## 1. Aging page

The aging paper is now published:

> Zalesak A, Kasaie P, Dansky Z, Althoff KN, Dowdy DW, Shah M, Fojo AT, Schnure M.
> Projected Aging Among People With HIV in the US. *JAMA Netw Open*. 2026;9(9):e2632299.
> doi:10.1001/jamanetworkopen.2026.32299. PMID 42696278.

Its abstract reports, across 24 states, 2025 to 2040:

- Median age of adults with diagnosed HIV: **51 → 61** (95% CrI 59–63 in 2040)
- Adults with diagnosed HIV older than 65 in 2040: **46%** (95% CrI 43%–48%)

The portal's `/aging` page still shows the pre-publication figures:

| Location | Current text | Published |
|---|---|---|
| `src/app/aging/page.tsx` (intro paragraph) | "will rise from 51 to 62 years" | 51 to 61 |
| `src/app/aging/page.tsx` (stat tile) | `51→62` | 51→61 |
| `src/app/aging/page.tsx` (stat tile) | `50%+` aged 65+ by 2040 | 46% |

`/work-with-us` uses the published figures, so the two pages disagree until this is resolved.

### Open question before editing

Is only the page text stale, or is the underlying data too? The chart data
(`src/data/hiv-age-projections-aggregated.json`, plus the sex/race variants) was
integrated in October 2025, before publication. If the published analysis used a
later model run, the charts may need refreshing along with the text; if not, only
the three strings above need to change.

Check with the paper's authors (Andrew Zalesak / Melissa Schnure) which run the
published numbers come from, then either:

1. Update the text only (data unchanged), or
2. Regenerate the aggregated JSON from the published run and update the text.

Also add the published citation to the `/aging` page, which currently has none.

## 2. Ryan White city explorer hover cards

The MSA explorer's hover cards read `city-summaries.json` from CloudFront
(`/ryan-white/city-summaries.json`, generated 2026-03-02). Its cessation figures
don't match the published paper (Forster et al., *Ann Intern Med* 2025,
doi:10.7326/ANNALS-25-01737) or the `/ryan-white` landing page:

| Figure | `city-summaries.json` | Published / landing page |
|---|---|---|
| 31-city additional infections, 2025–2030 | 79,153 (sum of per-city `cessationIncreaseAbsolute`) | 75,436 |
| 31-city relative increase | ~51% (summed absolute ÷ summed baseline medians) | 49% |
| Highest city | Baltimore +116% | Baltimore +110% (range 9%–110%) |
| Lowest city | Riverside +9% | Riverside +9% |

The likely cause is method, not a bug: the summaries compute the increase from
separate baseline and cessation medians (a ratio or difference of medians),
while the paper reports the median of per-simulation differences. Summing
per-city medians also doesn't give the median of the 31-city total.

### To decide

Whether the hover cards should show the published per-city estimates (from the
paper's tables or the analysts), or compute the per-simulation statistic in the
summary generator. Any chart of these results on a public page should use the
published values so it agrees with the text beside it.
