'use client';

import { useMemo } from 'react';
import { ReactFlow, Node, Edge } from '@xyflow/react';
import { AnimatedEdge } from './AnimatedEdge';
import '@xyflow/react/dist/style.css';

export default function ReactFlowDiagram() {
  // Define nodes (compartments) - simplified to 4 compartments with larger size
  const nodes: Node[] = useMemo(() => [
    {
      id: '0',
      position: { x: 28, y: 0 },
      data: { label: '' },
      style: {
        width: 56,
        height: 32,
        backgroundColor: '#E8F2FF',
        border: '2px solid #002D72',
        borderRadius: 4,
        padding: 0,
      },
      draggable: false,
    },
    {
      id: '1',
      position: { x: 0, y: 50 },
      data: { label: '' },
      style: {
        width: 52,
        height: 32,
        backgroundColor: '#B8D8F0',
        border: '2px solid #002D72',
        borderRadius: 4,
        padding: 0,
      },
      draggable: false,
    },
    {
      id: '2',
      position: { x: 60, y: 50 },
      data: { label: '' },
      style: {
        width: 52,
        height: 32,
        backgroundColor: '#68ACE5',
        border: '2px solid #002D72',
        borderRadius: 4,
        padding: 0,
      },
      draggable: false,
    },
    {
      id: '3',
      position: { x: 28, y: 100 },
      data: { label: '' },
      style: {
        width: 56,
        height: 32,
        backgroundColor: '#F2C413',
        border: '2px solid #002D72',
        borderRadius: 4,
        padding: 0,
      },
      draggable: false,
    },
  ], []);

  // Define edges (flows) with custom animated edge type
  const edges: Edge[] = useMemo(() => [
    { id: 'e0-1', source: '0', target: '1', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
    { id: 'e0-2', source: '0', target: '2', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
    { id: 'e1-3', source: '1', target: '3', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
    { id: 'e2-3', source: '2', target: '3', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
    { id: 'e2-1', source: '2', target: '1', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, strokeDasharray: '3,3', opacity: 0.5 }, markerEnd: undefined },
  ], []);

  const edgeTypes = useMemo(() => ({ animated: AnimatedEdge }), []);

  return (
    <>
      <style>{`
        /* Hide ReactFlow connection points (static dots) */
        .react-flow__handle {
          opacity: 0;
          pointer-events: none;
        }
      `}</style>

      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <radialGradient id="particle-gradient">
            <stop offset="0%" stopColor="#F2C413" stopOpacity="1" />
            <stop offset="100%" stopColor="#68ACE5" stopOpacity="0.8" />
          </radialGradient>
          <filter id="particle-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        panOnDrag={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: 'transparent', width: '100%', height: '100%' }}
      />
    </>
  );
}
