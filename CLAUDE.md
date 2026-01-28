# JHEEM Portal - Session Memory

## Project Context
- Modeling applications portal built with React/Next.js/AWS serverless stack
- **Live at**: https://jheem.org
- **Five-repository architecture**: jheem-portal (frontend), jheem-backend (API/workflows), jheem-container-minimal (AJPH container), jheem-ryan-white-croi-container (CROI container), jheem-simulations (data artifacts)

## Multi-Repository Architecture

### Repository Overview

| Repository | Purpose | Container/Data |
|------------|---------|----------------|
| **jheem-portal** | Next.js frontend | - |
| **jheem-backend** | GitHub Actions workflows, AWS infra | - |
| **jheem-container-minimal** | R container for MSA + AJPH state | `ghcr.io/ncsizemore/jheem-ryan-white-model` |
| **jheem-ryan-white-croi-container** | R container for CROI 30-state | `ghcr.io/ncsizemore/jheem-ryan-white-croi` |
| **jheem-simulations** | Simulation data via GitHub Releases | Free CDN |

### Key Routes (Current)

| Route | Purpose |
|-------|---------|
| `/ryan-white/` | MSA paper landing page |
| `/ryan-white/explorer` | MSA explorer (31 cities) |
| `/ryan-white-state-level/` | State paper landing (links to AJPH + CROI) |
| `/ryan-white-state-level/explorer/ajph` | AJPH state explorer (11 states) |
| `/ryan-white-state-level/explorer/croi` | CROI state explorer (30 states) |
| `/hiv-age-projections` | HIV Age Projections |
| `/cdc-testing` | CDC Testing (Shiny embed) |

### Key Workflows (jheem-backend)

| Workflow | Purpose | Data Source |
|----------|---------|-------------|
| `generate-native-data.yml` | MSA 31-city extraction | - |
| `generate-native-data-ryan-white-state.yml` | AJPH 11-state extraction | `v1.0.0` |
| `generate-native-data-ryan-white-state-croi-direct.yml` | CROI 30-state extraction | `v2.0.0` |

### Data Releases (jheem-simulations)

| Release | Content | Used By |
|---------|---------|---------|
| `ryan-white-state-v1.0.0` | AJPH 11-state simsets | AJPH workflow |
| `ryan-white-state-v2.0.0` | CROI 30-state raw simsets (~75GB) | CROI workflow |
| `ryan-white-state-v2.0.0-web` | CROI trimmed simsets (backup) | Archived |

### CloudFront Paths

| Path | Content |
|------|---------|
| `/ryan-white/` | MSA city JSON files |
| `/ryan-white-state/` | AJPH 11-state JSON files |
| `/ryan-white-state-croi/` | CROI 30-state JSON files |

**CloudFront Distribution**: `d320iym4dtm9lj.cloudfront.net`
**S3 Bucket**: `jheem-data-production`
**CORS Policy**: `Managed-SimpleCORS` (required for cross-origin requests)

---

## Latest Session Summary (2026-01-28)

### CROI 30-State Deployment Complete

Successfully deployed the expanded 30-state CROI analysis alongside the existing 11-state AJPH analysis.

**Key Achievement:** Discovered "direct approach" - raw simsets can run directly on GitHub Actions without OOM (only 1.3GB of 15GB used). This eliminated the 12-hour local trimming step entirely.

#### Completed This Session

- ✅ CROI 30-state workflow validated and run (all 30 states)
- ✅ AJPH 11-state workflow run (all 11 states)
- ✅ Frontend routes created (`/ryan-white-state-level/explorer/ajph` and `/croi`)
- ✅ Shared `StateChoroplethExplorer` component (config-driven)
- ✅ `states.ts` expanded to 30 states with coordinates
- ✅ CloudFront CORS fixed (added `Managed-SimpleCORS` response headers policy)
- ✅ Landing page fixed (AIDS→AJPH, 2025→2026)
- ✅ Nav menu updated (removed specific counts)
- ✅ Choropleth theme updated to match MSA explorer

#### Two State-Level Analyses

| Analysis | States | Timeframe | Scenarios | Route |
|----------|--------|-----------|-----------|-------|
| **AJPH** | 11 | 2025-2030 | cessation, brief (1.5yr), prolonged (3.5yr) | `/explorer/ajph` |
| **CROI** | 30 | 2026-2031 | cessation, interruption (2.5yr), + conservative | `/explorer/croi` |

---

## Previous Session Summaries

<details>
<summary>2026-01-16: AnalysisView Refactor (Click to expand)</summary>

- Created `AnalysisView` component (~800 lines) - extracted from MSA explorer
- Refactored MSA explorer to use AnalysisView (1350 → 540 lines, -60%)
- Integrated AnalysisView into state choropleth
- Generalized `useCityData` → `useLocationData`

</details>

<details>
<summary>2026-01-06: Feature Completion & Multi-Model Architecture (Click to expand)</summary>

- City search/filter, facet toggles, facet pagination
- Table view, CSV export, PNG export
- Created `ModelConfig` system for multi-model support

</details>

<details>
<summary>2025-12-31: CloudFront Production Pipeline (Click to expand)</summary>

- CloudFront distribution configured
- CORS configuration
- Workflow uploads to S3 with gzip

</details>

<details>
<summary>Earlier sessions (Click to expand)</summary>

- **2025-12-26**: GitHub Actions workflow for native data generation
- **2025-12-20**: Multi-level faceting fix
- **2025-12-17**: `prepare_plot_local()` output format
- **2025-10-31**: Comprehensive code review (Grade A)
- **2025-08-31**: Security hardening

</details>

---

## Current Status

### ✅ Complete & Working

| Component | Status |
|-----------|--------|
| MSA Explorer (31 cities) | ✅ Live at `/ryan-white/explorer` |
| AJPH State Explorer (11 states) | ✅ Live at `/ryan-white-state-level/explorer/ajph` |
| CROI State Explorer (30 states) | ✅ Live at `/ryan-white-state-level/explorer/croi` |
| CloudFront + CORS | ✅ Working with SimpleCORS policy |
| GitHub Actions Workflows | ✅ All three working |
| Config-driven architecture | ✅ `ModelConfig` system |

### 📋 Backlog (Lower Priority)

- Mobile responsiveness improvements
- Custom simulations feature
- Consider route migration (`/ryan-white/msa/explorer`)

---

## Key Files & Structure

### Routes

| File | Purpose |
|------|---------|
| `src/app/ryan-white/explorer/page.tsx` | MSA explorer |
| `src/app/ryan-white-state-level/explorer/ajph/page.tsx` | AJPH state explorer |
| `src/app/ryan-white-state-level/explorer/croi/page.tsx` | CROI state explorer |
| `src/app/ryan-white-state-level/page.tsx` | State landing page |

### Components

| File | Purpose |
|------|---------|
| `src/components/AnalysisView.tsx` | Shared analysis UI (~800 lines) |
| `src/components/StateChoroplethExplorer.tsx` | Config-driven state map |
| `src/components/NativeSimulationChart.tsx` | Recharts-based charts |

### Configuration

| File | Purpose |
|------|---------|
| `src/config/model-configs.ts` | Model configs (MSA, AJPH, CROI) |
| `src/data/states.ts` | 30 state coordinates |
| `src/data/cities.ts` | 31 MSA coordinates |
| `src/hooks/useStateSummaries.ts` | State data fetching (configurable URL) |
| `src/hooks/useLocationData.ts` | Location data fetching |

### Documentation

| File | Purpose |
|------|---------|
| `docs/CROI-30-STATE-PLAN.md` | CROI implementation (COMPLETE) |

---

## Architectural Decisions

### Config-Driven Design
- `ModelConfig` interface defines data URL, scenarios, defaults
- Same components serve multiple analyses (AJPH, CROI)
- Adding new models = new config + new route page

### Repository Strategy
- Separate container per model version (freeze for reproducibility)
- Data artifacts via GitHub Releases (free egress)
- Workflows in jheem-backend (centralized)

### Cost Optimization
- Container pulls from ghcr.io (free vs ECR $7/run)
- Simulations on GitHub Releases (free vs S3 $1/run)
- CloudFront free tier: 1M requests, 100GB/month

### Direct vs Trimmed Approach (CROI)
- Initially built 12-hour local trimming pipeline
- Discovered raw simsets only use 1.3GB on GH runners
- Direct approach is simpler, more precise (1000 vs 80 sims)
- Trimmed approach archived as backup

---

## Technical Stack

### Frontend
- **Framework**: Next.js 15 + TypeScript 5
- **Styling**: Tailwind CSS 4
- **Visualization**: Recharts, Plotly.js
- **Mapping**: Mapbox GL JS 3.12, react-map-gl 8.0
- **Animation**: Framer Motion 12

### Backend
- **Workflows**: GitHub Actions
- **Storage**: S3 + CloudFront
- **Registry**: ghcr.io

### Containers
- **AJPH**: `jheem-container-minimal` (pinned to `fc3fe1d2`)
- **CROI**: `jheem-ryan-white-croi-container`
