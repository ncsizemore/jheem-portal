# Aging study: complete page review

## Scope and design

Bring the aging study into the portal's established editorial design while preserving its interactive comparisons. The earlier page combined a large client-rendered introduction, nested decorative panels, duplicated controls, and crowded charts on mobile.

- Lead with the research question and a compact published finding. Keep the introduction, publication and explanatory material server-rendered.
- Use one shared comparison workspace for overall, race/ethnicity, and transmission-category views. Shared state, years, units and age filters govern charts, tables and downloads consistently.
- Use an ordered light-to-dark age palette and static bars. Full state names, clear count-scale guidance, native controls and per-chart data tables make the workspace usable on narrow screens and by keyboard.
- Treat model-fit evidence as a secondary, on-demand section. Retain both outcomes and all five age groups, add tables, and use readable one-/two-/three-column layouts. Replace the white-mask credible-band rendering with a true range area; correct duplicate rounded ticks and floating-point tick labels.
- Keep the comparison limit of 25 panels, but make any reduction explicit rather than silently omitting charts. Empty selections remain empty after reload. Preserve inactive breakdown selections and restore choices with browser back/forward.
- Replace timing-dependent DOM screenshot exports with snapshots of the rendered SVGs. PNG exports include titles, period, units, legend and the interval caveat; large exports have bounded canvas dimensions. CSVs and tables reflect selected age groups while retaining all five groups in percentage denominators.

## Scientific checks

Verified against the published article and PubMed:

- https://pubmed.ncbi.nlm.nih.gov/42696278/
- https://doi.org/10.1001/jamanetworkopen.2026.32299

Update the old summary's 62-year median and 50%+ over-65 estimate to the published 61 years and 46%. Correct the citation to *Projected Aging Among People With HIV in the US*, JAMA Network Open, 2026;9(9):e2632299. Retain 24 states and the published 86% coverage.

Distinguish the paper's additional age-distribution analysis from the portal's five displayed age groups; median age and over-65 share cannot be inferred from a 55+ bar. Label the combined dataset as the 24 study states rather than the United States. State that bars show medians by age group, not uncertainty intervals, and that normalized bars are ratios of median counts.

All four scientific JSON files are unchanged. Projection medians, demographic data transformations, and calibration means/bounds are retained. The only numeric guard added to normalization handles a zero population without NaN. No model outputs were recomputed or republished.

## Engineering and verification

- 73 non-browser tests pass, including four new aging URL/normalization regressions. TypeScript, lint, production build, pinned configuration and production dependency audit pass.
- Seven development aging journeys pass; the production-only bundle check is intentionally skipped in development. All eight aging checks pass against the production build. The final model-fit and large-export additions are covered in the production run and release CI.
- All 41 selected production browser checks pass, including the existing study, atlas and results journeys. Aging coverage includes URL history/reload, group retention, intentional empty selections, comparison limits, a 25-panel PNG, exact CSV/table values against committed data, desktop/mobile PNGs, lazy model-fit evidence, axis labels and 320/390/1280px layouts.
- Repository browser screenshots inspected for the overall and demographic layouts, model evidence and exported image. The in-app browser controller is disabled; this review uses repository Playwright screenshots.
- Initial decoded production JavaScript falls from 3,214,241 to 1,087,834 bytes (66% smaller) on a fresh default visit. This is a local bundle measurement, not a latency or compressed-transfer claim. Race, transmission and calibration modules load on demand. CI enforces a 1.6 MB initial decoded-script budget.
- No new dependency, service, infrastructure, S3 listing/upload, invalidation, simulation run or dataset publication. Browser checks block or mock external data. Static hosting remains the delivery path; selection changes use native browser history without route requests.

Release CI and deployed commit are recorded in the accompanying release artifacts.
