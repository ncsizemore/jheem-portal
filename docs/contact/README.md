# Collaboration contact form

`/work-with-us#contact` accepts a message and optional reply email. The only public
inbox setting is `CONTACT_EMAIL` in `src/lib/site.ts`. Direct email links, the copy
control, and server-side delivery all derive from it. CIPHER has its own equivalent
setting, `SITE.contactEmail` in that repository's `src/lib/site.ts`; update both
when the shared inbox changes. Individual researcher profile emails are separate.

## Delivery and configuration

`POST /api/contact` uses the existing `RESEND_API_KEY`,
`UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`. These must be set in the
Vercel environment. Messages are sent from `notifications@jheem.org` to the fixed
team inbox. Visitor email, when present, is used only as Reply-To. No confirmation
email is sent to a visitor-supplied address. The sender is a verified-domain
service address, not another group-contact setting.

The endpoint checks same-origin JSON requests, bounds the actual body to 24 KiB,
and validates a message of up to 5,000 characters plus an optional email. A hidden
honeypot catches basic bots. Dedicated Redis limits allow 5 attempts per client
per hour, 30 globally per hour, and 100 globally per day. They never consume
simulation quotas. Only Vercel's overwritten X-Forwarded-For header is used for
client limits; local/non-Vercel servers share one client bucket. Redis stores a
keyed hash of the IP for an hour, not the raw address. It stores no message or
email content. Rate limiting fails closed when configuration or Redis is unavailable.

Each browser attempt has a UUID retained for retries of the same content. It is
sent as Resend's idempotency key, which deduplicates for 24 hours. Changed content
receives a new ID. Reloading the page starts a new attempt. The UI reports success
only after a provider receipt; failures preserve the text and offer retry/direct
email. Provider acceptance is not proof of inbox placement.

## Privacy and operations

Messages and optional email addresses are held by Resend and the team Gmail inbox.
The application does not store submissions in another database and does not log
message bodies, addresses, IPs, or provider response bodies. It logs only a generic
service-unavailable event. This does not promise anonymity from hosting/provider
logs. The page says name/email are optional and asks visitors not to include
patient information. Assign someone to check and respond to the team inbox.

## Verification

- `npm test` includes `npm run test:contact`: bounded/invalid input, origin checks,
  optional identity, honeypot, quota failures, unavailable services, fixed recipient,
  Reply-To, retry-key reuse, no raw IP in Redis commands, and receipt validation.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` before release.
- Check desktop/mobile layout, browser validation, keyboard focus, and preserved
  drafts on failure. Use an explicitly authorized test message to verify real
  delivery. A disabled or invalid key must not produce a success screen.
- Check an actual delivered test in the inbox (including spam), or provider
  delivery status if the API key grants read access. Test retries with the same
  idempotency key, never by changing the key after an ambiguous timeout.

References: https://vercel.com/docs/headers/request-headers and
https://resend.com/docs/dashboard/emails/idempotency-keys.
