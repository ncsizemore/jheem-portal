"use client";

import { useState } from "react";

export default function CopyCitation({ citation }: { citation: string }) {
  const [status, setStatus] = useState("");
  const [showCitation, setShowCitation] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(citation);
      setStatus("Citation copied.");
      setShowCitation(false);
    } catch {
      setStatus("Select and copy the citation below.");
      setShowCitation(true);
    }
  }

  return (
    <div>
      <button type="button" className="editorial-link min-h-11" onClick={copy}>
        Copy citation
      </button>
      <p role="status" className="text-xs text-muted">
        {status}
      </p>
      {showCitation && (
        <p className="mt-2 select-all text-sm leading-relaxed text-muted">
          {citation}
        </p>
      )}
    </div>
  );
}
