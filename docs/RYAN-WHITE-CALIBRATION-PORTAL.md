# Ryan White calibration interface

Implemented 2026-09-07; deployment and integrated scientific/content QA remain.

## Scope and contract

The shared view covers the 31-city, 11-state AJPH, and 30-state CROI models. City navigation links
to `/ryan-white/calibration`; state navigation links to
`/ryan-white-state-level/calibration?model=ajph` or `model=croi`.
Queries restore `model`, `loc`, `stage`, `target`, `facet`, and `age`. No location is preselected.
Model/location/stage changes clear incompatible target selections. Browser back/forward restores
the view. Invalid selections produce a recoverable message, not an unrelated fallback chart.

Backend configuration at `136ce60d125becec6477e9bd6c0faf668ca539ff` supplies the release, exact
manifest/index URLs and SHA-256 digests, and reviewed display facets. Generated portal configuration
is checked by `npm run verify-config`. The release remains
`CIPHER-Epi/jheem-simulations:ryan-white-calibration-v1.0.0`.

The browser verifies metadata before interpreting it, then checks the selected location/stage
artifact's exact bytes, digest, model identity, ensemble, target registry, and numerical shape.
Only one location/stage artifact is requested at a time; target/age changes reuse it. Requests are
aborted on selection changes and state is keyed to the current selection, hiding stale charts.
Checksum, network, and format failures show no results and provide retry. This is static CloudFront
delivery: no simulation launch, workflow dispatch, new AWS compute, or manager download.

## Scientific presentation

- Epidemic baseline and Ryan White service fits are separate. All baseline fits and state service
  fits contain 1,000 draws; the deployed city service fit contains 80 deliberately thinned draws.
- Initial display supports total and age only. Other facets in the archive are not implicitly enabled.
- Model medians and central 50%/95% posterior intervals are restricted to the observed year span
  within the target's fitting window. Single-year selections use vertical intervals and a median
  marker. They do not imply a multi-year trend.
- Distinct observation sources use distinct marker shapes. Multiple or nested-geography observations
  are never averaged into a fabricated city total. The data table retains geography and source.
- Target versus model-fit-check labels, reconstructed provenance, unavailable/not-exported targets,
  and nested-geography warnings remain explicit. Agreement with fitting data is not independent
  validation of future predictions. JSON and archived-release links expose the detailed provenance.
- The responsive SVG has an accessible name/description and an expandable table containing all
  displayed values. Display rounding does not change downloaded source data.

## Validation and remaining work

Reader tests cover checksum/size failures, identity and shape mismatches, source preservation, and
year/age selection. Browser regressions exercise all three models, URL restoration, unavailable
targets, invalid locations, corrupt metadata/retry, lazy requests, mobile layout, late responses,
and single-year rendering. Existing custom-simulation journeys remain in the same suite.

The first full local sweep parsed all 144 production artifacts and checked 4,330 total/age selections
for duplicate model years. It found 29 single-year selections and at most three observed sources in
one selection. Live desktop/mobile review used the published CDN bytes. Local production build,
37 unit tests, nine browser journeys, type checking, lint, backend-pin verification, and the production dependency policy
passed. The existing documented Next/Sharp audit exception is unchanged; no dependencies were added.

For manual local review, use `http://localhost:3000`, an existing allowed CDN origin. Browser tests
run at port 3011 and proxy only the pinned public calibration responses to adapt their CORS header;
the source bytes and checksum verification are unchanged. Tests require read-only CDN access.
Production-origin CORS must still be checked after deployment.

Next: review/merge the portal PR, then smoke all three deployed model views and conduct the remaining
integrated navigation, keyboard/accessibility, scientific-copy, and workflow QA in Phase 5. The
initial UI checks do not close that broader release review or resolve historical provenance debt.
