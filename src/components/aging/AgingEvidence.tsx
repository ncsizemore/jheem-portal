'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const CalibrationSection = dynamic(
  () => import('@/components/CalibrationSection'),
  {
    loading: () => (
      <p role="status" className="py-8 text-sm text-muted">
        Loading model-fit data…
      </p>
    ),
  },
);
export default function AgingEvidence() {
  const [opened, setOpened] = useState(false);
  return (
    <details
      className="mt-6 border-y border-rule py-5"
      onToggle={(event) => {
        if (event.currentTarget.open) setOpened(true);
      }}
    >
      <summary className="cursor-pointer text-base font-medium text-hopkins-blue">
        Compare the model with observed data
      </summary>
      {opened && <CalibrationSection />}
    </details>
  );
}
