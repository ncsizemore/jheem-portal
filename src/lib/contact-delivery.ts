import { createHmac } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { CONTACT_EMAIL } from './site';
import type { ContactSubmission } from './contact-input';

// Dedicated quotas; collaboration requests never consume simulation-launch quota.
const RATE_SCRIPT = `
local ip = redis.call('INCR', KEYS[1])
if ip == 1 then redis.call('EXPIRE', KEYS[1], 3600) end
if ip > 5 then return {0, redis.call('TTL', KEYS[1])} end
local hour = tonumber(redis.call('GET', KEYS[2])) or 0
local day = tonumber(redis.call('GET', KEYS[3])) or 0
if hour >= 30 then return {0, redis.call('TTL', KEYS[2])} end
if day >= 100 then return {0, redis.call('TTL', KEYS[3])} end
if redis.call('INCR', KEYS[2]) == 1 then redis.call('EXPIRE', KEYS[2], 3600) end
if redis.call('INCR', KEYS[3]) == 1 then redis.call('EXPIRE', KEYS[3], 86400) end
return {1, 0}
`;

export async function checkContactLimit(request: Request) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !process.env.RESEND_API_KEY) throw new Error('Contact service is not configured');
  const redis = new Redis({ url, token, retry: false, signal: AbortSignal.timeout(5000) });
  // Vercel overwrites X-Forwarded-For. Outside that trusted proxy, share a bucket
  // rather than trusting user-controlled IP headers. No raw IP is stored.
  const address = process.env.VERCEL === '1'
    ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    : 'local';
  const clientKey = createHmac('sha256', token).update(`contact:${address}`).digest('hex');
  const result = await redis.eval<[], [number, number]>(RATE_SCRIPT,
    [`contact:rate:ip:${clientKey}`, 'contact:rate:hour', 'contact:rate:day'], []);
  return { allowed: result[0] === 1, retryAfter: Math.max(1, result[1]) };
}

export async function sendContactEmail(submission: ContactSubmission) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Contact service is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // The browser retains this ID for retries of the same message, including
      // ambiguous timeouts. Resend deduplicates requests for 24 hours.
      'Idempotency-Key': `contact/${submission.submissionId}`,
    },
    body: JSON.stringify({
      from: 'JHEEM Website <notifications@jheem.org>',
      to: [CONTACT_EMAIL],
      ...(submission.email ? { reply_to: submission.email } : {}),
      subject: 'New message from the JHEEM website',
      text: `Submitted through jheem.org/work-with-us\nReply email: ${submission.email || 'Not provided'}\n\n${submission.message}`,
    }),
  });
  if (!response.ok) throw new Error('Contact delivery was not accepted');
  const receipt = await response.json();
  if (typeof receipt.id !== 'string' || !receipt.id) throw new Error('Contact delivery receipt missing');
}
