/**
 * Email notification stash + deliver.
 *
 * Replaces the previous workflow-driven email flow (where `inputs.email`
 * was passed to `run-custom-sim.yml` and echoed to the job log). That
 * exposed user emails to anyone with read access to the backend repo's
 * Actions UI, and blocked re-publicizing the repo.
 *
 * New flow:
 *   1. Portal /api/custom-sim stashes `{email, url}` in a Redis list
 *      keyed by `notify:{backendModelId}:{location}:{scenarioKey}`.
 *   2. Workflow no longer receives email. On successful completion it
 *      POSTs to /api/custom-sim/notify with the scenario identifiers.
 *   3. That endpoint drains the list and sends Resend notifications.
 *
 * Email never transits the workflow → no GHA-side exposure.
 */

import { Redis } from '@upstash/redis';
import type { ModelConfig } from '@/config/model-configs';

const NOTIFY_TTL_SECONDS = 60 * 60 * 24; // 24h — longer than any sim
const NOTIFY_MAX_PER_KEY = 50; // pathological cap to bound Redis growth

// Backend model ID → portal /custom route. Kept here (not in models.json)
// because the mapping is portal-owned routing, not model metadata.
const PORTAL_PATH_BY_BACKEND_ID: Record<string, string> = {
  'ryan-white-msa': '/ryan-white/custom',
  'ryan-white-state-ajph': '/ryan-white-state-level/custom?model=ajph',
  'ryan-white-state-croi': '/ryan-white-state-level/custom?model=croi',
  'cdc-testing': '/cdc-testing/custom',
};

const PORTAL_ORIGIN = 'https://jheem.org';

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

function notifyKey(backendModelId: string, location: string, scenarioKey: string): string {
  return `notify:${backendModelId}:${location}:${scenarioKey}`;
}

/**
 * Build the full "View Results" URL the way the portal itself would
 * serialize the current selection. Mirrors the client-side
 * buildQueryString in CustomSimulationExplorer.tsx so both paths produce
 * identical links.
 */
export function buildReturnUrl(
  backendModelId: string,
  location: string,
  parameters: Record<string, number>,
  config: ModelConfig
): string {
  const base = PORTAL_PATH_BY_BACKEND_ID[backendModelId] ?? '';
  if (!base) return PORTAL_ORIGIN;
  const sep = base.includes('?') ? '&' : '?';
  const params = new URLSearchParams();
  params.set('loc', location);
  for (const p of config.customSimulation?.parameters ?? []) {
    const val = parameters[p.id];
    if (val !== undefined && val !== p.default) {
      params.set(p.keyPrefix, String(val));
    }
  }
  return `${PORTAL_ORIGIN}${base}${sep}${params.toString()}`;
}

interface NotifyEntry {
  email: string;
  url: string;
}

/**
 * Queue an email to be sent when the given scenario completes.
 * Fire-and-forget — failure to stash MUST NOT break the trigger path.
 */
export function stashNotify(
  backendModelId: string,
  location: string,
  scenarioKey: string,
  entry: NotifyEntry
): void {
  const redis = getRedis();
  if (!redis) return;
  const key = notifyKey(backendModelId, location, scenarioKey);

  (async () => {
    try {
      await redis.lpush(key, JSON.stringify(entry));
      // Trim to bounded size (defends against e.g. retries producing
      // duplicate stashes, or anyone queuing pathological numbers of
      // notifications against one scenario).
      await redis.ltrim(key, 0, NOTIFY_MAX_PER_KEY - 1);
      await redis.expire(key, NOTIFY_TTL_SECONDS);
    } catch (err) {
      console.error('[notify] stash failed:', err);
    }
  })();
}

/**
 * Drain all queued notifications for a scenario and return them.
 * Atomic per-entry via LPOP; safe under concurrent drains (whichever
 * caller pops first gets the entry, the other sees an empty list).
 */
export async function drainNotify(
  backendModelId: string,
  location: string,
  scenarioKey: string
): Promise<NotifyEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  const key = notifyKey(backendModelId, location, scenarioKey);
  const entries: NotifyEntry[] = [];

  for (let i = 0; i < NOTIFY_MAX_PER_KEY; i++) {
    const raw = await redis.lpop<string>(key);
    if (raw === null || raw === undefined) break;
    try {
      // Upstash may auto-parse JSON strings; handle both shapes.
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as NotifyEntry);
      if (parsed && typeof parsed.email === 'string' && typeof parsed.url === 'string') {
        entries.push(parsed);
      }
    } catch {
      // Malformed entry — drop silently.
    }
  }
  return entries;
}

/**
 * Send a "your simulation is ready" email via Resend. Returns true on
 * 2xx. Errors are logged but do not throw — one bad send should not
 * block subsequent sends in the same drain.
 */
export async function sendReadyEmail(to: string, location: string, url: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[notify] RESEND_API_KEY not configured');
    return false;
  }

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #1e293b; margin-bottom: 16px;">Your simulation is ready</h2><p style="color: #475569; line-height: 1.6;">Your custom simulation for <strong>${escapeHtml(location)}</strong> has completed.</p><p style="margin: 24px 0;"><a href="${escapeHtml(url)}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Results</a></p><p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">This is an automated notification from <a href="https://jheem.org" style="color: #94a3b8;">jheem.org</a>.</p></div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'JHEEM Notifications <notifications@jheem.org>',
        to: [to],
        subject: 'Your JHEEM simulation is ready',
        html,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('[notify] Resend non-2xx:', response.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[notify] Resend call failed:', err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
