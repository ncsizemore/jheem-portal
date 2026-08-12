# Ryan White Calibration Artifact Inventory and Delivery Contract

**Status:** Phase 4 inventory, provenance investigation, manager compatibility, and redistribution
disposition complete; controlled archival and target registry next

**Reviewed:** 2026-08-12

**Scope:** `ryan-white-msa`, `ryan-white-state-ajph`, and `ryan-white-state-croi`

## Executive assessment

The portal can add a useful model-calibration surface, but it should not be implemented as a thin
link to the current scenario charts and it should not yet claim to show "1,000 posterior
simulations" for every Ryan White model.

Three facts drive the recommendation:

1. The public location bundles already contain baseline summaries and observed points. The
   extraction mechanism therefore exists and can be adapted rather than replaced.
2. Those bundles do not identify the simulation release or asset digest, calibration code,
   posterior sample count, data-manager artifact, target-definition revision, or generator
   revision. They are useful display data, but they are not calibration evidence with a complete
   provenance chain.
3. Ryan White has two calibration stages. Immutable EHE releases provide the upstream epidemic
   baseline at **1,000 draws** for MSA and state geographies. The deployed second-stage Ryan White
   service-fit ensemble contains **80 deliberately thinned draws for MSA** and 1,000 draws for the
   state analyses. A single undifferentiated "1,000 posterior simulations" claim would therefore
   conflate two different fits and be wrong for the deployed city service-fit artifact.

The source investigation is now sufficient to begin a deterministic calibration exporter plus a
versioned manifest. It is no longer appropriate to block engineering on an open-ended model-owner
questionnaire. A later scientific review should evaluate plain-language target definitions,
construction caveats, and release copy after representative panels exist.

## Evidence baseline

This inventory used clean worktrees and the following revisions:

| System | Revision reviewed | Role |
|---|---:|---|
| `jheem-portal` | `9bbf7844fe07e20d4441e25b8b5f3002a68c0f39` | Current portal loaders, charts, and generated model config |
| `jheem-backend` | `1717d9cddfc807a7754d4e73d494572959130a2e` | Product/runtime model manifest |
| `jheem_analyses` | `fef88b515295254946cf4e26fd1585b9a4dcebff` | Current model-owner source used as the compatibility-tool base |
| Manager-compatibility implementation | `13193a9e703a8672c05182afb800401ca961f27c` | Hash-gated comparison, candidate-derived-target validation, tests, and deterministic report |
| `jheem-containers` | `7eaebfee90d34f3815f101408f1e59e10905be81` | Current canonical container `main` and production build manifest |
| `jheem-simulations` | `3ef5c66` | Immutable simulation-release catalog and asset digests; release tags do not identify generating analysis code |
| Group-site GMHA reference | `04c8eb5032b6feea27a485a7b7d0a718ddbf3181` | Calibration interaction and loading reference |

The deployed AJPH container pins `jheem_analyses` revision
`fc3fe1d2d5f859b322414da8b11f0182e635993b`; CROI pins
`250ffc8aafcabe00c1bca20df831bf9637c2dd12`. Their Ryan White likelihood files differ from each
other and from current `master`, although the active target families remain semantically the same.
These runtime pins are not proof of the source revision that originally generated the posterior
simsets. The release artifacts record a calibration code, but not an analysis Git revision.

Public release metadata, representative production bundles, model code, Git history, and the
team-NAS simulation/data-manager inventory were rechecked on 2026-08-11. The NAS inspection was
read-only and the share was disconnected after the review. The downloaded Baltimore baseline
matched its published SHA-256 digest.

## Deployed model and artifact matrix

| Portal model | Geography | Container | Epidemic-baseline input | Ryan White service-fit input | Calibration-export readiness |
|---|---:|---|---|---|---|
| `ryan-white-msa` | 31 cities | `ghcr.io/ncsizemore/jheem-ryan-white-msa:1.1.0` | [`ehe-msa-v1.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ehe-msa-v1.0.0): 1,000 draws per location, `final.ehe` | [`ryan-white-msa-v1.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ryan-white-msa-v1.0.0): 80 deliberately thinned fitted draws; 2010–2035 in inspected Baltimore base | **Ready for an explicitly two-stage export.** Show 1,000 for epidemic baseline fit and 80 for Ryan White service fit. Do not imply that a full 1,000-draw fitted Ryan White city artifact was recovered. |
| `ryan-white-state-ajph` | 11 states | `ghcr.io/ncsizemore/jheem-ryan-white-ajph:1.1.0` | [`ehe-state-v1.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ehe-state-v1.0.0): 1,000 draws, `final.ehe.state` | [`ryan-white-ajph-v1.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ryan-white-ajph-v1.0.0): 1,000 fitted draws, `noint` baseline | **Ready for deterministic export;** a versioned display-manager binding and target registry remain delivery work. |
| `ryan-white-state-croi` | 30 states | `ghcr.io/ncsizemore/jheem-ryan-white-croi:2.3.0` | [`ehe-state-v1.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ehe-state-v1.0.0): 1,000 draws, `final.ehe.state` | [`ryan-white-state-v2.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ryan-white-state-v2.0.0): 1,000 fitted draws, `noint` baseline | **Ready for deterministic export;** a versioned display-manager binding and target registry remain delivery work. |

Release-level observations:

| Release | Published | Assets | Size | Integrity and contents |
|---|---:|---:|---:|---|
| MSA v1.0.0 | 2026-02-04 | 124 | 3.34 GiB | 31 locations × baseline/cessation/brief/prolonged; all assets have SHA-256 digests |
| AJPH v1.0.0 | 2026-02-04 | 44 | 22.58 GiB | 11 states × `noint`/cessation/brief/prolonged; release explicitly identifies 1,000 simulations; all assets have digests |
| CROI state v2.0.0 | 2026-01-15 | 150 | 74.09 GiB | 30 states × `noint` and four 2026 scenarios; raw pre-trimming simsets; all assets have digests |

The later `ehe-msa-v1.0.0` release (93 assets, published 2026-05-18) and
`ehe-state-v1.0.0` release (55 assets, published 2026-06-15) make the full upstream 1,000-draw EHE
posteriors available as immutable, digested calibration inputs. They close the epidemic-baseline
availability question; they do not recreate the missing full second-stage Ryan White MSA fit.

The 11 `noint` assets shared by AJPH and CROI are byte-identical by published SHA-256 digest. A
normalized baseline-and-observation slice from the current public Alabama AJPH and CROI bundles is
also identical. The calibration payload may therefore be physically deduplicated for those states,
but each product model must still reference it through its own release manifest so the UI cannot
silently cross model boundaries.

### Verified MSA sample

`C.12580_base.Rdata` from MSA v1.0.0 was inspected after verifying digest
`sha256:b21925afd2c1f1e00519d28312c647715c74f3f05810f88fe5fe979f2f56b314`.

| Field | Value |
|---|---|
| Object | finalized `jheem.simulation.set` |
| Location | `C.12580` (Baltimore) |
| Calibration code | `final.ehe` |
| Intervention code | `noint` |
| Years | 2010–2035 |
| Posterior draws | 80 |
| Run labels | `final.ehe_1970_2030`, `noint_2025_2035` |

This matches the owner preparation code: `N.SIM = 1000`, `RW.N.SIM.FOR.WEB = 80`, then
`full.simset$thin(keep = RW.N.SIM.FOR.WEB)`. The 80-draw result is intentional delivery behavior,
not a corrupt release.

## What is already in production

The existing native plot pipeline calls `prepare_plot_local()` and writes, per
scenario/outcome/statistic/facet:

- summarized baseline and intervention series;
- lower and upper intervals;
- observed points, source identifiers, and source URLs; and
- basic display metadata.

The portal already transforms and renders the `obs` array. A public Baltimore bundle sampled during
this review contained HRSA Ryan White observations through 2023, NASTAD ADAP observations through
2022 where available, and several inherited CDC/EHE observation families. The AJPH and CROI Alabama
bundles expose the same observed Ryan White slices for their shared baseline.

One of those inherited overlays is demonstrably wrong in the released artifacts. In the inspected
MSA simset, `outcome.metadata[["adap.clients"]]$corresponding.observed.outcome` is
`non.adap.clients`; representative AJPH and CROI production payloads consequently emit the same
observations under both labels. Model source changed that metadata to `adap.clients` in commit
`e986be4f42f48ee8045f3530d1eeaa279052c022` on January 9, 2026, after the relevant fitted artifacts
had been generated. The duplicated production overlay is therefore a legacy display-mapping defect,
not evidence that ADAP and non-ADAP client counts are equivalent. A calibration exporter must reject
or override this stale mapping through its release-specific registry rather than copying it.

This is valuable reuse, but it is not a suitable long-term calibration artifact:

- baseline and observations are repeated under every scenario;
- one compressed Baltimore location file is 15.4 MiB and expands to about 208 MiB;
- calibration is conceptually baseline-only and should not require choosing an interruption
  scenario;
- metadata does not say whether 80 or 1,000 draws produced the interval;
- metadata does not bind the data to a release asset/digest, container digest, calibration code,
  target registry, or observed-data-manager revision; and
- all observed series that happen to map to an outcome can appear, even if they were not active
  likelihood targets for that release.

Accordingly, the existing extractor is a strong starting point, not the public contract itself.

## Calibration lineage and target inventory

Ryan White is a two-stage calibration:

1. an underlying EHE posterior (`final.ehe` for cities or `final.ehe.state` for states) calibrates
   the epidemic model; then
2. each posterior draw is transmuted to the Ryan White model and fitted against a Ryan White-specific
   likelihood.

The active EHE likelihood is broad. Depending on city/state registration it includes population and
migration, diagnoses and diagnosed prevalence, mortality and AIDS diagnoses, continuum outcomes,
PrEP, drug-use inputs, COVID-era change constraints, future-incidence constraints, and related
priors. The released Ryan White simsets retain only a subset of those outcomes. Therefore "all
calibration targets" cannot be reconstructed from the current Ryan White web simsets alone.

The active second-stage Ryan White target families are:

| Target family | City definition | State definition | Likelihood years | Candidate public facets | Primary observed inputs |
|---|---|---|---|---|---|
| Non-ADAP clients | Count | Count | From 2017 | Total; age, sex, race | HRSA Ryan White annual reports |
| Non-ADAP sex × risk distribution | Within-year proportion | Same custom likelihood | Available data years | Sex × risk | HRSA Ryan White annual reports |
| OAHS clients | Count | Count | From 2017 | Total; available one-way facets | HRSA Ryan White annual reports |
| OAHS viral suppression | Proportion | Proportion | From 2017 | Total; available one- and two-way facets | HRSA Ryan White annual reports |
| ADAP coverage | ADAP-to-non-ADAP ratio, with nested geographic construction | ADAP client count | City ratio ends in 2021; state count from 2017 | Total; available one-way facets | HRSA reports plus diagnosed-prevalence geography mapping for the city construction |
| ADAP viral suppression | ADAP-suppressed share of diagnosed prevalence, with nested geographic construction | ADAP suppression proportion | From 2017 | Total; available one-way facets; state likelihood permits two-way | NASTAD ADAP reports; city construction also uses HRSA and CDC diagnosed prevalence |

Important interpretation constraints:

- `adap.proportion` is registered as an ADAP-to-non-ADAP **ratio**, not a bounded share of all Ryan
  White clients.
- The city and state ADAP targets are not interchangeable. A shared label must not hide the
  different likelihood definitions.
- `from.year = 2017` is a likelihood rule, not a promise that every location/target has a complete
  annual series. Current production examples show location-specific gaps.
- Total HRSA series may extend back to 2013, while stratified series generally begin in 2017.
  ADAP-ratio inputs are constructed for 2020–2022 in the current data-processing code; the active
  city likelihood caps this target at 2021. NASTAD inputs cover 2019–2022 in the processing code,
  again with location-specific availability.
- Current public bundles also contain observed points for inherited outcomes such as diagnosed
  prevalence, diagnoses, overall suppression, awareness, testing, and PrEP. Presence in a bundle
  does not by itself establish that a series was an active target in the exact released
  calibration.

## Provenance findings and bounded gaps

### 1. Display observations are identified; exact historical fitting-manager bytes are optional

The production extraction path explicitly prioritizes
`ryan.white.web.data.manager.rdata`. Its observed coverage matches the production location bundle,
and its Git cache reference has remained unchanged since 2025-04-08. The inspected NAS artifact is
therefore the display-time observed-data manager for the deployed bundles:

- creation: `2025-04-08 16:21:06 CDT`;
- last modified: `2025-04-08 16:25:53 CDT`; and
- SHA-256: `4f1b5063ae6f6e9ffa4b254d4cad71fdf088903295339fb59a17e71819f99989`.

The current `ryan.white.data.manager.rdata` was rebuilt on 2026-03-16, after the published simsets,
and has SHA-256 `cc227cb9bdf43d9948f97db54d9c2652f034c4b780a8515cb57c99ea6f735188`.
It must not be substituted silently for the historical fitting manager.

Git commit `64725fb7188cf0317d2a708599a0df412f4894fa` preserves the original March 2025
fitting-manager metadata and private OneDrive object reference. That reference remained unchanged
through the AJPH runtime revision and changed only with the March 2026 rebuild. An unauthenticated
retrieval returned HTTP 401. An authenticated retrieval on 2026-08-12 succeeded, but the old sharing
URL served the **current March 2026 manager**, not a historical version: the downloaded bytes had
SHA-256 `cc227cb9bdf43d9948f97db54d9c2652f034c4b780a8515cb57c99ea6f735188`, and the
embedded creation/modification dates were `2026-03-16 11:42:34 CDT` and
`2026-03-16 11:46:08 CDT`. The preserved URL therefore addresses a mutable SharePoint file rather
than an immutable object version. No historical snapshot or lineage was embedded in the R6 manager.

Delivery requirement: archive the exact web manager used by the exporter in immutable internal
storage, publish its digest/source/coverage metadata, and publish only the derived observations if
the manager itself cannot be public. Treat the exact historical fitting-manager bytes as unavailable
unless a distinct SharePoint version-history entry, backup, or archive copy is discovered; do not
infer them from the current bytes served by the old URL.

### 1a. Manager compatibility is target-specific and now machine-checked

The hash-gated comparison in `jheem_analyses` commit
`13193a9e703a8672c05182afb800401ca961f27c` compares every estimate array by named dimension and
shared cell, emits deterministic JSON and Markdown, and fails closed when required target contracts
or candidate-derived formulas do not pass. For the April 2025 display manager versus March 2026
full manager:

- `non.adap.clients`, `oahs.clients`, `oahs.suppression`, and `adap.proportion` are identical on the
  compared structures and values;
- `adap.suppression` is additive, retaining all shared values;
- `diagnosed.prevalence` is compatible on overlap, with no changed shared values or candidate gaps;
- `adap.clients` and the ADAP-derived diagnosed-prevalence outcomes are candidate-only because the
  display manager does not carry them; and
- all five checked candidate-derived target families reproduce the owner processing formulas with
  zero mismatches.

Decision: the newer manager can support corrected, target-specific derived exports after an
explicit observed-manager binding and redistribution/storage decision. This does not make it the
historical fitting manager and does not validate candidate-only values against unavailable March
2025 bytes. The required target registry must encode that distinction rather than exposing a single
whole-manager compatibility flag.

### 2. MSA has a full epidemic posterior, but not a recoverable full Ryan White service fit

`ehe-msa-v1.0.0` supplies the full 1,000-draw upstream EHE posterior. The Ryan White preparation
then fits/transmutes that posterior against service data and deliberately thins the fitted city
ensemble to 80 for web delivery. No full fitted 1,000-draw Ryan White MSA simset or fitting cache was
found on the NAS or in GitHub releases.

The original MSA base, compact scenarios, and baseline seed were compared directly: their fitted
parameter matrices contain exactly the same 80 posterior draws. The public release's mixed
packaging lineage is awkward, but it is not a mixed scientific ensemble.

Decision: use all 1,000 released EHE draws for **Epidemic baseline fit** and the deployed 80 fitted
draws for **Ryan White service fit**, with the count visible in each section. Do not rerun a new
1,000-draw Ryan White fit merely to satisfy presentation copy; it would not be the deployed model
and could not reproduce the historical fit exactly.

### 3. Artifact integrity is strong; historical generating-code identity is partly reconstructed

Every relevant GitHub release asset has an immutable digest. The release repository's tags point to
release-catalog/documentation commits, however, not to the scientific code that generated the
simsets, and the serialized simsets do not embed an analysis Git revision.

For MSA packaging, timestamps and Git history strongly reconstruct
`1835cc0239c9a14dd79823167c87fc81cd23a7af` for the original web-preparation path and
`faa8bd47f2712de0a082beca8701bca50e35deef` for the later compact web simsets. These are packaging
revisions, not proof of the stochastic posterior-generating revision. State packaging can likewise
be bounded by history but is not embedded in the artifact. Current runtime container pins are also
not substitutes for historical generator identity.

Decision: record release asset digests as verified, packaging revisions as reconstructed, and the
historical scientific generator as unknown where it cannot be proven. This does not block a fit
presentation tied to the actual released artifacts. Future release automation must embed the
analysis revision, data-manager digest, exporter revision, and source posterior digest.

### 4. Public target scope is resolved as a two-stage, release-specific registry

The actual Ryan White likelihood registrations and the existing owner-side review script provide a
defensible target allowlist without an open-ended technical questionnaire. The public surface will
use two explicitly labeled groups—**Epidemic baseline fit** and **Ryan White service fit**—and will
only call a series an active calibration target when the release-specific registry says so.

Existing production overlays can seed the display, but they are not automatically targets: some
city likelihood components use nested or bias-adjusted constructions that are not identical to an
ordinary plotted outcome. A first exporter may present such related panels as **model fit checks**;
the stronger **calibration target** label requires an exact target mapping in the registry.

Remaining scientific review is narrow and reader-facing: confirm public labels, denominator and
geographic-construction explanations, caveats, and citations after representative panels are
generated.

## Provenance-debt disposition

### Address in Phase 4

- Publish a release-specific target registry and separate the EHE and Ryan White fit stages.
- Pin posterior release/assets and SHA-256 digests, observed-manager digest, actual sample count,
  exporter revision, schema revision, and coverage in the calibration manifest.
- Produce deterministic, checksummed per-location artifacts and compare representative outputs
  numerically with the owner-side review workflow.
- Preserve confidence honestly: `verified`, `reconstructed`, or `unknown`; do not convert inference
  into an exact historical claim.
- Archive the April 2025 web/display manager immutably, subject to data-sharing constraints.
- Reject the released `adap.clients` observation mapping and bind corrected exports explicitly to a
  manager that actually contains `adap.clients`.

### Completed evidence work

- The manager comparison, derived-target validations, deterministic reports, checksum gate, and
  regression tests are implemented in the isolated `jheem_analyses` compatibility unit.
- The duplicated production `adap.clients` overlay is traced to stale serialized simset metadata;
  the corresponding model-source correction is identified exactly.

### Attempted; no longer open delivery work

- The authenticated March 2025-link recovery was attempted on 2026-08-12. It returned the current
  March 2026 manager byte-for-byte, confirming that the sharing link is mutable and closing this
  route without recovering the historical artifact.
- If a clearly labeled full historical fitted MSA artifact is discovered in an existing archive,
  inventory it; do not launch a replacement calibration run as a provenance repair.

### Cross-repository future work

- Extend simulation serialization and release automation to embed generating analysis commit,
  source posterior digest, data-manager digest, calibration/target-registry revision, random-seed
  contract, exporter revision, and sample-count/thinning history.
- Make `jheem-simulations` releases validate a machine-readable provenance manifest rather than
  relying on release notes and catalog tags.
- Establish an immutable observed-data-manager registry with public metadata and controlled storage
  for artifacts that cannot be redistributed.
- Avoid mixed packaging generations in future releases; publish a clean successor only when there
  is a scientific or operational reason, not merely to rewrite history.
- For future city calibrations, archive the full fitted posterior before producing web-thinned
  derivatives.

## Proposed `jheem-calibration/v1` contract

The manifest is the immutable entry point. It should be small enough to load with model metadata and
should point to one display-ready location artifact at a time.

```json
{
  "schemaVersion": "jheem-calibration/v1",
  "modelId": "ryan-white-state-croi",
  "artifactRelease": "ryan-white-state-croi-calibration-v1.0.0",
  "generatedAt": "2026-08-11T00:00:00Z",
  "generator": {
    "repository": "ncsizemore/jheem-containers",
    "revision": "<immutable commit>",
    "containerImage": "ghcr.io/ncsizemore/jheem-ryan-white-croi:2.3.0",
    "containerDigest": "sha256:<digest>"
  },
  "posteriorStages": [
    {
      "id": "ehe",
      "label": "Epidemic baseline fit",
      "calibrationCode": "final.ehe.state",
      "ensembleKind": "full",
      "sampleCount": 1000,
      "simulationRelease": "ehe-state-v1.0.0",
      "sourceAssetDigest": "sha256:<digest>"
    },
    {
      "id": "ryan-white",
      "label": "Ryan White service fit",
      "calibrationCode": "final.ehe.state",
      "ensembleKind": "full",
      "sampleCount": 1000,
      "simulationRelease": "ryan-white-state-v2.0.0",
      "sourceAssetDigest": "sha256:<digest>"
    }
  ],
  "summary": {"center": ["mean", "median"], "interval": [0.025, 0.975]},
  "observations": {
    "dataManagerId": "ryan-white-web-data-manager-2025-04-08",
    "digest": "sha256:4f1b5063ae6f6e9ffa4b254d4cad71fdf088903295339fb59a17e71819f99989",
    "sourceRegistry": "sources.json"
  },
  "targetRegistry": {
    "revision": "<immutable registry commit>",
    "historicalGeneratorStatus": "unknown-or-reconstructed"
  },
  "targets": [],
  "locations": {
    "index": "locations.json",
    "artifactPattern": "locations/{location}.json"
  }
}
```

Each target registry entry should include:

- stable target ID and public label;
- calibration stage (`ehe` or `ryan-white`);
- model outcome, observed outcome, unit, scale, and denominator semantics;
- active likelihood status for this exact release;
- supported facets and level-of-stratification rule;
- likelihood year rule and actual observed coverage by location;
- source IDs and source URLs; and
- any construction or geographic-mapping caveat.

Each per-location artifact should contain only:

- location code, label, and geography type;
- manifest/release identity;
- baseline mean, median, and 95% interval by target/facet/year;
- observed points with source ID and URL; and
- actual ensemble count and observed-year coverage.

Do not ship raw posterior lines to the browser for the default view. Compute summaries from every
draw in each declared stage and record the stage-specific count. A future diagnostic download may
expose draw-level data as a separate artifact if scientifically useful.

## Ownership and implementation order

### Unit 4A — Record the source contract and historical gap

Owner: engineering, followed by focused scientific review.

1. Land the hash-gated manager comparison and candidate-derived-target validation. **Implemented;
   pending cross-repository review/merge.**
2. Review manager redistribution constraints, select immutable controlled storage, and decide
   whether manager files may be GitHub Release assets or require digest-only metadata plus public
   derived payloads. **Decision recorded in
   [`RYAN-WHITE-MANAGER-REDISTRIBUTION-AND-STORAGE-DECISION.md`](./RYAN-WHITE-MANAGER-REDISTRIBUTION-AND-STORAGE-DECISION.md):
   controlled archive plus public minimal derived artifacts; public manager release deferred.**
3. Commit the release-specific two-stage target registry derived from the likelihood registrations
   and owner-side review script. Exclude the legacy `adap.clients` overlay and bind any corrected
   ADAP client target to a manager that contains the actual series.
4. Record the verified EHE and Ryan White releases/assets, digests, stage-specific sample counts,
   April 2025 web-manager digest, and provenance-confidence fields.
5. Archive the exact web/display manager and publish source/coverage metadata subject to its
   redistribution constraints.
6. Record that the authenticated historical-manager link returned the current March 2026 artifact;
   the exact March 2025 bytes remain unavailable and do not block Unit 4B.
7. Record the absent full fitted MSA posterior and unknown historical generator revision explicitly;
   do not manufacture replacements or attestations.

**Exit gate:** every intended public panel is tied to a released posterior asset, observed-data
identity, target definition, stage-specific sample count, and source, while historical uncertainty
is represented explicitly rather than treated as a blocker.

### Unit 4B — Build and release deterministic artifacts

Owner: `jheem-containers` for extraction/runtime; backend for product mapping.

1. Refactor the existing `prepare_plot_local()`/observation extraction into a baseline-only,
   stage-aware calibration export command.
2. Make model ID, release asset, expected digest, target allowlist, and output directory explicit
   inputs; fail closed on mismatches or missing targets.
3. Emit `jheem-calibration/v1`, per-location payloads, a coverage report, and checksums.
4. Test sample count, quantiles, target/facet coverage, source URLs, and deterministic output.
5. Publish a versioned release or immutable object prefix.
6. Extend backend `models.json` with the manifest URL/release and digest; validate it alongside the
   existing container/simset contract.

**Exit gate:** an unchanged input set reproduces byte-stable scientific payloads apart from a
separately controlled generation timestamp, and every output validates against its manifest.

### Unit 4C — Add the portal surface

Owner: `jheem-portal`.

1. Add a schema-validated, cached, retryable calibration loader.
2. Add a model-aware entry point from each Ryan White explorer; calibration is baseline-only and
   has no scenario selector.
3. Guide users through location, target, and available stratification.
4. Plot posterior mean and 95% interval with observed points, a last-observed-year marker, source
   disclosure, sample count, calibration years, model/release identity, and a plain-language target
   definition.
5. Lazy-load the selected location artifact. Keep metadata and the location index small.

**Exit gate:** the page cannot render a target under the wrong model/release, and all scientific
claims are generated from validated manifest fields.

### Unit 4D — Integrated review

1. Numerically compare representative exported series with owner-side `simplot` output.
2. Verify at least one MSA, one AJPH-only state, one AJPH/CROI shared state, and one CROI-only state.
3. Exercise missing target, missing location, schema mismatch, stale manifest, and failed fetch
   states.
4. Complete desktop/mobile, keyboard, screen-reader-oriented, contrast, and non-color-encoding QA.
5. Obtain focused scientific sign-off on target definitions, construction caveats, source copy,
   and stage-specific ensemble disclosure.

## GMHA patterns to reuse—and one not to copy

Useful patterns from the current group-site GMHA implementation:

- a dedicated calibration section, separate from projections;
- location and outcome controls with optional age detail;
- mean plus 95% interval and observed surveillance points;
- a last-observed-year reference line;
- lazy per-location loading, request caching, explicit loading/error states, and retry behavior;
- source and methods disclosure; and
- development-time schema validation with pure transformation functions.

The GMHA staging manifest is not sufficient as a provenance contract: it records local absolute
source paths, filenames, sizes, and modification times rather than immutable source digests and
model revisions. Ryan White should borrow the interaction and data-loading architecture, while
using the stronger release contract above.

## Acceptance criteria for Phase 4

- No UI copy says "1,000 simulations" unless the selected `posteriorStages[].sampleCount` is 1,000
  for that exact location artifact and calibration stage.
- The MSA page cannot silently use its 80-draw web bundle while claiming the full posterior.
- AJPH and CROI may share identical physical state payloads only when the baseline asset digest and
  target/data-manager identities match; their model manifests remain distinct.
- Every displayed point identifies the model, product release, baseline asset digest, location,
  target, calibration stage, observed source, and posterior ensemble.
- Calibration years, observed-data years, intervention study years, and projection years are
  labeled as different concepts.
- Only targets marked active for the exact release are called calibration targets.
- Per-location payloads are lazy-loaded and do not duplicate baseline data by scenario.
- Schema, coverage, checksum, numerical cross-check, accessibility, responsive-layout, and failure
  tests pass before release.
