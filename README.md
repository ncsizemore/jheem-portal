# JHEEM Portal

The Johns Hopkins Epidemiological and Economic Model (JHEEM) portal provides interactive tools for exploring HIV policy modeling analyses.

**Live site:** https://jheem.org

## Research Applications

| Application | Description | Route |
|-------------|-------------|-------|
| **Ryan White: City-Level** | Impact of funding disruption across 31 MSAs | `/ryan-white` |
| **Ryan White: State-Level** | Statewide analysis (AJPH: 11 states, CROI: 30 states) | `/ryan-white-state-level` |
| **CDC Testing** | Impact of ending CDC-funded HIV testing (18 states) | `/cdc-testing` |
| **HIV Age Projections** | Age distribution projections 2025-2040 (24 states) | `/aging` |
| **Custom Simulations** | User-specified parameters, on-demand results | `/ryan-white/custom`, `/cdc-testing/custom` |

## Development

### Prerequisites

- Node.js 20.9+ (CI uses Node.js 24)
- npm

### Setup

```bash
git clone https://github.com/ncsizemore/jheem-portal.git
cd jheem-portal
npm ci
```

### Running locally

```bash
npm run dev
```

Open http://localhost:3000

### Building

```bash
npm run build
```

The build uses the committed model configuration pinned to an immutable backend revision. See
[`docs/MODEL-CONFIG-SYNC.md`](docs/MODEL-CONFIG-SYNC.md) for the deliberate update and verification
workflow.

## Architecture

The portal is part of a multi-repository system:

| Repository | Purpose |
|------------|---------|
| **jheem-portal** | Next.js frontend (this repo) |
| **jheem-backend** | GitHub Actions workflows, `models.json` config |
| **jheem-simulations** | Simulation data (GitHub Releases) |
| **jheem-base** | Shared R container base |
| **jheem-*-container** | Per-model R containers |

Data flows: GitHub Releases → GitHub Actions → S3/CloudFront → Portal

See `CLAUDE.md` for detailed architecture documentation.

## Adding a New Model

See [jheem-backend](https://github.com/ncsizemore/jheem-backend) for the step-by-step guide. In brief:

1. Add and merge config in `models.json` (jheem-backend)
2. Pin that backend commit and run `npm run sync-config` in the portal
3. Create the thin workflow wrapper and portal route

## Tech Stack

- **Framework:** Next.js 16, TypeScript 5
- **Styling:** Tailwind CSS 4
- **Visualization:** Recharts
- **Mapping:** Mapbox GL JS, react-map-gl

## License

[Add license information]
