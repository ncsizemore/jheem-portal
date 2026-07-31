import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

const WINDOW_SECONDS = 60 * 60;
const DEFAULT_IP_LIMIT = 6;
const DEFAULT_GLOBAL_LIMIT = 30;
const DISPATCH_RESERVATION_SECONDS = 5 * 60;

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
}

function opaqueClientKey(request: NextRequest): string {
  return createHash('sha256').update(clientAddress(request)).digest('hex').slice(0, 24);
}

const FIXED_WINDOW_SCRIPT = `
local ip_count = redis.call('INCR', KEYS[1])
if ip_count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local global_count = tonumber(redis.call('GET', KEYS[2])) or 0
if ip_count <= tonumber(ARGV[2]) then
  global_count = redis.call('INCR', KEYS[2])
  if global_count == 1 then redis.call('EXPIRE', KEYS[2], ARGV[1]) end
end
local ip_ttl = redis.call('TTL', KEYS[1])
local global_ttl = redis.call('TTL', KEYS[2])
local allowed = 0
if ip_count <= tonumber(ARGV[2]) and global_count <= tonumber(ARGV[3]) then allowed = 1 end
return {allowed, ip_count, global_count, math.max(ip_ttl, global_ttl)}
`;

export interface LaunchLimitResult {
  allowed: boolean;
  retryAfter: number;
  reason?: 'unavailable' | 'limit';
}

export async function checkLaunchRateLimit(request: NextRequest): Promise<LaunchLimitResult> {
  const redis = getRedis();
  if (!redis) return { allowed: false, retryAfter: 60, reason: 'unavailable' };

  const ipLimit = positiveInteger(process.env.CUSTOM_SIM_IP_HOURLY_LIMIT, DEFAULT_IP_LIMIT);
  const globalLimit = positiveInteger(process.env.CUSTOM_SIM_GLOBAL_HOURLY_LIMIT, DEFAULT_GLOBAL_LIMIT);

  try {
    const result = await redis.eval<[number, number, number], number[]>(
      FIXED_WINDOW_SCRIPT,
      [`custom-sim:rate:ip:${opaqueClientKey(request)}`, 'custom-sim:rate:global'],
      [WINDOW_SECONDS, ipLimit, globalLimit],
    );
    return {
      allowed: result[0] === 1,
      retryAfter: Math.max(1, result[3] > 0 ? result[3] : WINDOW_SECONDS),
      ...(result[0] === 1 ? {} : { reason: 'limit' as const }),
    };
  } catch (error) {
    console.error('[custom-sim-rate-limit] Redis check failed:', error);
    return { allowed: false, retryAfter: 60, reason: 'unavailable' };
  }
}

function reservationKey(requestId: string): string {
  const digest = createHash('sha256').update(requestId).digest('hex');
  return `custom-sim:dispatch:${digest}`;
}

export async function reserveDispatch(requestId: string): Promise<'reserved' | 'existing' | 'unavailable'> {
  const redis = getRedis();
  if (!redis) return 'unavailable';
  try {
    const result = await redis.set(reservationKey(requestId), '1', {
      nx: true,
      ex: DISPATCH_RESERVATION_SECONDS,
    });
    return result === 'OK' ? 'reserved' : 'existing';
  } catch (error) {
    console.error('[custom-sim-rate-limit] Dispatch reservation failed:', error);
    return 'unavailable';
  }
}

export async function releaseDispatch(requestId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(reservationKey(requestId));
  } catch (error) {
    console.error('[custom-sim-rate-limit] Dispatch reservation release failed:', error);
  }
}
