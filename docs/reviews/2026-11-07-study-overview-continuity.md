# State and CDC study overviews

## Scope and design

Extend the established Ryan White city overview to the two remaining funding-study
landing pages. Keep the accepted atlas and chart workspace intact. Aging combines
its introduction with a different analytical tool and remains the next focused
review; the ADAP costing workflow is also outside this pass.

- Lead with the research question and comparison, then offer direct local results.
- Treat the 11-state AJPH and 30-state CROI analyses as distinct studies, with
  separate dates, scenario choices, native GET forms, coverage lists, and model-fit
  links. Both are visible without a JavaScript-dependent study switch.
- Retain the city overview's serif hierarchy, paper-toned result entry, ruled
  findings table, full publication details, and restrained supporting links.
- Give CDC's current explorer the primary entry, with custom scenarios and the
  original Shiny tool available below the publication.
- Add an explicit, active Overview link to the state and CDC subnavigation. All
  links fit at 320px using shorter visible labels and full accessible names.
- Render both pages and their shared state form on the server. Only the existing
  citation control requires client interaction. Coverage comes from pinned model
  configuration, sorted by state name. State links disable prefetching.

## Source checks

- AJPH published title, authors, pages, central estimates, range, and uncertainty:
  https://pubmed.ncbi.nlm.nih.gov/41950444/ and
  https://doi.org/10.2105/AJPH.2025.308409.
  Replace the earlier headline used as a publication title. Label findings as the
  11-state publication; do not imply they also describe the CROI study.
- CROI presentation page identifies Melissa Schnure and the 30-state analysis:
  https://www.croiwebcasts.org/console/player/55174?mediaType=slideVideo.
  Preserve the existing link, now clearly separated from the AJPH publication.
- CDC final title, authors and pages: https://pubmed.ncbi.nlm.nih.gov/41640117/.
  Scenario timing and estimates: https://doi.org/10.1093/cid/ciag038, Figure 2 and
  Results. Funding resumes in January 2027 or 2029; testing recovers over that
  year. Replace the ambiguous 15/39-month descriptions with explicit recovery
  years. Display the paper's 3.9%, 8.2%, and 9.9% comparisons, rather than treating
  the earlier rounded 10% as a different result.
- Replace the claim that testing identifies infections before transmission can
  occur with the more accurate diagnosis–treatment–transmission explanation.
- Describe custom CDC inputs as testing reduction and the share still tested
  without CDC funding; the tool does not expose a user-selected timing control.

No simulation results, release pins, model configuration, scientific assumptions,
chart computations, or source-data files change.

## Verification and cost

- Production build, TypeScript, lint, pinned configuration check, and 69 existing
  non-browser regressions pass.
- 16 focused development browser checks pass (9 overview tests plus 7 model-fit
  journeys). Three actual result handoffs use existing verified fixtures with map
  summaries returning 503. Native form tests cover all ten scenario URLs with
  JavaScript disabled, required-field validation, and exact study coverage.
- The first test draft tried to render all scenarios using fixtures that only
  include selected plots. Those fixture misses were corrected by separating the
  complete form-routing coverage from the three available end-to-end result
  fixtures. No production data were downloaded to expand the test corpus.
- Desktop (1280px), 390px and 320px screenshots inspected. Native selectors,
  table widths, return navigation, publication links, and clipboard-failure
  fallback checked. Keep year ranges together on narrow screens.
- App browser control is disabled; visual review uses repository Playwright
  screenshots. These checks are expert inspection, not external reader testing.
- 13 production-build overview checks pass, including the existing city journey.
  CI now includes the overview suite in its production checks as well. The final
  conservative-option label shortening is verified by the release CI run.
- Production dependency audit passes. Release identifiers are recorded at closeout.
- No new dependency, paid service, infrastructure, S3 upload/listing, CloudFront
  invalidation, simulation run, or dataset publishing. Scientific data requests
  in automated tests are fulfilled locally or blocked.
