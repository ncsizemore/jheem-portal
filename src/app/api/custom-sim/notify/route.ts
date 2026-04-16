/**
 * API route: notification dispatch.
 *
 * POST /api/custom-sim/notify
 *   Auth: Authorization: Bearer {NOTIFY_SECRET}
 *   Body: { modelId, location, scenarioKey }
 *
 * Called exclusively by the run-custom-sim.yml workflow when a run
 * completes successfully. Drains queued email notifications for the
 * given scenario and sends them via Resend.
 *
 * Why auth:
 *   Without a secret, an attacker could call this repeatedly and
 *   cause spurious "your sim is ready" emails (spam via our domain).
 *   Upstash TTL caps exposure but it's still worth the 10 lines.
 *
 * Why not part of /api/custom-sim/status:
 *   status is polled unauthenticated every ~10s from user browsers.
 *   Mixing the send path into it would require either a separate
 *   code path gated by auth (same as this, just messier) or trusting
 *   the client to not spoof completion (no).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getModelConfig } from '@/config/model-configs';
import { drainNotify, sendReadyEmail } from '@/lib/notify';
import { logTrigger, buildEntry } from '@/lib/trigger-log';

// Same format whitelist as the other routes.
const LOCATION_FORMAT = /^[A-Z]{2}$|^C\.\d+$/;
const SCENARIO_KEY_FORMAT = /^[a-zA-Z][a-zA-Z0-9]*\d+(-[a-zA-Z][a-zA-Z0-9]*\d+)*$/;

// The modelId the workflow sends is the BACKEND id (ryan-white-msa,
// cdc-testing, etc.) — that's what it has in hand. Portal-side configs
// are keyed by *portal* ids (ryan-white, cdc-testing, ...). Reverse
// map so we can look up config for URL/validation purposes.
const BACKEND_TO_PORTAL_MODEL_ID: Record<string, string> = {
  'ryan-white-msa': 'ryan-white',
  'ryan-white-state-ajph': 'ryan-white-state-ajph',
  'ryan-white-state-croi': 'ryan-white-state-croi',
  'cdc-testing': 'cdc-testing',
};

export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFY_SECRET;
  const auth = request.headers.get('authorization');

  // Log every call, authorized or not. If someone finds the endpoint
  // and starts probing, we want it visible in Upstash.
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // fall through — invalid JSON is an error below
  }
  logTrigger(buildEntry(request, 'trigger', { body: { ...body, auth: auth ? 'present' : 'missing' } }));

  if (!secret) {
    console.error('[notify] NOTIFY_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { modelId, location, scenarioKey } = body as {
    modelId?: string;
    location?: string;
    scenarioKey?: string;
  };

  if (typeof modelId !== 'string' || typeof location !== 'string' || typeof scenarioKey !== 'string') {
    return NextResponse.json({ error: 'Missing modelId, location, or scenarioKey' }, { status: 400 });
  }

  // Validate shapes — the workflow is trusted, but we still want these
  // to fail fast if something upstream changes unexpectedly. Also
  // prevents poisoned cache keys if this endpoint ever gets exposed.
  const portalModelId = BACKEND_TO_PORTAL_MODEL_ID[modelId];
  if (!portalModelId) {
    return NextResponse.json({ error: 'Unknown model' }, { status: 400 });
  }
  const config = getModelConfig(portalModelId);
  if (!config) {
    return NextResponse.json({ error: 'Unknown model' }, { status: 400 });
  }
  if (!LOCATION_FORMAT.test(location) || !config.locations.includes(location)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
  }
  if (!SCENARIO_KEY_FORMAT.test(scenarioKey)) {
    return NextResponse.json({ error: 'Invalid scenarioKey' }, { status: 400 });
  }

  const entries = await drainNotify(modelId, location, scenarioKey);
  if (entries.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const entry of entries) {
    const ok = await sendReadyEmail(entry.email, location, entry.url);
    if (ok) sent++;
  }

  return NextResponse.json({ sent, queued: entries.length });
}
