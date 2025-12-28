# Session: GitHub Actions Workflow & S3/CloudFront Architecture

**Date**: 2025-12-26
**Status**: Workflow created and tested, CloudFront setup pending
**Previous Session**: `2025-12-20_multi_facet_fix_validated.md`

---

## Session Accomplishments

### 1. Route Consolidation
- Deleted old `/explore/native` page
- Moved `/explore/v2` to `/explore/native`
- V2 is now the canonical native explorer at `/explore/native`

### 2. GitHub Actions Workflow Created

**File**: `jheem-backend/.github/workflows/generate-native-data.yml`

**Features**:
- Configurable city set (test: 3 cities, full: 31 cities)
- Optional `individual.simulation` statistic (excluded by default for size)
- Parallel processing with configurable `max_parallel`
- Three-phase architecture: Prepare → Generate (matrix) → Aggregate
- Tolerates expected errors (some outcome/facet combos are invalid)

**Test Run Results** (3 cities):
- Baltimore, Atlanta, Chicago generated successfully
- 954 files per city (1344 attempted, 390 expected failures)
- ~40 minutes per city
- Aggregated artifact: 52.9MB compressed

### 3. Frontend Updated for 3 Cities
- Added Atlanta (C.12060) and Chicago (C.16980) to `AVAILABLE_CITIES`
- Tested successfully in dev - all 3 cities working with hover cards

### 4. GitHub Artifacts Limitation Discovered

**Problem**: Free tier has 500MB artifact storage limit
- 31 cities × ~15MB raw artifacts = ~465MB
- Plus aggregated artifact ~550MB = exceeds limit
- Workflow will fail on full 31-city run

**Decision**: Move to S3 + CloudFront instead of artifacts

---

## Architecture Decisions

### S3 + CloudFront for Static Data Serving

**Why CloudFront + S3 (not API Gateway or direct S3):**

| Concern | CloudFront + S3 |
|---------|-----------------|
| Large files (400MB) | ✅ No limits (Lambda has 6MB limit) |
| Gzip compression | ✅ Automatic - 400MB → 18MB on wire |
| Global performance | ✅ CDN edge locations worldwide |
| Caching | ✅ Reduces S3 costs, faster loads |
| CORS | ✅ CloudFront handles it |
| Cost | ✅ Free tier: 100GB transfer, 1M requests |
| Overage protection | ✅ No surprise bills (throttle, not charge) |

**CloudFront Free Tier (November 2025 flat-rate plan):**
- $0/month
- 1M requests/month
- 100GB data transfer/month
- **No overage charges** - reduced performance only if exceeded
- Email alerts at 50%, 80%, 100% usage

### One Distribution for All Apps

**Rationale**: Free tier allows 3 distributions. Using one for all portal data leaves 2 for future needs.

**URL Pattern**:
```
https://<cloudfront-id>.cloudfront.net/portal/ryan-white/C.12580.json
https://<cloudfront-id>.cloudfront.net/portal/cdc-testing/C.12580.json
https://<cloudfront-id>.cloudfront.net/portal/state-level/GA.json
```

### S3 Folder Structure (Multi-Model Ready)

```
jheem-data-production/
├── simulations/                    # Existing - source data
│   ├── ryan-white/
│   │   ├── base/                   # Base .Rdata files
│   │   └── prerun/                 # Prerun .Rdata files
│   ├── cdc-testing/                # Future
│   └── state-level/                # Future
└── portal/                         # NEW - frontend data
    ├── ryan-white/
    │   ├── C.12060.json
    │   ├── C.12580.json
    │   ├── C.16980.json
    │   ├── ... (31 cities)
    │   └── city-summaries.json
    ├── cdc-testing/                # Future
    └── state-level/                # Future
```

---

## Implementation Plan: CloudFront Setup

### Phase 1: Create CloudFront Distribution (~15 min)

1. **Create distribution** via AWS CLI:
   ```bash
   aws cloudfront create-distribution \
     --origin-domain-name jheem-data-production.s3.amazonaws.com \
     --default-root-object index.html
   ```
   (Actual command will be more detailed with cache behaviors)

2. **Configure behaviors**:
   - Enable gzip/brotli compression
   - Set cache TTL (24hr for city data, 1hr for summaries)
   - Add CORS headers

3. **Note the distribution domain**: `d1234abcd.cloudfront.net`

### Phase 2: Update Workflow (~10 min)

Modify `generate-native-data.yml`:
- Remove artifact upload steps
- Add S3 upload step with gzip Content-Encoding
- Upload to `s3://jheem-data-production/portal/ryan-white/`

```yaml
- name: Upload to S3
  run: |
    # Upload aggregated city files
    for file in public/data/C.*.json; do
      gzip -c "$file" > "${file}.gz"
      aws s3 cp "${file}.gz" \
        "s3://jheem-data-production/portal/ryan-white/$(basename $file)" \
        --content-type "application/json" \
        --content-encoding "gzip"
    done

    # Upload city summaries
    aws s3 cp public/data/city-summaries.json \
      s3://jheem-data-production/portal/ryan-white/city-summaries.json
```

### Phase 3: Update Frontend (~10 min)

1. Add CloudFront URL to environment:
   ```
   NEXT_PUBLIC_DATA_URL=https://d1234abcd.cloudfront.net/portal/ryan-white
   ```

2. Update `useCityData.ts` to fetch from CloudFront:
   ```typescript
   const DATA_URL = process.env.NEXT_PUBLIC_DATA_URL || '/data';
   const response = await fetch(`${DATA_URL}/${cityCode}.json`);
   ```

3. Update city summaries fetch similarly

### Phase 4: Re-run 31-City Workflow

With S3 upload instead of artifacts:
- `cities`: full
- `max_parallel`: 20
- Expected runtime: ~2 hours

### Phase 5: Update AVAILABLE_CITIES

After successful generation, update `/explore/native/page.tsx` with all 31 cities.

---

## Files Modified This Session

| Repository | File | Change |
|------------|------|--------|
| jheem-portal | `src/app/explore/native/page.tsx` | Replaced with V2, added Atlanta/Chicago |
| jheem-portal | `CLAUDE.md` | Updated routes and status |
| jheem-backend | `.github/workflows/generate-native-data.yml` | Created new workflow |

---

## Commits This Session

```
jheem-portal:
- c8b5849 refactor: consolidate V2 explorer into /explore/native
- ae2684a feat(explore-native): add Atlanta and Chicago to available cities

jheem-backend:
- f343712 feat: add workflow for native plot data generation
- b53f7f3 fix: tolerate expected errors in native data generation
```

---

## Next Session Checklist

1. [ ] Create CloudFront distribution
2. [ ] Update workflow to upload to S3 (remove artifacts)
3. [ ] Update frontend to fetch from CloudFront
4. [ ] Run full 31-city workflow
5. [ ] Update AVAILABLE_CITIES with all 31 cities
6. [ ] Test complete map explorer
7. [ ] Update CLAUDE.md with final architecture

---

## Long-Term Roadmap Context

This infrastructure will support multiple models:

| App | Current Status | Native Explorer Status |
|-----|----------------|----------------------|
| Ryan White | ✅ Shiny live | 🚧 Native in progress |
| CDC Testing | ✅ Shiny live | ⏳ Next after RW |
| State Level | ✅ Shiny live | ⏳ After CDC |
| EHE | Shiny (not in portal) | ⏳ Future consideration |

The folder structure and CloudFront distribution are designed to scale to all models with minimal additional setup.

---

## Commands Reference

**Run workflow (GitHub Actions UI)**:
1. Go to: https://github.com/ncsizemore/jheem-backend/actions
2. Select "Generate Native Plot Data"
3. Choose: `cities: full`, `max_parallel: 20`

**Manual local generation** (if needed):
```bash
docker run --rm \
  -v /path/to/simulations:/app/simulations:ro \
  -v /path/to/output:/output \
  849611540600.dkr.ecr.us-east-1.amazonaws.com/jheem-ryan-white-model:latest \
  batch --city C.12580 \
  --scenarios cessation,brief_interruption,prolonged_interruption \
  --outcomes incidence,diagnosed.prevalence,suppression,testing,prep.uptake,awareness,rw.clients,adap.clients,non.adap.clients,oahs.clients,adap.proportion,oahs.suppression,adap.suppression,new \
  --statistics mean.and.interval,median.and.interval \
  --facets "none,age,race,sex,risk,age+race,age+sex,age+risk,race+sex,race+risk,sex+risk,age+race+sex,age+race+risk,age+sex+risk,race+sex+risk,age+race+sex+risk" \
  --output-dir /output --output-mode data
```

**Aggregate city data**:
```bash
npx tsx scripts/aggregate-city-data.ts /path/to/raw/C.12580 public/data/C.12580.json
```
