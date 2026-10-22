import assert from 'node:assert/strict';
import test from 'node:test';
import { handleContactRequest } from '../src/lib/contact-handler.ts';
import { parseContactSubmission, CONTACT_BODY_MAX_BYTES } from '../src/lib/contact-input.ts';
import { checkContactLimit, sendContactEmail } from '../src/lib/contact-delivery.ts';
import { CONTACT_EMAIL } from '../src/lib/site.ts';

const message = { message: 'We would like to discuss local HIV planning.', email: '', website: '', submissionId: '7ec35664-3dc4-4ba1-94f2-a2d0de2f6f13' };
const makeRequest = (body = message, headers = {}) => new Request('https://jheem.org/api/contact', {
  method: 'POST',
  headers: { origin: 'https://jheem.org', 'content-type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const allowed = async () => ({ allowed: true, retryAfter: 0 });
const envNames = ['RESEND_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'VERCEL'];
const originalEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
function setEnv(name, value) { process.env[name] = value; }
test.afterEach(() => {
  for (const name of envNames) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});


async function run(request, checkLimit = allowed) {
  const sent = [];
  const response = await handleContactRequest(request, { checkLimit, send: async value => { sent.push(value); } });
  return { response, sent, body: await response.json() };
}

test('accepts a message without identifying fields and trims input', async () => {
  const { response, sent } = await run(makeRequest({ ...message, message: '  A planning question.\n ' }));
  assert.equal(response.status, 200);
  assert.equal(sent[0].message, 'A planning question.');
  assert.equal(sent[0].email, '');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('accepts optional reply email but rejects header injection and malformed types', async () => {
  assert.equal(parseContactSubmission({ ...message, email: ' reader@example.org ' }).email, 'reader@example.org');
  for (const email of ['reader@example.org\r\nBcc: other@example.org', 'invalid', 'a@b.org,c@d.org', 123, null]) {
    assert.equal((await run(makeRequest({ ...message, email }))).response.status, 400);
  }
});

test('rejects empty, oversized, and invalid message bodies before sending', async () => {
  for (const body of [{ ...message, message: ' ' }, { ...message, message: 'x'.repeat(5001) }, { ...message, message: '\u0000' }, { ...message, submissionId: 'bad' }, [], null, '{']) {
    const { response, sent } = await run(makeRequest(body));
    assert.equal(response.status, 400);
    assert.equal(sent.length, 0);
  }
});

test('rejects cross-origin and non-JSON requests before rate limiting or sending', async () => {
  const mustNotRun = async () => assert.fail('Rate limit should not be reached');
  assert.equal((await run(makeRequest(message, { origin: 'https://elsewhere.example' }), mustNotRun)).response.status, 403);
  assert.equal((await run(makeRequest(message, { origin: '' }), mustNotRun)).response.status, 403);
  assert.equal((await run(makeRequest(message, { 'content-type': 'text/plain' }), mustNotRun)).response.status, 415);
});

test('bounds actual streamed bytes even without an honest Content-Length', async () => {
  for (const headers of [{}, { 'content-length': '1' }]) {
    const { response, sent } = await run(makeRequest('x'.repeat(CONTACT_BODY_MAX_BYTES + 1), headers));
    assert.equal(response.status, 413);
    assert.equal(sent.length, 0);
  }
});

test('honeypot submissions do not send email or consume a quota', async () => {
  const { response, sent } = await run(makeRequest({ ...message, website: 'https://spam.example' }), async () => assert.fail('Honeypot must not reach Redis'));
  assert.equal(response.status, 200);
  assert.equal(sent.length, 0);
});

test('exhausted quota returns a retry hint without sending', async () => {
  const { response, sent } = await run(makeRequest(), async () => ({ allowed: false, retryAfter: 120 }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '120');
  assert.equal(sent.length, 0);
});

test('storage outage fails closed and does not log message content', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const { response, sent } = await run(makeRequest(), async () => { throw new Error('private provider detail'); });
  assert.equal(response.status, 503);
  assert.equal(sent.length, 0);
  assert.deepEqual(log.mock.calls[0].arguments, ['[contact] Submission service unavailable']);
});

test('delivery uncertainty never returns success or exposes provider error detail', async (t) => {
  t.mock.method(console, 'error', () => {});
  const response = await handleContactRequest(makeRequest(), { checkLimit: allowed, send: async () => { throw new Error('private provider detail'); } });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private provider detail/);
});

test('delivery is fixed to the central inbox, uses Reply-To, and retains the retry key', async (t) => {
  setEnv('RESEND_API_KEY', 'test-key');
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options, payload: JSON.parse(options.body) });
    return Response.json({ id: 'test-receipt' });
  });
  const input = { ...message, email: 'reader@example.org', message: '<script>literal text</script>' };
  await sendContactEmail(input);
  await sendContactEmail(input);
  assert.deepEqual(calls[0].payload.to, [CONTACT_EMAIL]);
  assert.equal(calls[0].payload.reply_to, input.email);
  assert.equal(calls[0].payload.from, 'JHEEM Website <notifications@jheem.org>');
  assert.equal(calls[0].payload.html, undefined);
  assert.ok(calls[0].payload.text.endsWith(input.message));
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  await sendContactEmail(message);
  assert.equal(calls[2].payload.reply_to, undefined);
});

test('provider rejection and missing receipts both reject delivery', async (t) => {
  setEnv('RESEND_API_KEY', 'test-key');
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'failed' }, { status: 500 }));
  await assert.rejects(sendContactEmail(message));
  mock.mock.mockImplementation(async () => Response.json({}));
  await assert.rejects(sendContactEmail(message));
});

test('rate limiting stores keyed IP hashes in its own namespace and ignores untrusted proxy headers', async (t) => {
  setEnv('RESEND_API_KEY', 'test-key');
  setEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
  setEnv('UPSTASH_REDIS_REST_TOKEN', 'secret-for-testing');
  setEnv('VERCEL', '1');
  const commands = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const command = JSON.parse(options.body);
    commands.push(command);
    return Response.json(Array.isArray(command[0]) ? [{ result: [1, 0] }] : { result: [1, 0] });
  });
  const request = makeRequest(message, { 'x-forwarded-for': '192.0.2.10', 'x-real-ip': '192.0.2.11' });
  assert.equal((await checkContactLimit(request)).allowed, true);
  const first = JSON.stringify(commands[0]);
  assert.match(first, /contact:rate:ip:/);
  assert.doesNotMatch(first, /192\.0\.2|custom-sim|secret-for-testing/);
  setEnv('VERCEL', '0');
  await checkContactLimit(request);
  await checkContactLimit(makeRequest(message, { 'x-forwarded-for': '192.0.2.99' }));
  assert.deepEqual(commands[1], commands[2]);
});

test('accepts the browser Host when Next normalizes the internal request hostname', async () => {
  const request = new Request('http://localhost:3106/api/contact', {
    method: 'POST', headers: { host: '127.0.0.1:3106', origin: 'http://127.0.0.1:3106', 'content-type': 'application/json' },
    body: JSON.stringify(message),
  });
  assert.equal((await run(request)).response.status, 200);
});
