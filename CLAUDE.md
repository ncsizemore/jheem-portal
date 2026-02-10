# JHEEM Portal - Architecture Reference

## Overview

Interactive portal for exploring HIV policy modeling analyses from the Johns Hopkins Epidemiological and Economic Model.

- **Live site**: https://jheem.org
- **Session log**: `docs/SESSION_LOG.md` (recent work and context)
- **Refactor plan**: `docs/ARCHITECTURE-REFACTOR-PLAN.md` (detailed implementation notes)

---

## Multi-Repository Architecture

```
jheem-simulations          jheem-*-container
(GitHub Releases)          (R model containers)
       │                          │
       ▼                          ▼
┌─────────────────────────────────────────┐
│           jheem-backend                  │
│     (GitHub Actions Workflows)           │
│     (models.json - source of truth)      │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│              S3 + CloudFront             │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│            jheem-portal                  │
│         (Next.js Frontend)               │
└─────────────────────────────────────────┘
```

### Repositories

| Repository | Purpose |
|------------|---------|
| **jheem-portal** | Next.js frontend |
| **jheem-backend** | GitHub Actions workflows, `models.json` config, AWS infra |
| **jheem-container-minimal** | R container for MSA + AJPH (`v1.0.0`) |
| **jheem-ryan-white-croi-container** | R container for CROI (`v1.0.0`) |
| **jheem-cdc-testing-container** | R container for CDC Testing (`v1.0.1`) |
| **jheem-simulations** | Simulation data via GitHub Releases |

### Data Releases (jheem-simulations)

| Release | Content |
|---------|---------|
| `ryan-white-msa-v1.0.0` | MSA 31 cities |
| `ryan-white-ajph-v1.0.0` | AJPH 11 states |
| `ryan-white-state-v2.0.0` | CROI 30 states |
| `cdc-testing-v1.0.0` | CDC Testing 18 states |

### CloudFront Paths

| Path | Content |
|------|---------|
| `/ryan-white/` | MSA city JSON files |
| `/ryan-white-state/` | AJPH 11-state JSON files |
| `/ryan-white-state-croi/` | CROI 30-state JSON files |
| `/cdc-testing/` | CDC Testing 18-state JSON files |

**Distribution**: `d320iym4dtm9lj.cloudfront.net`
**Bucket**: `jheem-data-production`
**CORS**: `Managed-SimpleCORS` response headers policy

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/ryan-white` | MSA paper landing page |
| `/ryan-white/explorer` | MSA explorer (31 cities) |
| `/ryan-white-state-level` | State paper landing (AJPH + CROI) |
| `/ryan-white-state-level/explorer/ajph` | AJPH explorer (11 states) |
| `/ryan-white-state-level/explorer/croi` | CROI explorer (30 states) |
| `/cdc-testing` | CDC Testing landing page |
| `/cdc-testing/explorer` | CDC Testing explorer (18 states) |
| `/aging` | HIV Age Projections (24 states) |
| `/shiny/cdc-testing` | Legacy Shiny app |
| `/shiny/ryan-white-custom` | Custom simulations Shiny app |

---

## Key Files

### Routes
| File | Purpose |
|------|---------|
| `src/app/page-wrapper.tsx` | Homepage |
| `src/app/ryan-white/page.tsx` | MSA landing |
| `src/app/ryan-white/explorer/page.tsx` | MSA explorer |
| `src/app/ryan-white-state-level/page.tsx` | State landing |
| `src/app/ryan-white-state-level/explorer/*/page.tsx` | AJPH/CROI explorers |
| `src/app/cdc-testing/page.tsx` | CDC Testing landing |
| `src/app/cdc-testing/explorer/page.tsx` | CDC Testing explorer |

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
| `src/config/model-configs.ts` | Generated from models.json (don't edit) |
| `scripts/sync-config.ts` | Syncs models.json → model-configs.ts |
| `src/data/states.ts` | State coordinates |
| `src/data/cities.ts` | MSA coordinates |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useLocationData.ts` | Location data fetching |
| `src/hooks/useStateSummaries.ts` | State summary fetching |
| `src/hooks/useAnalysisState.ts` | Analysis selection state |

---

## Architectural Decisions

### Config-Driven Design
- `models.json` in jheem-backend is the single source of truth
- Portal syncs at build time via `scripts/sync-config.ts`
- Adding new models = JSON config + thin workflow + route page
- **Why:** Before this, config was scattered across 4+ locations causing sync bugs. Single source eliminates drift.

### Landing Page Pattern
- Publication-focused: preprint/paper info, key findings, authors
- Links to interactive tools (explorer, legacy Shiny)
- **Why:** SaaS-style landing pages felt like genre mismatch for academic research. Publication focus establishes credibility.

### Repository Strategy
- Separate container per model (freeze for reproducibility)
- Data artifacts via GitHub Releases (free egress)
- Workflows in jheem-backend (centralized, reusable template)
- **Why:** Containers freeze model code so results match publications. GitHub Releases = free CDN. Reusable template reduced workflow code by 54%.

### Cost Optimization
- Container pulls from ghcr.io (free vs ECR $7/run)
- Simulations on GitHub Releases (free vs S3 $1/run)
- CloudFront free tier: 1M requests, 100GB/month
- **Why:** Research project budget. Per-run costs reduced from ~$8 to effectively $0.

---

## Tech Stack

**Frontend:** Next.js 15, TypeScript 5, Tailwind CSS 4
**Visualization:** Recharts, Plotly.js
**Mapping:** Mapbox GL JS, react-map-gl
**Workflows:** GitHub Actions (reusable template)
**Storage:** S3 + CloudFront
**Registry:** ghcr.io

---

## Adding a New Model

1. Add config to `models.json` (jheem-backend)
2. Create thin workflow wrapper (~40 lines)
3. Create route page (~30 lines)
4. Run workflow to generate data

See jheem-backend for detailed guide.
