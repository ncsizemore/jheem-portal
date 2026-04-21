# Email Notifications & Real-Time Progress for Custom Simulations

**Parent plan:** [Custom Simulations Plan](./CUSTOM-SIMULATIONS-PLAN.md) (item 6 in Path Forward)
**Status:** Feature 1 (email) COMPLETE. Feature 2 (progress) ready to start.
**Date:** March 31, 2026 (updated April 21, 2026)

## Goal

Two related UX improvements for the 10-20 minute custom simulation wait:

1. **Email notifications** — user provides email, gets notified when results are ready. "Fire and forget."
2. **Real-time progress** — simulation completion percentage displayed in the portal during the wait.

These are independent features that complement each other: progress info helps users who stay on the page, email helps users who leave.

---

## Feature 1: Email Notifications — COMPLETE

**Completed:** April 17, 2026. Verified end-to-end.

### Architecture (differs from original plan)

The original plan used Gmail SMTP with email passed as a `workflow_dispatch` input. This was replaced during a security hardening pass (April 2026) because workflow inputs are visible in the GHA run UI to anyone with repo read access — a privacy concern that blocked re-publicizing `jheem-backend`.

**Implemented design:** Email never transits the workflow.

1. Portal `/api/custom-sim` validates email, stashes `{email, returnUrl}` in **Upstash Redis** (keyed by `notify:{modelId}:{location}:{scenarioKey}`, 24h TTL)
2. Workflow runs without any email input
3. On success, workflow POSTs to `/api/custom-sim/notify` (Bearer-auth'd via `NOTIFY_SECRET`)
4. Notify endpoint drains the Redis list and sends via **Resend** (`notifications@jheem.org`)

**Key files:**
| File | Repo | Purpose |
|------|------|---------|
| `src/lib/notify.ts` | jheem-portal | Stash/drain helpers, Resend sender, URL builder |
| `src/app/api/custom-sim/notify/route.ts` | jheem-portal | Bearer-auth'd endpoint called by workflow |
| `src/app/api/custom-sim/route.ts` | jheem-portal | Stashes email in Upstash instead of passing to workflow |
| `.github/workflows/run-custom-sim.yml` | jheem-backend | "Notify completion" step (curl to portal) |

**Env vars required:**
| Var | Location | Purpose |
|-----|----------|---------|
| `RESEND_API_KEY` | Vercel | Sending email via Resend API |
| `NOTIFY_SECRET` | Vercel + GitHub secrets | Shared secret for notify endpoint auth |
| `UPSTASH_REDIS_REST_URL` | Vercel | Redis connection (also used by trigger logging) |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel | Redis auth |

---

## Feature 2: Real-Time Simulation Progress (Upstash Redis)

### The Problem

The GitHub Actions REST API returns 404 for logs of in-progress jobs (confirmed — GitHub community discussion #154834). The portal currently shows a 3-phase progress bar (Preparing / Running / Finishing) based on the workflow's job/step status, but can't show simulation completion percentage during the ~10-20 minute simulation step.

### Solution: Upstash Redis

**Status:** Ready to start. Upstash is already provisioned (done during security hardening for trigger logging, April 2026). `@upstash/redis` is installed. Env vars are configured in both Vercel and GHA.

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

1. **R container** writes progress to stdout during simulation (jheem2 prints sim-by-sim progress)
2. **Wrapper script** in the GHA workflow tails the container's stdout, parses progress lines, and PUTs to Upstash Redis with a key like `progress:{model}:{location}:{scenario}` and a TTL of 30 minutes
3. **Portal status API** (`/api/custom-sim/status`) reads from Redis alongside the existing GitHub API check. If Redis has progress data, it includes the percentage in the response
4. **Client hook** (`useCustomSimulation`) renders the percentage in the progress bar during the "Running" phase

### Implementation Steps

**One-time setup:**
1. Create free Upstash Redis database at upstash.com
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as secrets in:
   - Vercel (for portal status API reads)
   - GitHub repo (for workflow writes)

**Redis key design:**
```
Key:     progress:{model_id}:{location}:{scenario_key}
Value:   {"percent":45,"simsComplete":450,"simsTotal":1000}
TTL:     1800 seconds (30 minutes)
```

Using model/location/scenario as the key (not runId) means the portal can check progress without knowing the run ID. This aligns with how the portal already identifies simulations.

**Wrapper script approach:**

```yaml
- name: Run simulation
  run: |
    docker run ... 2>&1 | while IFS= read -r line; do
      echo "$line"
      if [[ "$line" =~ Running\ simulation\ ([0-9]+)\ of\ ([0-9]+) ]]; then
        current="${BASH_REMATCH[1]}"
        total="${BASH_REMATCH[2]}"
        # Write every 10th sim to stay within rate limits
        if (( current % 10 == 0 )); then
          curl -s "$UPSTASH_URL/set/progress:$KEY/$(printf '{"percent":%d,"simsComplete":%d,"simsTotal":%d}' $((current*100/total)) $current $total)/EX/1800" \
            -H "Authorization: Bearer $UPSTASH_TOKEN"
        fi
      fi
    done
```

The exact regex depends on jheem2's stdout format — need to verify what progress lines look like.

**Files to modify:**

| File | Repo | Change |
|------|------|--------|
| `src/app/api/custom-sim/status/route.ts` | jheem-portal | Read progress from Redis |
| `src/hooks/useCustomSimulation.ts` | jheem-portal | Surface progress percentage |
| `src/components/SimulationProgress.tsx` | jheem-portal | Render percentage in progress bar |
| `.github/workflows/run-custom-sim.yml` | jheem-backend | Wrapper script for stdout parsing + Redis writes |

### Open Questions

1. **R container stdout format:** What does jheem2 print during simulation? Need to verify the exact pattern to parse. If it doesn't print parseable progress, we'd need a small R-side change.
2. **Upstash rate limits:** Free tier is 10,000 commands/day. Writing every 10th sim keeps a 1000-sim run to ~100 PUTs + ~150 GETs from polling. Comfortable for ~20+ runs/day.

---

## Implementation Order

### Step 1: Email notifications — COMPLETE
Implemented April 2026. Architecture changed from Gmail SMTP to Resend via portal-side Upstash stash/drain. See Feature 1 section above.

### Step 2: Redis progress — READY TO START
Infrastructure already in place (Upstash provisioned, env vars configured).
1. ~~Create Upstash Redis database~~ DONE (April 2026, for trigger logging)
2. Verify jheem2 stdout progress format
3. Add wrapper script to workflow
4. Update portal status API to read from Redis
5. Update progress bar component to show percentage
6. Test end-to-end

### Step 3: Polish
- Progress: smoothing (don't jump backwards), handle stale data gracefully
- UI: progress animation

---

## Cost

| Service | Free Tier | Expected Usage | Cost |
|---------|-----------|---------------|------|
| Resend | 3,000 emails/month | <50/month | $0 |
| Upstash Redis | 10,000 commands/day | ~5,000/day max | $0 |

Both features operate entirely within free tiers at research-tool scale.
