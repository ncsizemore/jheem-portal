# Custom-simulation control-plane contract

**Status:** implementation unit in progress  
**Canonical execution contract:** `jheem-backend/docs/custom-simulation-run-contract.md`

The portal treats model configuration, normalized parameters, and the backend
scenario key as one versioned request identity:

```text
request_id = v1:<backend_model_id>:<location>:<scenario_key>
run_title  = custom-sim: <request_id>
```

## Portal invariants

- Opening a shared URL performs `action: "lookup"`. It may load cached results
  or attach to the exact active run, but cannot dispatch compute.
- Only the Run Simulation button performs `action: "launch"`.
- An omitted action is lookup for compatibility with stale browser bundles.
- Trigger and status matching use exact run-title equality. A direct GitHub run
  ID is accepted only when its workflow and title match the derived identity.
- During rollout, the two historical title formats are reconstructed from
  normalized parameters and matched exactly so an in-flight legacy run is not
  duplicated. New requests and callers that supply `requestId` use v1 only.
- Complete means the CloudFront object exists; workflow success alone enters a
  bounded finalizing period.
- Trigger bodies must be JSON and no larger than 4 KiB. Unknown parameters,
  fractions, and values outside 0–100 are rejected rather than silently coerced.
- Parameter values are whole percentages from 0 through 100. URL parsing and
  range controls use the same one-percentage-point step accepted by the API and
  backend, so shared links never expose a different value than the visible UI.
- Raw email addresses are excluded from forensic trigger logs.

Fine-grained percentages are monotonic only within their workflow phase. When
the workflow moves from simulation counts to extraction file counts, the detail
bar resets to the new phase rather than retaining a numerically larger but stale
percentage from the previous phase.

## Launch protection

Cache hits and lookup requests are not charged against compute launch limits.
After an exact active-run check, cache-miss launches require Upstash Redis and
use atomic fixed-window limits:

| Scope | Default | Environment override |
|---|---:|---|
| Client address | 6 launches/hour | `CUSTOM_SIM_IP_HOURLY_LIMIT` |
| Portal-wide | 30 launches/hour | `CUSTOM_SIM_GLOBAL_HOURLY_LIMIT` |

An atomic five-minute per-request reservation closes the gap between GitHub's
run-list API and workflow creation. If Redis is unavailable, new compute fails
closed with 503; cached reads and existing-run lookup remain available.
Adding an email notification to an active run is rate-limited as a launch action
so the notification queue cannot be used as a mail relay.

The backend provides a second layer: canonical-input validation, workflow-level
concurrency, and an S3 existence check before compute. Deploy backend support
before this portal revision.
