'use client';

import { useState } from 'react';

// Fallback for readers whose browser doesn't open a mail app from a mailto link
// (common with webmail). Copies the address without displaying it; if the clipboard
// is unavailable, shows the address so it can be copied by hand.
export default function CopyEmailButton({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  if (state === 'failed') {
    return <span className="text-sm text-gray-700 select-all">{email}</span>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('failed');
    }
  };

  const copied = state === 'copied';

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Email address copied' : 'Copy email address'}
        title={copied ? 'Copied' : 'Copy email address'}
        className="inline-flex h-11 w-11 items-center justify-center border border-hopkins-blue/25 text-hopkins-blue transition-colors hover:border-hopkins-blue/50 hover:bg-hopkins-blue/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hopkins-blue"
      >
        {copied ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="1.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
          </svg>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Email address copied' : ''}
      </span>
    </>
  );
}
