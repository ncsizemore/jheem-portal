/**
 * Trigger logging via Upstash Redis.
 *
 * Background: Vercel runtime logs only retain 1 hour on the Hobby plan.
 * Two unexplained "mystery run" incidents (D.41473 on 2026-04-05 and
 * D.65153 on 2026-04-06) hit the wall of that retention window before
 * we could investigate. This module persists every relevant request
 * outside Vercel's window so we have forensic data the next time
 * something weird shows up.
 *
 * Design rules (see docs/CUSTOM-SIM-SECURITY-HARDENING.md, Finding 5):
 *
 * - **Fire-and-forget**: logging must NEVER block or fail an API
 *   response. All errors are swallowed with a console.error. The hot
 *   path returns regardless of whether the Redis write succeeded.
 *
 * - **Allowlist headers**: we explicitly enumerate which headers to
 *   capture (UA, referer, origin, IPs, geo). Never log Cookie or
 *   Authorization, and never log a blanket headers object — a
 *   blocklist will eventually miss something new.
 *
 * - **Bounded growth**: every LPUSH is followed by an LTRIM that caps
 *   the list to MAX_ENTRIES. The list self-prunes; we won't run out
 *   of Redis quota even under sustained traffic.
 *
 * - **PII awareness**: trigger bodies contain user emails. Access to
 *   the Redis instance is gated by the Upstash REST token (Vercel env
 *   var, never committed). No portal route reads from Redis without
 *   auth (in fact, no portal route reads from Redis at all yet —
 *   inspection happens via the Upstash dashboard).
 */

import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

const MAX_ENTRIES = 5000;

// Lazily-initialized client. Vercel cold starts share module scope, so
// this is effectively a per-instance singleton.
let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Env vars not configured — silently no-op so local dev and any
    // misconfigured deployment still work, just without logging.
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

/**
 * Headers we capture. Allowlist, not blocklist — anything new GitHub /
 * Vercel / Cloudflare adds in the future is invisible until we add it
 * here on purpose. Cookies and Authorization MUST never appear here.
 */
const HEADER_ALLOWLIST = [
  'user-agent',
  'referer',
  'origin',
  'x-forwarded-for',
  'x-real-ip',
  'x-vercel-ip-country',
  'x-vercel-ip-country-region',
  'x-vercel-ip-city',
  'cf-connecting-ip',
] as const;

function pickHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of HEADER_ALLOWLIST) {
    const value = req.headers.get(name);
    if (value) out[name] = value;
  }
  return out;
}

interface TriggerLogEntry {
  ts: string;
  kind: 'trigger' | 'status';
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  headers: Record<string, string>;
  result?: { status: number; outcome?: string };
}

/**
 * Write an entry to the Redis log list. Fire-and-forget — caller does
 * NOT await this. Errors are swallowed; the API response continues.
 *
 * Note we don't use `void` on the call site because we want to make
 * the contract explicit: this returns a promise but the caller is
 * expected to ignore it.
 */
export function logTrigger(entry: Omit<TriggerLogEntry, 'ts'>): void {
  const redis = getRedis();
  if (!redis) return;

  const fullEntry: TriggerLogEntry = {
    ts: new Date().toISOString(),
    ...entry,
  };

  // Fire-and-forget. Wrapped in IIFE so the promise is created but not
  // awaited at the call site, and any rejection is caught here rather
  // than becoming an unhandled rejection.
  (async () => {
    try {
      await redis.lpush('trigger-log', JSON.stringify(fullEntry));
      await redis.ltrim('trigger-log', 0, MAX_ENTRIES - 1);
    } catch (err) {
      // Logging must never break the API path. Surface to console for
      // Vercel runtime logs (1-hour retention) but don't propagate.
      console.error('[trigger-log] write failed:', err);
    }
  })();
}

/**
 * Convenience: build an entry from a NextRequest + extras. Keeps call
 * sites in route handlers terse.
 */
export function buildEntry(
  req: NextRequest,
  kind: TriggerLogEntry['kind'],
  extras: { body?: unknown; query?: Record<string, string>; result?: TriggerLogEntry['result'] } = {}
): Omit<TriggerLogEntry, 'ts'> {
  return {
    kind,
    method: req.method,
    path: new URL(req.url).pathname,
    headers: pickHeaders(req),
    ...extras,
  };
}
