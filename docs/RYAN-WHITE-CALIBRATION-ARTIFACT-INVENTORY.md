# Ryan White Calibration Artifact Inventory and Delivery Contract

**Status:** Phase 4 inventory complete; source contract open and artifact production blocked

**Reviewed:** 2026-08-11

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
3. The deployed MSA web artifacts contain **80 deliberately thinned draws**. The 11-state AJPH and
   30-state CROI releases contain 1,000-draw state simsets. A shared page that describes every model
   as a 1,000-draw fit would therefore be wrong for the currently deployed city artifact.

The next unit should be a deterministic calibration exporter plus a versioned manifest. Portal UI
work should follow only after the model owner resolves the bounded source and target questions in
this document.

## Evidence baseline

This inventory used clean worktrees and the following revisions:

| System | Revision reviewed | Role |
|---|---:|---|
| `jheem-portal` | `9bbf7844fe07e20d4441e25b8b5f3002a68c0f39` | Current portal loaders, charts, and generated model config |
| `jheem-backend` | `1717d9cddfc807a7754d4e73d494572959130a2e` | Product/runtime model manifest |
| `jheem_analyses` | `8fa915fac7322cdcb5ba57135fa001ed4365b463` | Current model-owner source |
| `jheem-containers` | `7eaebfee90d34f3815f101408f1e59e10905be81` | Current canonical container `main` and production build manifest |
| Group-site GMHA reference | `04c8eb5032b6feea27a485a7b7d0a718ddbf3181` | Calibration interaction and loading reference |

The deployed AJPH container pins `jheem_analyses` revision
`fc3fe1d2d5f859b322414da8b11f0182e635993b`; CROI pins
`250ffc8aafcabe00c1bca20df831bf9637c2dd12`. Their Ryan White likelihood files differ from each
other and from current `master`, although the active target families remain semantically the same.
These runtime pins are not proof of the source revision that originally generated the posterior
simsets. The release artifacts record a calibration code, but not an analysis Git revision.

Public release metadata and representative production bundles were rechecked on 2026-08-11. The
inspection was read-only. The downloaded Baltimore baseline matched its published SHA-256 digest.

## Deployed model and artifact matrix

| Portal model | Geography | Container | Simulation release | Baseline ensemble | Calibration identity | Calibration-export readiness |
|---|---:|---|---|---|---|---|
| `ryan-white-msa` | 31 cities | `ghcr.io/ncsizemore/jheem-ryan-white-msa:1.1.0` | [`ryan-white-msa-v1.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ryan-white-msa-v1.0.0) | 80 thinned draws; 2010–2035 in inspected Baltimore asset | `final.ehe` | **Blocked for a truthful 1,000-draw claim.** The public release has web-thinned simsets; the full 1,000-draw city baseline must be published or the UI must disclose 80 draws. |
| `ryan-white-state-ajph` | 11 states | `ghcr.io/ncsizemore/jheem-ryan-white-ajph:1.1.0` | [`ryan-white-ajph-v1.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ryan-white-ajph-v1.0.0) | 1,000 draws, `noint` baseline | `final.ehe.state` | **Input available.** A deterministic export and versioned observed-data artifact are still missing. |
| `ryan-white-state-croi` | 30 states | `ghcr.io/ncsizemore/jheem-ryan-white-croi:2.3.0` | [`ryan-white-state-v2.0.0`](https://github.com/ncsizemore/jheem-simulations/releases/tag/ryan-white-state-v2.0.0) | 1,000 draws, `noint` baseline | `final.ehe.state` | **Input available.** A deterministic export and versioned observed-data artifact are still missing. |

Release-level observations:

| Release | Published | Assets | Size | Integrity and contents |
|---|---:|---:|---:|---|
| MSA v1.0.0 | 2026-02-04 | 124 | 3.34 GiB | 31 locations × baseline/cessation/brief/prolonged; all assets have SHA-256 digests |
| AJPH v1.0.0 | 2026-02-04 | 44 | 22.58 GiB | 11 states × `noint`/cessation/brief/prolonged; release explicitly identifies 1,000 simulations; all assets have digests |
| CROI state v2.0.0 | 2026-01-15 | 150 | 74.09 GiB | 30 states × `noint` and four 2026 scenarios; raw pre-trimming simsets; all assets have digests |

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

## Provenance gaps that block UI implementation

### 1. No versioned observed-data artifact

The Ryan White specification loads `../../cached/ryan.white.data.manager.rdata`. The repository
contains processing code, but the finalized manager is not committed or released. Its raw inputs
are referenced through external `Q:/data_raw/...` paths. The pipeline does register HRSA, NASTAD,
and CDC/NHSS sources and source URLs, but a fresh checkout cannot reproduce or identify the exact
manager used for a release.

Required resolution: publish the exact read-only data-manager artifact used for export, with a
digest, build revision, source inventory, and coverage report. Raw restricted inputs need not be
public if licensing prevents it, but their identity and transformation provenance must be.

### 2. MSA full posterior is not a released input

The full 1,000-draw city simsets are retrieved from owner storage and thinned to 80 for the web
release. They are not present in MSA v1.0.0.

Required resolution: either publish full baseline simsets as a separate immutable calibration-input
release, or deliberately present the 80-draw web ensemble and say so. The former is recommended if
the page is intended to parallel GMHA's 1,000-simulation presentation.

### 3. Calibration-code strings do not identify target definitions

`final.ehe` and `final.ehe.state` identify calibration registrations, but the serialized release
does not record the analysis Git revision that defined those registrations. Container runtime pins
identify how current custom runs are built; they are not necessarily the revisions used to create
the historical posterior assets.

Required resolution: the model owner must identify or attest the generating revision for each
posterior release. Future releases must record it automatically.

### 4. Public-target scope is unresolved

The phrase "all calibration targets" can mean the second-stage Ryan White targets, the inherited
EHE targets, or both. The current release cannot display the full inherited set.

Recommended resolution: expose two explicitly labeled groups—**Epidemic baseline fit** and **Ryan
White service fit**—with a release-specific allowlist. Start with targets that have defensible
observed provenance and retained model outcomes. Never label auxiliary observed overlays as active
calibration targets merely because the exporter can pull them.

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
  "posterior": {
    "calibrationCode": "final.ehe.state",
    "ensembleKind": "full",
    "sampleCount": 1000,
    "simulationRelease": "ryan-white-state-v2.0.0",
    "baselinePattern": "rw_final.ehe.state-1000_{location}_noint.Rdata",
    "summary": {"center": ["mean", "median"], "interval": [0.025, 0.975]}
  },
  "observations": {
    "dataManagerRelease": "ryan-white-data-manager-v1.0.0",
    "digest": "sha256:<digest>",
    "sourceRegistry": "sources.json"
  },
  "targetRegistryRevision": "<immutable jheem_analyses commit or attestation>",
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

Do not ship 1,000 raw lines to the browser for the default view. Compute summaries from all 1,000
draws in the exporter and record the count. A future diagnostic download may expose draw-level data
as a separate artifact if scientifically useful.

## Ownership and implementation order

### Unit 4A — Close the source contract

Owner: model team with engineering support.

1. Approve the release-specific public target allowlist and the two-stage labeling.
2. Identify/attest the analysis revision used to generate each posterior release.
3. Publish the exact observed-data manager with digest and source/coverage metadata.
4. Publish the full 1,000-draw MSA baseline inputs, or approve an explicit 80-draw presentation.

**Exit gate:** every intended target can be tied to a posterior release, observed-data artifact,
target definition, sample count, and source.

### Unit 4B — Build and release deterministic artifacts

Owner: `jheem-containers` for extraction/runtime; backend for product mapping.

1. Refactor the existing `prepare_plot_local()`/observation extraction into a baseline-only
   calibration export command.
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
5. Obtain model-owner sign-off on target definitions, source copy, and ensemble disclosure.

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

- No UI copy says "1,000 simulations" unless `posterior.sampleCount` is 1,000 for that exact
  location artifact.
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
