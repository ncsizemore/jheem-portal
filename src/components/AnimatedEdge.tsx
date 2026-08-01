'use client';

import { BaseEdge, EdgeProps, getStraightPath } from '@xyflow/react';
import { useMemo } from 'react';

function seededRandom(seedText: string) {
  let seed = Array.from(seedText).reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619),
    2166136261,
  ) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function generateParticles(edgeId: string) {
  const random = seededRandom(edgeId);
  // Generate 2-6 particles per edge (more variation)
  const particleCount = 2 + Math.floor(random() * 5);

  return Array.from({ length: particleCount }, () => {
    // Highly varied delays (0-5 seconds) for staggered starts
    const delay = random() * 5;

    // Varied speeds (1-4 seconds duration) for different flow rates
    const duration = 1 + random() * 3;

    // Slight size variation (3-4.5px radius)
    const size = 3 + random() * 1.5;

    return { delay, duration, size };
  });
}

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // Seeded variation is stable across renders and server/client hydration.
  const particles = useMemo(() => generateParticles(id), [id]);

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {particles.map((particle, i) => (
        <circle
          key={i}
          r={particle.size}
          fill="url(#particle-gradient)"
          filter="url(#particle-glow)"
        >
          <animateMotion
            dur={`${particle.duration}s`}
            repeatCount="indefinite"
            path={edgePath}
            begin={`${particle.delay}s`}
          />
          <animate
            attributeName="opacity"
            values="0;0.9;0.8;0.6;0"
            dur={`${particle.duration}s`}
            repeatCount="indefinite"
            begin={`${particle.delay}s`}
          />
        </circle>
      ))}
    </>
  );
}
