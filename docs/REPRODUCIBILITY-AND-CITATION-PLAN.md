# Reproducibility & Citation Plan

**Status:** Planning (internal) · **Created:** 2026-06-17 · **Driver:** Parastu's manuscript request

Internal engineering plan. A user-facing reproduction guide is a later, separate deliverable.

---

## 1. Context & framing

Parastu raised that the JHEEM model is hosted under Todd's personal account and that NIH-funded
work needs stable, public, version-pinned links to the exact code behind each manuscript. Her ask
is correct and timely. Working through it surfaced a useful distinction:

There are **two different reproducibility problems** that are easy to conflate:

- **A. Reproducibility of the running pipeline** — "if we re-run, do we get the same numbers?"
  **This is largely solved.** Containers pin jheem2 to an exact commit, jheem-base carries a full
  `renv.lock`, and images are content-addressable. This is ahead of most academic modeling groups.
- **B. Citable archival of source for a publication** — "can a reviewer in 2031 find, download, and
  *cite* the exact code behind Table 2, guaranteed unchanged?" **This is not solved.** It needs an
  institution-owned home, immutable snapshots with persistent identifiers (DOIs), and capture of the
  whole dependency closure — not just one repo.

The work below is tiered by how directly it serves problem B (Parastu's actual need), so that
opportunistic engineering doesn't displace the critical path.

---

## 2. Current state (findings — institutional knowledge capture)

### Repository hosting & versioning
- The "model" is a **family of ~5 R packages**, not one repo:
  | Repo | Owner | DESCRIPTION ver | Git tags | Branch |
  |------|-------|-----------------|----------|--------|
  | `jheem2` (engine) | **tfojo1** | 1.11.1 | **0** | `dev` |
  | `distributions` | **tfojo1** | 1.0.0 | **0** | master |
  | `locations` | **tfojo1** | 0.1.0 | **0** | main |
  | `bayesian.simulations` | **tfojo1** | 0.2.2 | **0** | master |
  | `jheem_analyses` (specs/calibration) | **tfojo1** | — | 28 (date-scoped) | master |
- Portal / backend / containers are under **ncsizemore** (personal).
- The core engine packages have **zero semantic version tags**; jheem2's working branch is `dev`.
  The only thing that pins a result today is a commit SHA buried in a Dockerfile.

### How containers pin the model (reproducibility-in-practice is real)
- `jheem-base`: `r-base:4.4.2` + system deps + full `renv.lock` (~578 KB, pins the R dependency tree).
  Copies `common/`, `simulation/`, `plotting/`, `tests/` into `/app`. Sets no ENTRYPOINT.
- Model containers (e.g. MSA): `FROM jheem-base:<ver>`, `COPY` a prebuilt workspace `.RData`,
  pin jheem2 at runtime via `renv::install('tfojo1/jheem2@<commit-sha>')`, then
  `ENTRYPOINT container_entrypoint.sh` / `CMD batch`.
- **The source repos are NOT shipped as browsable files.** `jheem_analyses` source isn't in the
  image (only its output, the workspace `.RData`). `jheem2` is an installed R package — repo tree,
  git history, and compiled C++ are not present as files. Caveat: like any R package, R-level
  function bodies remain introspectable from an R session, so this is **not a secrecy boundary**.

### Known fragilities
- **Runtime monkeypatching of jheem2 internals** (the biggest smell). Scattered across
  `custom_simulation.R` / `simple_ryan_white.R`:
  - `assignInNamespace("populate_outcomes_array", ...)` NULL-guard (RW models only).
  - `get.intervention.from.code.from.code` typo shim.
  - Manual restore of `VERSION.MANAGER` / `ONTOLOGY.MAPPING.MANAGER` namespace state.
  Comments already say "Fix in jheem2 proper, then remove this." These couple the container to
  jheem2's internal implementation and are version-fragile.
- **MSA workspace version skew:** calibrated with jheem2 1.6.2 but serialized with 1.9.2 (R6 class
  compatibility). Works, but hard to reason about; a reproducibility landmine for a citable artifact.
- **Build depends on personal-account repos** (`renv::install('tfojo1/jheem2@<sha>')`). If those go
  private/away — the exact risk Parastu raised — container builds break.

### Build & data mechanics
- Build by **pushing to GitHub**; each repo's `build-and-push.yml` builds + pushes to ghcr.io.
- **base→model cascade rebuild is deliberately disabled** (models pin different jheem2 versions).
  Rolling a base change requires: new base tag → bump each model's `ARG BASE_VERSION` → push each.
- Simsets live in **public** GitHub Releases (`jheem-simulations`). Unauth download works.
  **Sizes are large** — state baseline simsets are ~1.5 GB each (noint ~400 MB); trimmed/web simsets
  are smaller. The custom-sim workflow downloads the per-location simset before each run (it has to —
  GHA runners are ephemeral).
- `custom_simulation.R` writes simsets to `OUTPUT_DIR/simulations/{MODEL_ID}/{base,prerun/LOCATION}`;
  `batch_plot_generator.R` reads `simulations/{MODEL_ID}/...` relative to CWD with `--output-mode data`.
  Same workspace auto-detected from `*_workspace.RData`. This shared contract is the seam the `run`
  command chains.

---

## 3. Tier 1 — Reproducibility & citation (critical path; BLOCKED on Todd)

This is the track that actually solves Parastu's problem. Blocked until Todd is back (the repos are
his to move). Captured here so it's ready to execute immediately.

1. **GitHub Organization.** Move JHEEM repos off personal accounts into a team-owned org with **≥2
   owners**. Open decision: **standalone public org vs JHU GitHub Enterprise** (tradeoffs: Enterprise
   looks institutional but can deprovision on departure and complicates external collaborators; a
   team-owned org is often more durable for open science). Transfers preserve history + set up redirects.
2. **Semantic version tags + GitHub Releases** on `jheem2`, `distributions`, `locations`,
   `bayesian.simulations` — at minimum, cut a tagged release whenever a manuscript freezes.
3. **Per-publication release bundle** capturing the *whole closure*: commit/tag of each component repo,
   the `renv.lock`, and the **container image digest**. One small companion record per paper.
4. **Zenodo DOIs.** Connect repos to Zenodo so each GitHub Release auto-mints a permanent version DOI
   (+ concept DOI). This is the citable, immutable link for the code-availability statement. GitHub
   tags alone are not an archive.
5. **`CITATION.cff`** in each repo (GitHub "Cite this repository" button; feeds Zenodo metadata).
6. **Fix the jheem2 monkeypatches upstream** (unblocked by versioning) and drop the runtime patches.

Open decisions to resolve with Todd: org type, org naming, admin/ownership.

---

## 4. Tier 2 — Container as citable artifact ✅ DONE

**Status (2026-06-18):** Implemented and validated end-to-end on MSA. `run` + `version` modes and
simset fetch+cache are in **jheem-base v1.6.0**; MSA rebuilt on it (`ghcr.io/.../jheem-ryan-white-msa`,
latest). Reproducibility proven bit-for-bit (see §6). Other three models: one-line `ENV` + `BASE_VERSION`
bump each — deferred (roadmap).

Reinforced Tier 1 and was the right use of time while Tier 1 is blocked. **Designed for forward-compat:**
provenance fields carry `TBD` placeholders for the eventual tag/DOI so Tier 1 fills blanks, not redesigns.

**As-built deviations from the plan below:** the simset cache mounts at `/cache` (wrapper symlinks the
location's `_base` simset into `/data`, where `custom_simulation.R` reads); fetch is `fetch_simset.R`
(jsonlite + `download.file`), size-verified against the release asset; identity is baked as plain
`MODEL_ID`/`SIMULATION_SCRIPT` ENV (plus `DEFAULT_OUTCOMES`, `SIMSET_RELEASE`, `JHEEM2_REF`,
`JHEEM2_WORKSPACE_VERSION`).

### 4.1 `run` command — one-command simulation
- Add a `run)` case to `common/container_entrypoint.sh` → `run_simulation.sh` (new, in `common/`,
  so it lands in **jheem-base** and all four models inherit it).
- `run_simulation.sh` is a **thin façade over the existing `custom_simulation.R` +
  `batch_plot_generator.R`** — the same scripts the web pipeline uses. **Do not fork a parallel sim
  path** (a second path that drifts would undermine the reproducibility story).
- Flags: `--location`, `--out`, `--outcomes`, `--scenario-key`, repeatable `--param NAME=VALUE`
  (exported uppercased → reuses the model script's existing env-var contract; no per-model bash).
- Sets `OUTPUT_DIR=/app` so the two scripts' shared directory contract lines up; emits one artifact.

### 4.2 Model identity via baked `ENV` (decided)
- Bake the **real** vars into each model Dockerfile: `ENV MODEL_ID=… SIMULATION_SCRIPT=…`
  (NOT a `JHEEM_`-prefixed duplicate — single name per concept).
- **Keep the workflow's runtime `-e` injection.** Decision rationale (do not "clean this up" later):
  - Params + `LOCATION` vary per request → must stay runtime-injected regardless.
  - For `MODEL_ID`/`SIMULATION_SCRIPT`, runtime `-e` is technically redundant once baked, but keeping
    it preserves `models.json` as the single source of truth for the workflow path. Removing it would
    push source-of-truth into Dockerfiles (drift surface) and couple "rename a script" to "rebuild image."
  - Runtime `-e` always overrides image `ENV`, so the two coexist harmlessly. Baked `ENV` serves only
    the standalone `run` path (no `models.json` there) and makes the image self-describing.

### 4.3 Simset fetch + caching
- `run` fetches the per-location simset from the public `jheem-simulations` release (R `download.file`;
  the `curl` binary isn't in the image, libcurl is). Verify a checksum (guard against silent truncation).
- **Persistence:** a runtime download lives only for that container instance (gone with `--rm`, not
  shared across `docker run`s). With a mounted volume (`-v jheem-cache:/data`) the wrapper checks
  `/data` first → **downloads once per location per machine**, instant thereafter. This is the version
  to hand Parastu. (Per-run download is acceptable on a fast connection — marginal vs sim runtime — but
  the cache is free to offer.)
- **Cache key = location + release tag** (e.g. `/data/<release-tag>/<location>.Rdata`), not location
  alone, so a re-cut release never serves a stale cached file.
- **No separate "demo" container** — show the real, citable artifact.

### 4.4 Provenance / `version` mode (self-describing image)
- Bake OCI `LABEL`s + add a `version`/`manifest` entrypoint mode printing: model id, jheem2
  version/commit, base version, simset release, and (Tier 1, `TBD` for now) git tag + Zenodo DOI.
- This *is* the citation mechanism: each manuscript archive cites
  `docker run …@<digest> run --params …`, and a reviewer verifies provenance via `… version`.

---

## 5. Tier 3 — Base hardening

### 5a. Base-image migration to rocker ✅ DONE (jheem-base v1.6.0)

What was "digest-pin the base OS" escalated into a full migration when a cache-cold rebuild **broke**:
`r-base:4.4.2` tracks Debian testing/sid, so its live apt packages drift — `libnode` had moved to
**Node 24**, whose V8 dropped the `ArrayBuffer::New(Isolate*, size_t)` symbol the V8 R package links.
Pinning the `FROM` digest didn't help (the good Feb build used the *same* base digest — the drift was in
`apt-get install`, not the image). Static-libv8 download isn't available on sid, so V8 was forced onto
the broken system lib.

**Resolution — migrated to `rocker/r-ver:4.4.2` (pinned by digest):** Ubuntu 24.04 LTS (frozen, not
rolling) + Posit Package Manager binaries — purpose-built for reproducible R. This also let us **delete
two long-standing workarounds**: the V8/sf/units/gert **source-compile block** and the
**libnode/libgdal symlink hacks** (both were r-base/Debian artifacts; RSPM noble binaries match the
system libs natively, so `renv::restore()` handles everything). The Dockerfile got *simpler*.

Tags `v1.5.0` / `v1.5.1` (the r-base digest-pin + curl attempts) are **burned**; the working base is
**v1.5.0→ superseded by v1.6.0** (rocker). Per the no-retag rule, failed releases bumped patch/minor.

### 5b. Still open (fold in where cheap; no deadline)

- **Multi-stage base build** — the rocker base still ships build toolchain; a builder/runtime split
  shrinks the image + CVE surface. (Less urgent now: no source compiles, so the toolchain matters less.)
- **Run as non-root** (`USER`) in the externally-shared image.
- **Date-pin the RSPM snapshot** (`…/noble/<date>` instead of `latest`) for fully reproducible package
  resolution — `renv.lock` already pins versions, so this is belt-and-suspenders.
- **Consolidate the jheem2 workarounds** into one labeled `jheem2_compat.R` + tracking issue, removable
  as a unit once fixed upstream (Tier 1.6). *(Still present — the migration didn't touch these.)*
- **Confirm the externally-shared image carries no creds** and the `run` path can't touch S3/DynamoDB
  (it uses `--output-mode data`, no `--upload-s3`/`--register-db`; verify).

---

## 5c. Reproducibility validation + regression testing

**Equivalence proven (2026-06-18).** For MSA C.12580 `a50-o30-r40`, three independent builds agree
**bit-for-bit** (max abs diff `0.0`, baseline + intervention, 156 points): the **production** pipeline
artifact (2026-03-19, fetched via CloudFront), the **rocker** build, and a **Debian 1.4.1** build. So the
base migration preserves published results, and the production artifact is a well-founded golden (its
provenance confirmed by agreement with two independent builds). This is the cutover gate for a frozen
model — each frozen model should clear it before `models.json` points production at a rocker-built image.

**Golden test (committed, MSA).** `tests/` in the MSA container repo: a production artifact as the golden
(`golden/C.12580_a50-o30-r40.json`), a slice comparator (`compare_golden.py`, incidence/sex, exit 0/1 on
tolerance), and `run_golden_test.sh`. Guards against **silent numerical drift** — the failure a green
build won't catch (a regular build break, like the V8 one, is caught by the build itself).

**Testing roadmap (deferred — scoped, not open-ended):**
- Graduate the bash+golden into a proper **container-CI suite**. Framework is a free choice (we're testing
  a container, not R); maintained by an SWE deliberately raising the bar → target is **pytest / proper
  container CI**, not testthat-by-default. The substance is the *architecture*, not the language:
  - **Fast structural checks** (`container-structure-test`/goss: files present, ENV set, jheem2 version,
    `version` output) — seconds, gate every build.
  - **Slow golden tests** (the ~5-min sim) — nightly or on base-version changes; parametrized over the
    scenario×model matrix (34 cached production goldens exist across the 4 models).
- Widen the golden slice beyond incidence/sex (the golden files already hold the full aggregation).
- ~~Per-model goldens for AJPH / CROI / CDC-Testing~~ — **done**: all four models are on
  rocker and each reproduces its production golden bit-for-bit (0.0); the four goldens are
  preserved in each repo's `tests/golden/`. Consolidating the comparator/runner into one
  parametrized pytest suite is deferred to the container monorepo (§5e) — not stood up in a
  soon-to-be-subsumed location.

---

## 5d. Data provenance — the OneDrive gap (decision: defer, per-manager)

Model containers build their workspaces from data managers fetched at build time. MSA `COPY`s a frozen
workspace; **AJPH/CROI/CDC build from `jheem_analyses` source + `wget` the cached data managers from
OneDrive links** (`data_manager_cache_metadata.Rdata`). Those links are external/mutable/personal-account
— the same bus-factor risk as code-under-personal-account, for *data*. Pinning the `jheem_analyses` commit
pins the *link set* but not the *durability* (links can rot).

**The fix exists but isn't ours to drive now.** A data-manager CI pipeline (`CI_PIPELINE_PLAN.md` in
jheem_analyses) already versions raw data + managers as immutable GitHub Releases and auto-loads via
`cache_manager.R` / `data_manager_sources.json` — the full "commit + data version + deps = deterministic"
closure. But it's (a) only implemented for the **syphilis** manager, (b) still incomplete even there
(section builds run manually, not yet on CI), and (c) owned by the data teammate.

**Decision: defer; don't detour.** Migrating managers to the pipeline is non-blocking (OneDrive works now),
externally owned, and unbounded (gated on section-build CI). So for the container migration:
- Source data from OneDrive **as-is**; don't couple this work to the unfinished data pipeline.
- **Pin what we control:** CROI's `jheem_analyses` commit (AJPH/CDC already pin); base + jheem2 already pinned.
- **Be honest in provenance:** `version` reports data as OneDrive-sourced / *not release-pinned* (flips to a
  data-release version per-manager as they graduate — same "fill the blank later" pattern as the Zenodo DOI).
- Safety net: for pinned-commit models the build is reproducible *today* (risk is future link-rot), and the
  golden test would catch a data shift.

**End-state (per-manager, when that manager's pipeline is proven end-to-end):** the container drops the
OneDrive `wget`, consumes the pinned data-manager release via `cache_manager.R`, and `version` reports the
data-release version. "Port a manager to CI" and "switch its container to the release" are **one unit of
work**, done in the right hands at the right time — not a detour bolted onto the base migration.

---

## 5e. Container repo architecture — consolidate to a monorepo (recommendation)

The rocker migration made the cost of the current **polyrepo** structure (base +
one repo per model) concrete:
- **Base↔model coordination is manual and N-times.** A base bump (1.6.0→1.6.1)
  meant hand-bumping `BASE_VERSION` in every model repo + a push each; the
  cascade-rebuild that would automate it is disabled.
- **The four model Dockerfiles are ~90% identical** (clone jheem_analyses → wget
  OneDrive → build workspace → verify), differing only in ~6 baked values.
- **Cross-cutting concerns have no home** (run/version/fetch scripts, the
  comparator, the goldens, provenance) — which is what the test-location question
  was really about.

**Decisive argument — internal consistency:** the project's own principle is
config-driven design (`models.json` as single source of truth), yet the containers
are the one place that's duplicated polyrepo boilerplate rather than config-driven.

**Recommendation: a `jheem-containers` monorepo** — `base/`, `models/{msa,ajph,
croi,cdc}/` (thin per-model config over a shared parametrized build), `shared/`
(run scripts), `tests/` (the pytest suite + goldens) — with **per-image tags**
(`msa/v1.0.2`) and **path-filtered matrix CI** (build only the changed image).
Independent versioning/freezing is preserved (a per-image tag at a monorepo commit
freezes that image's source; the image digest is the real freeze), and the team
already does component-scoped tags in one repo (jheem_analyses). Scope: **only the
container-packaging repos** — NOT jheem2 / jheem_analyses / jheem-simulations.

**Sequencing: execute with the Tier 1 org migration**, not before — those repos get
rehomed to the org anyway, so that's the once-only moment to consolidate rather than
shuffle twice. The decision can be made now; execution rides the org move.

**Interim (done):** the four production goldens are preserved per-repo
(`tests/golden/`); the pytest suite is deliberately NOT stood up in a soon-to-be-
subsumed location — it lands in the monorepo `tests/`.

**Detailed migration plan:** `CONTAINER-MONOREPO-MIGRATION-PLAN.md` — decoupled from
the org move (do it now in the personal account; org transfer becomes a simple later
step), with the key de-risking sequence (relocate-with-history first, config-driven
refactor second; goldens as the gate at every step) and the production-safety
constraint (preserve published image names so `models.json` is untouched).

---

## 6. Known / deferred debt (tracked, not scheduled)

- MSA workspace version skew (1.6.2 calibrated / 1.9.2 serialized) — document loudly even if not re-derived.
- Hardcoded `START.YEAR` (2025.5) / `end.year` (2035) / `LOSS.LAG` in `simple_ryan_white.R` (README TODO).
  Fine if frozen per-release, but a drift risk vs. a manuscript's stated horizon.
- ~~No end-to-end smoke test in the container build workflows~~ — addressed off-CI: all four models have a
  preserved golden and reproduce production bit-for-bit. Not yet wired into CI as a build gate, and the
  comparator/runner consolidate into the monorepo pytest suite (§5c/§5e).
- Manual base↔model version coordination (cascade disabled). The `version` mode makes drift detectable; the
  monorepo (§5e) is the real fix.
- **Base v1.6.2 follow-up (bundle, then rebuild all four):** (1) `fetch_simset.R` retry/resume — large
  state simsets (1+ GB) can truncate on a network blip with no retry (hit during CDC validation; real for
  Parastu downloading state simsets via `run`); (2) `version.sh` should *print* `JHEEM_ANALYSES_REF` (baked
  as ENV, `docker inspect`-visible, but not yet in the `version` output) so from-source models surface their
  pinned commit. Both are base changes; do them together, then rebuild the now-uniformly-rocker fleet.

---

## 7. Rollout mechanics (Tier 2)

1. jheem-base: add `run)` case + `run_simulation.sh` (+ `chmod +x`), provenance labels + `version` mode.
   Push → new base build. Cut a new base **semver tag** (models pin semver, not `latest`).
2. Each model container: bump `ARG BASE_VERSION` to the new base; add `ENV MODEL_ID=… SIMULATION_SCRIPT=…`.
   Push each → model rebuild. (No auto-cascade; this is N manual bumps + pushes.)
3. Verify with a real simset: `docker run … run --location <loc> --param … --out results.json`.

---

## 8. Sequencing summary

- **Done (2026-06-18 → 06-22):** Tier 2 (run/version/fetch) + base migration to rocker (§5a) + equivalence
  proof (§5c). **All four models migrated to rocker and reproduce production bit-for-bit (0.0)** — MSA,
  AJPH, CDC, CROI (CROI's `jheem_analyses` commit traced + pinned, closing the unpinned-HEAD hole). Four
  goldens preserved per-repo. A coherent, validated stopping point.
- **No deadline pressure.** Tier 1 is blocked on Todd's return, and there is no hard manuscript deadline —
  the team's value is *do it right* over rushing the initial ask. Remaining work is paced for correctness.
- **Forward-compat rule:** Tier 2 provenance carries `TBD` tag/DOI fields; don't add new hardcoded
  `tfojo1/...` references. So Tier 1 later is filling blanks + a find-and-replace, not a redesign.
- **Next, roughly in order:** (a) reply to Parastu / tee up the org decision; (b) when Todd's back, Tier 1
  (org → tags → release bundles → Zenodo → fix monkeypatches upstream) — the track that closes Parastu's
  request, and the moment to execute the **container monorepo** (§5e) + the **pytest suite** + the base
  v1.6.2 follow-up (§6); (a)+(b) are the actual deliverable; (c) the monorepo/pytest/v1.6.2 work is
  foundational, rides the org move, not on a clock.
