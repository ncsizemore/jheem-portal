# Email Notifications & Real-Time Progress for Custom Simulations

**Parent plan:** [Custom Simulations Plan](./CUSTOM-SIMULATIONS-PLAN.md) (items 1-2 in next priorities)
**Status:** Planning
**Date:** March 31, 2026

## Goal

Two related UX improvements for the 10-20 minute custom simulation wait:

1. **Email notifications** — user provides email, gets notified when results are ready. "Fire and forget."
2. **Real-time progress** — simulation completion percentage displayed in the portal during the wait.

These are independent features that complement each other: progress info helps users who stay on the page, email helps users who leave.

---

## Feature 1: Email Notifications

### User Flow

1. User sets parameters and location on the custom sim page
2. Optional "Email me when ready" checkbox + email input appears
3. User submits — simulation triggers as usual
4. User can close the tab / navigate away
5. When the workflow completes, an email is sent with a direct link to the results

### Design Decisions

**Delivery mechanism: AWS SES**

Options considered:
- **AWS SES** — already have AWS infra (S3, CloudFront, IAM). Free tier: 62,000 emails/month from EC2/Lambda, $0.10/1000 otherwise. Sending from a verified domain gives good deliverability.
- **GitHub Actions email** — GHA doesn't have native email. Would need a marketplace action or `sendmail`. Fragile and hard to template.
- **Third-party (SendGrid, Resend, Postmark)** — unnecessary new dependency when AWS is already in the stack.
- **Webhook to portal API** — GHA calls a portal endpoint on completion, portal sends email. Adds a round-trip and requires the portal to have email-sending capability anyway.

**SES is the clear choice.** We already have IAM credentials on the portal (for S3). SES just needs domain verification and an IAM policy addition.

**Where the email is sent from: GitHub Actions workflow**

Two options:
1. **Workflow sends email directly** — at the end of `run-custom-sim.yml`, an `aws ses send-email` step fires if an email input was provided. Simple, no extra infrastructure.
2. **Portal sends email** — workflow completes → portal's status poll detects completion → portal sends email. Adds complexity (portal needs SES credentials, email state tracking).

Option 1 is simpler. The workflow already has AWS credentials (for S3 upload). Adding a `send-email` step is ~10 lines of YAML. The email address is passed as a workflow input alongside the other parameters.

**Email content:**
- Subject: "Your JHEEM simulation is ready"
- Body: Brief summary of parameters, direct link to results page (with query params so it auto-loads)
- Plain text + simple HTML (no heavy templating needed for a research tool)
- From: `notifications@jheem.org` or similar (requires SES domain verification)

### Implementation

**Portal changes:**
- Add optional `email` field to custom sim form UI (checkbox + input)
- Pass `email` through to `/api/custom-sim` POST body
- API route passes `email` as a workflow input in the `workflow_dispatch`

**Backend changes (jheem-backend):**
- Add `email` as optional input to `run-custom-sim.yml`
- Add SES send step at end of workflow (conditional on email being provided)
- Add IAM policy for `ses:SendEmail` to the workflow's AWS role
- Verify sending domain in SES (one-time setup)

**Files to modify:**

| File | Repo | Change |
|------|------|--------|
| `src/components/CustomSimulationExplorer.tsx` | jheem-portal | Email checkbox + input UI |
| `src/hooks/useCustomSimulation.ts` | jheem-portal | Pass email to trigger |
| `src/app/api/custom-sim/route.ts` | jheem-portal | Forward email to workflow dispatch |
| `.github/workflows/run-custom-sim.yml` | jheem-backend | Accept email input, SES send step |

**SES setup (one-time):**
- Verify domain (jheem.org or similar) in SES console
- Move SES out of sandbox mode (requires AWS support request — or verify individual recipient emails for testing)
- Add `ses:SendEmail` permission to existing IAM role

**SES sandbox consideration:** New SES accounts start in sandbox mode (can only send to verified emails). Moving to production requires an AWS support request with use case justification. For initial development/testing, we can verify team member emails individually. The support request is straightforward for a transactional notification use case.

### Open Questions

1. **Sending domain:** `jheem.org`? `noreply@jheem.org`? Need to confirm domain ownership for SES verification.
2. **SES region:** Should match other AWS resources for simplicity. Which region is the S3 bucket in?
3. **Email validation:** Basic format check on the client is sufficient. No need for verification flow — this is a notification, not an account system.

---

## Feature 2: Real-Time Simulation Progress (Upstash Redis)

### The Problem

The GitHub Actions REST API returns 404 for logs of in-progress jobs (confirmed — GitHub community discussion #154834). The portal currently shows a 3-phase progress bar (Preparing / Running / Finishing) based on the workflow's job/step status, but can't show simulation completion percentage during the ~10-20 minute simulation step.

### Solution: Upstash Redis

**Why Upstash:**
- REST API — accessible from both GitHub Actions (`curl`) and Vercel/Next.js (`fetch()`)
- Free tier: 10,000 commands/day, 256MB storage — more than enough
- No server to manage, no connection pooling issues (REST, not TCP)
- Short TTL support — progress data auto-expires, no cleanup needed

**How it works:**

```
R container → stdout (progress lines)
  ↓
Wrapper script in GHA → tails stdout, PUTs to Redis
  ↓
Portal status API → reads from Redis → returns to client
  ↓
Progress bar → shows simulation %
```

1. **R container** already writes progress to stdout during simulation (jheem2 prints sim-by-sim progress)
2. **Wrapper script** in the GHA workflow tails the container's stdout, parses progress lines, and PUTs to Upstash Redis with a key like `progress:{runId}` and a TTL of 30 minutes
3. **Portal status API** (`/api/custom-sim/status`) reads from Redis alongside the existing GitHub API check. If Redis has progress data, it includes the percentage in the response
4. **Client hook** (`useCustomSimulation`) renders the percentage in the progress bar during the "Running" phase

### Implementation

**Upstash setup (one-time):**
- Create free Upstash Redis database
- Get REST URL and token
- Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as secrets in:
  - Vercel (for portal status API)
  - GitHub repo (for workflow write access)

**Redis key design:**
```
Key:     progress:{model_id}:{location}:{scenario_key}
Value:   { "percent": 45, "simsComplete": 450, "simsTotal": 1000, "updatedAt": "..." }
TTL:     1800 seconds (30 minutes)
```

Using model/location/scenario as the key (not runId) means the portal can check progress without knowing the run ID upfront. This aligns with how the portal already identifies simulations.

**Wrapper script approach:**

The GHA workflow runs the R container via `docker run`. To capture progress:

```yaml
- name: Run simulation
  run: |
    docker run ... 2>&1 | while IFS= read -r line; do
      echo "$line"
      if [[ "$line" =~ Running\ simulation\ ([0-9]+)\ of\ ([0-9]+) ]]; then
        current="${BASH_REMATCH[1]}"
        total="${BASH_REMATCH[2]}"
        percent=$((current * 100 / total))
        curl -s -X PUT "$UPSTASH_URL/set/progress:$KEY/$percent/EX/1800" \
          -H "Authorization: Bearer $UPSTASH_TOKEN"
      fi
    done
```

The exact regex depends on jheem2's stdout format. Need to verify what progress lines look like.

**Portal changes:**

```typescript
// In /api/custom-sim/status/route.ts
// After existing GitHub API check, before returning:
if (phase === 'simulating') {
  const progressRes = await fetch(
    `${UPSTASH_URL}/get/progress:${modelId}:${location}:${scenarioKey}`,
    { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } }
  );
  if (progressRes.ok) {
    const { result } = await progressRes.json();
    if (result) response.progress = JSON.parse(result);
  }
}
```

**Files to modify:**

| File | Repo | Change |
|------|------|--------|
| `src/app/api/custom-sim/status/route.ts` | jheem-portal | Read progress from Redis |
| `src/hooks/useCustomSimulation.ts` | jheem-portal | Surface progress percentage |
| `src/components/SimulationProgress.tsx` | jheem-portal | Render percentage in progress bar |
| `.github/workflows/run-custom-sim.yml` | jheem-backend | Wrapper script for stdout parsing + Redis writes |

### Open Questions

1. **R container stdout format:** What does jheem2 print during simulation? Need to verify the exact pattern to parse. If it doesn't print per-sim progress, we'd need to add that to the R code.
2. **Upstash rate limits:** Free tier is 10,000 commands/day. A 1000-sim run writing every sim = 1000 PUTs + portal polling at 8s intervals ≈ 150 GETs per run. At ~5 runs/day that's ~5,750 commands. Comfortable, but should batch PUTs (write every 10th sim, not every sim).
3. **Redis value format:** Simple integer (percent) vs structured JSON (percent + sims complete + total). JSON is marginally more useful for the UI but either works.

---

## Implementation Order

### Step 1: Email notifications

Simpler, no new service dependencies beyond SES domain verification. Can be fully tested with verified individual emails before moving SES out of sandbox.

1. SES domain verification + IAM policy (one-time AWS setup)
2. Add email input to portal UI
3. Pass email through API → workflow dispatch
4. Add SES send step to workflow
5. Test end-to-end with verified email

### Step 2: Redis progress

Requires Upstash account setup and verifying R container stdout format.

1. Create Upstash Redis database, configure secrets
2. Verify jheem2 stdout progress format (run a sim locally, capture output)
3. Add wrapper script to workflow
4. Update portal status API to read from Redis
5. Update progress bar component to show percentage
6. Test end-to-end

### Step 3: Polish

- Progress percentage smoothing (don't jump backwards, handle stale data)
- Email error handling (SES failures shouldn't fail the workflow)
- UI polish (email input validation, progress animation)

---

## Cost

| Service | Free Tier | Expected Usage | Cost |
|---------|-----------|---------------|------|
| AWS SES | 62,000 emails/month (from EC2) | <100/month | $0 |
| Upstash Redis | 10,000 commands/day, 256MB | ~5,000 commands/day max | $0 |

Both features operate entirely within free tiers at research-tool scale.
