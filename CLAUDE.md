# JHEEM Portal - Session Memory

## Project Context
- Modeling applications portal transitioning from Shiny apps to React/Next.js/AWS serverless stack
- **Four major applications live**: Ryan White Map Explorer, HIV Age Projections, State Level (Shiny), CDC Testing (Shiny)
- **Four-repository architecture**: jheem-portal (frontend), jheem-backend (API/workflows), jheem-container-minimal (R simulation container), jheem-simulations (simulation data artifacts)
- Currently on temporary Vercel domain, preparing for live domain deployment

## 🏗️ Multi-Repository Architecture

### Repository Overview

| Repository | Purpose | Changes Often? |
|------------|---------|----------------|
| **jheem-portal** | Next.js frontend | Frequently |
| **jheem-backend** | API, Lambda functions, GitHub Actions workflows | Occasionally |
| **jheem-container-minimal** | Ryan White MSA + State container (frozen for published models) | Rarely |
| **jheem-simulations** | Simulation data artifacts via GitHub Releases (free CDN) | Append-only |

**Note on container repos**: As we add new models, each will get its own container repo. This allows "freezing" published models for reproducibility. `jheem-container-minimal` should eventually be renamed to `jheem-ryan-white-container` to reflect that it serves both MSA and state-level Ryan White models.

### Repository Details

#### 1. **jheem-portal** (This Repository)
**Purpose**: Next.js frontend with React components
**Status**: ✅ Production deployed on Vercel
**URL**: https://jheem-portal.vercel.app/

**Key Routes** (decided route structure):
- `/ryan-white/msa/explorer` - MSA-level marker map (currently at `/ryan-white/explorer`)
- `/ryan-white/state/explorer` - State-level choropleth map (prototype ready)
- `/ryan-white/` - Landing page for both variants
- `/hiv-age-projections` - Multi-state HIV aging analysis
- `/ryan-white-state-level` - Legacy embedded Shiny app (to be replaced)
- `/cdc-testing` - Embedded Shiny app (iframe)

#### 2. **jheem-backend** (Serverless API & Workflows)
**Location**: `/Users/cristina/wiley/Documents/jheem-backend/`
**Purpose**: AWS Lambda + API Gateway + S3 + GitHub Actions workflows

**Key Workflows**:
- `generate-native-data.yml` - MSA-level data generation (31 cities)
- `generate-native-data-ryan-white-state.yml` - State-level data generation (11 states)

**Infrastructure**:
- CloudFront: `d320iym4dtm9lj.cloudfront.net`
- S3: `jheem-data-production/portal/ryan-white/`
- Container pulls from ghcr.io (free, was $7/run from ECR)

#### 3. **jheem-container-minimal** (R Simulation Container)
**Location**: `/Users/cristina/wiley/Documents/jheem-container-minimal/`
**Purpose**: Containerized JHEEM simulation model for Ryan White (MSA + State)
**Registry**: `ghcr.io/ncsizemore/jheem-ryan-white-model:latest`

**Key Discovery**: Same container works for both MSA and state-level - container treats location generically (accepts "AL" same as "C.12580").

**Pinned to**: `jheem_analyses` commit `fc3fe1d2` (July 2025) for reproducibility of published papers.

#### 4. **jheem-simulations** (Data Artifacts)
**Location**: `github.com/ncsizemore/jheem-simulations`
**Purpose**: Host simulation files via GitHub Releases (free egress vs S3 costs)

**Current Releases**:
- `ryan-white-state-v1.0.0` - 11 states, old AJPH analysis (2025-2030 timeframe)
- `ryan-white-state-v2.0.0` - **30 states**, CROI 2026 analysis (2026-2031 timeframe), ~75GB raw simsets

---

## Latest Session Summary (2026-01-16)

### AnalysisView Refactor & 30-State Data Pipeline

#### ✅ Completed

**Frontend Refactoring:**
- ✅ Created `AnalysisView` component (~800 lines) - extracted from MSA explorer for reuse
- ✅ Refactored MSA explorer to use AnalysisView (1350 → 540 lines, -60% code)
- ✅ Integrated AnalysisView into state choropleth (click state → full analysis)
- ✅ Generalized `useCityData` → `useLocationData` with customizable `dataUrl` option

**Commits:**
- `587cbf2` - refactor: create AnalysisView component and generalize data hook
- `493c465` - refactor: integrate AnalysisView into MSA explorer
- `134ab13` - feat: integrate AnalysisView into state choropleth

**30-State Expansion (Key Discovery):**
- State-level analysis expanded from 11 → **30 states**
- Two separate analyses now exist:

| Analysis | States | Timeframe | Scenarios |
|----------|--------|-----------|-----------|
| **AJPH (original)** | 11 | 2025-2030 | cessation, brief (1.5yr), prolonged (3.5yr) |
| **CROI (updated)** | 30 | 2026-2031 | cessation, 2.5-year interruption |

**Data Transfer Infrastructure:**
- ✅ Set up GitHub Releases upload from campus server (SSH + `gh` CLI)
- ✅ Uploaded 30-state raw simsets to `ryan-white-state-v2.0.0` release (~75GB)
- Server path: `ssh nsizemo1@10.253.170.91`, NAS at `/mnt/jheem_nas_share/`

**Files per state (CROI 2026):**
- `*_noint.Rdata` - baseline (~850MB)
- `*_rw.end.26.Rdata` - cessation (~450MB)
- `*_rw.p.intr.26.Rdata` - 2.5-year interruption (~450MB)
- `*_rw.end.cons.26.Rdata` - cessation conservative (~390MB)
- `*_rw.p.intr.cons.26.Rdata` - interruption conservative (~390MB)

#### 🔑 Key Technical Insights

**Trimming Script (`prep_rw_web_simsets.R`):**
- Located at: `jheem_analyses/applications/ryan_white/prep_rw_web_simsets.R`
- Reduces simulations: 1000 → 80 (configured via `RW.N.SIM.FOR.WEB`)
- Truncates time range: 2016-2036 (configured via `RW.WEB.FROM.YEAR`, `RW.WEB.TO.YEAR`)
- Creates web-optimized versions with sub.version `'ws'` (seed) and `'w'` (interventions)
- **Must be run locally** - requires R + jheem2 + re-runs simulations

**jheem_analyses Repo:**
- Pulled latest (38 commits), local path adjustments stashed
- Key config in `ryan_white_main.R`:
  - `RW.STATES` = 30 states
  - `RW.ANCHOR.YEAR = 2026`
  - `N.SIM = 1000`, `RW.N.SIM.FOR.WEB = 80`

#### 🚧 Immediate Next Steps

| Task | Priority | Notes |
|------|----------|-------|
| Download raw simsets from GitHub Releases | High | ~75GB to local machine |
| Run trimming script locally | High | Produces ~5-8GB web-optimized files |
| Update `STATE_NAME_TO_CODE` mapping | Medium | Add 19 new states to frontend |
| Deploy trimmed state data to CloudFront | Medium | Via existing workflow pattern |
| Consider website organization | Medium | Two sections: AJPH (11 MSAs) vs CROI (30 states)? |

#### 📋 Path Forward

1. **Download & Trim**: Pull raw simsets from `ryan-white-state-v2.0.0`, run `prep_rw_web_simsets.R` locally
2. **Deploy**: Upload trimmed web simsets to S3/CloudFront (or new GitHub Release)
3. **Frontend**: Update state choropleth with 30 states, new scenario labels
4. **Organization**: Decide on website structure (separate AJPH/CROI sections vs unified)

---

## Previous Session Summaries

<details>
<summary>2025-01-08: Infrastructure & Cost Optimization (Click to expand)</summary>

**Reference**: See `jheem-backend/SESSION_SUMMARY_2025-01-08.md` for full details.

**Cost Optimizations**:
- Container pulls: ECR (~$7/run) → ghcr.io ($0)
- Simulation downloads: S3 (~$1/run) → GitHub Releases ($0)
- Total cost per workflow run: ~$8 → ~$0-1

**Infrastructure Changes**:
- Added ghcr.io as third registry
- Created `jheem-simulations` repo
- Created state-level workflow
- Fixed streaming JSON aggregation with `big-json` library

</details>

<details>
<summary>2026-01-06: Feature Completion & Multi-Model Architecture (Click to expand)</summary>

**Commits**: `1e44676`, `1516afd`, `52d4f0c`, `6c282cf`, `24094b3`

**UX Improvements:**
- ✅ City search/filter in switcher (auto-focus, clear button, result count)
- ✅ Facet dimension toggles (replaced 16-item dropdown with Age/Sex/Race/Risk toggle buttons)
- ✅ Facet pagination (show first 9 panels, "Show all X" to expand)
- ✅ Decluttered controls header

**Data Export:**
- ✅ Table view (toggle between Chart/Table)
- ✅ CSV export
- ✅ PNG export (html2canvas with 2x resolution)

**Multi-Model Architecture:**
- ✅ Created `/src/config/model-configs.ts` with `ModelConfig` interface
- ✅ Explorer now uses `MODEL_CONFIG` constant - copy page and change config for new models

</details>

<details>
<summary>2026-01-05: Native Explorer Demo Polish & Route Promotion (Click to expand)</summary>

**Route Structure:**
- Promoted native explorer to `/ryan-white/explorer` (model-first hierarchy)
- Removed `/explore/native` (was temporary location)

**UI/UX Polish:**
- Updated scenario descriptions with precise paper definitions (18mo, 42mo, permanent)
- Changed default outcome to `incidence`
- Blue-to-orange diverging color scale for suppression (colorblind-friendly)

</details>

<details>
<summary>2025-12-31: CloudFront Production Pipeline (Click to expand)</summary>

**Distribution**: `d320iym4dtm9lj.cloudfront.net`
**Origin**: `jheem-data-production.s3.us-east-1.amazonaws.com/portal`

- CloudFront CORS configuration fixed
- Workflow uploads to S3 with gzip compression
- Free tier: 1M requests, 100GB transfer/month

</details>

<details>
<summary>Earlier sessions (Click to expand)</summary>

- **2025-12-26**: GitHub Actions workflow for native data generation
- **2025-12-20**: Multi-level faceting fix (age+race+sex shows 45 panels)
- **2025-12-17**: Decided on `prepare_plot_local()` output format
- **2025-12-11**: Native plotting architecture investigation
- **2025-10-31**: Comprehensive code review (Grade A overall)
- **2025-08-31**: Security hardening (zero vulnerabilities)

</details>

---

## 🎯 CURRENT STATUS

### ✅ Complete & Working
- **MSA Explorer** (`/ryan-white/explorer`): Full-featured, demo-ready
- **Multi-Model Config**: `ModelConfig` system ready for future models
- **CloudFront**: Data served with CORS, free tier
- **Cost-Optimized Workflows**: ~$8/run → ~$0-1/run
- **State-Level Workflow**: Created (needs end-to-end test)
- **Choropleth Prototype**: Ready for design feedback

### 🚧 In Progress
| Item | Status | Notes |
|------|--------|-------|
| State workflow end-to-end test | ⏳ | Run with `dry_run=false` |
| MSA simulation migration | ⏳ | Move from S3 to GitHub Releases |
| State choropleth UI | ⏳ | Finalize from prototype |
| Route restructure | ⏳ | Migrate to `/ryan-white/msa/explorer` |

### 📋 Backlog
- Replace `/ryan-white-state-level` Shiny embed with native explorer
- Mobile responsiveness
- Custom simulations (70% infra ready, lower priority)

---

## 📂 KEY FILES & STRUCTURE

### Applications
- `/src/app/ryan-white/explorer/page.tsx` - MSA Map Explorer (~1100 lines)
- `/src/app/ryan-white/explorer/state/page.tsx` - State choropleth prototype
- `/src/app/hiv-age-projections/page.tsx` - HIV Age Projections
- `/src/app/ryan-white-state-level/page.tsx` - Legacy Shiny embed
- `/src/app/cdc-testing/page.tsx` - CDC Testing Shiny embed

### Native Plotting Components
- `/src/components/NativeSimulationChart.tsx` - Recharts-based charts
- `/src/components/StateMapSample.tsx` - Choropleth prototype
- `/src/hooks/useCityData.ts` - Load aggregated city/state JSON
- `/src/config/model-configs.ts` - Model configuration system

### Data Files
- `/src/data/cities.ts` - 31 MSA coordinates
- `/src/data/states.ts` - 11 state coordinates
- `/public/us-states.json` - GeoJSON for state boundaries
- `/public/data/city-summaries.json` - City summary metrics

### Scripts
- `/scripts/aggregate-city-data.ts` - Merge per-combination JSONs (streaming)
- `/scripts/generate-state-summaries.ts` - State hover card data

### Related Repositories
- **jheem-backend**: `/Users/cristina/wiley/Documents/jheem-backend/`
- **jheem-container-minimal**: `/Users/cristina/wiley/Documents/jheem-container-minimal/`
- **jheem-simulations**: `github.com/ncsizemore/jheem-simulations`

---

## 🏗️ ARCHITECTURAL DECISIONS

### Repository Strategy
- **Separate container repo per model**: Enables "freezing" published work for reproducibility
- **Data artifacts via GitHub Releases**: Free egress vs S3 costs (~$1/run saved)
- **Single container for MSA + State**: Container treats location generically

### Cost Optimization
- Container pulls from ghcr.io (free) instead of ECR (~$7/run saved)
- Simulations hosted on GitHub Releases (free) instead of S3 (~$1/run saved)
- CloudFront free tier: 1M requests, 100GB/month

### Route Structure (Option C)
- `/ryan-white/msa/explorer` - MSA marker map
- `/ryan-white/state/explorer` - State choropleth map
- `/ryan-white/` - Landing page for both variants
- Preserves paper URLs: `jheem.org/ryan-white-state-level` → redirect to new route

### Workflow Separation
- Separate workflows for MSA vs State (independent evolution, clear ownership)
- Both use same container, just different location codes and simulation sources

---

## Technical Stack

### Frontend (This Repository)
- **Framework**: Next.js 15.5.2 with TypeScript 5
- **Styling**: Tailwind CSS 4
- **Data Visualization**: Recharts, Plotly.js
- **Mapping**: Mapbox GL JS 3.12, react-map-gl 8.0
- **Animation**: Framer Motion 12.17
- **Additional**: html2canvas, big-json (streaming), rc-slider

### Backend (jheem-backend)
- **Workflows**: GitHub Actions
- **Storage**: S3 + CloudFront
- **Container Registry**: ghcr.io (primary), ECR, Docker Hub

### Container (jheem-container-minimal)
- **Base**: R 4.4.2 with renv
- **Core Package**: jheem2 from GitHub
- **Pinned**: `jheem_analyses` commit `fc3fe1d2`
