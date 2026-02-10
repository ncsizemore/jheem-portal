# JHEEM Portal - Session Log

Append-only log of session work and context. Most recent first.

---

## 2026-02-10: Homepage Redesign & Documentation Cleanup

### Completed
- Created CDC Testing landing page (`/cdc-testing`) - publication-focused design
- Moved Shiny app to `/shiny/cdc-testing` as legacy route
- Redesigned homepage with academic framing (research questions, smaller icons, publication citations)
- Simplified navigation (CDC Testing links to landing, no submenu)
- Implemented dynamic color scaling for state choropleths
- Repository cleanup: archived old docs, removed session files from git, rewrote README

### Design Principles Established
- Landing pages: Publication-focused (preprint info, key findings, tool links)
- Homepage: Academic framing (research questions, not product features)
- Config boundary: models.json = what to extract, frontend = how to display

### Current Focus
- Documentation updates across repos (Phase 4 of refactor plan)
- Container tech debt (shared base image opportunity) - deferred

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
