# Custom Simulation Security Hardening

## Context

Triggered by investigation of an unexplained failed GHA run for location
`D.41473` (ryan-white-msa) on 2026-04-05 18:43:45Z, ~2.5 minutes after a
legitimate user test of `C.12580`. The incident turned out to be a dead
end (Vercel Hobby plan retains only 1 hour of runtime logs), but the
investigation surfaced a much larger issue: the custom simulation attack
surface was never security-reviewed, and an audit revealed a critical
vulnerability class.

## Critical Finding

**GitHub Actions script injection (RCE) in `run-custom-sim.yml`.**

The workflow interpolates user-controlled inputs (`inputs.location`,
`inputs.email`, `inputs.model_id`, `inputs.parameters`) directly into
shell scripts via `${{ ... }}` expansion in 30+ places. GHA template
expansion happens before the shell parses the script — the input
becomes literal shell source, not a quoted argument.

This is the #1 item in GitHub's Actions security hardening guide and is
exploitable via a single HTTP POST to the unauthenticated
`/api/custom-sim` endpoint. The `location` and `email` fields pass
through the portal API with essentially no validation (truthy check
and `typeof === 'string'` respectively).

**Blast radius (bounded but painful):**
- AWS credentials loaded into runner env → S3 write + CloudFront
  invalidation on the production bucket. Cache poisoning of prerun data
  is the worst case.
- Resend API key → send email from `notifications@jheem.org`.
- Default `GITHUB_TOKEN` is read-only (verified via
  `gh api repos/.../actions/permissions/workflow`), so no repo push,
  no release publish, no container push.
- Vercel-side PAT is not in the runner and cannot be exfiltrated via
  this path.

## Other Findings

2. **No rate limiting** on `/api/custom-sim`. Amplifiable cost/quota abuse.
3. **Email field acts as open relay** for phishing via portal-branded HTML
   to any attacker-chosen address.
4. **Client-side auto-trigger** in `CustomSimulationExplorer.tsx` fires
   `runSimulation` on page load if a `loc` query param is present — no
   membership check against the locations list. Combined with Finding 1,
   a link click becomes an RCE vector.
5. **`location` becomes a filesystem/S3 path** in multiple places
   (output dir, aggregation script arg, S3 destination key). Classical
   path traversal risk after the shell injection is closed.

## Fix Plan (priority order)

All fixes below should ship together as a single security hardening pass
before resuming UX work or the Redis progress feature.

### 1. Refactor workflow to use `env:` instead of `${{ inputs.X }}` in shell — CRITICAL ✅ DONE
File: `jheem-backend/.github/workflows/run-custom-sim.yml`
Commit: `33f2a75` (jheem-backend master)

Every `run:` step that references `inputs.X` now has an `env:` block,
and shell bodies reference `$VAR` instead of `${{ inputs.X }}`. Also
added a defense-in-depth integer 0–100 check on parameter values in
the config step (the portal API already validates this, but the
workflow can't trust the caller).

Audit of related workflows:
- `test-custom-sim.yml` — **deleted** in `0f81b1b`. Old development
  workflow no longer needed; removing it eliminates one more
  attack-surface entry point.
- `generate-msa.yml`, `generate-ajph.yml`, `generate-cdc-testing.yml`,
  `generate-croi.yml` — **safe as-is**. These are thin wrappers that
  pass `inputs.X` into the reusable template via `with:` blocks (a
  structured input context, not shell interpolation).
- `_generate-data-template.yml` — has the same pattern (~15 occurrences)
  but is **not** invoked by the portal API. Only callable via direct
  `workflow_dispatch`, which requires a PAT or repo collaborator. Lower
  urgency. **Deferred** as a follow-up commit after the higher-priority
  portal-side fixes ship.

### 2. Whitelist `location` server-side in the API route — HIGH
File: `jheem-portal/src/app/api/custom-sim/route.ts`

Two-layer check:
- Format regex: `/^[A-Z]{2}$|^C\.\d+$/`
- Membership: `config.locations.includes(location)`

Reject with 400 on either failure.

### 3. Validate `email` format in the API route — HIGH
File: `jheem-portal/src/app/api/custom-sim/route.ts`

Standard RFC-ish regex. Reject on failure.

### 4. Client-side location validation in auto-trigger — MEDIUM
File: `jheem-portal/src/components/CustomSimulationExplorer.tsx` (~line 102)

Don't fire `runSimulation` unless `selectedLocation` is in the
`locations` prop.

### 5. Log trigger attempts outside Vercel's 1-hour retention — MEDIUM
Upstash Redis list or Discord webhook from `/api/custom-sim`. Capture
IP, UA, Origin, body. If another suspicious trigger happens, we'll have
forensics instead of another dead-end investigation.

### 6. Rotate the GitHub PAT used by the portal — LOW
Eliminates the "compromised PAT" hypothesis. Cheap, do it anyway.

### 7. Review AWS IAM scope on the credentials — LOW (defense in depth)
Verify the key is scoped to `s3://jheem-data-production/portal/*` +
`cloudfront:CreateInvalidation` on the one distribution. Tighten if
broader. Protects blast radius if Finding 1 ever recurs via new code.

### Deferred (nice-to-have, not this pass)

- Rate limiting on `/api/custom-sim` (Upstash rate limiter, ~5/hour/IP).
- Origin/Referer check on API route (raises bar against trivial curl).

## Investigation: Has Anything Been Damaged?

**Conducted 2026-04-06. Result: no evidence of past compromise.**

- [x] **IAM scope on `jheem-github-actions`** (the user whose keys are
      in GHA secrets): tightly scoped via three policies. Allowed:
      read/write `s3://jheem-data-production/portal/*`, read all of
      `jheem-data-production`, `cloudfront:CreateInvalidation` only on
      distribution `E3VDQ7V9FBIIGD`, ECR push to
      `jheem-ryan-white-model` (stale, unused), and stale perms on
      `jheem-plots-*` / `jheem-test-*` / dynamo tables that don't
      appear to exist. Cannot create/modify IAM, cannot touch other
      buckets or distributions. Blast radius if exploited: cache
      poisoning of `portal/*` content + invalidation cost on one
      distribution. Bounded and recoverable.
- [x] **S3 audit**: 237 total objects in bucket. All non-`portal/`
      objects are legit base simset files from a single 2025-08-04
      bootstrap. Only 4 writes since 2026-04-01, all matching known GHA
      runs. No unexpected files, paths, names, or sizes. D.41473 does
      not appear in S3 — the failed run died at the download step,
      well before any write.
- [x] **CloudFront**: 41 invalidations since 2026-01-01. All timestamps
      correlate with legitimate workflow runs. No volume anomaly.
- [x] **GHA history** (`run-custom-sim.yml`, last 50 runs): all inputs
      are clean — valid locations, integer parameters, no shell
      metacharacters in any display title. D.41473 is the only odd one
      and contained no injection payload.
- [ ] **Resend dashboard**: not checkable via CLI. User to spot-check
      send volume and recipient list at resend.com. Low priority — the
      key has been in use for ~1 week.

**Conclusion:** Proceed with fix plan. No need to rotate AWS keys.
PAT rotation (Finding 6) is still recommended as cheap insurance. ECR
+ stale-prefix cleanup (new task #14) is housekeeping, not urgent.

## Progress Tracking

- [x] **Investigation**: S3 + CloudFront + GHA run history — no damage
- [x] **Finding 7**: Review IAM scope — `jheem-github-actions` already
      tightly scoped (audited in detail above)
- [x] **Finding 1**: Workflow `env:` refactor — `33f2a75`
- [x] **Audit other workflows**: `generate-*` wrappers safe;
      `_generate-data-template.yml` deferred; `test-custom-sim.yml`
      deleted in `0f81b1b`
- [x] **Test run from portal**: ran two sims (`C.32820` and `KY`) on
      2026-04-06; refactored workflow handled them cleanly end-to-end
      (runs 24045578964, 24045550193 — both `success`).
- [x] **Finding 2/5**: Location whitelist (regex + membership) in API route — `19b64c4`
- [x] **Finding 3**: Email format validation in API route — `19b64c4`
- [x] **Finding 4**: Client-side auto-trigger validation — `19b64c4`
- [x] **Deployment confirmed live**: Vercel production deployment
      `4287714786` for `19b64c4` built 2026-04-06 23:26:57Z
- [ ] **Finding 5**: Trigger logging via Upstash Redis — **next up**
- [ ] **Finding 6**: Rotate PAT (user action in GitHub UI)
- [ ] **Follow-up**: Refactor `_generate-data-template.yml` to env: pattern
- [ ] **Housekeeping**: Cleanup stale ECR/plots/dynamo perms from
      `jheem-github-actions` (Task #14)

## Second Incident: D.65153 (2026-04-06)

A second mystery run appeared at 19:00:27Z, ~13 minutes after the
legitimate `C.32820` test run. Same shape as D.41473: invalid `D.NNNNN`
location, default parameters (`a=50&o=30&r=40`), failed at the
"Download base simset" step after ~21 seconds. This time we had Vercel
runtime logs (exported before the 1-hour retention expired) and could
reconstruct the requester's session:

```
19:00:22.247  GET  /                                       Chrome 142 / Win / pdx1
19:00:22.434  GET  /ryan-white/custom?loc=D.65153&a=50&o=30&r=40
19:00:25.701  POST /api/custom-sim                          200, 1855ms
19:00:26-28   ~30 _rsc= prefetches across most routes
```

Real browser executing JavaScript (the prefetch wave only fires after
React hydration), different region from the test session (pdx1 vs iad1),
different UA from the legitimate user (Chrome 142 vs Edge 146). The
attack landed before `19b64c4` was deployed; the same request after
deployment would be blocked by the location whitelist.

## Re-Assessment of Attribution (2026-04-06)

Initial read was "targeted attacker watching the public Actions feed
and probing the auto-trigger vuln." On reflection, that hypothesis is
weaker than it first appeared.

**Arguments against the attacker hypothesis:**
- An attacker who wants to confirm a trigger works only needs *one*
  probe, not two with the same invalid-location pattern.
- Default parameters `a=50&o=30&r=40` are exactly what the page
  serializes when no slider has been touched — a hand-crafted probe
  would more likely omit params or pick distinct values to verify
  passthrough.
- "Knows the URL shorthand" is weak — anyone who used the page sees
  the shorthand in their address bar and can share it.
- Different region/UA can be the same person on a different device or
  network; not independent corroboration.
- Two data points with intervals of ~3 min and ~13 min is not a
  polling-loop signal, it's "happened the same day."
- Source check: no `D.<digits>` string anywhere in `src/` or git
  history. The portal cannot generate this URL itself.

**What the data actually supports:**
*Something automated* is hitting `/ryan-white/custom` with crafted
`?loc=` URLs. The headless-vs-real distinction is less interesting
than the fact that the URL pattern is closed (no internal code path
produces it) and the timing is loosely correlated with legit runs.

**Honest probability table:**

| Hypothesis | Weight |
|---|---|
| Targeted human probing the auto-trigger vuln | ~20% |
| Search engine / archival crawler replaying URLs found somewhere | ~25% |
| Headless browser security scanner (Defender / Zscaler-style URL detonation) | ~20% |
| Stale link in an external doc / paper / deck | ~15% |
| Bug in some external surface (Shiny, supplementary material) | ~10% |
| Coincidence — unrelated automation near legit runs | ~10% |

No single hypothesis dominates. The right move is **observability** —
add logging (Finding 5), watch for ~1 week, and re-evaluate with data
instead of arguing from N=2.

**Crucially: the agnostic-to-attribution hardening is done.** Whoever
this is, the trigger path is now closed by `19b64c4` and the workflow
is shell-injection-safe via `33f2a75`. The remaining question is
forensic, not protective.

## Public vs Private Repo Decision

User made `jheem-portal` private after the second incident as
defense-in-depth. Trade-offs:

- **Public**: unlimited GHA minutes; reproducibility/transparency
  consistent with academic research norms; easier collaborator
  onboarding; aligns with original project mission.
- **Private**: removes the public Actions feed scrape vector; hides
  source code that exposes the trigger surface; counts GHA minutes
  against the account quota (Pro: 3000 min/month free, ~300–600
  custom-sim runs).

**Recommendation:** revert to public *after* Finding 5 logging is
live and has shown ~1 week of clean traffic. With `33f2a75` and
`19b64c4` in place, privacy is obscurity-flavored defense-in-depth
with bounded value, and the openness has real cost (academic
mission, free CI). If logging surfaces ongoing attack attempts that
ride the public Actions feed, revisit.

## Out of Scope for This Pass

- UX refinement (copy-link on email row, URL display) — resume after.
- Redis progress feature — resume after (and now bundled with the
  Finding 5 Upstash Redis work).
- Rate limiting and Origin checks — track as follow-ups.
