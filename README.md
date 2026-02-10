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

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/ncsizemore/jheem-portal.git
cd jheem-portal
npm install
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

This syncs configuration from `jheem-backend/models.json` before building.

## Architecture

The portal is part of a multi-repository system:

| Repository | Purpose |
|------------|---------|
| **jheem-portal** | Next.js frontend (this repo) |
| **jheem-backend** | GitHub Actions workflows, `models.json` config |
| **jheem-simulations** | Simulation data (GitHub Releases) |
| **jheem-*-container** | R containers for data extraction |

Data flows: GitHub Releases → GitHub Actions → S3/CloudFront → Portal

See `CLAUDE.md` for detailed architecture documentation.

## Adding a New Model

See [jheem-backend](https://github.com/ncsizemore/jheem-backend) for the step-by-step guide. In brief:

1. Add config to `models.json` (jheem-backend)
2. Create thin workflow wrapper (~40 lines)
3. Create route page in portal (~30 lines)

## Tech Stack

- **Framework:** Next.js 15, TypeScript 5
- **Styling:** Tailwind CSS 4
- **Visualization:** Recharts, Plotly.js
- **Mapping:** Mapbox GL JS, react-map-gl

## License

[Add license information]
