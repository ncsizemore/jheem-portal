'use client';

import dynamic from 'next/dynamic';

// Import ReactFlow dynamically with no SSR to avoid hydration issues
const ReactFlowDiagram = dynamic(
  () => import('./ReactFlowDiagram'),
  { ssr: false }
);

export default function CompartmentalModelIcon() {
  return <ReactFlowDiagram />;
}
