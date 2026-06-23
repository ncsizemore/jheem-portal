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

> **Prerequisite (one-time, manual): grant the monorepo write access to the existing ghcr packages.**
> Each package (`jheem-base`, `jheem-ryan-white-{msa,ajph,croi}`, `jheem-cdc-testing`) is currently *linked
> to its original repo*, so the monorepo's `GITHUB_TOKEN` gets `permission_denied: write_package` on first
> push. Fix per package: **Package → Settings → Manage Actions access → Add repository → `jheem-containers`
> → Write** (`https://github.com/users/ncsizemore/packages/container/<pkg>/settings`). No REST API exists for
> user-package actions-access, so it's UI-only. (Alternative: a `write:packages` PAT as the registry password
> instead of `GITHUB_TOKEN` works because it authenticates as the package owner — but that's a broad
> long-lived secret; the per-package grant is least-privilege and preferred.) Found when the base build
> succeeded but failed at push.

---

## 4. Migration sequence — relocate first, refactor second

**The single most important de-risking decision: do NOT combine relocation and the config-driven refactor
in one big-bang.** Two phases, each independently verifiable:

**Phase A — Relocate (provably identical). ✅ DONE (2026-06-23).** Five repos moved into the monorepo
*with history preserved* (`git-filter-repo`, so `blame`/`log` trace through the move), Dockerfiles repathed
but unchanged. Matrix CI (`.github/workflows/build.yml`) authored + validated: **all five images build and
push from the monorepo to their existing names**, and a monorepo-built MSA image reproduces its production
golden bit-for-bit (0.0). One prerequisite surfaced + fixed: per-package ghcr Actions write-access grant
(§3b). Production untouched (it pins semver tags, not the monorepo's `:latest`). **Closeout still pending:**
archive the five old container repos once confident the monorepo fully replaces them (single source of truth).

**Phase B — Refactor to config-driven.** Collapse the per-model Dockerfiles into the two shared templates
+ `models.yml`. Success criterion: **goldens still pass 0.0** (the refactor is correct iff outputs are
unchanged). Higher value, higher touch — but de-risked because Phase A already proved the monorepo
plumbing, so any golden regression here is unambiguously the refactor.

This ordering means the goldens are the regression gate at *every* step, and we never debug "is it the
move or the refactor?" — exactly the lesson from the rocker A/B work.

---

## 5. CI design (path-filtered matrix)

- **Change detection** → build only affected images: a change under `models/<m>/` builds `<m>`; a change
  under `base/`, `build/`, or `common/` builds **all** models. ⚠️ **Phase A caveat (corrected per the
  independent review):** this restores build **fan-out**, *not* a true dependency cascade. In Phase A the
  model jobs run concurrently and still `FROM` a *published* base tag — they do **not** consume the base
  built from the same commit, so a green run does not prove the changed base is compatible with its
  dependents. The **true digest cascade** (build candidate base → pass its digest into model builds → test
  → promote) is **Phase B** work, informed by the review's distinction between *compatibility fan-out*
  (test all models against a candidate base) and *release fan-out* (release only models that should adopt
  it — which matters because MSA's `jheem2` constraints differ).
- **Per-image tags (decided): prefixed semver git tags** `<image>-vMAJOR.MINOR.PATCH` (e.g.
  `ryan-white-msa-v1.0.2`, `base-v1.7.0`). `docker/metadata-action` strips the prefix → the image tag is
  clean semver (`…/jheem-ryan-white-msa:1.0.2` + `:1.0` + `:latest`), matching what `models.json` pins.
  Semver intent: **major** = recalibration/result-changing; **minor** = notable change; **patch** =
  rebuild/fix preserving results (base bump, dep fix). Rolling vs release split: **main pushes →
  `:latest` + `:sha`** (the path filter rebuilds these on base changes); **a `<image>-vX.Y.Z`
  tag → the pinned release**; **production pins specific `:X.Y.Z`** via `models.json`, insulated from
  `:latest` churn. A base change never auto-bumps a model's released version — releases stay deliberate
  (the build/promote separation jheem_analyses already uses). Per-image semver, not one repo-wide version.
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
- Base change auto-rebuilds dependent models (build fan-out; the true digest cascade is Phase B — §5/§review).
- `models.yml` is the per-model source of truth; adding a model = config + dir.
- Old repos archived read-only once the monorepo is authoritative.
- `models.json` / production **unchanged** (the org image-namespace cutover is a separate, later step).

---

## 9. Decisions (settled 2026-06-22)

1. **Repo name** — `jheem-containers`. ✓
2. **Phase B timing** — **land Phase A first** (shippable, production-safe), then do the config-driven
   refactor deliberately. ✓
3. **MSA's prebuilt-workspace variant** — **keep it** as the one `prebuilt` template (avoid yak-shaving
   the 1.6.2/1.9.2 skew; tracked in the reproducibility plan's known debt). ✓
4. **Tag scheme** — **per-image prefixed semver** (`<image>-vX.Y.Z`), detailed in §5. ✓
