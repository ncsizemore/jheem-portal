import { CONTACT_BODY_MAX_BYTES, parseContactSubmission } from './contact-input';
import type { ContactSubmission } from './contact-input';

export interface ContactDependencies {
  checkLimit: (request: Request) => Promise<{ allowed: boolean; retryAfter: number }>;
  send: (submission: ContactSubmission) => Promise<void>;
}

function response(status: number, body: object, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

// Bound the actual stream, not just the caller-supplied Content-Length header.
async function readBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get('content-length')) > CONTACT_BODY_MAX_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > CONTACT_BODY_MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function handleContactRequest(request: Request, dependencies: ContactDependencies): Promise<Response> {
  // Next's local server can normalize request.url to localhost; the Host
  // header retains the actual origin the browser visited. Browsers cannot
  // override Host when posting from another origin.
  const url = new URL(request.url);
  const expectedOrigin = `${url.protocol}//${request.headers.get('host') || url.host}`;
  if (request.headers.get('origin') !== expectedOrigin) {
    return response(403, { error: 'Please send your message from this website.' });
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return response(415, { error: 'Please use the message form to get in touch.' });
  }

  let input: unknown;
  try {
    const body = await readBody(request);
    if (body === null) return response(413, { error: 'Please shorten your message and try again.' });
    input = JSON.parse(body);
  } catch {
    return response(400, { error: 'Please check your message and try again.' });
  }
  const submission = parseContactSubmission(input);
  if (!submission) {
    return response(400, { error: 'Please enter a message of up to 5,000 characters and a valid email address, if provided.' });
  }
  // A hidden field catches simple bots without adding a challenge for readers.
  if (submission.website) return response(200, { ok: true });

  try {
    const limit = await dependencies.checkLimit(request);
    if (!limit.allowed) {
      return response(429, { error: 'Too many messages have been attempted. Please try later, or email us directly.' }, {
        'Retry-After': String(Math.max(1, limit.retryAfter)),
      });
    }
    await dependencies.send(submission);
    return response(200, { ok: true });
  } catch {
    // Never log the request, provider response, message, email, or IP address.
    console.error('[contact] Submission service unavailable');
    return response(503, { error: 'We couldn’t confirm that your message was sent. Your text is still here; please retry, or email us directly.' });
  }
}
