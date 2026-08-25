# Ryan White Portal Review and Remediation Plan

**Status:** Phase 4 exhaustive artifact production and independent candidate review complete —
organization-owned archival, immutable promotion, backend binding, and portal presentation next

**Created:** 2026-07-29  
**Scope:** Ryan White city and state explorers, custom simulations, calibration presentation, and the shared portal components they depend on

### Progress snapshot — 2026-08-25

- **Phase 0:** Implemented and covered by AJPH/CROI URL regression tests.
- **Phase 1:** Model timing contract, shared-engine validation, workflow transport, cache isolation,
  result metadata, container defaults, and portal disclosure are implemented. Reconciled backend
  [jheem-backend#21](https://github.com/ncsizemore/jheem-backend/pull/21) merged as `c07ebece`
  with executable timing transport, CROI cache isolation, mirrored workflow defaults, and the four
  released production pins. Expanded PR validation passed in
  [run 30572114348](https://github.com/ncsizemore/jheem-backend/actions/runs/30572114348),
  post-merge `master` validation passed in
  [run 30572306019](https://github.com/ncsizemore/jheem-backend/actions/runs/30572306019),
  and the local container-to-backend contract passed 66 checks with two intentional skips. A
  production-configuration CROI dry-run for Alabama passed in
  [run 30572846978](https://github.com/ncsizemore/jheem-backend/actions/runs/30572846978):
  it used CROI `2.3.0`, intervention `2026.5`, lag `0.25`, simulation `2026–2036`, reporting
  `2026–2031`, and scenario key `t2026-a50-o30-r40`; aggregation completed and S3/CloudFront upload
  was explicitly skipped. Dry-run progress telemetry was written to Redis under the versioned key.
  The first controlled write-backed smoke
  [run 30575379534](https://github.com/ncsizemore/jheem-backend/actions/runs/30575379534)
  successfully published that versioned key while the legacy `a50-o30-r40` key remained absent,
  proving cache isolation. Inspection of the delivered object found that the timing contract was
  missing because the workflow's portal checkout used deployed `main`, whose aggregator did not yet
  contain the local metadata change. Backend
  [jheem-backend#25](https://github.com/ncsizemore/jheem-backend/pull/25), merged as `597b5ea0`,
  now embeds and verifies `metadata.custom_simulation` after aggregation and before publication,
  removing that cross-repository deployment-order dependency. Post-merge validation passed in
  [run 30577599349](https://github.com/ncsizemore/jheem-backend/actions/runs/30577599349).
  Repair [run 30577631730](https://github.com/ncsizemore/jheem-backend/actions/runs/30577631730)
  then overwrote the same versioned object, passed model execution, metadata verification, S3
  upload, and CloudFront invalidation, and left the legacy key absent. The CDN-delivered JSON
  contains the exact CROI contract (`2026.5` intervention, `0.25`-year lag, `2026–2036` simulation,
  `2026–2031` reporting, and `t2026` cache prefix), 132 source files, and only the expected
  `t2026-a50-o30-r40` scenario/data key.
  Canonical container work is
  merged in [jheem-containers#14](https://github.com/ncsizemore/jheem-containers/pull/14), which now
  builds a candidate base first and injects its immutable digest into every downstream model before
  testing. The full candidate review found CROI baseline and observations unchanged, no intervention
  divergence through 2025, and the expected effect beginning in the 2026 annual interval. MSA and
  AJPH remain bit-for-bit identical to their prior goldens, CROI perturbation passed, and CDC passed
  its complete gate. The corrected CROI golden is now active while the prior production artifact is
  retained as a historical reference. The final candidate-base cascade passed in full:
  [run 30540195304](https://github.com/ncsizemore/jheem-containers/actions/runs/30540195304).
  The post-merge `main` cascade is
  [run 30549853543](https://github.com/ncsizemore/jheem-containers/actions/runs/30549853543);
  its base-cascade classification prevented tag promotion, but its cross-repository contract exposed
  that backend `master` does not yet publish the timing metadata used during feature-branch
  validation. Merged metadata-only bridge
  [jheem-backend#22](https://github.com/ncsizemore/jheem-backend/pull/22) adds the
  contract plus its validator without changing workflow execution, caching, or image pins.
  Backend `master` validation passed, and non-promoting full container
  [run 30550724551](https://github.com/ncsizemore/jheem-containers/actions/runs/30550724551)
  passed the cross-repository contract, candidate base test, and all four exact-digest model gates;
  both promotion jobs were skipped. The explicit `base-v1.7.0` release
  [run 30555134258](https://github.com/ncsizemore/jheem-containers/actions/runs/30555134258)
  then passed the contract, base test, and all four downstream model gates. It promoted only the
  base tags (`1.7.0`, `1.7`, and `latest`); model promotion was skipped as designed. All three base
  tags resolve to the tested OCI index digest
  `sha256:a76a92ca41d38c3d7d5f77f79efd2e2fe754f8ee97be6b69aec0ea949c1282c3`.
  Release-preparation
  [jheem-containers#15](https://github.com/ncsizemore/jheem-containers/pull/15) pins all four
  downstream models to that base version and digest. Its first run exposed and then repaired a
  GitHub Actions transitive-skip defect that had allowed model builds to pass while their full
  behavior gates were skipped whenever the base build was intentionally omitted. Corrected
  [run 30560008410](https://github.com/ncsizemore/jheem-containers/actions/runs/30560008410),
  attempt 2, passed all four model builds and all four smoke/golden/perturbation suites; both
  promotion jobs were skipped. PR #15 merged as `7eaebfee`; merged-state
  [run 30565962207](https://github.com/ncsizemore/jheem-containers/actions/runs/30565962207)
  repeated all four full gates and promoted the tested model digests to `latest`. Explicit release
  workflows then passed and published MSA `1.1.0`
  ([run 30568530711](https://github.com/ncsizemore/jheem-containers/actions/runs/30568530711)),
  AJPH `1.1.0`
  ([run 30568558212](https://github.com/ncsizemore/jheem-containers/actions/runs/30568558212)),
  CROI `2.3.0`
  ([run 30568563875](https://github.com/ncsizemore/jheem-containers/actions/runs/30568563875)),
  and CDC Testing `2.1.3`
  ([run 30568569535](https://github.com/ncsizemore/jheem-containers/actions/runs/30568569535)).
  Exact and minor-version registry tags were verified against each workflow's tested digest.
  Backend `master` now pins the released model versions.
- **Container migration closeout:** The monorepo had already published `latest`, while production
  remained on legacy-built semver pins and all five legacy workflows could still publish competing
  mutable tags. Merged changes now retire publishing in
  [base](https://github.com/ncsizemore/jheem-base/pull/1),
  [MSA](https://github.com/ncsizemore/jheem-ryan-white-msa-container/pull/1),
  [AJPH](https://github.com/ncsizemore/jheem-ryan-white-ajph-container/pull/1),
  [CROI](https://github.com/ncsizemore/jheem-ryan-white-croi-container/pull/1), and
  [CDC Testing](https://github.com/ncsizemore/jheem-cdc-testing-container/pull/1) without removing
  historical source or tags.
- **Phase 2:** Shared analysis controls now reflow at narrow widths, inputs have programmatic labels,
  toggle state is exposed to assistive technology, popovers support Escape, and both maps have a
  direct non-map location selector. TypeScript and the production portal build pass. The public-site
  browser smoke loaded all 31 city and 30 CROI state choices, entered analysis through both direct
  selectors, rendered charts, and verified Escape dismissal for display options.
- **Phase 3:** Core guided workflows and structured pre-run timelines are deployed in
  [jheem-portal#13](https://github.com/ncsizemore/jheem-portal/pull/13), merged as `56b1b82a`.
  Model descriptions now flow through the shared configuration, pre-run controls follow the
  location/scenario/outcome/stratification sequence, and custom simulations explain their fixed
  assumptions, parameter meaning, background runtime, and review summary. Eight focused URL,
  cache-key, and timeline regressions pass; full TypeScript and production builds pass, including
  backend configuration sync and all 22 routes. The local browser pass verified AJPH query
  restoration, CROI timing disclosure, the exact `model=croi&loc=AL` URL/share-link state, and a
  375-pixel layout without horizontal overflow. It also found and repaired a model-selector split
  brain in which local UI state could change while the address bar retained the prior model; model
  links now make the URL authoritative and intentionally clear the old scenario before a different
  model can run. The production browser pass verified the MSA brief-interruption stop, resume, and
  recovery dates; the CROI July/October 2026 cessation timing and January 2029/2030 interruption
  recovery; and immediate loading of Alabama's cached `t2026-a50-o30-r40` custom result without an
  alert. Final terminology for the three suppression-loss inputs still requires model/content-owner
  approval.
- **Phase 3.5:** The high-risk control-plane and reproducibility work is deployed. Portal
  [#15](https://github.com/ncsizemore/jheem-portal/pull/15) established the patched dependency
  baseline and documented the remaining time-bounded advisories; portal
  [#16](https://github.com/ncsizemore/jheem-portal/pull/16) pinned generated model configuration to
  immutable backend revision `597b5ea0` and added mandatory tests, type checking, production build,
  configuration-drift verification, and production dependency audit. Backend
  [#26](https://github.com/ncsizemore/jheem-backend/pull/26) and portal
  [#17](https://github.com/ncsizemore/jheem-portal/pull/17) deployed the versioned request identity,
  exact run matching, duplicate suppression, explicit-launch rule, bounded inputs, fail-closed
  launch rate limiting, finalizing state, and reconstructable result metadata. Controlled
  production run
  [30651896230](https://github.com/ncsizemore/jheem-backend/actions/runs/30651896230)
  completed end to end in 11 minutes 56 seconds; an identical relaunch converged on the same run,
  the CloudFront result and return-link cache were available, and the published metadata matched
  the expected contract. Portal
  [#18](https://github.com/ncsizemore/jheem-portal/pull/18) then repaired the two bounded findings
  from that validation: cross-phase progress detail and one-percentage-point slider semantics.
  Pull-request and post-merge CI and Vercel production deployment passed. Portal
  [#20](https://github.com/ncsizemore/jheem-portal/pull/20) merged the lint/React closeout gate;
  its post-merge Portal CI passed. Portal
  [#21](https://github.com/ncsizemore/jheem-portal/pull/21) deployed the bounded critical-browser
  gate; post-merge Portal CI and Vercel deployment passed, and the public custom-simulation route
  returned HTTP 200. Backend [#27](https://github.com/ncsizemore/jheem-backend/pull/27) then pinned
  all active external actions to supported Node 24 releases and enforced the workflow policy.
  Backend [#28](https://github.com/ncsizemore/jheem-backend/pull/28) removed the sole unused
  vulnerable production dependency and added a zero-high/critical production-audit gate. Both
  backend post-merge validations passed. Phase 3.5 is complete.
- **Phase 4:** Artifact and target inventory is complete in
  [`RYAN-WHITE-CALIBRATION-ARTIFACT-INVENTORY.md`](./RYAN-WHITE-CALIBRATION-ARTIFACT-INVENTORY.md).
  A subsequent read-only NAS, model-code, data-manager, and release investigation established a
  two-stage source contract: immutable EHE releases provide 1,000-draw epidemic baselines for MSA
  and state geographies; the deployed Ryan White service-fit ensembles contain 80 deliberately
  thinned city draws and 1,000 state draws. The exact web/display manager and digest are identified,
  the target allowlist can be derived from the likelihood/review code, and representative packaging
  lineage is reconstructed. Engineering may proceed without an open-ended model-owner questionnaire.
  The authenticated historical-manager recovery was attempted on 2026-08-12; the old SharePoint URL
  served the current March 2026 artifact, confirming that the link is mutable and leaving the exact
  March 2025 bytes unavailable but non-blocking. A hash-gated comparison now establishes exact or
  additive compatibility for the shared display targets, and independently reproduces the newer
  manager's five ADAP-derived target formulas. It deliberately does not claim whole-manager or
  historical-posterior identity. The same pass also confirmed a legacy deployed metadata defect:
  older simsets map `adap.clients` observations to `non.adap.clients`, producing a duplicated ADAP
  overlay; model source corrected the mapping on 2026-01-09, but existing released artifacts still
  carry the old metadata. The manager compatibility unit is merged directly to `jheem_analyses`
  `master` at `426f03d1`, following that repository's established workflow. The private
  `CIPHER-Epi/jheem-data-managers` repository now holds digest-verified controlled releases of the
  April 2025 web/display manager and March 2026 full manager. The release-specific target registry
  is merged in [jheem-containers#16](https://github.com/ncsizemore/jheem-containers/pull/16), and the
  deterministic exporter is merged in
  [jheem-containers#17](https://github.com/ncsizemore/jheem-containers/pull/17), with the subsequent
  scientific extraction corrections merged in
  [jheem-containers#18](https://github.com/ncsizemore/jheem-containers/pull/18). The exporter restores
  the serialized JHEEM runtime state, rejects inherited observation mappings, preserves nested
  likelihood geography, emits the closed `jheem-calibration/v1` schema, and records immutable
  runtime, posterior, registry, exporter, and manager identities. A real Atlanta MSA service-fit
  run using the released 80-draw posterior and both controlled managers passed duplicate-export
  determinism, schema validation, and scientific invariants. The final private acceptance matrix
  then passed both EHE and Ryan White service-fit stages for representative MSA, AJPH, and CROI
  locations against the merged exporter and exact runtime-image digests. Unit 4A and representative
  Unit 4B acceptance are complete. The checksum-pinned production inventory and coverage contract
  are merged in [CIPHER-Epi/jheem-data-managers#3](https://github.com/CIPHER-Epi/jheem-data-managers/pull/3)
  and [jheem-containers#19](https://github.com/ncsizemore/jheem-containers/pull/19). Exhaustive
  [production run 32667856224](https://github.com/CIPHER-Epi/jheem-data-managers/actions/runs/32667856224),
  attempt 2, passed 31 MSA, 11 AJPH, and 30 CROI locations across both stages and assembled 144
  artifacts into three deterministic product bundles. The sole first-attempt failure was a GitHub
  release-asset connection reset; failed-job retry passed the unchanged AJPH shard and assembly.
  Independent candidate review then verified every package checksum, committed source digest,
  schema, inventory entry, coverage summary, provenance field, finite-value and quantile invariant,
  public observation source, and representative scientific payload. The review is recorded in
  [`RYAN-WHITE-CALIBRATION-RC2-REVIEW.md`](./RYAN-WHITE-CALIBRATION-RC2-REVIEW.md). The candidate is
  accepted for finalization but cannot be renamed or published as final: it embeds `rc.2` and the
  personal archive repository. Organization-owned archival, final assembly, CloudFront promotion,
  backend binding, and portal presentation remain. Phase 5 has not started.

### Independent engineering audit checkpoint — 2026-07-31

The completed release is accepted: no rollback is indicated, and the production evidence supports
the corrected scientific timing, cache isolation, and guided-workflow behavior. The review should
not yet be closed, however. A fresh-eyes engineering pass found a bounded set of control-plane,
reproducibility, dependency, and automated-assurance risks that should be remediated before adding
the calibration surface.

The revised order is:

1. complete **Phase 3.5 — Control-plane and reproducibility remediation**;
2. begin **Phase 4 — Model-aware calibration presentation**;
3. complete **Phase 5 — Integrated QA and release**.

Content-owner terminology review and the remaining interaction/accessibility polish may proceed in
parallel with Phase 3.5, but they do not replace its engineering gates.

### Phase 3.5 closeout checkpoint — 2026-08-02

The control-plane release is accepted and production-validated. Passive navigation is lookup-only;
new computation requires an explicit launch; identical submissions share one canonical request and
workflow; different scenarios retain distinct identities; cache completion requires the delivered
object; and launch abuse is bounded by atomic client, global, and per-request controls. The
production validation also confirmed the exact title, duplicate behavior, published provenance,
cached return path, and phase-aware progress behavior now protected by regression tests.

No further control-plane redesign is indicated before calibration work. The bounded closeout order
is:

1. merge portal PR #20, which modernizes linting, remediates the exposed React findings, and adds
   zero-warning lint to mandatory CI — **complete**;
2. add a small automated browser suite for the critical custom-simulation journeys — **complete in
   portal PR #21**;
3. audit active workflow commentary, remove the obsolete portal-postinstall/token explanation, and
   upgrade supported backend GitHub Actions runtimes — **complete in backend PR #27**;
4. clear the adjacent unused production dependency and enforce the audit — **complete in backend
   PR #28**;
5. mark Phase 3.5 complete, then inventory calibration artifacts for Phase 4 — **complete**.

Model-owner terminology approval may proceed in parallel. It is a content-release dependency, not
a reason to reopen the corrected execution architecture.

---

## 1. Why this work needs a plan

What began as a content and interaction-design review exposed a scientific-behavior defect in the
CROI custom-simulation path. The work now spans several independently deployed repositories:

| Repository | Responsibility in this work |
|---|---|
| `jheem_analyses` | Model-owner source of truth for intervention assumptions and reporting periods |
| `jheem-containers` | Canonical shared engine, model images, candidate-base cascade, and release gate |
| `jheem-backend` | Model configuration and workflow orchestration |
| Legacy base/CROI/AJPH/MSA/CDC repositories | Historical source and tags only; publishing retired |
| `jheem-portal` | User workflow, scientific context, results presentation, and accessibility |

This plan separates scientific correctness from UX improvements, records which source is
authoritative for each decision, and defines deployment gates so that a polished interface cannot
mask an incorrect simulation.

---

## 2. Confirmed findings

### 2.1 State custom-simulation URLs

The portal concatenated new query parameters onto a route that already contained `?model=...`,
producing malformed share and history URLs. The location could be lost on reload and a CROI route
could fall back to AJPH.

**Status:** Resolved and deployed in portal PR #13 with a shared URL-merging utility and
regression tests.

### 2.2 CROI custom-simulation timing

The model-owner code and the exact `jheem_analyses` revision pinned by the CROI container establish:

- anchor year: 2026;
- intervention begins July 1, 2026 (`2026.5`);
- suppression loss is applied after a three-month lag (`0.25`);
- the CROI study/reporting period is 2026–2031;
- the underlying simulation retains a longer computational horizon.

The shared custom Ryan White engine instead hardcodes a July 2025 intervention and a 2025–2035
run. The backend configuration records CROI's 2026 start year but does not pass model-specific
timing into the custom-simulation container.

**Ownership:** Shared-engine/backend integration defect, not a model-owner-code defect and not a
numerical calculation performed by the portal.

**Status:** Resolved through the released container/backend timing contract and production-validated
as recorded in the Phase 1 snapshot above.

### 2.3 Product and design issues

- Direct explorer routes provide too little scientific and scenario context.
- Pre-run and custom workflows expose controls without first explaining the decisions being made.
- Custom simulations do not clearly state that they model permanent cessation only.
- Desktop controls do not adapt adequately to narrow screens.
- Map interaction and control labeling need an accessibility pass.
- Calibration evidence is not presented alongside the model that it supports.

---

## 3. Prioritization principles

1. **Scientific correctness before interface polish.**
2. **One model contract, not model-ID conditionals scattered across workflows and R scripts.**
3. **Model-owner code defines assumptions; backend configuration transports them; the portal
   explains them.**
4. **Study period and computational horizon are separate concepts and must be labeled separately.**
5. **Pre-run and custom simulation are related but not identical workflows.** Named paper scenarios
   should not be presented as though they are interchangeable with the custom permanent-cessation
   parameterization.
6. **Calibration is model- and location-specific.** Do not publish a generic calibration page that
   can imply support for a different model, geography, or release.

---

## 4. Recommended implementation order

### Phase 0 — Contain known portal defects

- Complete the state custom-simulation URL fix.
- Cover AJPH and CROI model/location/parameter combinations with regression tests.
- Verify reload, back/forward navigation, share links, and emailed result links.

**Exit gate:** Model selection and all scenario parameters survive a copied URL and a clean reload.

### Phase 1 — Correct and harden custom-simulation timing

#### Backend model contract

Extend each Ryan White model's `customSimulation` configuration with explicit fields such as:

```json
{
  "interventionType": "permanent_cessation",
  "timing": {
    "interventionStartTime": 2026.5,
    "lossLagYears": 0.25,
    "simulationStartYear": 2026,
    "simulationEndYear": 2036,
    "reportingStartYear": 2026,
    "reportingEndYear": 2031
  }
}
```

The exact values differ by model. The schema should reject incomplete timing configuration for a
custom-enabled model rather than silently applying a shared default.

#### Workflow and engine

- Read timing from the selected model configuration in `run-custom-sim.yml`.
- Pass it to the model container as validated environment variables.
- Make `simple_ryan_white.R` consume and validate those values.
- Remove the fixed `2025.5`, `2025`, and `2035` assumptions from the shared script.
- Log the resolved timing and include it in generated result metadata.

#### Runtime validation

- Rebuild the CROI model container on the corrected base.
- Generate a new CROI custom golden artifact.
- Assert that CROI custom and baseline results do not diverge in 2025.
- Assert that the configured intervention becomes active during 2026.
- Re-run MSA and AJPH goldens to detect unintended behavior changes.
- Verify the production workflow end to end for at least one CROI state.

#### Portal disclosure

Show, before submission:

- intervention start date;
- lag before suppression changes;
- intervention type (permanent cessation);
- study/reporting period;
- longer exploratory output horizon, if displayed.

**Exit gate:** Timing is selected by model configuration, recorded in output metadata, validated by
goldens, and visible to the user.

**Containment rule:** If the corrected CROI runtime cannot be deployed in the same release cycle,
temporarily remove the CROI custom option. A warning is insufficient for a known numerical-timing
error.

### Phase 2 — Repair the shared explorer foundation

- Replace fixed desktop layouts with responsive control regions.
- Establish a consistent control order: location, scenario, outcome, stratification.
- Add programmatic labels, keyboard behavior, focus treatment, and non-map location selection.
- Ensure maps are supplementary rather than the only way to select a geography.
- Improve loading, empty, unavailable, and error states.
- Test shared changes against MSA, AJPH, CROI, and CDC Testing to prevent cross-model regressions.

**Exit gate:** Core explorer tasks work at desktop and mobile widths and can be completed without a
mouse or map interaction.

### Phase 3 — Add scientific context and guided workflows

#### Pre-run explorers

- Add a concise model-purpose statement.
- Explain the named scenarios and their timelines before users choose one.
- Present the workflow as four clearly numbered decisions without turning it into a blocking wizard:
  location, scenario, outcome, stratification.
- Distinguish baseline, interruption, resumption, and post-resumption periods in copy and charts.

#### Custom simulations

- Explain what is customizable and what remains fixed.
- Define ADAP, OAHS, and other Ryan White support parameters in plain language.
- Show a scenario summary for review before simulation submission.
- Explain runtime, caching, email delivery, and result persistence.
- Keep the result explorer available on the same page after completion.

**Exit gate:** A domain-informed but first-time visitor can describe the scenario they are about to
run before pressing **Simulate**.

### Phase 3.5 — Control-plane and reproducibility remediation

This is a focused hardening phase, not a redesign of the completed model correction or guided
workflow. Keep each change independently reviewable and avoid coupling it to calibration feature
work.

#### Dependency security and enforced checks

- Upgrade Next.js from the affected `16.2.3` release to a current patched compatible release and
  refresh the lockfile.
- Resolve or explicitly disposition remaining production dependency advisories.
- Replace the obsolete Next.js lint command with a supported ESLint invocation.
- Add mandatory CI for unit tests, type checking, linting, and a production build. Add a small
  browser suite for critical custom-simulation journeys rather than attempting broad coverage in
  the first CI change.

**Exit gate:** A clean install has no unresolved high-severity production advisory without a
documented, reviewed exception, and every portal change is gated by tests, type checking, linting,
and a production build.

**Progress — 2026-07-31:** Next.js is updated to `16.2.12`; PostCSS is constrained to a patched
8.x release; unused Plotly packages and their vulnerable production build chain are removed; and
the remaining unreachable optional Sharp finding is recorded with an enforced configuration
control and removal trigger in `docs/DEPENDENCY-SECURITY.md`. The production build and focused
Ryan White regressions pass. Lint modernization was separated from the initial mandatory CI
baseline because the Next.js 16 rules expose pre-existing cross-application React findings that
require focused remediation rather than a blanket severity downgrade. The baseline excluding lint
was subsequently delivered in portal PR #16.

**Reproducibility and CI progress — 2026-07-31:** The portal now pins its generated model
configuration to immutable backend commit `597b5ea0`, commits deterministic generated output, and
keeps ordinary install/build paths independent of backend availability. The new CI baseline uses
immutable action revisions and gates pull requests on the pinned-config check, 12 focused
regressions, TypeScript, all-route production build, and a tested production-audit policy. Lint
modernization and critical browser journeys remain separate follow-ups; the CI baseline does not
weaken the newly exposed React rules to manufacture a clean result.

**Deployed status — 2026-08-01:** Portal PRs #15 and #16 are deployed. Pull-request and `main`
checks enforce the pinned configuration, focused regressions, TypeScript, all-route production
build, and the documented production-audit policy. At that checkpoint, the remaining exit-gate work
was deliberately narrow: replace the obsolete lint command, remediate the real React findings, add
lint to CI, and automate the critical browser journeys already exercised manually.

**Lint closeout — 2026-08-01:** Portal PR #20 aligns the flat configuration with Next.js 16.2.12,
replaces the removed framework command with zero-warning ESLint 9, resolves all 16 React correctness
errors and seven warnings without weakening rules, and adds lint to mandatory CI. TypeScript, 22
focused tests, the production dependency policy, all 22 production routes, and local URL/hydration
browser checks pass. The costing route remains statically generated. PR #20 is merged and its
post-merge Portal CI passed.

**Browser-automation closeout — 2026-08-01:** Portal PR #21 pins Playwright, adds its Chromium
runtime and three critical custom-simulation journeys to mandatory CI, and intercepts every custom
simulation request so the test suite cannot dispatch backend compute. It verifies exact shared-link
restoration and lookup-only behavior, the explicit Run-button launch boundary, and fail-closed
handling of unknown location codes. The first run exposed a client inconsistency: an unknown URL
location skipped lookup but still enabled Run. The portal now canonicalizes that input to no
selection and checks known-location membership again at launch. All three browser journeys, the 22
focused tests, pinned-config verification, TypeScript, zero-warning lint, the production dependency
policy, and all 22 production routes pass locally. PR #21 merged as `67b7790`; post-merge
[Portal CI 30716319717](https://github.com/ncsizemore/jheem-portal/actions/runs/30716319717)
and Vercel deployment passed, and the
[public custom-simulation route](https://jheem.org/ryan-white/custom) returned HTTP 200.

#### Explicit launch, abuse resistance, and exact run identity

- Opening, crawling, or previewing a result URL may check cache/status but must not create a new
  simulation. New computation requires an explicit user action.
- Add rate limiting appropriate to an unauthenticated endpoint that can dispatch long-running
  compute. Enforce JSON content type and a bounded request body; retain origin/challenge controls
  as defense-in-depth options if observed abuse warrants them.
- Define one canonical request identity from model ID, normalized location, normalized scenario
  parameters, and the versioned run contract.
- Use that identity for deduplication, status lookup, workflow concurrency, and validation of a
  supplied run ID. Do not treat two scenarios as equivalent merely because they share a location.
- Test simultaneous identical requests, simultaneous different scenarios for one location, stale
  run IDs, cached results, failure, and retry.

**Exit gate:** Passive navigation cannot spend compute; repeated identical submissions converge on
one run; distinct scenarios cannot inherit one another's status; and abusive request bursts are
bounded.

**Deployed status — 2026-08-01:** Backend PR #26 and portal PR #17 satisfy this gate. Controlled
production run 30651896230 used canonical title
`custom-sim: v1:ryan-white-msa:C.12580:a1-o2-r3`; the identical relaunch returned the same run ID
without dispatching duplicate compute. Portal PR #18 preserves exact whole-percentage inputs and
resets fine-grained detail when workflow progress changes units across phases.

#### Versioned cache and result provenance contract

- Include the model/container release, immutable image digest, input or simset release, backend
  configuration revision, result schema/aggregator version, timing contract, location, and scenario
  parameters in reconstructable result provenance.
- Version cache identity by a stable run contract so a new model, data, timing, or schema release
  cannot silently reuse an incompatible object.
- Validate delivered metadata against the portal's expected contract before presenting a result;
  fail safely or show a clear incompatibility state rather than applying a confident but incorrect
  label.
- Replace cross-repository reads from moving default branches with immutable commits, releases, or
  a versioned contract artifact. Minimize the backend workflow's dependency on a full portal
  checkout for aggregation.

**Exit gate:** A result can be traced to immutable model/data/configuration inputs, incompatible
cache entries cannot be reused, and rebuilding an unchanged release cannot silently consume a
different cross-repository contract.

**Deployed status — 2026-08-01:** The released backend and portal use the versioned `v1` request
identity, versioned scenario/cache keys, immutable portal configuration source, deterministic
object naming, and published custom-simulation metadata. The controlled production result passed
metadata verification before publication and was retrieved through the CloudFront and portal
cache paths without falling back to a legacy key.

#### Documentation and workspace hygiene

- Update the custom-simulation security document to reflect the implemented portal-owned email
  notification path and response headers, while retaining genuinely open hardening work.
- Remove or correct workflow comments that describe a status-object mechanism no longer in use.
- Review action-version runtime warnings and update action majors where supported.
- Before feature work, preserve unrelated costing and component changes on their own branch or
  commit, synchronize clean portal/backend worktrees with their authoritative default branches,
  and avoid mixing workspace cleanup with product changes.

**Exit gate:** Operational documentation describes the deployed system, and Phase 4 starts from
clean, synchronized worktrees without disturbing unrelated user changes.

**Closeout status — 2026-08-02:** The portal security and run-contract documents describe the
portal-owned notification path, fail-closed rate limits, exact request identity, and delivered-object
completion semantics. Phase 3.5 work has used an isolated clean worktree so unrelated costing work
remains untouched. Backend PR #27 pins all 15 active external action uses to reviewed immutable
Node 24 release commits, upgrades workflow toolchains from EOL Node 20 to Node 24 LTS, removes the
obsolete portal-postinstall token explanation and unnecessary token exposure, and enforces those
rules across all seven active workflows. The audit found no active status-object commentary
remaining. Archived workflows remain inert and intentionally unchanged. Post-merge
[validation 30725343524](https://github.com/ncsizemore/jheem-backend/actions/runs/30725343524)
passed. Backend PR #28 removes the unused `react-simple-maps` production dependency and its D3/React
graph, adds an enforced high/critical production audit, and reduces production audit findings to
zero. Post-merge
[validation 30725435203](https://github.com/ncsizemore/jheem-backend/actions/runs/30725435203)
passed. Remaining npm findings are confined to legacy development tooling and belong to a separate
non-runtime maintenance backlog. The Phase 3.5 engineering and documentation gates are complete.

### Phase 4 — Add model-aware calibration presentation

- Inventory calibration targets and posterior-fit artifacts for each deployed model/release.
  **Complete, including the follow-up source/provenance investigation; see the Phase 4 artifact
  inventory.**
- Define a versioned calibration manifest keyed by model ID, release, location, outcome, and target.
- Generate calibration outputs from the same pinned model artifacts used by the portal.
- Add a calibration entry point to each relevant model page.
- Borrow the useful GMHA interaction patterns, while preserving the Ryan White portal's component
  system and avoiding a one-off embedded app.
- Clearly distinguish calibration/fit years from projection years.

**Exit gate:** Every displayed calibration result identifies the exact model release, geography,
calibration stage, target data, posterior ensemble and sample count it represents; reconstructed or
unknown historical provenance is labeled honestly rather than silently promoted to verified.

#### Phase 4 implementation checkpoint — 2026-08-11

Proceed in four bounded units:

1. record the engineering source contract: two-stage target registry, verified release assets and
   digests, stage-specific sample counts, exact web/display-manager identity, provenance-confidence
   fields, and the completed historical-manager recovery result;
2. adapt the existing container extraction path to emit deterministic, stage-aware, baseline-only
   `jheem-calibration/v1` artifacts and publish them immutably;
3. pin and validate the manifest in backend model configuration, then build the schema-validated,
   lazy portal surface; and
4. complete numerical, cross-model, failure-state, accessibility, responsive, production, and
   focused scientific-copy QA.

Do not begin the visual surface by reusing scenario files directly. They repeat baseline and
observed data, omit the scientific provenance needed by the exit gate, and do not distinguish the
1,000-draw EHE epidemic baseline from the 80-draw MSA or 1,000-draw state Ryan White service-fit
ensembles. Do not rerun a replacement 1,000-draw MSA service fit and present it as provenance for
the deployed model.

#### Phase 4 manager-compatibility checkpoint — 2026-08-12

The manager comparison and candidate-derived-target validation are implemented as a deterministic,
hash-gated `jheem_analyses` unit. The April 2025 display manager and March 2026 full manager have
unchanged shared values for `non.adap.clients`, `oahs.clients`, `oahs.suppression`, and
`adap.proportion`; `adap.suppression` is additive; and `diagnosed.prevalence` is unchanged on its
shared cells while the newer manager fills additional coverage. All five checked ADAP-derived
targets reproduce their documented formulas with zero mismatches.

This evidence supports target-specific reuse, not silent substitution of the March 2026 manager as
the historical fitting manager. In particular, `adap.clients` is candidate-only relative to the
display manager. A production overlay that shows it equal to `non.adap.clients` reflects the old
simset's incorrect `corresponding.observed.outcome` metadata, not historical numeric equivalence.

The bounded order from here is:

1. review redistribution constraints for the April 2025 display manager and March 2026 full
   manager — **complete; see
   [`RYAN-WHITE-MANAGER-REDISTRIBUTION-AND-STORAGE-DECISION.md`](./RYAN-WHITE-MANAGER-REDISTRIBUTION-AND-STORAGE-DECISION.md)**;
2. choose immutable controlled storage and decide whether either manager may be a GitHub Release
   asset, with a digest-only/public-derived-data fallback when redistribution is not established —
   **architecture selected: use private `CIPHER-Epi/jheem-data-managers` immutable releases plus
   public minimal derived artifacts; repository creation, private-location data classification,
   and both controlled releases are complete; no public manager release without source-rights
   review**;
3. commit the release-specific target registry, explicitly excluding the legacy `adap.clients`
   overlay and representing the corrected target only where a valid observed-manager binding is
   available — **complete in `jheem-containers` PR #16**;
4. merge the manager-compatibility, portal-provenance, and target-registry PRs in dependency order,
   then remove their merged temporary worktrees and synchronize the repositories' default-branch
   checkouts without disturbing the dirty primary portal checkout — **complete except for bounded
   local branch/worktree cleanup, which remains intentionally deferred until unrelated portal work
   is preserved**;
5. bootstrap the private `CIPHER-Epi/jheem-data-managers` repository with the archive schema,
   registry, immutable-release convention, access policy, and verification workflow; confirm the
   two managers' private-location data classification and publish their exact verified byte streams
   as controlled releases — **complete**;
6. proceed to the deterministic exporter, manifest, backend binding, portal surface, and integrated
   QA in Units 4B–4D — **exporter and representative multi-model/two-stage acceptance complete;
   exhaustive production, publication, backend binding, and portal work remain**; and
7. treat central publication of future CI-built managers—beginning with a later syphilis promotion
   pilot—as a separate platform unit, not a prerequisite for the Ryan White calibration surface.

#### Phase 4 exporter and acceptance checkpoint — 2026-08-18

The representative-acceptance exporter and scientific extraction corrections are pinned to merged
`jheem-containers` commit `a490eb7f8028785b68b5bf4b84b74bba2dbd0497`. The private acceptance
workflow downloads and verifies the exact simulation release asset and both controlled-manager
byte streams, runs the exporter twice inside the immutable model-image digest, compares the outputs
byte for byte, validates the closed schema, and checks model, stage, location, sample-count, target,
and observation invariants. The final provenance-exact
[acceptance run](https://github.com/CIPHER-Epi/jheem-data-managers/actions/runs/31846981011)
passed EHE and Ryan White service-fit stages for representative MSA, AJPH, and CROI locations. The
acceptance matrix is merged in
[CIPHER-Epi/jheem-data-managers#1](https://github.com/CIPHER-Epi/jheem-data-managers/pull/1) at
`4cb656c5b05e34e608b5adf254fa715a0c594685`. No controlled input or raw posterior is published.

The exhaustive build uses coverage-enabled exporter revision
`d11c5ae6f945dbc12466615d3fa15a4131edb3bb`, while retaining the accepted registry and scientific
extraction behavior. Its exporter, schema, registry, coverage scanner, and coverage-lock byte
digests are independently verified. The six representative stage artifacts retain identical
scientific payloads to run `31846981011`; only the deliberately added coverage source, target
availability state, and corresponding exporter digest differ.

The next bounded order is:

1. complete the representative real-artifact gates for MSA, AJPH, and CROI across both stages —
   **complete**;
2. add a committed, checksum-pinned production inventory for 31 MSA, 11 AJPH, and 30 CROI
   locations, and generate both stages for every entry: 72 product/location bundles and 144 public
   derived JSON artifacts — **complete in run 32667856224, attempt 2**;
3. assemble per-product manifests, location indexes, coverage reports, and checksums; fail closed
   on missing or extra locations, schema drift, input-digest drift, or nondeterministic output —
   **complete for `v1.0.0-rc.2`; independent review passed**;
4. retain the complete build privately for review, then publish only approved minimal derived
   artifacts and release metadata to a versioned public `jheem-simulations` release. Manager
   binaries and source posterior assets remain outside that release — **private retention and
   independent review are complete; publication remains gated on creating public
   `CIPHER-Epi/jheem-simulations`, updating the archive identity, and reassembling—not renaming—a
   final `v1.0.0` package from the retained shards**;
5. promote the reviewed release byte-for-byte to an immutable versioned S3/CloudFront prefix.
   GitHub Releases is the archival source of truth, not the browser delivery origin: direct release
   assets use attachment redirects and do not provide a portal CORS contract;
6. pin each product's CloudFront manifest URL and digest in backend configuration. Rollback changes
   only that pin to a prior immutable release; it does not overwrite an existing prefix; and
7. begin the schema-validated, lazy portal surface only after the promoted manifest contract passes
   backend validation.

The exhaustive build belongs in the private manager repository because it alone can read the
controlled inputs. It is manually dispatched and bounded in concurrency: a full build transfers
roughly 142 GB (132 GiB) of immutable simulation inputs but emits well under 0.1 GB of derived JSON
before release bundling.
Publication is a separate approval-gated promotion, not an automatic consequence of a successful
build.

Calibration-tooling-only changes should eventually stop rebuilding and promoting unrelated runtime
images. The current broad container gate is safe but unnecessarily expensive; selector refinement
is bounded CI maintenance and must not weaken exact-digest model testing for runtime changes.

### Phase 5 — Integrated QA and release

- Desktop and mobile visual regression pass.
- Keyboard and screen-reader-oriented interaction review.
- Color contrast and non-color encoding review.
- URL, navigation, email-link, cache, and failure-recovery tests.
- Scientific copy review against the pinned analysis code.
- Production smoke test for every Ryan White model and workflow.
- Record image digests, model/data releases, and deployment versions.

#### Required deployment order

1. Merge the five legacy publisher-retirement PRs so only the monorepo can write current package
   tags.
2. Publish backend-owned timing metadata and its validator without enabling runtime transport or
   changing cache keys/image pins. This lets container `main` validate against backend `master`
   without changing production execution.
3. Merge the canonical container change. A base change on `main` must remain unpromoted until the
   explicit base release gate passes.
4. **Completed 2026-07-30:** Published `base-v1.7.0`; the full gated cascade passed and promoted
   only `jheem-base:1.7.0`, `1.7`, and `latest`, all at immutable digest
   `sha256:a76a92ca41d38c3d7d5f77f79efd2e2fe754f8ee97be6b69aec0ea949c1282c3`.
5. **Completed 2026-07-30:** [jheem-containers#15](https://github.com/ncsizemore/jheem-containers/pull/15)
   updated every downstream model to base `1.7.0` at its immutable digest and repaired the model-only
   workflow gate. The corrected PR and merged-state four-model gates passed. Explicit release tags
   published MSA `1.1.0`, AJPH `1.1.0`, CROI `2.3.0`, and CDC Testing `2.1.3`; every exact and
   minor-version tag was verified against its release-tested digest.
6. **Completed 2026-07-30:** Reconciled [jheem-backend#21](https://github.com/ncsizemore/jheem-backend/pull/21)
   with the metadata bridge, updated canonical and mirrored workflow pins to MSA `1.1.0`, AJPH
   `1.1.0`, CROI `2.3.0`, and CDC Testing `2.1.3`, and added pin-drift validation. Backend CI and
   the container-to-backend contract passed. The PR merged with timing transport, cache isolation,
   and compatible pins together; post-merge `master` validation passed. The released CROI
   production-configuration dry-run passed with the expected timing metadata and `t2026` key while
   skipping result upload. The controlled write-backed cache-isolation smoke and metadata repair
   rerun are complete; the versioned production result is available and the legacy key remains
   absent.
7. **Completed 2026-07-30:** Deployed the portal guidance, timing disclosure, URL-state fixes, and
   accessible/responsive controls through [jheem-portal#13](https://github.com/ncsizemore/jheem-portal/pull/13).
   Vercel production deployment passed for `56b1b82a`; public live-data city, CROI state, scenario
   timeline, keyboard-dismissal, and cached-custom-result checks passed. The backend write-backed
   and cache-isolation smokes are complete as recorded above.
8. **Core controls completed 2026-08-01:** Portal PRs #15–#18 and backend PR #26 delivered the
   dependency/CI baseline, reproducible configuration, exact request identity, launch protection,
   duplicate suppression, delivered-result completion, progress repair, and production validation.
   Complete the bounded lint, browser-automation, action-runtime, and documentation closeout before
   deploying the Phase 4 calibration surface.

The former unsafe legacy-pin state is resolved in PR #21. Keep the executable timing transport,
cache isolation, and compatible released pins together during final merge/deployment so a result
cannot be labeled with the corrected contract while running a legacy image.

---

## 5. Decisions made and decisions still open

### Recommended decisions

- Treat 2026–2031 as the CROI study/reporting period.
- Preserve the longer computational output when useful, but label years after 2031 as exploratory
  projections rather than part of the CROI analysis period.
- Configure CROI custom cessation to begin July 1, 2026 with the model's three-month loss lag.
- Keep the custom tool scoped to permanent cessation until temporary-interruption timing is
  deliberately implemented and validated.
- Generate explanatory timeline copy from structured model metadata wherever possible.

### Still requires focused model/content-owner review

- Final plain-language definitions for the three suppression-loss inputs.
- Whether exploratory post-2031 results should be shown by default or behind an expanded range.
- Plain-language labels, denominator/geographic-construction explanations, and methodological
  caveats for the release-specific target registry after representative panels exist.
- Source and ensemble disclosure copy for the two labeled groups: 1,000-draw EHE epidemic baseline
  fit, and Ryan White service fit using 80 city or 1,000 state draws.
- Publication-ready citations and acknowledgement language for the CROI analysis.

None of these open content decisions should block the Phase 1 numerical correction.

---

## 6. Test matrix

| Area | Required coverage |
|---|---|
| URL state | AJPH and CROI; location only; parameters; copied URL; reload; back/forward |
| Timing | MSA 2025 configuration; AJPH 2025 configuration; CROI 2026.5 configuration |
| Numerical regression | Existing MSA/AJPH goldens; corrected CROI golden; no CROI effect in 2025 |
| Workflow | Successful run, cached result, failure, retry, email result link |
| Request identity | Identical concurrent request; different scenarios at one location; stale/mismatched run ID |
| Abuse controls | Explicit launch only; rate-limit boundary; content type; oversized/malformed body |
| Provenance/cache | Model and data release; image digest; timing/config/schema revision; incompatible cache rejection |
| Responsive UI | 390 px, 768 px, 1024 px, and wide desktop |
| Accessibility | Keyboard-only selection, visible focus, labeled controls, non-map location path |
| Content | Scenario timeline, fixed assumptions, study period, output horizon, model release |
| Calibration | Model/release/location/stage identity; target and manager provenance; asset digest; actual sample count; verified/reconstructed/unknown confidence |
| Automation | Clean install, dependency audit, unit tests, type check, lint, build, critical browser journeys |

---

## 7. Definition of done

The review is complete when:

- no deployed custom simulation uses timing inherited accidentally from another model;
- passive page loads cannot launch new simulation compute;
- request identity, concurrency, and rate limiting prevent accidental cross-scenario status reuse and
  bound unauthenticated compute dispatch;
- every simulation result carries enough metadata to reconstruct immutable model, data, timing,
  configuration, and schema inputs;
- incompatible cache entries are rejected rather than silently relabeled;
- users understand the scenario before running or interpreting it;
- the shared explorers work across supported screen sizes and input methods;
- calibration evidence is tied to the correct model, release, geography, fit stage, target registry,
  observed-data identity, and stage-specific posterior count;
- cross-repository dependencies are pinned to reproducible contracts; and
- mandatory CI, cross-repository goldens, and portal regression tests protect these properties in
  future releases.
