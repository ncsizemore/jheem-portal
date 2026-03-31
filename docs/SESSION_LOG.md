# JHEEM Portal - Session Log

Append-only log of session work and context. Most recent first.

---

## 2026-03-30: CDC Testing Custom Sims Complete

### Completed
- CDC Testing custom simulations — full end-to-end pipeline validated (Steps 0-5)
- jheem-base v1.4.0→v1.4.1: model-agnostic `custom_simulation.R` with conditional `populate_outcomes_array` patch
- CDC Testing container v2.1.2 (base v1.4.1): workspace creation fixed to source `cdc_testing_main.R`
- Portal route `/cdc-testing/custom` with CDC-specific page header
- Refactored page headers out of `CustomSimulationExplorer` into individual pages (children prop)
- Updated CDC Testing plan and custom sims plan with completion notes

### Issues Discovered & Resolved
- Workspace cherry-picking fragility — research code dependency changes break manual file sourcing
- `populate_outcomes_array` NULL-guard corrupts CDC Testing outcomes — made conditional on MODEL_ID
- `distributions` package required for `generate.random.samples` S4 generic

### Key Commits
- jheem-base: `38bc59a` (v1.4.1)
- jheem-cdc-testing-container: `6667b7f` (v2.1.2)
- jheem-backend: `634f62a` (models.json + workflow)
- jheem-portal: `8f3b1b2` (route + nav), `3a3dc2a` (header refactor)

### Status
All 4 models (MSA, AJPH, CROI, CDC Testing) have working custom simulations. Config-driven architecture validated across Ryan White and CDC Testing intervention types. Next: email notifications + Redis progress tracking.

---

## 2026-03-25/26: CDC Testing Custom Sims (Steps 0-1)

### Completed
- Step 0: Refactored `custom_simulation.R` to be model-agnostic (contract: `create_model_intervention()` + `run_custom_simulation()`)
- CROI rebuilt on base v1.4.0 (v2.2.0), custom sim validated
- Step 1: Created `simple_cdc_testing.R` simulation script for CDC Testing
- Updated plans with Step 0 completion, version matrix, housekeeping notes

---

## 2026-03-24: Container Architecture Cleanup & CROI Custom Sims

### Completed
- CROI custom sims added (unified `/ryan-white-state-level/custom` page with AJPH/CROI toggle)
- Container architecture cleanup: dedicated containers per model, clean base v1.3.0
- MSA container fix v1.0.1 (prebuilt workspace compatibility)
- All 3 Ryan White models validated end-to-end

---

## 2026-02-10: Homepage Redesign & Documentation Cleanup

### Completed
- Created CDC Testing landing page (`/cdc-testing`) - publication-focused design
- Moved Shiny app to `/shiny/cdc-testing` as legacy route
- Redesigned homepage with academic framing (research questions, smaller icons, publication citations)
- Simplified navigation (CDC Testing links to landing, no submenu)
- Repository cleanup: archived old docs, removed session files from git, rewrote README

### Documentation Updates (Phase 4)
- **jheem-portal**: Slimmed CLAUDE.md to architecture-only, created SESSION_LOG.md
- **jheem-backend**: Created CLAUDE.md + rewrote README with "Adding a New Model" guide
- **jheem-container-minimal**: Light touch - noted current usage + planned restructuring
- **jheem-simulations**: Updated README with all releases + naming conventions
- Marked `ryan-white-state-v1.0.0` as deprecated in GitHub Releases

### Architecture Refactor Plan: CLOSED
- All core goals achieved (see `docs/ARCHITECTURE-REFACTOR-PLAN.md`)
- Remaining tech debt documented: container shared base image (next priority)

### Design Principles Established
- Landing pages: Publication-focused (preprint info, key findings, tool links)
- Homepage: Academic framing (research questions, not product features)
- Config boundary: models.json = what to extract, frontend = how to display

---

## 2026-02-05/06: CDC Testing Integration

### Completed
- Created CDC Testing container (`jheem-cdc-testing-container`)
- Created workflow wrapper (`generate-cdc-testing.yml`)
- Created frontend route (`/cdc-testing/explorer`)
- Implemented config-driven summary metrics
- Full 18-state workflow run completed

### Key Findings
- Container v1.0.0 had wrong workspace filename, fixed in v1.0.1
- Some CDC outcomes lack demographic facets (aggregate-only)
- `cdc.funded.diagnoses` not in simulation files - removed from config

---

## 2026-02-03/04: Production Hardening & MSA Migration

### Completed
- Validated CROI workflow with new template
- Fixed cumulative metrics calculation (script now accepts year args)
- Fixed CloudFront cache invalidation path
- Config sync implemented (models.json → model-configs.ts at build time)
- MSA simulations migrated to GitHub Releases (`ryan-white-msa-v1.0.0`)

### Infrastructure Lessons
- CloudFront invalidation paths don't include origin path prefix
- CORS + caching requires `Origin` header in cache key
- IAM policy needed `cloudfront:CreateInvalidation` permission

---

## 2026-01-30/31: Architecture Refactor Phase 1

### Completed
- Created `models.json` config registry in jheem-backend
- Tagged container versions with semver (v1.0.0)
- Created reusable workflow template (`_generate-data-template.yml`)
- Removed dead portal routes (/test, /explore, /fast-test)
- Refactored AnalysisView (874 → 537 lines)
  - Extracted useAnalysisState hook
  - Extracted LocationSwitcher component
  - Extracted DisplayOptionsPopover component
  - Extracted export utilities

### Metrics
- Workflow code: 1,270 lines → 590 lines (54% reduction)
- AnalysisView: 874 lines → 537 lines (39% reduction)

---

## 2026-01-28: CROI 30-State Deployment

### Completed
- CROI 30-state workflow validated and run (all 30 states)
- AJPH 11-state workflow run (all 11 states)
- Created shared `StateChoroplethExplorer` component (config-driven)
- Expanded `states.ts` to 30 states with coordinates
- Fixed CloudFront CORS (added `Managed-SimpleCORS` policy)

### Key Achievement
Discovered "direct approach" - raw simsets run directly on GitHub Actions without OOM (only 1.3GB of 15GB used). Eliminated 12-hour local trimming step.

---

## Earlier Sessions (Summary)

- **2026-01-16**: AnalysisView refactor, LocationSwitcher extraction
- **2026-01-06**: Feature completion (search, facet toggles, table view, exports), ModelConfig system
- **2025-12-31**: CloudFront production pipeline, CORS configuration
- **2025-12-26**: GitHub Actions workflow for native data generation
- **2025-10-31**: Comprehensive code review (Grade A)
