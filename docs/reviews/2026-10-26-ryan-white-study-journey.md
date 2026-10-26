# Ryan White study overview and results handoff

## Scope

The city study is the first complete research-to-results exemplar. It carries the
established public-page typography, spacing, and scholarly tone into the study
route. Other study overviews and CIPHER remain outside this pass.

- Lead with the study question, coverage, comparison, and scenario start date.
- Offer a labeled, native GET form for metropolitan area and service interruption.
  Submission opens the existing explorer with both selections in the URL; it does
  not request computation. Map browsing remains available.
- Present the published 19%, 38%, and 49% increases in a semantic comparison table,
  with the published 75,436 count, geographic range, and paper link. Distinguish
  these findings from the March 2026 simulation data at the form and the table.
- Preserve the full publication title, all authors, citation, model-fit route,
  custom-simulation route, coverage list, state analyses, and collaboration route.
- Keep an overview link available throughout the city workflow, including mobile.
  Mobile labels shorten to Overview / Results / Custom scenarios, with full
  accessible names. The overview header scrolls away on narrow screens.
- Resolve a direct result link from configured study coverage independently of
  map-summary availability. Only locations with actual summaries receive markers.
  Preserve summary labels and align the checked-in fallback catalog with all 31
  pinned result-manifest labels (seven older names updated; codes unchanged).

## Source discipline

Study claims and the short model-mechanism explanation were checked against the
published abstract: https://pubmed.ncbi.nlm.nih.gov/40921074/ and
https://doi.org/10.7326/ANNALS-25-01737.

Scenario IDs and interruption durations come from the existing pinned model
configuration. No result values, model assumptions, release pins, or custom-run
behavior change. The page makes no unsupported claim about the cause of the
historical difference between publication and portal estimates.

## Independent reviews

Two fresh agents reviewed without the preceding design conversation. One inspected
candidate and production pages visually as an academic-site designer; the other
reviewed implementation, accessibility, and source consistency.

The design review supported the question-led composition, adjacent location form,
restrained table, and placement of publication details. Its recommendations led
to a short mechanism explanation, source identification at the results entry,
"Projected increase" wording, and a more accurate publication-anchor label.

The engineering review caught fallback location-name drift and map markers that
could imply default metrics for absent summaries. Both were corrected. The
remaining optional catalog mismatch was also reconciled against the pinned
manifests. No blocking issue remained in that review.

These are expert inspections, not observations of intended readers. Reader testing
is unavailable in the near term and is not a release dependency.

## Verification

- Production build, TypeScript, lint, pinned configuration check, dependency audit.
- 52 non-browser regressions and 28 browser journeys, including all three study-form
  scenario handoffs while map summaries return 503, required-area validation,
  coverage links, active/return navigation, and 320px navigation fit.
- Existing result, calibration, state, and cached/custom workflow regressions.
  External simulation launches and email sending are mocked in automated tests.
- Desktop and narrow-screen visual inspection, including native selectors,
  publication anchor, and the mobile shortcut to the local-results form.
- The public summary and a pinned result manifest returned 200 with permissive CORS
  in direct network checks. The local interactive browser encountered a fetch
  failure; production/preview data verification remains necessary before closeout.
