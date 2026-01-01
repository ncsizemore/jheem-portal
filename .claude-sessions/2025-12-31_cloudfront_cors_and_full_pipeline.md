# Session: CloudFront CORS Fix & Full Pipeline Validation

**Date**: 2025-12-31
**Status**: CloudFront working, ready for full 31-city generation
**Previous Session**: `2025-12-26_workflow_and_s3_architecture.md`

---

## Session Accomplishments

### 1. CloudFront Distribution Created (Free Tier)

Created new distribution via AWS Console with free tier plan:
- **Distribution ID**: `E3VDQ7V9FBIIGD`
- **Domain**: `d320iym4dtm9lj.cloudfront.net`
- **Origin**: `jheem-data-production.s3.us-east-1.amazonaws.com`
- **Origin Path**: `/portal`
- **Plan**: Free ($0/month, no overage charges)

**Free Tier Benefits**:
- 1M requests/month
- 100GB data transfer/month
- No overage charges (reduced performance only if exceeded)
- WAF included

### 2. CORS Configuration Fixed

**Initial Problem**: CloudFront cached responses without CORS headers, blocking browser requests.

**Root Cause**: CloudFront's default settings don't forward the `Origin` header to S3. Without it, S3 doesn't add CORS headers, and CloudFront caches the non-CORS response.

**Solution Applied**:
1. **S3 CORS Policy** - Added allowed origins:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `http://192.168.1.62:3000`
   - `https://jheem-portal.vercel.app`
   - `https://jheem.org`

2. **CloudFront Origin Request Policy** - Applied `CORS-S3Origin` managed policy:
   - Forwards `Origin`, `Access-Control-Request-Headers`, `Access-Control-Request-Method` to S3
   - Includes `Origin` in cache key (CORS/non-CORS cached separately)

3. **Cache Invalidation** - Cleared cached non-CORS responses

### 3. IAM Policy Updated

Added write permissions for GitHub Actions to upload to `portal/*`:
```json
{
    "Sid": "WritePortalData",
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:DeleteObject"],
    "Resource": ["arn:aws:s3:::jheem-data-production/portal/*"]
}
```

### 4. Workflow Updated

Modified `generate-native-data.yml` to upload to S3 instead of artifacts:
- Gzips files before upload
- Sets `Content-Encoding: gzip` and `Content-Type: application/json`
- Files available at `https://d320iym4dtm9lj.cloudfront.net/ryan-white/C.XXXXX.json`

### 5. Frontend Updated

- **CSP**: Added CloudFront domain to `connect-src`
- **useCityData.ts**: Fetches from CloudFront URL
- **page.tsx**: City summaries fetch from CloudFront

### 6. Test Run Successful

Ran workflow with 3 cities (test mode):
- Atlanta, Baltimore, Chicago generated and uploaded
- All files accessible via CloudFront with correct CORS headers
- Frontend loads data successfully

---

## Architecture Summary

```
Browser (jheem-portal.vercel.app or localhost)
    ↓ fetch with Origin header
CloudFront (d320iym4dtm9lj.cloudfront.net)
    ↓ forwards Origin via CORS-S3Origin policy
S3 (jheem-data-production/portal/ryan-white/)
    ↓ returns data with CORS headers
CloudFront (caches per-Origin)
    ↓ gzip-compressed JSON
Browser (renders charts)
```

---

## AWS Resources Created/Modified

| Resource | ID/Name | Purpose |
|----------|---------|---------|
| CloudFront Distribution | E3VDQ7V9FBIIGD | CDN for portal data |
| S3 CORS Config | jheem-data-production | Allow cross-origin requests |
| IAM Policy (updated) | JheemDataAccessPolicy | Added portal/* write |
| Origin Request Policy | CORS-S3Origin (managed) | Forward CORS headers |

---

## Files Modified This Session

| Repository | File | Change |
|------------|------|--------|
| jheem-portal | `next.config.ts` | Added CloudFront to CSP connect-src |
| jheem-portal | `src/hooks/useCityData.ts` | Fetch from CloudFront URL |
| jheem-portal | `src/app/explore/native/page.tsx` | City summaries from CloudFront |
| jheem-backend | `.github/workflows/generate-native-data.yml` | S3 upload instead of artifacts |

---

## Next Steps

1. [x] Test 3-city workflow with S3 upload
2. [ ] Run full 31-city workflow
3. [ ] Update AVAILABLE_CITIES with all 31 cities
4. [ ] Deploy to production (Vercel)
5. [ ] Verify on live domains

---

## Commands Reference

**Run full 31-city workflow**:
1. Go to: https://github.com/ncsizemore/jheem-backend/actions
2. Select "Generate Native Plot Data"
3. Settings:
   - cities: `full`
   - include_individual_simulation: `false`
   - max_parallel: `20`

**Test CloudFront CORS**:
```bash
curl -sI -H "Origin: https://jheem.org" \
  "https://d320iym4dtm9lj.cloudfront.net/ryan-white/city-summaries.json" \
  | grep -i access-control
```

**Invalidate CloudFront cache**:
```bash
aws cloudfront create-invalidation \
  --distribution-id E3VDQ7V9FBIIGD \
  --paths "/*"
```

---

## Key Learnings

1. **CloudFront + S3 CORS requires two things**:
   - S3 CORS configuration (allowed origins)
   - CloudFront origin request policy to forward Origin header

2. **Free tier limitations**:
   - Can't use legacy `ForwardedValues` settings
   - Must use managed cache/origin request policies
   - WAF is required and included

3. **Cache invalidation is cheap**:
   - First 1,000 paths/month are free
   - Necessary after CORS config changes
