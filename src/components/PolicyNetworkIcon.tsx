'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface Node {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'policy' | 'outcome' | 'intervention';
  label?: string;
}

interface Connection {
  from: string;
  to: string;
  strength: number;
}

export default function PolicyNetworkIcon() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Define network nodes representing policy modeling complexity
  const nodes: Node[] = [
    // Central policy question
    { id: 'central', x: 48, y: 35, size: 12, type: 'policy', label: '?' },

    // Primary policy levers (ring 1)
    { id: 'funding', x: 28, y: 25, size: 9, type: 'policy' },
    { id: 'testing', x: 68, y: 25, size: 9, type: 'policy' },
    { id: 'treatment', x: 20, y: 50, size: 9, type: 'policy' },
    { id: 'prevention', x: 76, y: 50, size: 9, type: 'policy' },

    // Secondary interventions (ring 2)
    { id: 'outreach', x: 15, y: 35, size: 7, type: 'intervention' },
    { id: 'linkage', x: 48, y: 15, size: 7, type: 'intervention' },
    { id: 'retention', x: 81, y: 35, size: 7, type: 'intervention' },

    // Outcome nodes (ring 3)
    { id: 'infections', x: 25, y: 70, size: 8, type: 'outcome' },
    { id: 'diagnoses', x: 48, y: 75, size: 8, type: 'outcome' },
    { id: 'suppression', x: 71, y: 70, size: 8, type: 'outcome' },

    // Additional complexity nodes
    { id: 'equity', x: 12, y: 60, size: 6, type: 'intervention' },
    { id: 'access', x: 84, y: 60, size: 6, type: 'intervention' },
    { id: 'adherence', x: 38, y: 85, size: 6, type: 'outcome' },
    { id: 'mortality', x: 58, y: 85, size: 6, type: 'outcome' },
  ];

  // Define connections showing policy relationships
  const connections: Connection[] = [
    // Central to primary
    { from: 'central', to: 'funding', strength: 0.9 },
    { from: 'central', to: 'testing', strength: 0.9 },
    { from: 'central', to: 'treatment', strength: 0.9 },
    { from: 'central', to: 'prevention', strength: 0.9 },

    // Primary to interventions
    { from: 'funding', to: 'outreach', strength: 0.7 },
    { from: 'funding', to: 'linkage', strength: 0.7 },
    { from: 'testing', to: 'linkage', strength: 0.7 },
    { from: 'testing', to: 'retention', strength: 0.7 },
    { from: 'treatment', to: 'retention', strength: 0.7 },
    { from: 'prevention', to: 'retention', strength: 0.7 },

    // Interventions to outcomes
    { from: 'outreach', to: 'infections', strength: 0.6 },
    { from: 'linkage', to: 'diagnoses', strength: 0.6 },
    { from: 'retention', to: 'suppression', strength: 0.6 },
    { from: 'treatment', to: 'suppression', strength: 0.6 },

    // Cross-connections showing complexity
    { from: 'funding', to: 'treatment', strength: 0.4 },
    { from: 'testing', to: 'prevention', strength: 0.4 },
    { from: 'outreach', to: 'diagnoses', strength: 0.3 },
    { from: 'linkage', to: 'suppression', strength: 0.3 },

    // Secondary connections
    { from: 'treatment', to: 'equity', strength: 0.5 },
    { from: 'prevention', to: 'access', strength: 0.5 },
    { from: 'infections', to: 'adherence', strength: 0.4 },
    { from: 'suppression', to: 'mortality', strength: 0.4 },
    { from: 'equity', to: 'infections', strength: 0.3 },
    { from: 'access', to: 'suppression', strength: 0.3 },
  ];

  // Determine if connection should be highlighted
  const isConnectionActive = (conn: Connection) => {
    if (!hoveredNode) return false;
    return conn.from === hoveredNode || conn.to === hoveredNode;
  };

  // Get node glow color
  const getNodeGlow = (node: Node) => {
    if (node.type === 'policy') return 'rgba(0, 45, 114, 0.4)';
    if (node.type === 'outcome') return 'rgba(242, 196, 19, 0.4)';
    return 'rgba(104, 172, 229, 0.4)';
  };

  return (
    <div className="w-full h-full">
      <svg viewBox="0 0 96 96" className="w-full h-full">
        <defs>
          {/* Gradients for nodes */}
          <radialGradient id="policy-gradient">
            <stop offset="0%" stopColor="#003D82" />
            <stop offset="100%" stopColor="#002D72" />
          </radialGradient>
          <radialGradient id="outcome-gradient">
            <stop offset="0%" stopColor="#FFD43B" />
            <stop offset="100%" stopColor="#F2C413" />
          </radialGradient>
          <radialGradient id="intervention-gradient">
            <stop offset="0%" stopColor="#7DBEF5" />
            <stop offset="100%" stopColor="#68ACE5" />
          </radialGradient>

          {/* Glow filters */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="strong-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background subtle grid */}
        <g opacity="0.03">
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 10}
              y1="0"
              x2={i * 10}
              y2="96"
              stroke="#002D72"
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={i * 10}
              x2="96"
              y2={i * 10}
              stroke="#002D72"
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Connections */}
        <g>
          {connections.map((conn, idx) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const isActive = isConnectionActive(conn);
            const baseOpacity = conn.strength * 0.3;
            const opacity = isActive ? Math.min(conn.strength * 0.8, 0.9) : baseOpacity;

            return (
              <motion.line
                key={`conn-${idx}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isActive ? '#F2C413' : '#002D72'}
                strokeWidth={isActive ? 1.5 : 0.8}
                opacity={opacity}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity,
                }}
                transition={{
                  duration: 1.5,
                  delay: idx * 0.02,
                  opacity: { duration: 0.3 }
                }}
              />
            );
          })}
        </g>

        {/* Animated pulse rings (subtle background animation) */}
        <g opacity="0.15">
          <motion.circle
            cx="48"
            cy="48"
            r="20"
            fill="none"
            stroke="#002D72"
            strokeWidth="0.5"
            initial={{ r: 10, opacity: 0.3 }}
            animate={{ r: 40, opacity: 0 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          <motion.circle
            cx="48"
            cy="48"
            r="20"
            fill="none"
            stroke="#F2C413"
            strokeWidth="0.5"
            initial={{ r: 10, opacity: 0.3 }}
            animate={{ r: 40, opacity: 0 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeOut",
              delay: 2
            }}
          />
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node, idx) => {
            const isHovered = hoveredNode === node.id;
            const isConnected = hoveredNode && connections.some(
              c => (c.from === hoveredNode && c.to === node.id) ||
                   (c.to === hoveredNode && c.from === node.id)
            );

            const shouldHighlight = isHovered || isConnected;
            const gradientId = `${node.type}-gradient`;

            return (
              <g key={node.id}>
                {/* Glow effect when hovered or connected */}
                {shouldHighlight && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 4}
                    fill={getNodeGlow(node)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}

                {/* Main node */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size}
                  fill={`url(#${gradientId})`}
                  filter={shouldHighlight ? "url(#strong-glow)" : "url(#glow)"}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: shouldHighlight ? 1.15 : 1,
                    opacity: shouldHighlight ? 1 : 0.85
                  }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.05,
                    scale: { duration: 0.2 }
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                />

                {/* Inner highlight for depth */}
                <motion.circle
                  cx={node.x - node.size * 0.2}
                  cy={node.y - node.size * 0.2}
                  r={node.size * 0.4}
                  fill="white"
                  opacity={shouldHighlight ? 0.4 : 0.2}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: shouldHighlight ? 0.4 : 0.2 }}
                  transition={{ duration: 0.3 }}
                  pointerEvents="none"
                />

                {/* Label for central node */}
                {node.label && (
                  <motion.text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    pointerEvents="none"
                  >
                    {node.label}
                  </motion.text>
                )}

                {/* Subtle pulse animation for central node */}
                {node.id === 'central' && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size}
                    fill="none"
                    stroke="#F2C413"
                    strokeWidth="1"
                    opacity="0"
                    animate={{
                      r: [node.size, node.size + 8],
                      opacity: [0.6, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
