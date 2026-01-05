# JHEEM Portal - Session Memory

## Project Context
- Modeling applications portal transitioning from Shiny apps to React/Next.js/AWS serverless stack
- **Four major applications live**: Ryan White Map Explorer, HIV Age Projections, State Level (Shiny), CDC Testing (Shiny)
- **Three-repository architecture** for Ryan White modernization: jheem-portal (frontend), jheem-backend (API), jheem-container-minimal (R simulation engine)
- Currently on temporary Vercel domain, preparing for live domain deployment

## 🏗️ Multi-Repository Architecture (Ryan White Modernization)

### Repository Overview

The Ryan White map explorer modernization spans three repositories, replacing legacy Shiny apps with a serverless architecture:

#### 1. **jheem-portal** (This Repository)
**Purpose**: Next.js frontend with React components
**Status**: ✅ Production deployed on Vercel
**URL**: https://jheem-portal.vercel.app/

**Key Routes**:
- `/explore` - Ryan White Map Explorer (legacy Plotly-based)
- `/explore/native` - **NEW** Native Recharts explorer (recommended, will replace /explore)
- `/hiv-age-projections` - Multi-state HIV aging analysis
- `/ryan-white-state-level` - Embedded Shiny app (iframe)
- `/cdc-testing` - Embedded Shiny app (iframe)

#### 2. **jheem-backend** (Serverless API)
**Location**: `/Users/cristina/wiley/Documents/jheem-backend/`
**Purpose**: AWS Lambda + API Gateway + DynamoDB + S3
**Status**: ✅ Deployed to AWS production
**API**: `https://abre4axci6.execute-api.us-east-1.amazonaws.com/prod`

**Infrastructure**:
- **Lambda Functions** (Python 3.9): Plot discovery, retrieval, registration, city listing
- **DynamoDB Table**: `jheem-test-tiny` (composite key: `city_scenario`, `outcome_stat_facet`)
- **S3 Bucket**: `jheem-test-tiny-bucket` (plot JSON files)
- **GitHub Actions**: Automated plot generation workflow
- **Cost**: ~$1-2/month (95% reduction from $50/month Shiny hosting)

**API Endpoints**:
- `GET /plots/cities` - Discover available cities ✅
- `GET /plots/search` - Search plots by city/scenario ✅
- `GET /plot` - Retrieve specific plot data ✅
- `POST /plots/register` - Register new plots (GitHub Actions) ✅

#### 3. **jheem-container-minimal** (R Simulation Engine)
**Location**: `/Users/cristina/wiley/Documents/jheem-container-minimal/`
**Purpose**: Containerized JHEEM simulation model
**Status**: ✅ Built and published to ECR/DockerHub
**Image**: `849611540600.dkr.ecr.us-east-1.amazonaws.com/jheem-ryan-white-model:latest`

**Two Operational Modes**:
1. **Batch Mode (Prerun)** - ✅ Working
   - `batch_plot_generator.R` - Generates all plot combinations
   - Used by GitHub Actions for prerun data generation
   - Produces Plotly JSON plots uploaded to S3/DynamoDB

2. **Lambda Mode (Custom Simulations)** - 🚧 Ready but not deployed
   - `lambda_handler.R` - AWS Lambda entry point (200 lines complete)
   - `simulation/interventions.R` - Ryan White parameter handling
   - `simulation/runner.R` - Simulation execution pipeline
   - Loads base simulations, applies custom parameters, generates plots on-demand

### Data Flow Architecture

**Prerun Path (Current - Working)**:
```
GitHub Actions Workflow
    ↓ (trigger with config type)
ECR Container (batch mode)
    ↓ (downloads base sims from S3)
R Plot Generation
    ↓ (generates JSON plots)
S3 Upload + DynamoDB Registration
    ↓ (indexed by composite keys)
Lambda API (Python)
    ↓ (serves via API Gateway)
Frontend (Next.js)
    ↓ (displays in map explorer)
User sees prerun plots
```

**Custom Simulation Path (Planned - Infrastructure Ready)**:
```
Frontend (parameter form) → NOT BUILT YET
    ↓ (POST with city + parameters)
API Gateway → NOT CONFIGURED YET
    ↓ (async job pattern)
Lambda (R container) → NOT DEPLOYED YET
    ↓ (downloads base sim from S3)
Custom Simulation Execution
    ↓ (5-7 minute runtime)
Plot Generation + S3 Upload
    ↓ (results stored)
Frontend polling → NOT BUILT YET
    ↓ (checks status)
User sees custom results
```

---

## Latest Session Summary (2025-01-04)

### Code Review and Quality Improvements

**Commits**: `d1da612`, `aabbd9f`

#### Completed Fixes

**Security:**
- Added `encodeURIComponent()` to all URL query parameters (6 files)
- Documented iframe sandbox security decision in EmbeddedShinyApp.tsx

**Performance:**
- Parallelized scenario API fetches (~3x speedup)
- Extracted inline event handlers to useCallback in native explorer
- Added dynamic import for html2canvas (reduces initial bundle)

**Error Handling:**
- Added loading/error states with timeout handling for city summaries fetch
- Fixed memory leak from uncleared timeout in DemographicView

**Code Quality:**
- Wrapped console statements in development-only checks
- Removed deprecated document.execCommand, using modern Clipboard API
- Standardized all imports to use @/ path aliases (10 files)

#### Remaining Items (Lower Priority)

| Issue | Effort | Notes |
|-------|--------|-------|
| Repeated error UI patterns | 1hr | Same error card in 3 places |
| Module-level cache in useCityData | 1hr | Global Map could cause stale data |
| JSDoc for complex functions | 30min | getSuppressionColor, getMarkerSize |
| Centralized API client | 3-4hrs | Fetch logic duplicated across 7 files |
| Split native/page.tsx (830 lines) | 2-3hrs | Into MapView + AnalysisView |

---

## Previous Session Summary (2025-12-31)

### CloudFront Production Pipeline Complete

#### ✅ CloudFront Distribution Created (Free Tier)

**Distribution**: `d320iym4dtm9lj.cloudfront.net`
**Origin**: `jheem-data-production.s3.us-east-1.amazonaws.com/portal`
**Plan**: Free ($0/month, no overage charges, WAF included)

#### ✅ CORS Configuration Fixed

**Problem**: CloudFront cached responses without CORS headers, blocking browser requests.

**Solution**:
1. S3 CORS policy with allowed origins (localhost, jheem.org, vercel)
2. CloudFront `CORS-S3Origin` managed origin request policy
3. Cache invalidation to clear non-CORS cached responses

#### ✅ Workflow Updated for S3 Upload

Workflow now uploads directly to S3 with gzip compression instead of GitHub artifacts:
```
s3://jheem-data-production/portal/ryan-white/C.XXXXX.json
```

#### ✅ Frontend Updated

- CSP: Added CloudFront domain to `connect-src`
- `useCityData.ts`: Fetches from CloudFront URL
- `page.tsx`: City summaries from CloudFront

#### ✅ Test Run Successful

3 cities (Atlanta, Baltimore, Chicago) generated, uploaded to S3, and successfully loaded in frontend via CloudFront.

### 📋 Next Steps

1. **Run full 31-city workflow** (~2 hours with 20 parallel)
2. **Update AVAILABLE_CITIES** with all 31 cities
3. **Deploy to production** (Vercel)

### 🔧 Infrastructure Summary

| Component | Value |
|-----------|-------|
| CloudFront Domain | `d320iym4dtm9lj.cloudfront.net` |
| S3 Path | `jheem-data-production/portal/ryan-white/` |
| Origin Request Policy | `CORS-S3Origin` (managed) |
| Free Tier Limits | 1M requests, 100GB transfer/month |

See session notes: `.claude-sessions/2025-12-31_cloudfront_cors_and_full_pipeline.md`

---

## Previous Session Summaries

<details>
<summary>2025-12-26: Workflow & S3/CloudFront Architecture (Click to expand)</summary>

- Created GitHub Actions workflow for native data generation
- Tested with 3 cities successfully (954 files per city)
- Discovered GitHub artifacts 500MB limit
- Decided on S3 + CloudFront architecture
- Added Atlanta and Chicago to AVAILABLE_CITIES

</details>

<details>
<summary>2025-12-20: Multi-Level Faceting Fix (Click to expand)</summary>

- Fixed multi-level faceting (age+race+sex now shows 45 panels, not 5)
- Container fix: capture all `facet.by*` columns, not just `facet.by1`
- Frontend: added composite facet key helper
- Assessed V2 explorer UX (grade B+)

</details>

<details>
<summary>2025-12-17: Native Plotting Data Format (Click to expand)</summary>

### Key Decision: Use `prepare_plot_local()` Output

Discovered that extracting raw data and aggregating client-side was mathematically broken for proportions. Pivoted to extracting `prepare_plot_local()` output directly - this handles all the complex aggregation and ontology mapping correctly.

**Files Modified:**
- `batch_plot_generator.R` - Added `--output-mode data` flag
- Created transform utilities and chart components

**Validation:** Data from `prepare_plot_local()` matches Shiny app exactly.

</details>

<details>
<summary>2025-12-14: Observation Data Investigation (Click to expand)</summary>

Investigated discrepancies between extracted observation data and Shiny app. Root cause: data manager has different data at different granularities. Solution: pull at same granularity simplot uses.

</details>

<details>
<summary>2025-12-11: Native Plotting Architecture Investigation (Click to expand)</summary>

Initial investigation into native plotting approach. Created `extract_summary_data.R` for raw data extraction. Later discovered fundamental issues with this approach (proportion aggregation, ontology mapping).

</details>

<details>
<summary>2025-10-31: Code Review (Click to expand)</summary>

Comprehensive frontend code review. Grade A overall. Minor issues identified (URL encoding, React.memo gaps, console cleanup).

</details>

---

## Previous Session Summary (2025-10-31)

<details>
<summary>Click to expand previous session details</summary>

#### ✅ Comprehensive Code Review Completed (Frontend)
- **Security Analysis**: Grade A - Zero vulnerabilities confirmed via npm audit
- **Build Verification**: Zero TypeScript errors, zero ESLint warnings
- **Error Handling Review**: Comprehensive timeout/validation patterns confirmed
- **Performance Assessment**: React.memo/useCallback patterns verified
- **Type Safety Check**: All 'any' types replaced with proper interfaces confirmed

#### 🔍 Multi-Repository Architecture Assessment Completed
**Reviewed all three repositories** and documented complete system architecture:

1. **jheem-portal**: Frontend production-ready, prerun working, custom UI not built
2. **jheem-backend**: API deployed and serving, custom simulation endpoint not configured
3. **jheem-container-minimal**: Container built with complete custom simulation code ready

**Key Finding**: ~70% of custom simulation work is complete (backend infrastructure + R code), but missing deployment + frontend integration.

#### 📋 Minor Issues Identified (Frontend Only)
1. **URL Encoding**: Missing `encodeURIComponent` in `explore/page.tsx` lines 162, 167
2. **React.memo Gaps**: `MapboxCityMap` and `PlotExplorationSidebar` need optimization
3. **Mapbox Token**: Should verify domain restrictions are configured in Mapbox dashboard
4. **Console Cleanup**: 18 console statements still need dev-only wrapping

</details>

---

## 🎯 CURRENT STATUS: CloudFront Setup, Then 31-City Generation

### ✅ Complete & Working
- **Frontend (jheem-portal)**: All apps deployed, Grade A code quality
- **Native Plotting**: ✅ Multi-level faceting fixed, CI rendering fixed
- **Native Explorer**: ✅ `/explore/native` with 3 test cities working
- **GitHub Actions Workflow**: ✅ Created and tested (`generate-native-data.yml`)
- **Architecture Decision**: ✅ S3 + CloudFront chosen (multi-model ready)
- **Security**: Zero vulnerabilities, comprehensive CSP headers

### 🚧 Production Push (Next Steps)
| Item | Status | Notes |
|------|--------|-------|
| CloudFront distribution | ⏳ Next | Create and configure |
| Workflow S3 upload | ⏳ Pending | Replace artifacts with S3 |
| Frontend CloudFront URL | ⏳ Pending | Update data fetching |
| 31-city generation | ⏳ Pending | Run workflow with `full` |
| Route swap | ⏳ Future | Native → main `/explore` |

### 🚧 Custom Simulations (Separate Track - Lower Priority)
- **Infrastructure**: 70% complete
  - ✅ R container has complete `lambda_handler.R` (200 lines)
  - ✅ Simulation pipeline ready (`interventions.R`, `runner.R`)
  - ❌ Lambda function not deployed to AWS
  - ❌ API Gateway endpoint not configured
  - ❌ Frontend parameter UI not built
  - ❌ Async job pattern not implemented

### 📊 Code Quality Scorecard (Frontend)
| Category | Grade | Status |
|----------|-------|--------|
| Security | A | Excellent headers, zero vulnerabilities |
| Error Handling | A | Comprehensive, user-friendly |
| Type Safety | A | Zero TS errors, proper types |
| Performance | B+ | Good patterns, large bundle acceptable |
| Code Quality | A- | Clean, maintainable, minor console logs |
| Architecture | A | Component reuse, clean separation |
| Testing | N/A | No tests (known gap) |

**Overall Grade: A** - Production-ready with minor improvements recommended

---

## 🚀 MAJOR APPLICATIONS

### 1. Ryan White Map Explorer (`/explore`) 🚧
**Status**: ✅ Prerun working, ❌ Custom simulations not deployed
**Priority**: High - Team excited for this modernization

**Current Capabilities (Prerun)**:
- Interactive US map with city-level HIV data
- Hover-to-preview, click-to-explore interaction
- Three-dimensional plot controls (Outcome/Summary/Facet)
- Multiple scenario comparisons (cessation, brief_interruption, etc.)
- Real-time API discovery of available cities
- Error boundaries and graceful fallbacks

**Missing Capabilities (Custom Simulations)**:
- Parameter input form (ADAP/OAHS/Other suppression loss %)
- "Run Custom Simulation" button
- Progress indicator for 5-7 minute simulations
- Results display for custom parameters
- Comparison with prerun baseline

**Technical Highlights**:
- Mapbox GL JS integration with Web Workers
- AbortController for request management
- Comprehensive error handling with timeouts
- Type-safe plot interfaces

**Next Steps**:
1. Generate full prerun dataset (31 cities, ~64K plots)
2. Deploy custom simulation Lambda function
3. Build parameter input UI
4. Implement async job polling pattern

### 2. HIV Age Projections (`/hiv-age-projections`)
**Status**: ✅ Fully functional, production-ready

**Key Features**:
- Multi-state comparison (up to 25 states simultaneously)
- Three view modes: States Only, States × Race, States × Sex
- Interactive timeline controls (2025-2040)
- Normalized vs absolute display modes
- PNG export functionality
- URL state management (shareable links)
- Real-time chart count management

**Data Coverage**:
- 24 US states representing 86% of diagnosed HIV cases
- Age cohorts: 13-24, 25-34, 35-44, 45-54, 55+
- Race categories: Black, Hispanic, Other
- Sex categories: MSM, Non-MSM

**Technical Highlights**:
- **Generic `DemographicView` component** - Eliminates duplication between race/sex views
- URL query parameter sync with Next.js navigation
- Chart grid with dynamic state truncation
- Custom event system for export status
- Recharts for data visualization

**Component Architecture**:
- `DemographicView.tsx` (330 lines) - Generic demographic breakdown component
- `ByRaceView.tsx` (68 lines) - Race-specific wrapper
- `BySexView.tsx` (65 lines) - Sex-specific wrapper
- `MultiStateChartGrid.tsx` (304 lines) - Chart grid renderer
- `AgeDistributionChart.tsx` (305 lines) - Individual chart component

### 3. Ryan White State Level (`/ryan-white-state-level`)
**Status**: ✅ Embedded Shiny app with sophisticated UX

**Features**:
- Sophisticated landing page with feature highlights
- Floating launch panel
- Session preservation with restore/end controls
- Loading states with animations
- Secure iframe with minimal permissions

### 4. CDC Testing Model (`/cdc-testing`)
**Status**: ✅ Embedded Shiny app with sophisticated UX

**Features**:
- Matching UX pattern to State Level app
- Testing scenario analysis (cessation, interruption, restoration)
- Landing page with policy impact highlights
- Session management controls

---

## 📋 RYAN WHITE MODERNIZATION ROADMAP

### 🔄 Strategic Direction (Updated 2025-12-11)

**Current Strategy**: Native frontend plotting with extracted summary data
**Fallback Strategy**: Pre-rendered Plotly JSONs (on hold, preserved as backup)

#### Why Native Plotting?
- **28x smaller data** (~47 MB vs ~1.3 GB for 64K Plotly JSONs)
- **Dynamic faceting** (any age/sex/race combination, computed client-side)
- **Modern styling** (Recharts, professional appearance, consistent with rest of portal)
- **Simpler infrastructure** (31 files vs 64K files, simpler DynamoDB schema)
- **Frontend-first** (reduces R dependency, better developer experience)

#### Why Keep Plotly Fallback?
- Native approach is **unvalidated** - needs Phase 1 proof before commitment
- Plotly infrastructure **already works** (workflow, container, API all functional)
- **Low cost to preserve** - just documentation, no ongoing maintenance
- **Risk mitigation** - if native hits blockers, can ship with proven approach

**Decision Gate**: End of Phase 1 - proceed with native or revert to Plotly based on validation results.

**Session Documentation**: See `.claude-sessions/2025-12-11_native_plotting_investigation.md` for full technical investigation.

---

### Phase 1: Validate Native Plotting ✅ COMPLETE

**Status**: Validated on 2025-12-18
**Decision**: Proceed with native approach (Phase 2a)

**Completed**:
- ✅ Built test page at `/explore/test-native` and `/explore/native`
- ✅ NativeSimulationChart component with Recharts
- ✅ Support for mean/median with CI and individual simulations
- ✅ Faceted views (unfaceted, by age, by sex, by race)
- ✅ Display toggles (CI, baseline, observations)
- ✅ Visual validation against Shiny app - parity confirmed
- ✅ Aggregation script to merge per-combination JSONs

**Outcome**: Native approach is viable and recommended for production

---

### Phase 2a: Native Plotting Production ⏳ CURRENT PRIORITY

**Effort**: 2-3 days
**Prerequisites**: Phase 1 complete ✅

**Tasks**:
1. **New S3 bucket** (`jheem-summary-data`)
   - Store one JSON per city (~1.5 MB gzipped each)
   - Enable CloudFront caching (24-hour TTL)

2. **New API endpoints** (v2, alongside existing v1):
   - `GET /v2/cities` - List cities with metadata, file sizes, last updated
   - `GET /v2/data/{city}` - Return gzipped summary data

3. **New GitHub Actions workflow** (`generate-summary-data.yml`)
   - Uses `extract_summary_data.R` from jheem-container-minimal
   - Matrix strategy: one job per city
   - Outputs to new S3 bucket

4. **Generate full dataset**
   - Run workflow for all 31 cities
   - Verify API returns data correctly

**Deliverable**: Production v2 API serving summary data

---

### Phase 2b: Plotly JSON Backend (Fallback - On Hold)

**Status**: Infrastructure ready, on hold pending Phase 1 decision
**Effort**: 1 day (mostly compute time)

**Tasks** (if needed):
1. Trigger existing `generate-plots.yml` workflow in jheem-backend
   - Select `config_type: full` (31 cities, ~64K plots)
   - Set `max_parallel: 8` for faster completion
   - Monitor progress in Actions dashboard (2-6 hours runtime)
2. Verify all cities visible in map explorer
3. Validate plot variety (outcomes, statistics, facets)

**Deliverable**: Production map explorer with complete pre-rendered dataset

---

### Phase 3: Frontend Integration

**Effort**: 2-3 days
**Prerequisites**: Phase 2a or 2b complete

#### If Native (Phase 2a):
1. **New data hook** (`useCityData.ts`)
   - Fetch from v2 API, cache in memory/localStorage
   - Return typed `CityData` object

2. **Aggregation utilities** (`aggregateData.ts`)
   - Sum across dimensions based on facet selection
   - Handle observation data alignment (varying granularities)

3. **Replace chart rendering**
   - Update `MapPlotOverlay` to use Recharts
   - Confidence interval shading, baseline comparison lines
   - Match existing control behavior

4. **Feature flag** for gradual rollout
   - Toggle between v1 (Plotly) and v2 (native) in settings
   - Monitor for issues before full cutover

#### If Plotly (Phase 2b):
- No frontend changes needed (current implementation works)
- Just verify data loads correctly for all cities

**Deliverable**: Production map explorer with chosen plotting approach

---

### Phase 4: Deploy Custom Simulations 🚧

**Effort**: 2-3 days
**Prerequisites**: Prerun plots working (Phase 3 complete)
**Note**: Custom simulation infrastructure is independent of plotting approach

#### Backend Deployment
1. **Verify Base Simulations Exist** (1-2 hours)
   - Check S3: `s3://jheem-data-production/simulations/ryan-white/base/`
   - Validate format (`.Rdata` files for all cities)
   - Test local loading with `lambda_handler.R`

2. **Deploy Custom Simulation Lambda** (4-6 hours)
   - Add Lambda function to `serverless.yml` in jheem-backend
   - Configure container image as Lambda runtime
   - Set memory: 10GB, timeout: 900s (15 min)
   - Deploy with `serverless deploy --stage prod`
   - Test endpoint with curl

3. **Implement Async Job Pattern** (6-8 hours)
   - POST `/custom-simulation` returns job ID immediately
   - Store job status in DynamoDB
   - Lambda updates status on completion
   - GET `/simulation-status/{jobId}` for polling
   - Store results in S3 when complete

#### Frontend Integration
4. **Build Parameter Input UI** (8-12 hours)
   - Create `CustomSimulationForm` component
   - Three sliders: ADAP, OAHS, Other suppression loss (0-100%)
   - "Run Custom Simulation" button
   - Validation and error handling

5. **Implement Progress Polling** (4-6 hours)
   - `SimulationProgress` component with estimated time
   - Poll status every 5 seconds
   - Handle errors and timeouts
   - Display results when complete

6. **Results Display** (2-4 hours)
   - Reuse chart components (Recharts or Plotly depending on Phase 2 decision)
   - Add comparison with prerun baseline
   - Option to save/share results

**Deliverable**: Complete custom simulation capability, feature parity with legacy Shiny app

---

### Phase 5: Deprecate Legacy Systems 📅 Future

**Prerequisites**: Phases 1-4 complete, validation period (30+ days)

**Tasks**:
1. Run both systems in parallel
2. Collect user feedback
3. Monitor usage patterns (validate prerun vs custom usage assumptions)
4. Migrate any missing features
5. Deprecate v1 API endpoints (if using native approach)
6. Clean up old S3 data (64K Plotly JSONs if not using them)
7. Sunset Shiny apps
8. Celebrate 95% cost savings!

---

### 📁 Native Plotting Investigation Files

| File | Repository | Purpose |
|------|------------|---------|
| `extract_summary_data.R` | jheem-container-minimal | R script for data extraction |
| `native-plotting-architecture.md` | jheem-backend/docs | Full architecture documentation |
| `C.12580_complete.json` | jheem-container-minimal/output | Sample extracted data (15 MB, 1.5 MB gzipped) |
| `2025-12-11_native_plotting_investigation.md` | jheem-portal/.claude-sessions | Detailed session findings & recommendations |

---

## 📋 TECHNICAL DEBT & PRIORITIES (Updated 2025-10-31)

### 🚨 Priority 1: Quick Wins (High Impact, Low Effort)

#### ✅ COMPLETED
- ✅ **Code Duplication** - RESOLVED via `EmbeddedShinyApp` component (pages now 43 lines each)
- ✅ **Embedded Shiny UX** - Landing pages, floating controls, session management complete
- ✅ **Partial React.memo** - 2/4 expensive components optimized
- ✅ **Console Cleanup** - Reduced from 39 to 18 (54% improvement)
- ✅ **Bundle Optimization** - Working well (423 kB largest route)

#### ❌ REMAINING (Estimated 2-4 hours)
1. **URL Encoding Security** - Add `encodeURIComponent` to API calls in `explore/page.tsx`:162,167
2. **React.memo Completion** - Add to `MapboxCityMap.tsx` (442 lines) and `PlotExplorationSidebar.tsx` (431 lines)
3. **Console Statement Wrapping** - Wrap remaining 18 console statements in `process.env.NODE_ENV === 'development'` checks
4. **Mapbox Token Security** - Verify domain restrictions configured in Mapbox dashboard

### ⚡ Priority 2: Testing & API Infrastructure (Medium Priority)

#### ❌ NOT STARTED
1. **Testing Infrastructure** - Zero test coverage (critical gap for scaling)
   - Set up Jest/React Testing Library
   - Add tests for critical user flows
   - Test error boundaries and API error handling

2. **API Service Layer** - Create unified abstraction (fetch calls in 13+ files)
   - Centralize base URL configuration
   - Unified error handling
   - Request/response interceptors
   - Type-safe API client

### 🎨 Priority 3: Polish & Accessibility (Lower Priority)

#### ❌ NOT STARTED
1. **Accessibility Features**
   - ARIA labels for interactive elements
   - Keyboard navigation support
   - Screen reader optimization
   - Focus management

2. **Component Decomposition** (Optional)
   - Components >400 lines could be split (but well-structured currently)
   - `MapboxCityMap.tsx`: 442 lines
   - `PlotExplorationSidebar.tsx`: 431 lines
   - `Navigation.tsx`: 412 lines

### 📊 Priority 4: Observability (Production Monitoring)

#### ❌ NOT STARTED
1. **Error Tracking** - Sentry or similar
2. **Performance Metrics** - Web Vitals monitoring
3. **Analytics** - User behavior tracking
4. **Bundle Analysis** - Automated size monitoring

---

## 🏗️ ARCHITECTURAL DECISIONS & PATTERNS

### Multi-Repository Architecture
- **Frontend/Backend Separation**: Clean API boundaries, independent deployment
- **Container-Based Simulation**: Reproducible R environment, Lambda-compatible
- **Pre-computed vs On-Demand**: Smart cost/performance tradeoff (prerun for most users, custom for power users)
- **Serverless-First Design**: Auto-scaling, pay-per-use, 95% cost reduction

### Security-First Configuration
- Comprehensive CSP headers blocking XSS attacks
- Secure iframe sandboxing with minimal permissions
- Environment variable scoping with `NEXT_PUBLIC_` prefix
- Zero npm vulnerabilities maintained
- Build-time validation (no error suppression)

### Component Architecture Wins
- **Generic Components**: `DemographicView` eliminates code duplication
- **Config-Based Pages**: `EmbeddedShinyApp` reused across multiple pages
- **Error Boundaries**: Granular error handling at component level
- **Type Safety**: Custom type declarations for third-party libraries

### Performance Patterns
- React.memo for expensive components
- useCallback to prevent function recreation
- useMemo for expensive computations
- AbortController for request cleanup
- Suspense boundaries for code splitting

### API Error Handling
- 15-30 second timeouts on all requests
- AbortController for cancellation
- Specific error messages by HTTP status code
- Response validation before processing
- Development-only detailed logging

### Backend Infrastructure (jheem-backend)
- **Composite Key DynamoDB Schema**: Efficient querying with `city_scenario` + `outcome_stat_facet`
- **S3 Lifecycle Management**: Cost optimization for plot storage
- **GitHub Actions Matrix Strategy**: Parallel plot generation across cities
- **Python Lambda + R Container**: Right tool for each job

### Container Optimization (jheem-container-minimal)
- **Multi-Stage Docker Build**: Minimizes image size (~5.2 GB)
- **Pre-built Workspace Pattern**: Fast cold starts (loads `ryan_white_workspace.RData`)
- **renv + RSPM**: Reproducible R dependencies with binary packages
- **VERSION.MANAGER Restoration**: Sophisticated state management for jheem2 package

---

## 🔄 PREVIOUS ACCOMPLISHMENTS (Historical Context)

### Session 2025-08-31 - Security Hardening Complete
1. **Build Configuration Security**
   - Removed TypeScript/ESLint error ignoring from next.config.ts
   - Added comprehensive security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
   - Enabled proper build-time security validation

2. **Dependency Security**
   - Updated Next.js from 15.3.2 → 15.5.2 (fixed 4 moderate/high vulnerabilities)
   - Fixed all ESLint vulnerabilities
   - Removed unused react-simple-maps dependency (~100KB reduction)
   - Achieved zero security vulnerabilities

3. **Iframe Security Hardening**
   - Removed excessive permissions (accelerometer, autoplay, clipboard-write, gyroscope, picture-in-picture)
   - Tightened sandbox attributes (removed allow-popups, allow-top-navigation)
   - Added strict referrer policy for privacy

4. **Type Safety Infrastructure**
   - Created proper TypeScript declarations for Plotly.js
   - Replaced all 'any' types with proper interfaces
   - Achieved zero TypeScript and ESLint errors

5. **Map Explorer Fixes**
   - Fixed CSP blocking API calls (added AWS API Gateway to connect-src)
   - Fixed blank map tiles (added Mapbox and CartoDB domains to CSP)
   - Fixed Web Worker blocking (added worker-src blob: for Mapbox GL JS)
   - Result: Map explorer fully functional

### Ryan White Map Explorer UX Transformation
- Intuitive hover-to-preview, click-to-explore interaction pattern
- Professional scenario selection matching Shiny app language
- Three-dimensional plot exploration (Outcome/Summary/Facet)
- Clean hover tooltips with proper z-index layering
- Contextual instructions and loading states

### Error Boundaries & Production Resilience
- Robust ErrorBoundary component with retry functionality
- Enhanced API error handling with timeouts and specific messages
- Component-level error protection (map, tooltips, scenarios, controls)
- Development debug info (detailed errors in dev mode only)

---

## 📂 KEY FILES & STRUCTURE

### Applications (This Repository)
- `/src/app/explore/page.tsx` - Ryan White Map Explorer (432 lines)
- `/src/app/hiv-age-projections/page.tsx` - HIV Age Projections app (474 lines)
- `/src/app/ryan-white-state-level/page.tsx` - State Level Shiny embed (43 lines)
- `/src/app/cdc-testing/page.tsx` - CDC Testing Shiny embed (43 lines)
- `/src/app/ryan-white/page.tsx` - Legacy Ryan White page

### Core Components
- `/src/components/Navigation.tsx` (412 lines) - Main navigation with dropdowns
- `/src/components/ErrorBoundary.tsx` (118 lines) - Error boundary with retry
- `/src/components/Footer.tsx` - Consistent dark footer across all pages
- `/src/components/EmbeddedShinyApp.tsx` (359 lines) - Reusable Shiny iframe wrapper

### HIV Age Projections Components
- `/src/components/DemographicView.tsx` (330 lines) - **Generic demographic component**
- `/src/components/ByRaceView.tsx` (68 lines) - Race-specific wrapper
- `/src/components/BySexView.tsx` (65 lines) - Sex-specific wrapper
- `/src/components/MultiStateChartGrid.tsx` (304 lines) - Chart grid with export
- `/src/components/AgeDistributionChart.tsx` (305 lines) - Individual charts
- `/src/components/StateSelector.tsx` (177 lines) - Multi-state selector
- `/src/components/TimelineControls.tsx` (149 lines) - Year range controls

### Map Explorer Components (Plotly - Legacy)
- `/src/components/MapboxCityMap.tsx` (442 lines) - Interactive map
- `/src/components/MapPlotOverlay.tsx` (201 lines) - Plot display overlay (Plotly)
- `/src/components/PlotVariationControls.tsx` (300 lines) - 3D plot controls
- `/src/components/ScenarioSelectionPopup.tsx` (165 lines) - Scenario picker
- `/src/components/CityHoverTooltip.tsx` - City preview tooltip
- `/src/hooks/useAvailableCities.ts` (191 lines) - API discovery hook

### Native Plotting Components (Recharts - Current)
- `/src/app/explore/native/page.tsx` - **Native Map Explorer** (817 lines) - Two-mode UX, recommended
- `/src/app/explore/test-native/page.tsx` - Test page for native charts
- `/src/components/NativeSimulationChart.tsx` - Recharts-based chart component
- `/src/components/NativePlotOverlay.tsx` - Plot overlay using native charts
- `/src/components/NativePlotControls.tsx` - Dropdown controls for plot options
- `/src/hooks/useCityData.ts` - Hook to load aggregated city JSON
- `/src/utils/transformPlotData.ts` - Transform raw data to chart format
- `/src/types/native-plotting.ts` - TypeScript types for native plotting
- `/scripts/aggregate-city-data.ts` - Script to merge JSONs into per-city files
- `/public/data/city-summaries.json` - City summary metrics for map hover cards

### Data Files
- `/src/data/cities.ts` - City coordinates and metadata
- `/src/data/hiv-age-projections.ts` - State-level age projection data
- `/src/data/hiv-age-projections-race.ts` - Race-stratified projections
- `/src/data/hiv-age-projections-sex.ts` - Sex-stratified projections

### Configuration
- `next.config.ts` - Security headers, CSP configuration
- `package.json` - Dependencies (Next.js 15.5.2, React 19, Mapbox, Plotly, Recharts)
- `.env.local` - Environment variables (API base URL, Mapbox token)

### Related Repositories
- **jheem-backend**: `/Users/cristina/wiley/Documents/jheem-backend/` - Serverless API infrastructure
- **jheem-container-minimal**: `/Users/cristina/wiley/Documents/jheem-container-minimal/` - R simulation container

---

## 🎯 IMMEDIATE NEXT STEPS (Prioritized)

### Immediate: Validation (Before Scaling)
1. ⏳ **Validate against Shiny app** - Side-by-side comparison
   - CI bands match?
   - Line positions correct?
   - Observations aligned?
   - Edge cases handled?

**Gate**: Must pass before investing in 31-city generation

### High Priority: Production Infrastructure
| Task | Effort | Status |
|------|--------|--------|
| Scenario splitting | 2-3 hrs | ❌ Split 398MB → 3×130MB |
| S3 + CloudFront | 1-2 hrs | ❌ Host with gzip, caching |
| 31-city pipeline | 2-3 hrs | ❌ GitHub Actions or batch |
| Generate dataset | Compute | ❌ All cities, all scenarios |
| Swap routes | 30 min | ❌ V2 → main `/explore` |

**Deliverable**: Production map explorer with all 31 cities

### Medium Priority: Native Explorer Polish
| Task | Effort | Status |
|------|--------|--------|
| Facet pagination | 2-3 hrs | ❌ "Show first 9" for 45-panel views |
| ✅ Scenario descriptions | 30 min | ✅ Done - visible below tabs |
| Mobile responsive | 3-4 hrs | ❌ Collapsible filters |
| City switcher search | 1-2 hrs | ❌ Needed for 31 cities |

### Lower Priority: Cleanup & Custom Sims
- ❌ Remove legacy Plotly `/explore` (once native is promoted)
- ❌ Custom simulations (separate track, 70% infra ready)

---

## 📈 DEPLOYMENT READINESS

### ✅ Production Ready (Frontend)
- Zero security vulnerabilities
- Clean builds (no TS or ESLint errors)
- Comprehensive error handling
- All major features functional
- Security headers configured
- Type safety complete

### 🚧 Partial (Backend Migration)
- Prerun API deployed and working
- Limited dataset (need full generation)
- Custom simulation infrastructure ready but not deployed
- Frontend custom UI not built

### 🟡 Minor Improvements Available
- URL encoding in 2 locations
- React.memo for 2 large components
- Console statement cleanup
- Mapbox token verification

### ❌ Known Gaps (Non-Blocking for Prerun)
- No automated tests
- No error monitoring
- No analytics
- No accessibility features
- Custom simulations not deployed

**Recommendation**:
1. **Immediate**: Generate full prerun dataset and deploy for team use
2. **Short-term**: Complete custom simulation deployment if team requests it
3. **Long-term**: Add testing, monitoring, accessibility

---

## Technical Stack

### Frontend (This Repository)
- **Framework**: Next.js 15.5.2 with TypeScript 5
- **Styling**: Tailwind CSS 4
- **Data Visualization**: Recharts, Plotly.js, react-plotly.js
- **Mapping**: Mapbox GL JS 3.12, react-map-gl 8.0
- **Animation**: Framer Motion 12.17
- **Additional**: html2canvas (PNG export), rc-slider (timeline controls)
- **Embedded Apps**: Shiny apps via secure iframes

### Backend (jheem-backend Repository)
- **Runtime**: Python 3.9 Lambda functions
- **Framework**: Serverless Framework
- **Database**: DynamoDB (composite keys for efficient querying)
- **Storage**: S3 with lifecycle management
- **API**: API Gateway with CORS
- **CI/CD**: GitHub Actions for plot generation
- **Container Registry**: AWS ECR

### Container (jheem-container-minimal Repository)
- **Base**: R 4.4.2 with renv
- **Core Package**: jheem2 from GitHub
- **Dependencies**: Plotly, jheem2, ggplot2, htmlwidgets, jsonlite
- **Build**: Multi-stage Docker (3 stages: base, workspace-builder, runtime)
- **Size**: ~5.2 GB (within Lambda 10GB limit)
- **Orchestration**: Batch mode (GitHub Actions) + Lambda mode (custom sims)
