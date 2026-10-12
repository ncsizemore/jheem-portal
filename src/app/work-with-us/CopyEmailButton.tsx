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

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className="min-h-11 text-sm text-hopkins-blue underline decoration-hopkins-blue/30 underline-offset-4 transition-colors hover:decoration-hopkins-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hopkins-blue"
    >
      {state === 'copied' ? 'Copied' : 'Copy email address'}
    </button>
  );
}
