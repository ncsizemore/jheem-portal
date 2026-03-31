# Email Notifications & Real-Time Progress for Custom Simulations

**Parent plan:** [Custom Simulations Plan](./CUSTOM-SIMULATIONS-PLAN.md) (item 6 in Path Forward)
**Status:** In progress — Step 1 (email notifications)
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
2. Optional "Email me when ready" checkbox + email input
3. User submits — simulation triggers as usual
4. User can close the tab / navigate away
5. When the workflow completes, an email is sent with a direct link to the results

### Design Decision: Gmail SMTP

Options considered:
- **Gmail SMTP via `curl`** — team already has a Gmail account used for Shiny app notifications (via `blastula` R package). Zero new services, two GitHub secrets, one workflow step.
- **AWS SES** — already have AWS infra, but sandbox mode requires AWS support request to send to unverified emails. Overkill for a research tool sending a few notifications per week.
- **Third-party (Resend, SendGrid, Postmark)** — clean APIs but unnecessary new dependency.

**Gmail SMTP is the right choice.** The only cosmetic downside is a `@gmail.com` sender address instead of `@jheem.org`. For a research tool sending to collaborators, this doesn't matter. Can upgrade later if needed without changing the architecture.

**Where the email is sent from: GitHub Actions workflow.**
The workflow sends email directly at the end of `run-custom-sim.yml` via `curl` to Gmail's SMTP server. The email address is passed as a workflow input. No portal-side email infrastructure needed.

**Email content:**
- Subject: "Your JHEEM simulation is ready"
- Body: Model name, location, parameter summary, direct link to results (with query params so it auto-loads)
- Plain text + simple HTML
- From: existing JHEEM Gmail account

### Implementation Steps

**One-time setup:**
1. Generate Gmail App Password (Google Account > Security > App Passwords)
2. Add `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` as GitHub repo secrets on jheem-backend

**Portal changes:**
- Add optional email input to `CustomSimulationExplorer` form
- Pass `email` through `useCustomSimulation` hook to `/api/custom-sim` POST
- API route forwards `email` as a workflow input in the `workflow_dispatch`

**Backend changes (jheem-backend):**
- Add `email` as optional input to `run-custom-sim.yml`
- Add email send step at end of workflow (conditional on email being provided)

**Files to modify:**

| File | Repo | Change |
|------|------|--------|
| `src/components/CustomSimulationExplorer.tsx` | jheem-portal | Email input UI |
| `src/hooks/useCustomSimulation.ts` | jheem-portal | Pass email to trigger |
| `src/app/api/custom-sim/route.ts` | jheem-portal | Forward email to workflow dispatch |
| `.github/workflows/run-custom-sim.yml` | jheem-backend | Accept email input, send step |

**Workflow email step:**

```yaml
- name: Send notification email
  if: inputs.email != ''
  env:
    GMAIL_ADDRESS: ${{ secrets.GMAIL_ADDRESS }}
    GMAIL_APP_PASSWORD: ${{ secrets.GMAIL_APP_PASSWORD }}
  run: |
    curl --url "smtps://smtp.gmail.com:465" \
      --ssl-reqd \
      --mail-from "$GMAIL_ADDRESS" \
      --mail-rcpt "${{ inputs.email }}" \
      --user "$GMAIL_ADDRESS:$GMAIL_APP_PASSWORD" \
      --upload-file - <<EOF
    From: JHEEM Notifications <$GMAIL_ADDRESS>
    To: ${{ inputs.email }}
    Subject: Your JHEEM simulation is ready
    Content-Type: text/html; charset=UTF-8

    <p>Your custom simulation is ready.</p>
    <p><strong>Location:</strong> ${{ inputs.location }}</p>
    <p><a href="https://jheem.org/...">View results</a></p>
    EOF
```

### Open Questions

1. **Gmail account:** Which Gmail address? Need credentials to generate the App Password.
2. **Results URL construction:** The workflow needs to build a portal URL with the right query params (model, location, parameters). The `run-custom-sim.yml` already has all these inputs — just need to format the URL.

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

### Step 1: Email notifications
1. Confirm Gmail account + generate App Password
2. Add email input to portal custom sim UI
3. Pass email through API → workflow dispatch
4. Add Gmail SMTP send step to workflow
5. Test end-to-end

### Step 2: Redis progress
1. Create Upstash Redis database, configure secrets
2. Verify jheem2 stdout progress format
3. Add wrapper script to workflow
4. Update portal status API to read from Redis
5. Update progress bar component to show percentage
6. Test end-to-end

### Step 3: Polish
- Email: error handling (SMTP failure shouldn't fail the workflow), nicer HTML template
- Progress: smoothing (don't jump backwards), handle stale data gracefully
- UI: email input validation, progress animation

---

## Cost

| Service | Free Tier | Expected Usage | Cost |
|---------|-----------|---------------|------|
| Gmail SMTP | 500 emails/day | <10/week | $0 |
| Upstash Redis | 10,000 commands/day | ~5,000/day max | $0 |

Both features operate entirely within free tiers at research-tool scale.
