# JHEEM Portal - Architecture Reference

## Overview

Interactive portal for exploring HIV policy modeling analyses from the Johns Hopkins Epidemiological and Economic Model.

- **Live site**: https://jheem.org
- **Custom sims plan**: `docs/CUSTOM-SIMULATIONS-PLAN.md` (architecture, progress, version matrix)
- **Security hardening**: `docs/CUSTOM-SIM-SECURITY-HARDENING.md` (findings, fixes, parked backlog)
- **Email & progress plan**: `docs/EMAIL-AND-PROGRESS-PLAN.md` (notification + real-time progress)

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
| **jheem-ryan-white-msa-container** | R container for MSA (jheem2 1.6.2, pinned) |
| **jheem-ryan-white-ajph-container** | R container for AJPH |
| **jheem-ryan-white-croi-container** | R container for CROI |
| **jheem-cdc-testing-container** | R container for CDC Testing |
| **jheem-base** | Shared R container base (custom_simulation.R, entrypoint) |
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
| `/ryan-white/custom` | MSA custom simulations |
| `/ryan-white-state-level/custom` | State custom simulations (AJPH/CROI toggle) |
| `/cdc-testing/custom` | CDC Testing custom simulations |
| `/aging` | HIV Age Projections (24 states) |
| `/shiny/cdc-testing` | Legacy Shiny app |
| `/shiny/ryan-white-custom` | Custom simulations Shiny app (legacy) |

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
| `src/components/AnalysisView.tsx` | Shared prerun analysis UI |
| `src/components/CustomSimulationExplorer.tsx` | Config-driven custom sim page (params, trigger, results) |
| `src/components/analysis/AnalysisResults.tsx` | Shared controls + chart/table (used by both prerun and custom) |
| `src/components/SimulationProgress.tsx` | Stepped progress bar for custom sims |
| `src/components/StateChoroplethExplorer.tsx` | Config-driven state map |
| `src/components/NativeSimulationChart.tsx` | Recharts-based charts |
| `src/components/Navigation.tsx` | Site navigation |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/custom-sim/route.ts` | POST trigger: cache check → dedup → workflow_dispatch |
| `src/app/api/custom-sim/status/route.ts` | GET status: CloudFront cache → GHA Jobs API progress |
| `src/app/api/custom-sim/notify/route.ts` | POST notify: Bearer-auth'd, called by workflow on completion, drains email queue from Upstash and sends via Resend |

### Configuration
| File | Purpose |
|------|---------|
| `src/config/model-configs.ts` | Generated from models.json (don't edit) |
| `scripts/sync-config.ts` | Syncs models.json → model-configs.ts (authenticated GitHub API) |
| `src/data/states.ts` | State coordinates |
| `src/data/cities.ts` | MSA coordinates |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useCustomSimulation.ts` | Custom sim lifecycle: trigger → poll → fetch |
| `src/hooks/useLocationData.ts` | Location data fetching |
| `src/hooks/useStateSummaries.ts` | State summary fetching |
| `src/hooks/useAnalysisState.ts` | Analysis selection state |

### Libraries
| File | Purpose |
|------|---------|
| `src/lib/trigger-log.ts` | Upstash Redis forensic logging (fire-and-forget) |
| `src/lib/notify.ts` | Email notification stash/drain + Resend sender |

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

### Custom Simulations
User-specified parameters trigger on-demand R simulations via GitHub Actions. Results land on S3/CloudFront in the same JSON format as prerun data — the portal renders both identically.

**Flow:** Portal POST → `/api/custom-sim` → cache check → dedup → `workflow_dispatch` → R container → S3 → CloudFront → portal polls `/api/custom-sim/status` → renders results.

**Caching:** Deterministic scenario keys (e.g., `a50-o30-r40`) mean identical parameters always hit the same S3 path. Once computed, results are instant for all future users.

**Email notifications:** User optionally provides email at trigger time. Portal stashes `{email, url}` in Upstash Redis. Workflow calls `/api/custom-sim/notify` (Bearer-auth'd) on success. Portal drains queue and sends via Resend. Email never transits the workflow (privacy: no PII in GHA logs/inputs).

**Security:** Location whitelist (regex + membership), email format validation, auto-trigger guard on client, Upstash forensic logging on all API requests. Workflow uses `env:` blocks for all inputs (no shell injection). See `docs/CUSTOM-SIM-SECURITY-HARDENING.md`.

**Supported models:** All 4 (MSA, AJPH, CROI, CDC Testing). Config-driven via `models.json` `customSimulation` block.

---

## Tech Stack

**Frontend:** Next.js 16, TypeScript 5, Tailwind CSS 4
**Visualization:** Recharts, Plotly.js
**Mapping:** Mapbox GL JS, react-map-gl
**Workflows:** GitHub Actions (reusable template)
**Storage:** S3 + CloudFront
**Registry:** ghcr.io
**Notifications:** Resend (email), Upstash Redis (logging + notification queue)

---

## Adding a New Model

1. Add config to `models.json` (jheem-backend)
2. Create thin workflow wrapper (~40 lines)
3. Create route page (~30 lines)
4. Run workflow to generate data

See jheem-backend for detailed guide.
