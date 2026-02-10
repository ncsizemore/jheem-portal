# JHEEM Portal - Session Memory

## Project Context
- Modeling applications portal built with React/Next.js/AWS serverless stack
- **Live at**: https://jheem.org
- **Five-repository architecture**: jheem-portal (frontend), jheem-backend (API/workflows), jheem-container-minimal (AJPH container), jheem-ryan-white-croi-container (CROI container), jheem-cdc-testing-container (CDC Testing container), jheem-simulations (data artifacts)

## Multi-Repository Architecture

### Repository Overview

| Repository | Purpose | Container/Data |
|------------|---------|----------------|
| **jheem-portal** | Next.js frontend | - |
| **jheem-backend** | GitHub Actions workflows, AWS infra, models.json | - |
| **jheem-container-minimal** | R container for MSA + AJPH state | `ghcr.io/ncsizemore/jheem-ryan-white-model` |
| **jheem-ryan-white-croi-container** | R container for CROI 30-state | `ghcr.io/ncsizemore/jheem-ryan-white-croi` |
| **jheem-cdc-testing-container** | R container for CDC Testing | `ghcr.io/ncsizemore/jheem-cdc-testing-model` |
| **jheem-simulations** | Simulation data via GitHub Releases | Free CDN |

### Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage (research-focused) |
| `/ryan-white` | MSA paper landing page |
| `/ryan-white/explorer` | MSA explorer (31 cities) |
| `/ryan-white-state-level` | State paper landing (AJPH + CROI) |
| `/ryan-white-state-level/explorer/ajph` | AJPH state explorer (11 states) |
| `/ryan-white-state-level/explorer/croi` | CROI state explorer (30 states) |
| `/cdc-testing` | CDC Testing landing page |
| `/cdc-testing/explorer` | CDC Testing explorer (18 states) |
| `/aging` | HIV Age Projections |
| `/shiny/cdc-testing` | Legacy Shiny app (deprecated) |
| `/shiny/ryan-white-custom` | Custom simulations Shiny app |

### Key Workflows (jheem-backend)

| Workflow | Purpose | Data Source |
|----------|---------|-------------|
| `_generate-data-template.yml` | Reusable workflow template | - |
| `generate-msa.yml` | MSA 31-city extraction | `ryan-white-msa-v1.0.0` |
| `generate-ajph.yml` | AJPH 11-state extraction | `ryan-white-ajph-v1.0.0` |
| `generate-croi.yml` | CROI 30-state extraction | `ryan-white-state-v2.0.0` |
| `generate-cdc-testing.yml` | CDC Testing 18-state extraction | `cdc-testing-v1.0.0` |

### Data Releases (jheem-simulations)

| Release | Content | Used By |
|---------|---------|---------|
| `ryan-white-msa-v1.0.0` | MSA 31 cities | MSA workflow |
| `ryan-white-ajph-v1.0.0` | AJPH 11 states | AJPH workflow |
| `ryan-white-state-v2.0.0` | CROI 30 states | CROI workflow |
| `cdc-testing-v1.0.0` | CDC Testing 18 states | CDC Testing workflow |

### CloudFront Paths

| Path | Content |
|------|---------|
| `/ryan-white/` | MSA city JSON files |
| `/ryan-white-state/` | AJPH 11-state JSON files |
| `/ryan-white-state-croi/` | CROI 30-state JSON files |
| `/cdc-testing/` | CDC Testing 18-state JSON files |

**CloudFront Distribution**: `d320iym4dtm9lj.cloudfront.net`
**S3 Bucket**: `jheem-data-production`
**CORS Policy**: `Managed-SimpleCORS` (required for cross-origin requests)

---

## Latest Session Summary (2026-02-10)

### Homepage Redesign & CDC Testing Landing Page

Shifted from SaaS-style to academic design language across the site.

#### Completed This Session

- ✅ Created CDC Testing landing page (`/cdc-testing`) - publication-focused design
- ✅ Moved Shiny app to `/shiny/cdc-testing` as legacy route
- ✅ Redesigned homepage with academic framing:
  - Research-focused copy (questions, not features)
  - Smaller supporting icons (population dynamics, scenario analysis, time horizons)
  - Publication citations on model cards
  - Key finding callout (CDC Testing projection)
  - Removed Framer Motion animations (lighter bundle)
- ✅ Simplified navigation (CDC Testing links to landing, no submenu)
- ✅ Fixed publication info (Ann Intern Med 2025, Aging 24 states/Submitted)
- ✅ Implemented dynamic color scaling for state choropleths

#### Design Principles Established

- **Landing pages**: Publication-focused (preprint info, key findings, tool links)
- **Homepage**: Academic framing (research questions, not product features)
- **Config boundary**: models.json = what to extract, frontend = how to display

---

## Previous Session Summaries

<details>
<summary>2026-02-05/06: CDC Testing Integration (Click to expand)</summary>

- Created CDC Testing container (`jheem-cdc-testing-container`)
- Created workflow wrapper (`generate-cdc-testing.yml`)
- Created frontend route (`/cdc-testing/explorer`)
- Implemented config-driven summary metrics
- Full 18-state workflow run completed

</details>

<details>
<summary>2026-02-03/04: Production Hardening & MSA Migration (Click to expand)</summary>

- Validated CROI workflow with new template
- Fixed cumulative metrics calculation
- Fixed CloudFront cache invalidation
- Config sync implemented (models.json → model-configs.ts)
- MSA simulations migrated to GitHub Releases

</details>

<details>
<summary>2026-01-30/31: Architecture Refactor Phase 1 (Click to expand)</summary>

- Created models.json config registry
- Tagged container versions with semver (v1.0.0)
- Created reusable workflow template
- Removed dead portal routes
- Refactored AnalysisView (874 → 537 lines)

</details>

<details>
<summary>2026-01-28: CROI 30-State Deployment (Click to expand)</summary>

- CROI 30-state workflow validated and run
- Shared StateChoroplethExplorer component created
- CloudFront CORS fixed

</details>

<details>
<summary>Earlier sessions (Click to expand)</summary>

- **2026-01-16**: AnalysisView refactor, LocationSwitcher extraction
- **2026-01-06**: Feature completion, ModelConfig system
- **2025-12-31**: CloudFront production pipeline
- **2025-12-26**: GitHub Actions workflow for native data
- **2025-10-31**: Comprehensive code review (Grade A)

</details>

---

## Current Status

### ✅ Complete & Working

| Component | Status |
|-----------|--------|
| MSA Explorer (31 cities) | ✅ Live at `/ryan-white/explorer` |
| AJPH State Explorer (11 states) | ✅ Live at `/ryan-white-state-level/explorer/ajph` |
| CROI State Explorer (30 states) | ✅ Live at `/ryan-white-state-level/explorer/croi` |
| CDC Testing Explorer (18 states) | ✅ Live at `/cdc-testing/explorer` |
| HIV Age Projections | ✅ Live at `/aging` |
| Config-driven architecture | ✅ `models.json` is single source of truth |
| GitHub Actions Workflows | ✅ All four use reusable template |
| CloudFront + CORS | ✅ Working with SimpleCORS policy |

### 📋 Backlog

- Mobile responsiveness improvements
- Container tech debt (shared base image opportunity)
- Documentation updates (Phase 4 of refactor plan)

---

## Key Files & Structure

### Routes

| File | Purpose |
|------|---------|
| `src/app/page-wrapper.tsx` | Homepage |
| `src/app/ryan-white/page.tsx` | MSA landing page |
| `src/app/ryan-white/explorer/page.tsx` | MSA explorer |
| `src/app/ryan-white-state-level/page.tsx` | State landing page |
| `src/app/ryan-white-state-level/explorer/ajph/page.tsx` | AJPH state explorer |
| `src/app/ryan-white-state-level/explorer/croi/page.tsx` | CROI state explorer |
| `src/app/cdc-testing/page.tsx` | CDC Testing landing page |
| `src/app/cdc-testing/explorer/page.tsx` | CDC Testing explorer |
| `src/app/aging/page.tsx` | HIV Age Projections |

### Components

| File | Purpose |
|------|---------|
| `src/components/AnalysisView.tsx` | Shared analysis UI (~540 lines) |
| `src/components/StateChoroplethExplorer.tsx` | Config-driven state map |
| `src/components/NativeSimulationChart.tsx` | Recharts-based charts |
| `src/components/Navigation.tsx` | Site navigation |

### Configuration

| File | Purpose |
|------|---------|
| `src/config/model-configs.ts` | Generated from models.json (don't edit directly) |
| `scripts/sync-config.ts` | Syncs models.json → model-configs.ts |
| `src/data/states.ts` | 30 state coordinates |
| `src/data/cities.ts` | 31 MSA coordinates |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useLocationData.ts` | Location data fetching |
| `src/hooks/useStateSummaries.ts` | State summary data fetching |
| `src/hooks/useAnalysisState.ts` | Analysis selection state |

---

## Architectural Decisions

### Config-Driven Design
- `models.json` in jheem-backend is the single source of truth
- Portal syncs at build time via `scripts/sync-config.ts`
- Adding new models = JSON config + thin workflow + route page
- **Why:** Before this, config was scattered across 4+ locations causing sync bugs. CROI scenario changes required edits in 4 places. Single source of truth eliminates drift.

### Landing Page Pattern
- Publication-focused: preprint/paper info, key findings, authors
- Links to interactive tools (explorer, legacy Shiny)
- Academic credibility without SaaS marketing feel
- **Why:** Original Shiny-style landing pages felt like "product marketing" - genre mismatch for academic research tools. Publication-focused design establishes credibility and matches user expectations.

### Repository Strategy
- Separate container per model (freeze for reproducibility)
- Data artifacts via GitHub Releases (free egress)
- Workflows in jheem-backend (centralized, reusable template)
- **Why:** Containers freeze model code for reproducibility (results match publications). GitHub Releases provide free CDN for large simulation files. Centralized workflows with reusable template reduced 1,270 lines to 590 lines (54% less code).

### Cost Optimization
- Container pulls from ghcr.io (free vs ECR $7/run)
- Simulations on GitHub Releases (free vs S3 $1/run)
- CloudFront free tier: 1M requests, 100GB/month
- **Why:** Research project with limited budget. These choices reduced per-run costs from ~$8 to effectively $0 while maintaining performance.

---

## Technical Stack

### Frontend
- **Framework**: Next.js 15 + TypeScript 5
- **Styling**: Tailwind CSS 4
- **Visualization**: Recharts, Plotly.js
- **Mapping**: Mapbox GL JS 3.12, react-map-gl 8.0

### Backend
- **Workflows**: GitHub Actions (reusable template pattern)
- **Storage**: S3 + CloudFront
- **Registry**: ghcr.io
- **Config**: models.json (synced to portal at build time)

### Containers
- **MSA/AJPH**: `jheem-container-minimal:v1.0.0`
- **CROI**: `jheem-ryan-white-croi-container:v1.0.0`
- **CDC Testing**: `jheem-cdc-testing-container:v1.0.1`
