'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Particle {
  id: number;
  startCompartment: number;
  endCompartment: number;
  delay: number;
  duration: number;
}

// Seeded random number generator for consistent server/client rendering
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function CompartmentalModelIcon() {
  // Define compartments in a flow layout (simplified HIV care continuum)
  const compartments = [
    { id: 0, x: 10, y: 12, width: 32, height: 16, color: '#E8F2FF' }, // HIV-negative
    { id: 1, x: 54, y: 12, width: 32, height: 16, color: '#B8D8F0' }, // Undiagnosed
    { id: 2, x: 32, y: 40, width: 32, height: 16, color: '#68ACE5' }, // Diagnosed
    { id: 3, x: 10, y: 68, width: 32, height: 16, color: '#F2C413' }, // On Treatment
    { id: 4, x: 54, y: 68, width: 32, height: 16, color: '#002D72' }, // Suppressed
  ];

  // Generate particles flowing between compartments
  const particles = useMemo<Particle[]>(() => {
    const parts: Particle[] = [];
    let seed = 12345;

    // Define flows between compartments (based on JHEEM structure)
    const flows = [
      { from: 0, to: 1, count: 6 },  // HIV-negative → Undiagnosed (new infections)
      { from: 1, to: 2, count: 8 },  // Undiagnosed → Diagnosed
      { from: 2, to: 3, count: 7 },  // Diagnosed → On Treatment
      { from: 3, to: 4, count: 6 },  // On Treatment → Suppressed
      { from: 4, to: 3, count: 2 },  // Suppressed → On Treatment (loss of suppression)
      { from: 2, to: 1, count: 1 },  // Some fall out of care
    ];

    let particleId = 0;
    flows.forEach(flow => {
      for (let i = 0; i < flow.count; i++) {
        parts.push({
          id: particleId++,
          startCompartment: flow.from,
          endCompartment: flow.to,
          delay: seededRandom(seed++) * 5,
          duration: 2.5 + seededRandom(seed++) * 1.5,
        });
      }
    });

    return parts;
  }, []);

  return (
    <div className="w-full h-full">
      <svg viewBox="0 0 96 96" className="w-full h-full">
        <defs>
          {/* Gradient for particles */}
          <radialGradient id="particle-gradient">
            <stop offset="0%" stopColor="#F2C413" stopOpacity="1" />
            <stop offset="100%" stopColor="#68ACE5" stopOpacity="0.8" />
          </radialGradient>

          {/* Glow filter */}
          <filter id="particle-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Compartment boxes */}
        {compartments.map((comp) => (
          <motion.rect
            key={comp.id}
            x={comp.x}
            y={comp.y}
            width={comp.width}
            height={comp.height}
            fill={comp.color}
            stroke="#002D72"
            strokeWidth={1.5}
            rx={3}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: comp.id * 0.08 }}
          />
        ))}

        {/* Connection arrows showing flows */}
        <g opacity="0.25" stroke="#002D72" strokeWidth="1.2" fill="none">
          {/* HIV-negative → Undiagnosed */}
          <path d="M 42 20 L 54 20" markerEnd="url(#arrowhead)" />
          {/* Undiagnosed → Diagnosed */}
          <path d="M 70 28 L 58 40" markerEnd="url(#arrowhead)" />
          {/* Diagnosed → On Treatment */}
          <path d="M 38 56 L 32 68" markerEnd="url(#arrowhead)" />
          {/* On Treatment → Suppressed */}
          <path d="M 42 76 L 54 76" markerEnd="url(#arrowhead)" />
          {/* Suppressed → On Treatment (reverse) */}
          <path d="M 54 80 L 42 80" markerEnd="url(#arrowhead)" strokeDasharray="2,2" />
        </g>

        {/* Arrowhead marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#002D72" />
          </marker>
        </defs>

        {/* Animated particles flowing between compartments */}
        {particles.map((particle) => {
          const startComp = compartments[particle.startCompartment];
          const endComp = compartments[particle.endCompartment];

          const startX = startComp.x + startComp.width / 2;
          const startY = startComp.y + startComp.height / 2;
          const endX = endComp.x + endComp.width / 2;
          const endY = endComp.y + endComp.height / 2;

          return (
            <motion.circle
              key={particle.id}
              r={1.5}
              fill="url(#particle-gradient)"
              filter="url(#particle-glow)"
              initial={{ cx: startX, cy: startY, opacity: 0 }}
              animate={{
                cx: [startX, endX, startX],
                cy: [startY, endY, startY],
                opacity: [0, 0.9, 0.9, 0],
              }}
              transition={{
                duration: particle.duration * 2,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
