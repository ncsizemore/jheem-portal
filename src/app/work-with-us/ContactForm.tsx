'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CONTACT_EMAIL_MAX_LENGTH, CONTACT_MESSAGE_MAX_LENGTH } from '@/lib/contact-input';

const FIELD_CLASS = 'mt-2 block w-full border border-rule bg-white px-3 py-3 text-base leading-relaxed text-ink focus:border-hopkins-blue focus:outline-2 focus:outline-offset-2 focus:outline-hopkins-blue disabled:opacity-60';
const BUTTON_CLASS = 'inline-flex min-h-11 items-center justify-center bg-hopkins-blue px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-hopkins-blue/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hopkins-blue disabled:cursor-wait disabled:opacity-60';

export default function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [canReply, setCanReply] = useState(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  const sending = useRef(false);
  const success = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === 'sent') success.current?.focus({ preventScroll: true });
  }, [state]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const data = new FormData(event.currentTarget);
    const input = {
      message: String(data.get('message') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      website: String(data.get('website') ?? ''),
    };
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) {
      attempt.current = { payload, id: crypto.randomUUID() };
    }
    sending.current = true;
    setState('sending');
    setError('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, submissionId: attempt.current.id }),
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        throw new Error(typeof result.error === 'string' ? result.error : 'We couldn’t confirm that your message was sent. Please retry, or email us directly.');
      }
      setCanReply(Boolean(input.email));
      setState('sent');
      attempt.current = null;
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'Error'
        ? cause.message
        : 'We couldn’t confirm that your message was sent. Your text is still here; please retry, or email us directly.');
      setState('error');
    } finally {
      sending.current = false;
    }
  }

  if (state === 'sent') {
    return (
      <div ref={success} tabIndex={-1} className="mt-7 border-l-2 border-hopkins-blue py-2 pl-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hopkins-blue">
        <p className="font-serif text-2xl text-ink">Thank you for getting in touch.</p>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Your message has been sent to the team.
          {canReply ? ' We can reply at the email address you provided.' : ' Without an email address, we won’t be able to reply.'}
        </p>
        <button type="button" onClick={() => setState('idle')} className="mt-4 min-h-11 text-sm text-hopkins-blue underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hopkins-blue">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form method="post" action="/api/contact" onSubmit={submit} className="mt-7" aria-label="Contact the JHEEM team" aria-busy={state === 'sending'}>
      <fieldset disabled={state === 'sending'} className="space-y-5">
        <div>
          <label htmlFor="contact-message" className="text-sm font-medium text-ink">Your message</label>
          <textarea id="contact-message" name="message" rows={5} required maxLength={CONTACT_MESSAGE_MAX_LENGTH} aria-describedby="contact-intro contact-privacy" className={`${FIELD_CLASS} min-h-36 resize-y`} />
        </div>
        <div className="max-w-sm">
          <label htmlFor="contact-email" className="text-sm font-medium text-ink">Email <span className="font-normal text-muted">(if you’d like a reply)</span></label>
          <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={CONTACT_EMAIL_MAX_LENGTH} className={FIELD_CLASS} />
        </div>
        <div hidden aria-hidden="true">
          <label htmlFor="contact-website">Leave this field empty</label>
          <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <p id="contact-privacy" className="text-sm leading-relaxed text-muted">
          You can send a message without providing your name or email. Messages go to our team inbox. Please don’t include patient information.
        </p>
        <button type="submit" className={BUTTON_CLASS}>{state === 'sending' ? 'Sending…' : 'Send message'}</button>
      </fieldset>
      <p role="alert" className={error ? 'mt-4 text-sm leading-relaxed text-red-800' : 'sr-only'}>{error}</p>
      <noscript><p className="mt-4 text-sm text-muted">Please use the email link below to get in touch.</p></noscript>
    </form>
  );
}
