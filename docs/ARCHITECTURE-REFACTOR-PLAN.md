# JHEEM Architecture Refactor Plan

**Status:** ✅ COMPLETE (February 10, 2026)
**Duration:** January 30 - February 10, 2026 (Sessions 1-7)

---

## Summary

This refactoring effort successfully transformed the JHEEM portal from a collection of ad-hoc implementations to a config-driven, maintainable multi-model platform.

### Goals Achieved

| Goal | Before | After |
|------|--------|-------|
| Configuration | Scattered across 4+ locations | Single source: `models.json` |
| Workflow code | ~1,270 lines (85% duplicated) | ~590 lines (54% reduction) |
| Adding a model | Copy 400+ line workflow, update 4+ files | 1 JSON entry + 40-line wrapper + 30-line route |
| Container versions | `:latest` tags | Semver (v1.0.0, v1.0.1) |
| AnalysisView | 874 lines monolith | 537 lines + extracted hooks/components |
| Documentation | Outdated, scattered | Current across all repos |

### Validation

CDC Testing (18 states) was added using the new patterns:
- Config entry in `models.json` ✅
- Thin workflow wrapper (~40 lines) ✅
- Route page (~30 lines) ✅
- Reused all shared components ✅

---

## Remaining Tech Debt

### Container Restructuring (Next Priority)

**Problem:** Three container repos with ~80% duplicated Dockerfiles and scripts.

| Repo | Purpose | Dockerfile Lines |
|------|---------|------------------|
| `jheem-container-minimal` | MSA + AJPH | ~220 |
| `jheem-ryan-white-croi-container` | CROI | ~275 |
| `jheem-cdc-testing-container` | CDC Testing | ~244 |

**Proposed solution:**
```
ghcr.io/ncsizemore/jheem-base:1.0.0  ← Common R deps, scripts (~200 lines)
  ├── jheem-ryan-white-model:1.0.0   ← Just workspace + labels (~30 lines)
  ├── jheem-ryan-white-croi:1.0.0
  └── jheem-cdc-testing:1.0.0
```

**Benefits:**
- Model containers become ~30 lines instead of ~220
- Faster builds (base layer cached)
- Single place to update common dependencies
- Natural point to fix repo naming inconsistency

**Repo naming (batch with restructuring):**
- `jheem-container-minimal` → `jheem-ryan-white-container` (or similar)
- Align with `jheem-ryan-white-croi-container`, `jheem-cdc-testing-container`

### Release Naming (Low Priority)

CROI uses `ryan-white-state-v2.0.0` instead of `ryan-white-croi-v1.0.0`. Works fine, just inconsistent. Fix if/when CROI data needs refresh.

### Optional Polish (Do Opportunistically)

- **Runtime validation**: Add Zod schemas for JSON data structures
- **Component organization**: Create subdirectories (`analysis/`, `charts/`, `map/`)
- **Styling consolidation**: Extract magic numbers to theme config

---

## Architecture Reference

See individual repo documentation:
- `jheem-backend/CLAUDE.md` - Workflow architecture, models.json schema, "Adding a New Model" guide
- `jheem-portal/CLAUDE.md` - Frontend architecture, component structure
- `jheem-simulations/README.md` - Release naming conventions, file structures

### Data Flow

```
jheem-simulations (GitHub Releases)
         │
         ▼
jheem-backend (GitHub Actions)
├── models.json (config source of truth)
└── _generate-data-template.yml + thin wrappers
         │
         ▼
S3 + CloudFront
         │
         ▼
jheem-portal (Next.js)
├── Syncs config at build time
└── StateChoroplethExplorer + AnalysisView serve all models
```

---

## Session History

Detailed session notes are in `docs/SESSION_LOG.md`.

| Session | Date | Focus |
|---------|------|-------|
| 1 | 2026-01-30 | Architecture review, models.json, AnalysisView refactor |
| 2 | 2026-01-31 | Container versioning, workflow template |
| 3 | 2026-02-03 | Production hardening, config sync |
| 4 | 2026-02-04 | MSA migration to GitHub Releases |
| 5 | 2026-02-04/05 | AJPH fix, CDC Testing release + container |
| 6 | 2026-02-09 | CDC Testing workflow + frontend, config refinement |
| 7 | 2026-02-10 | Homepage redesign, documentation cleanup |
