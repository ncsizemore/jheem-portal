'use client';

import { useMemo } from 'react';
import { ReactFlow, Node, Edge } from '@xyflow/react';
import { AnimatedEdge } from './AnimatedEdge';
import { CompartmentNode } from './CompartmentNode';
import '@xyflow/react/dist/style.css';

export default function ReactFlowDiagram() {
  // Define nodes - matching the JHEEM model structure
  const nodes: Node[] = useMemo(() => [
    {
      id: '0',
      type: 'compartment',
      position: { x: 38, y: 0 },
      data: { label: 'HIV-negative' },
      style: {
        width: 40,
        height: 18,
        backgroundColor: '#E8F2FF',
        border: '1.5px solid #002D72',
        borderRadius: 3,
        padding: 0,
        opacity: 0.9,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      draggable: false,
    },
    {
      id: '1',
      type: 'compartment',
      position: { x: 0, y: 30 },
      data: { label: 'Undiagnosed Acute HIV, Not on PrEP' },
      style: {
        width: 38,
        height: 18,
        backgroundColor: '#B8D8F0',
        border: '1.5px solid #002D72',
        borderRadius: 3,
        padding: 0,
        opacity: 0.9,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      draggable: false,
    },
    {
      id: '2',
      type: 'compartment',
      position: { x: 78, y: 30 },
      data: { label: 'Undiagnosed Acute HIV, Enrolled in PrEP' },
      style: {
        width: 38,
        height: 18,
        backgroundColor: '#B8D8F0',
        border: '1.5px solid #002D72',
        borderRadius: 3,
        padding: 0,
        opacity: 0.9,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      draggable: false,
    },
    {
      id: '3',
      type: 'compartment',
      position: { x: 38, y: 60 },
      data: { label: 'Diagnosed Acute HIV' },
      style: {
        width: 40,
        height: 18,
        backgroundColor: '#68ACE5',
        border: '1.5px solid #002D72',
        borderRadius: 3,
        padding: 0,
        opacity: 0.9,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      draggable: false,
    },
    // Undiagnosed Chronic compartments - now more visible
    {
      id: '4',
      type: 'compartment',
      position: { x: 0, y: 86 },
      data: { label: 'Undiagnosed Chronic HIV, Not on PrEP' },
      style: {
        width: 38,
        height: 18,
        backgroundColor: '#B8D8F0',
        border: '1.5px solid #002D72',
        borderRadius: 3,
        padding: 0,
        opacity: 0.9,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      draggable: false,
    },
    {
      id: '5',
      type: 'compartment',
      position: { x: 78, y: 86 },
      data: { label: 'Undiagnosed Chronic HIV, Enrolled in PrEP' },
      style: {
        width: 38,
        height: 18,
        backgroundColor: '#B8D8F0',
        border: '1.5px solid #002D72',
        borderRadius: 3,
        padding: 0,
        opacity: 0.9,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      draggable: false,
    },
    // Diagnosed Chronic - partially visible
    {
      id: '6',
      type: 'compartment',
      position: { x: 38, y: 120 },
      data: { label: 'Diagnosed Chronic HIV' },
      style: {
        width: 40,
        height: 18,
        backgroundColor: '#F2C413',
        border: '1.5px solid #002D72',
        borderRadius: 3,
        padding: 0,
        opacity: 0.9,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      draggable: false,
    },
  ], []);

  // Define edges - matching model_unit.png structure
  const edges: Edge[] = useMemo(() => [
    // HIV-negative → Undiagnosed Acute
    { id: 'e0-1', source: '0', target: '1', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
    { id: 'e0-2', source: '0', target: '2', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },

    // Undiagnosed Acute PrEP → Not on PrEP (one-way, horizontal)
    { id: 'e2-1', source: '2', target: '1', sourceHandle: 'left-source', targetHandle: 'right', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.4 }, markerEnd: undefined },

    // Undiagnosed Acute → Diagnosed Acute
    { id: 'e1-3', source: '1', target: '3', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
    { id: 'e2-3', source: '2', target: '3', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },

    // Undiagnosed Acute → Undiagnosed Chronic (matching PrEP status)
    { id: 'e1-4', source: '1', target: '4', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
    { id: 'e2-5', source: '2', target: '5', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },

    // Undiagnosed Chronic PrEP → Not on PrEP (one-way, horizontal)
    { id: 'e5-4', source: '5', target: '4', sourceHandle: 'left-source', targetHandle: 'right', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.4 }, markerEnd: undefined },

    // Diagnosed Acute → Diagnosed Chronic
    { id: 'e3-6', source: '3', target: '6', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },

    // Undiagnosed Chronic → Diagnosed Chronic
    { id: 'e4-6', source: '4', target: '6', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
    { id: 'e5-6', source: '5', target: '6', sourceHandle: 'bottom-source', targetHandle: 'top', type: 'animated', style: { stroke: '#002D72', strokeWidth: 1.5, opacity: 0.5 }, markerEnd: undefined },
  ], []);

  const edgeTypes = useMemo(() => ({ animated: AnimatedEdge }), []);
  const nodeTypes = useMemo(() => ({ compartment: CompartmentNode }), []);

  return (
    <>
      <style>{`
        /* Hover effect for compartments */
        .react-flow__node:hover {
          filter: brightness(1.15);
          transform: scale(1.05);
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
        nodeTypes={nodeTypes}
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
