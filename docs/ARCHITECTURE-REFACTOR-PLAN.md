# JHEEM Architecture Refactor Plan

**Author:** Independent Architecture Review
**Date:** January 30, 2026
**Status:** Phase 1 Complete
**Scope:** jheem-portal, jheem-backend, container repositories

---

## Executive Summary

The JHEEM portal has evolved from a single MSA explorer to a multi-model platform supporting city-level (31 MSAs), state-level AJPH (11 states), and state-level CROI (30 states) analyses. With CDC testing as the next planned addition, now is the right time to consolidate patterns before complexity compounds.

**Overall Assessment: B+** — Strong foundation with accumulated technical debt.

The core architecture decisions are sound:
- Config-driven explorer design (`ModelConfig` system)
- Parallel GitHub Actions pipelines
- CloudFront CDN for data delivery
- Shared components across analyses

However, the implementation has drifted:
- Configuration scattered across 4+ locations
- 85% code duplication in workflows
- Monolithic components that resist extension
- No single source of truth for model definitions

This plan addresses these issues in phases, prioritizing changes that directly enable cleaner CDC testing integration.

---

## Current Architecture Overview

### Repository Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  jheem-simulations          jheem-container-*                   │
│  (GitHub Releases)          (R model containers)                │
│         │                          │                            │
│         ▼                          ▼                            │
│  ┌─────────────────────────────────────────┐                   │
│  │           jheem-backend                  │                   │
│  │     (GitHub Actions Workflows)           │                   │
│  │                                          │                   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │                   │
│  │  │   MSA    │ │   AJPH   │ │   CROI   │ │                   │
│  │  │ workflow │ │ workflow │ │ workflow │ │                   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ │                   │
│  └───────┼────────────┼────────────┼───────┘                   │
│          │            │            │                            │
│          ▼            ▼            ▼                            │
│  ┌─────────────────────────────────────────┐                   │
│  │              S3 + CloudFront             │                   │
│  │  /ryan-white/  /ryan-white-state/  etc  │                   │
│  └─────────────────────────────────────────┘                   │
│                        │                                        │
│                        ▼                                        │
│  ┌─────────────────────────────────────────┐                   │
│  │            jheem-portal                  │                   │
│  │         (Next.js Frontend)               │                   │
│  │                                          │                   │
│  │  StateChoroplethExplorer + AnalysisView │                   │
│  │         serves all models                │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What's Working Well

| Component | Status | Notes |
|-----------|--------|-------|
| Config-driven explorers | ✅ Good | `ModelConfig` interface is clean |
| Type safety | ✅ Good | Strict TypeScript, minimal `any` |
| GitHub Actions structure | ✅ Good | Clear 3-phase pattern |
| Data caching | ✅ Good | `useLocationData` prevents redundant fetches |
| CloudFront delivery | ✅ Good | Fast, cost-effective |

### What Needs Work

| Issue | Severity | Impact |
|-------|----------|--------|
| Config scattered across repos | High | Sync bugs, maintenance burden |
| Workflow duplication (85%) | High | Adding models requires 400+ line copy |
| AnalysisView monolith (874 lines) | High | Hard to maintain/extend |
| Container `:latest` tags | Medium | Non-reproducible builds |
| Dead experimental routes | Low | Developer confusion |
| No runtime validation | Low | Silent failures on schema drift |

---

## Key Findings

### 1. Configuration Fragmentation

The same information is defined in multiple places:

| Setting | Portal | Workflows | Containers | Scripts |
|---------|--------|-----------|------------|---------|
| Scenarios | `model-configs.ts` | env vars | entrypoint | — |
| Outcomes | `model-configs.ts` | env vars | — | hardcoded |
| Facets | `model-configs.ts` | env vars | — | parsing logic |
| Locations | `states.ts`, `cities.ts` | matrix arrays | — | — |

**Risk:** When CROI scenarios changed, updates were needed in 4+ places. This will compound with each new model.

### 2. Workflow Duplication

The three data generation workflows share ~85% identical code:

```
generate-native-data.yml          (MSA)     ~400 lines
generate-native-data-ryan-white-state.yml  (AJPH)   ~450 lines
generate-native-data-ryan-white-state-croi.yml (CROI) ~420 lines
─────────────────────────────────────────────────────
Total: ~1,270 lines with ~1,080 duplicated
```

**Differences are minimal:**
- Data source (S3 vs GitHub Release)
- Container image reference
- Scenario list
- Output S3 path

### 3. Component Complexity

`AnalysisView.tsx` has grown to 874 lines handling:
- Location data loading and caching
- Selection state (scenario, outcome, statistic, facet)
- Facet dimension toggles and filtering
- CSV/PNG export logic
- Location switcher UI
- Chart display orchestration

This violates single-responsibility principle and makes testing difficult.

### 4. Container Versioning Gap

Workflows reference containers with `:latest` tag:
```yaml
container_image:
  default: 'ghcr.io/ncsizemore/jheem-ryan-white-model:latest'
```

**Risk:** Different workflow runs may use different container versions, making results non-reproducible.

---

## Recommendations

### Principle: Single Source of Truth

All model configuration should live in one canonical location. Other systems import or reference it — never duplicate it.

**Proposed:** `.github/config/models.json` in jheem-backend

```json
{
  "ryan-white-msa": {
    "displayName": "Ryan White MSA Explorer",
    "geographyType": "city",
    "locations": ["C.12580", "C.12060", ...],
    "scenarios": [
      { "id": "cessation", "label": "Cessation", "color": "#ef4444" },
      { "id": "brief_interruption", "label": "Brief Interruption (1.5yr)", "color": "#f59e0b" },
      { "id": "prolonged_interruption", "label": "Prolonged Interruption (3.5yr)", "color": "#22c55e" }
    ],
    "outcomes": ["incidence", "diagnosed.prevalence", "aids.deaths", ...],
    "facets": ["none", "age", "race", "sex", "risk", "age+race", ...],
    "statistics": {
      "base": ["mean.and.interval", "median.and.interval"],
      "all": ["mean.and.interval", "median.and.interval", "individual.simulation"]
    },
    "container": {
      "image": "ghcr.io/ncsizemore/jheem-ryan-white-model",
      "version": "v1.0.0"
    },
    "dataSource": {
      "type": "S3",
      "path": "s3://jheem-data-production/simulations/ryan-white/"
    },
    "output": {
      "s3Path": "portal/ryan-white",
      "cloudfrontPath": "/ryan-white/"
    }
  },
  "ryan-white-state-ajph": { ... },
  "ryan-white-state-croi": { ... },
  "cdc-testing": { ... }
}
```

**Benefits:**
- Workflows read scenarios/outcomes from JSON
- Portal fetches or imports at build time
- Adding a model = adding a JSON entry
- Version controlled, auditable changes

### Principle: Reusable Workflow Template

Extract common workflow logic into a reusable template:

```
.github/workflows/
├── _generate-data-template.yml    # Reusable (workflow_call)
├── generate-msa.yml               # Thin wrapper (~40 lines)
├── generate-ajph.yml              # Thin wrapper (~40 lines)
├── generate-croi.yml              # Thin wrapper (~40 lines)
└── generate-cdc-testing.yml       # NEW: Thin wrapper (~40 lines)
```

**Template handles:**
- Prepare phase (load config, set matrix)
- Generate phase (download, container, aggregate, upload)
- Finalize phase (combine summaries)

**Wrappers provide:**
- Model ID
- Override defaults if needed
- Trigger conditions

### Principle: Component Decomposition

Break `AnalysisView` into focused pieces:

```
src/
├── components/
│   ├── analysis/
│   │   ├── AnalysisView.tsx        # Slim orchestrator (~200 lines)
│   │   ├── LocationSwitcher.tsx    # Location dropdown + navigation
│   │   ├── FacetControls.tsx       # Facet dimension toggles
│   │   └── ExportControls.tsx      # CSV/PNG export buttons
│   └── ...
├── hooks/
│   ├── useAnalysisState.ts         # Selection state management
│   ├── useChartData.ts             # Derived/filtered data
│   └── ...
└── utils/
    ├── exportCsv.ts                # CSV generation logic
    ├── exportPng.ts                # PNG generation logic
    └── ...
```

### Principle: Semantic Container Versioning

Tag container releases with semver:
```
ghcr.io/ncsizemore/jheem-ryan-white-model:v1.0.0
ghcr.io/ncsizemore/jheem-ryan-white-model:v1.1.0
ghcr.io/ncsizemore/jheem-ryan-white-croi:v1.0.0
```

Reference specific versions in config:
```json
"container": {
  "image": "ghcr.io/ncsizemore/jheem-ryan-white-model",
  "version": "v1.0.0"
}
```

Document which version produced which dataset for reproducibility.

---

## Implementation Plan

### Phase 1: Foundation (Est. 3-4 days)

Establish the patterns that will make CDC testing integration clean.

#### 1.1 Create Configuration Registry
**Location:** `jheem-backend/.github/config/models.json`

- Define schema for model configuration
- Migrate MSA, AJPH, CROI configs
- Add placeholder for CDC testing
- Document schema in README

**Acceptance Criteria:**
- [ ] All scenarios, outcomes, facets defined in JSON
- [ ] Workflows can read from JSON (tested with dry-run)
- [ ] Portal can import/fetch the config

#### 1.2 Tag Container Versions
**Location:** Container repositories

- Tag current working versions as `v1.0.0`
- Update `models.json` to reference specific versions
- Update workflow defaults to use versioned tags

**Acceptance Criteria:**
- [ ] Both containers have semver tags
- [ ] Workflows use versioned references
- [ ] `:latest` removed from defaults

#### 1.3 Create Reusable Workflow Template
**Location:** `jheem-backend/.github/workflows/`

- Extract common logic to `_generate-data-template.yml`
- Create thin wrappers for MSA, AJPH, CROI
- Test with dry-run on each model

**Acceptance Criteria:**
- [ ] Template handles all three current models
- [ ] Wrappers are <50 lines each
- [ ] Dry-run succeeds for all models

#### 1.4 Remove Dead Portal Routes
**Location:** `jheem-portal/src/app/`

- Audit `/test`, `/explore`, `/fast-test`, `/truly-fast`
- Remove or document experimental routes
- Clean up unused components

**Acceptance Criteria:**
- [ ] No unexplained test routes in production build
- [ ] Build succeeds with routes removed

#### 1.5 Refactor AnalysisView
**Location:** `jheem-portal/src/components/`

- Extract `useAnalysisState` hook
- Extract `LocationSwitcher` component
- Extract export utilities
- Slim down AnalysisView to orchestration

**Acceptance Criteria:**
- [ ] AnalysisView < 300 lines
- [ ] All existing functionality preserved
- [ ] MSA and state explorers still work

---

### Phase 2: CDC Testing Integration (Est. 1-2 days)

With foundation in place, CDC testing becomes straightforward.

#### 2.1 Add CDC Testing Config
**Location:** `jheem-backend/.github/config/models.json`

- Define CDC testing scenarios, outcomes, facets
- Specify container and data source
- Set output paths

#### 2.2 Create CDC Testing Workflow
**Location:** `jheem-backend/.github/workflows/`

- Create thin wrapper using template
- Test with dry-run

#### 2.3 Add CDC Testing Route
**Location:** `jheem-portal/src/app/`

- Create `/cdc-testing/explorer` route
- Use `StateChoroplethExplorer` with CDC config
- Add to navigation

**Acceptance Criteria:**
- [ ] CDC testing explorer loads and displays data
- [ ] Uses shared components (no duplication)
- [ ] Workflow generates data successfully

---

### Phase 3: Polish (Est. 2-3 days, optional)

Improvements that enhance maintainability but aren't blocking.

#### 3.1 Organize Component Directory
- Create subdirectories: `analysis/`, `charts/`, `layout/`, `map/`
- Move components to appropriate locations
- Update imports

#### 3.2 Add Runtime Validation
- Install Zod
- Create schemas for JSON data structures
- Validate on fetch, provide clear error messages

#### 3.3 Consolidate Styling
- Extract magic numbers to theme config
- Create base component library (Button, Card, Modal)
- Standardize color usage

#### 3.4 Sync Portal Config with Backend
- Generate `model-configs.ts` from `models.json`
- Or fetch dynamically at build time
- Ensure single source of truth flows through

---

## Success Criteria

### Phase 1 Complete When:
- [ ] `models.json` is the source of truth for all model config
- [ ] Workflows use reusable template pattern
- [ ] Containers are versioned and pinned
- [ ] AnalysisView is decomposed and maintainable
- [ ] Dead routes removed

### Phase 2 Complete When:
- [ ] CDC testing explorer is live
- [ ] No code was duplicated to add it
- [ ] Workflow was <50 lines of new code

### Overall Success:
- Adding a new model requires:
  - 1 JSON config entry
  - 1 thin workflow wrapper (~40 lines)
  - 1 route page (~30 lines)
- Not:
  - Copying 400+ line workflow
  - Duplicating component code
  - Updating 4+ config locations

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing explorers during refactor | Test each change against MSA + state explorers before merging |
| Workflow template too rigid | Start with existing patterns, parameterize only what varies |
| Config sync drift (backend ↔ portal) | Phase 3.4 addresses this; interim: manual verification |
| Container version breaks model | Test tagged version before updating config |

---

## Session Tracking

Use this section to track progress across sessions.

### Session 1 (2026-01-30)
- [x] Architecture review completed
- [x] Plan document created
- [x] Phase 1.1: Created models.json config registry (jheem-backend)
- [x] Phase 1.4: Removed dead portal routes (/test, /explore, /fast-test)
- [x] Phase 1.5: Refactored AnalysisView (874 → 537 lines)
  - Extracted useAnalysisState hook
  - Extracted LocationSwitcher component
  - Extracted DisplayOptionsPopover component
  - Extracted export utilities (CSV, PNG, filename)

### Session 2 (2026-01-31)
- [x] Phase 1.2: Tagged container versions with semver (v1.0.0)
  - Fixed Docker metadata action issue with empty branch names on tag pushes
  - Both containers now have v1.0.0 tags on ghcr.io
- [x] Phase 1.3: Created reusable workflow template
  - `_generate-data-template.yml`: Reusable template (~470 lines)
  - `generate-msa.yml`: MSA wrapper (~40 lines)
  - `generate-ajph.yml`: AJPH wrapper (~40 lines)
  - `generate-croi.yml`: CROI wrapper (~40 lines)
  - Reduced workflow code from ~1,270 lines to ~590 lines (54% reduction)

### Phase 1 Complete ✅
All foundation work is done. Ready for Phase 2: CDC Testing Integration.

### Session 3 (2026-02-03)
Focus: Production hardening and workflow validation

- [x] Validated CROI workflow with new template (30 states, full run)
- [x] Fixed cumulative metrics calculation in state summaries
  - Script now accepts `--start-year` and `--end-year` arguments
  - Workflow passes intervention years from models.json
- [x] Fixed CloudFront cache invalidation path
  - Was using S3 path (`/portal/...`), now uses CloudFront path (`/...`)
  - Origin path stripping added to template
- [x] Fixed CORS caching issue
  - Root cause: Cache policy didn't include `Origin` header in cache key
  - Fix: Switched to `Managed-Elemental-MediaPackage` cache policy
  - CloudFront free tier doesn't allow custom cache policies
- [x] Archived old workflows to `_archive/` folder
  - `generate-native-data.yml`
  - `generate-native-data-ryan-white-state.yml`
  - `generate-native-data-ryan-white-state-croi.yml`
  - `generate-plots.yml`
- [x] AJPH workflow validation completed successfully
- [x] Added CloudFront invalidation permission to IAM policy
- [x] **Config sync implemented** (Phase 3.4 - moved up)
  - Created `scripts/sync-config.ts` to generate `model-configs.ts` from models.json
  - Fetches from GitHub raw URL (CI) or local path via `JHEEM_CONFIG_PATH` (dev)
  - Added to build script: `npm run sync-config && next build`
  - Added postinstall hook for local dev convenience
  - Removed `model-configs.ts` from git tracking (now generated)
  - **models.json is now the single source of truth**

**Infrastructure lessons learned:**
- CloudFront invalidation paths don't include origin path prefix
- CORS + caching requires `Origin` header in cache key
- Free tier limits policy customization
- IAM policy needed `cloudfront:CreateInvalidation` permission

### Phase 1 + Config Sync Complete ✅
All foundation work is done, including config sync. Ready for Phase 2: CDC Testing Integration.

### Session 4 (planned)
- [ ] Phase 2.1: Add CDC testing config to models.json
- [ ] Phase 2.2: Create CDC testing workflow wrapper
- [ ] Phase 2.3: Add CDC testing route to portal

---

## Appendix A: File Reference

### Portal (jheem-portal)
| File | Purpose | Lines |
|------|---------|-------|
| `src/components/AnalysisView.tsx` | Main analysis UI | 874 |
| `src/components/StateChoroplethExplorer.tsx` | State map + analysis | 537 |
| `src/config/model-configs.ts` | Model definitions | ~250 |
| `src/data/states.ts` | State coordinates | ~150 |
| `src/hooks/useLocationData.ts` | Data fetching | ~200 |

### Backend (jheem-backend)
| File | Purpose | Lines |
|------|---------|-------|
| `.github/workflows/generate-native-data.yml` | MSA workflow | ~400 |
| `.github/workflows/generate-native-data-ryan-white-state.yml` | AJPH workflow | ~450 |
| `.github/workflows/generate-native-data-ryan-white-state-croi.yml` | CROI workflow | ~420 |

### Containers
| Repository | Image | Current Tag |
|------------|-------|-------------|
| jheem-container-minimal | `ghcr.io/ncsizemore/jheem-ryan-white-model` | `v1.0.0` |
| jheem-ryan-white-croi-container | `ghcr.io/ncsizemore/jheem-ryan-white-croi` | `v1.0.0` |

---

## Appendix B: Configuration Schema

Proposed JSON Schema for `models.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "required": ["displayName", "geographyType", "scenarios", "outcomes", "container", "output"],
    "properties": {
      "displayName": { "type": "string" },
      "geographyType": { "enum": ["city", "state", "county"] },
      "locations": {
        "type": "array",
        "items": { "type": "string" }
      },
      "scenarios": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["id", "label"],
          "properties": {
            "id": { "type": "string" },
            "label": { "type": "string" },
            "color": { "type": "string" },
            "description": { "type": "string" }
          }
        }
      },
      "outcomes": {
        "type": "array",
        "items": { "type": "string" }
      },
      "facets": {
        "type": "array",
        "items": { "type": "string" }
      },
      "statistics": {
        "type": "object",
        "properties": {
          "base": { "type": "array", "items": { "type": "string" } },
          "all": { "type": "array", "items": { "type": "string" } }
        }
      },
      "container": {
        "type": "object",
        "required": ["image", "version"],
        "properties": {
          "image": { "type": "string" },
          "version": { "type": "string" }
        }
      },
      "dataSource": {
        "type": "object",
        "required": ["type"],
        "properties": {
          "type": { "enum": ["S3", "GitHub-Release"] },
          "path": { "type": "string" },
          "release": { "type": "string" },
          "patterns": { "type": "array", "items": { "type": "string" } }
        }
      },
      "output": {
        "type": "object",
        "required": ["s3Path"],
        "properties": {
          "s3Path": { "type": "string" },
          "cloudfrontPath": { "type": "string" }
        }
      }
    }
  }
}
```

---

*This document should be updated as work progresses. Each session should update the Session Tracking section and mark completed items in the Implementation Plan.*
