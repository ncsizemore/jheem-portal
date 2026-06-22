# Container Monorepo Migration Plan

**Status:** Planning (internal) · **Created:** 2026-06-22
**Companion:** `REPRODUCIBILITY-AND-CITATION-PLAN.md` §5e (why a monorepo)

Consolidate the five container-packaging repos into one `jheem-containers` monorepo, with a
config-driven build and path-filtered CI — **in the personal account now**, decoupled from the
Tier-1 org move (which becomes a simple later transfer of one repo). The deciding rationale (§5e):
the containers are the one part of the system that violates the project's own config-driven principle.

---

## 1. Scope

**In:** the container-packaging repos — `jheem-base`, `jheem-ryan-white-msa-container`,
`jheem-ryan-white-ajph-container`, `jheem-ryan-white-croi-container`, `jheem-cdc-testing-container`.

**Out:** model code (`jheem2`, `jheem_analyses`) and data (`jheem-simulations`) — genuinely different
concerns and lifecycles. Not the portal or backend.

---

## 2. Target structure

```
jheem-containers/
  base/
    Dockerfile  Rprofile.site  renv.lock
    common/        # container_entrypoint.sh, run_simulation.sh, version.sh, fetch_simset.R,
                   # custom_simulation.R, batch_plot_generator.R, lambda_handler.R, ...
    simulation/    # simple_ryan_white.R, simple_cdc_testing.R, ...
    plotting/  tests/
  models/
    ryan-white-msa/        { config + prebuilt-workspace build inputs }
    ryan-white-ajph/       { config + from-source build inputs (google_mobility, workspace script) }
    ryan-white-state-croi/ { config + trim_simsets.R, ... }
    cdc-testing/           { config + simple_cdc_testing.R, workspace script }
  build/
    Dockerfile.from-source     # shared template: clone jheem_analyses → wget → build workspace
    Dockerfile.prebuilt        # shared template: COPY a frozen workspace (MSA's variant)
  tests/
    conftest.py  test_golden.py
    golden/<model>/<loc>_<key>.json   # the four production goldens
  .github/workflows/build.yml          # path-filtered matrix
  models.yml                            # per-model config (the single source of truth)
```

---

## 3. Two core design decisions

### 3a. Config-driven build (the value)
The three from-source models (AJPH/CROI/CDC) share an **identical** build (clone `jheem_analyses` →
`wget` OneDrive data → build workspace → verify). MSA is the one variant (COPY a frozen workspace —
a one-off forced by the 1.6.2/1.9.2 skew). So:

- **Two shared Dockerfile templates** (`from-source`, `prebuilt`), selected per model.
- **`models.yml`** holds the ~6–8 per-model values: `template`, `model_id`, `jheem_analyses_commit`,
  `workspace_script`, `spec_object` (e.g. `CDCT.SPECIFICATION`), `simulation_script`, `simset_release`,
  `simset_base_suffix`, baked ENV.
- Adding a model = a `models.yml` entry + a `models/<name>/` dir. *That's* config-driven, matching
  `models.json`'s ethos. The baked-`ENV` provenance work we just did slots straight in.

### 3b. Preserve published image names (the safety constraint)
Production pulls images by name via `models.json` (`container.image` = `ghcr.io/ncsizemore/jheem-…`).
Image names are derived as `${{ github.repository_owner }}/<name>`. The monorepo CI **must keep
pushing to the exact same names** so `models.json` and the live pipeline are untouched. The matrix sets
`<name>` per model; the owner stays `ncsizemore`. **Result: production sees no change.** (At org-transfer
time the owner changes → names change → that's the one coordinated `models.json` cutover — see §7.)

---

## 4. Migration sequence — relocate first, refactor second

**The single most important de-risking decision: do NOT combine relocation and the config-driven refactor
in one big-bang.** Two phases, each independently verifiable:

**Phase A — Relocate (provably identical).** Move the five repos into the monorepo *with history
preserved*, keeping each Dockerfile essentially as-is (just repathed). Set up matrix CI pushing the
**same image names**. Success criterion: every image still builds and **the four goldens still pass 0.0**
+ the base image is byte-equivalent. This phase changes *where code lives and how CI runs* — not what's
built. Low risk, fully validated by the goldens we already have.

**Phase B — Refactor to config-driven.** Collapse the per-model Dockerfiles into the two shared templates
+ `models.yml`. Success criterion: **goldens still pass 0.0** (the refactor is correct iff outputs are
unchanged). Higher value, higher touch — but de-risked because Phase A already proved the monorepo
plumbing, so any golden regression here is unambiguously the refactor.

This ordering means the goldens are the regression gate at *every* step, and we never debug "is it the
move or the refactor?" — exactly the lesson from the rocker A/B work.

---

## 5. CI design (path-filtered matrix)

- **Change detection** → build only affected images: a change under `models/<m>/` builds `<m>`; a change
  under `base/`, `build/`, or `common/` builds **all** models. This **restores the base→model cascade**
  we lost (the disabled cross-repo `repository_dispatch`) — for free, as an in-repo path filter.
- **Per-image tags:** `<model>-vX.Y.Z` (e.g. `ryan-white-msa-v1.0.2`) + `latest`/sha, via
  `docker/metadata-action` per matrix entry. Independent versioning preserved without separate repos.
- **Image name:** keep `${{ github.repository_owner }}/<name>` so it's correct in both the personal
  account and (post-transfer) the org with no edits.
- **Golden gate:** run the pytest suite (fast structural checks always; slow golden runs on base changes
  or nightly — they need the simset download + ~5–10 min sim).

---

## 6. History preservation

Per repo: `git filter-repo --to-subdirectory-filter <dest>` to rewrite each repo's history into its
monorepo path, then merge into the monorepo with `--allow-unrelated-histories`. Preserves authorship +
blame. (Tags: prefix-rename old per-repo tags, e.g. `msa/v1.0.1`, to avoid collisions.)

---

## 7. Relationship to the org move (later, simple)

Once the monorepo is green and production runs off it unchanged:
1. **Git transfer** the single `jheem-containers` repo to the org — GitHub's native transfer (NOT a
   fork): preserves issues/PRs/releases/stars + sets up URL/git redirects. One transfer, not five.
2. **Image-namespace cutover** — the careful part. `${{ github.repository_owner }}` becomes the org, so
   images auto-publish as `ghcr.io/<org>/…`. Update `models.json` `container.image` (and the workflow's
   image refs, if any are hardcoded) to the org namespace in lockstep, re-publish (or transfer the ghcr
   packages), and verify the live pipeline pulls the new names. This is the *only* production-affecting
   step in the whole effort, and it's a focused, well-understood change — exactly what the monorepo makes
   a single coordinated cutover instead of five scattered ones.

---

## 8. Definition of done

- Monorepo builds all five images (**same names**) green; four goldens pass 0.0; pytest suite passing.
- Base change auto-rebuilds dependent models (cascade restored).
- `models.yml` is the per-model source of truth; adding a model = config + dir.
- Old repos archived read-only once the monorepo is authoritative.
- `models.json` / production **unchanged** (the org image-namespace cutover is a separate, later step).

---

## 9. Open decisions (yours)

1. **Repo name** — `jheem-containers`? (assumed throughout).
2. **Phase B timing** — do the config-driven refactor immediately after relocation, or land Phase A and
   pause? (I'd land A first — it's a shippable, production-safe win — then do B deliberately.)
3. **MSA's prebuilt-workspace variant** — keep it as the one `prebuilt` template indefinitely, or revisit
   whether MSA could move to from-source (would require resolving the 1.6.2/1.9.2 skew — out of scope here,
   tracked in the reproducibility plan's known debt).
4. **Tag scheme** — `<model>-vX.Y.Z` per image (assumed) vs a single monorepo version line.
