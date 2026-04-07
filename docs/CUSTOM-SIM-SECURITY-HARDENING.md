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
- [x] **Finding 5**: Trigger logging via Upstash Redis — `813cea9`
      (`src/lib/trigger-log.ts`, wired into both `/api/custom-sim`
      routes; LPUSH + LTRIM to bounded list, fire-and-forget, header
      allowlist; inspection via Upstash dashboard Data Browser)
- [x] **Finding 6**: PAT rotated as a side effect of the private-repo
      migration — the pre-existing token lacked `contents:read`, so a
      new fine-grained PAT with the right scope was minted and
      replaces it in Vercel env vars.
- [x] **Private-repo side effects** surfaced and fixed:
      - `sync-config.ts` switched to authenticated GitHub Contents API
        with unauthenticated-raw fallback for local dev (`2a3d465`).
      - `run-custom-sim.yml` passes `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
        to the `Install portal dependencies` step so the postinstall
        can fetch models.json from the private repo (`354deac`).
- [x] **End-to-end validation**: full portal → API → workflow → S3 →
      CloudFront path exercised successfully with the private backend
      repo, Upstash logging active, and all validation in place.
      Confirmed no mystery follow-up within the test window.
- [ ] **Follow-up**: Refactor `_generate-data-template.yml` to env: pattern
- [ ] **Housekeeping**: Cleanup stale ECR/plots/dynamo perms from
      `jheem-github-actions` (Task #14)
- [ ] **Observability window**: watch Upstash logs for ~1 week, then
      revisit the public/private decision for both repos.

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
- Rate limiting and Origin checks — track as follow-ups (see backlog).

## Parked Hardening Backlog

These were discussed at the end of the security pass and deliberately
deferred. Recorded here so we don't lose them. Rough order of
value-per-effort, not strict priority.

1. **Rate limiting on `/api/custom-sim`** — ~30 lines with
   `@upstash/ratelimit` (Upstash already provisioned for Finding 5).
   Sliding window, ~5 triggers/hour/IP. Single highest-value item
   remaining. Does not prevent determined distributed abuse, but
   caps damage from any single source.

2. **Content-Type enforcement + request body size cap** — reject
   anything that isn't `application/json`, reject bodies > 2KB. ~10
   lines. Makes fuzzers / malformed clients fail fast with 415/413
   before any code runs.

3. **Origin allowlist as defense-in-depth** — reject POSTs whose
   `Origin` isn't `https://jheem.org` (plus localhost for dev). ~5
   lines. **Explicitly acknowledge in a comment** that this only
   stops casual abuse, not determined attackers (the header is
   client-controlled). Its real value is cleaning up noise in the
   Upstash logs.

4. **Cloudflare Turnstile on the trigger button** — ~1–2 hours.
   The one control in this list that *actually* stops automated
   abuse, because the challenge is issued by Cloudflare's network
   and can't be spoofed from curl. Cost: small UX hiccup for legit
   users, Cloudflare sees telemetry. Pick this up if Upstash logs
   during the observability week show bot traffic that survives
   rate limiting.

5. **Response security headers** — CSP, X-Frame-Options: DENY,
   X-Content-Type-Options: nosniff, Strict-Transport-Security. ~15
   lines in Next.js middleware or `next.config.ts` headers. Baseline
   web hygiene — protects the frontend, not the API, but worth
   setting explicitly.

6. **Dependency + secret scanning baseline** — Dependabot or
   Renovate for npm/R/workflow updates; GitHub native secret
   scanning (free on public repos, available on private with
   Advanced Security). Zero code, just enable in repo settings.

7. **Alerting on rejection patterns** — follow-on to Finding 5.
   Discord webhook (or Slack) triggered when N rejected requests
   land in a short window. Turns passive Upstash logs into active
   alerts. ~1 hour.

8. **Refactor `_generate-data-template.yml` to `env:` pattern** —
   Same shape as `33f2a75` but for the prerun pipeline. Lower
   urgency because it requires a PAT to invoke (not unauthenticated
   like custom-sim was). Mentioned here to keep all hardening items
   in one place.

**Explicitly NOT recommended for this project:**

- Custom auth / bearer tokens / API keys — any shared secret in the
  browser bundle is not a secret. Real "UI-only" restriction requires
  user accounts, which is a product decision not a security control.
- Web Application Firewall — overkill for this traffic profile.
- IP geoblocking — breaks legit international users, gains marginal.
- Origin/Referer checks presented as "security" rather than as
  defense-in-depth against casual abuse — this misrepresents what
  they do and creates false confidence.

## Broader Security Assessment

Written at the end of the security pass as an honest "what else
could bite us" inventory. Organized by rough level of concern, not
alphabetically. These are observations from reading the repos, not
exhaustive audit findings — some may turn out to be non-issues on
deeper inspection.

### Things I'd actually worry about

**1. User-submitted emails are in GHA `workflow_dispatch` input
metadata.** When the portal triggers the workflow, `inputs.email` is
visible in the run's "Run workflow" UI and in the job logs' "Set up
job" step. Anyone with read access to `jheem-backend` can see every
email address that has ever been submitted. Right now that's just you
(the repo is private). If the repo ever goes public again, past
emails become public. This is a legitimate privacy concern worth
addressing before re-publicizing.
*Possible mitigations:* redact email from `run-name:`; consider
hashing emails at the portal API before forwarding to the workflow
(store real address only in the Upstash trigger log and in Resend,
not in GHA); or commit to never re-publicizing `jheem-backend`.

**2. Secret scanning on git history has never been done.** We
confirmed `.env*` is in `.gitignore` and `git ls-files` shows no
current committed secrets, but we haven't audited history. If any
AWS key, Resend key, PAT, or Upstash token was *ever* committed and
later removed, it's still in the git history forever. Running
`gitleaks detect` or `trufflehog git` across both repos' full
history is a one-command audit that costs nothing.

**3. Branch protection status is unknown.** If `master` / `main` in
`jheem-backend` and `jheem-portal` don't have branch protection
(required reviews, required status checks, no force-push), a
compromised token or account could push directly to main and reach
production without review. Particularly concerning for
`jheem-portal/scripts/` (aggregation code that runs with AWS
credentials during the workflow) — any modification there is
effectively "add code that will execute with S3 write access." This
is cheap to check and cheap to fix.

**4. The aggregation scripts in `jheem-portal/scripts/` run in the
workflow with AWS credentials in scope.** This is working as
intended, but it means the code review bar for any PR touching
`scripts/` should be higher than for frontend changes. A seemingly
innocent modification to a data-processing script is an exfiltration
path. Worth knowing explicitly rather than discovering it the hard
way.

### Things to keep an eye on

**5. Container supply chain.** The `jheem-*-container` repos build
R containers and push to `ghcr.io`. Those repos haven't received the
same security review as `jheem-backend`. If a container repo or its
build workflow is compromised, a malicious image gets pushed and our
`run-custom-sim.yml` runs it. The blast radius is the same as a
workflow RCE (AWS creds, Resend key). Mitigations: pin the image to
a specific SHA digest instead of a tag, enable branch protection on
the container repos, review their workflows for the same
`${{ inputs }}` interpolation patterns we just fixed.

**6. Third-party GitHub Actions pinning.** Actions like
`actions/checkout@v4` are referenced by tag, which means they update
automatically. A compromise of one of those actions (has happened)
would affect our workflows. Best practice is SHA-pinning. Lower
urgency but worth knowing.

**7. `jheem-simulations` release publication path.** Releases are
fine to consume publicly (they serve the base simsets), but who and
what can *publish* releases is the question. If the publication
workflow is compromised, base simsets could be poisoned and all
future custom-sims would start from tampered data. Probably
well-controlled, but worth verifying.

**8. CloudFront / S3 CORS and bucket policy.** Using
`Managed-SimpleCORS`, which is a sensible default for a public data
CDN. Should confirm the S3 bucket policy restricts writes to
`jheem-github-actions` only, and that there are no leftover
public-write prefixes from earlier iterations.

### Likely non-issues but worth noting

**9. Vercel environment access.** Only the account owner can read
env vars. Confirmed via `vercel env ls`. Add any future
collaborators with care.

**10. DNS / TLS.** Vercel handles TLS; `jheem.org` DNS is presumably
on a reputable registrar. Worth enabling DNSSEC + registrar lock if
not already.

**11. Upstash Redis access.** Token is in Vercel env only, never
committed. Low risk unless Vercel itself is compromised.

### Meta-concern: backup / restore

Not a security vuln per se, but: **there is no documented
backup/restore plan** for the CloudFront-served data. If a future
vulnerability ever did result in malicious writes to
`s3://jheem-data-production/portal/*`, or if someone fat-fingers a
bucket operation, the recovery story is "re-run all the generation
workflows and regenerate everything." That probably works but has
never been tested end-to-end. Worth knowing that the recovery path
exists and is at least conceptually verified.

### Summary

The custom-sim trigger path is well-hardened after this week's work.
The items above are either privacy/operational concerns that the
hardening pass didn't cover (1, 4), baseline hygiene we haven't done
yet (2, 3, 5, 6), or things that would need their own review session
to address properly (7, 8). None are on fire right now. #1 and #2
are the two I'd prioritize if you want to do *one more* security
session before fully moving on — they're both cheap and they both
close real gaps.
