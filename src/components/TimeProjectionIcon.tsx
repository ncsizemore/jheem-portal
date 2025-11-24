'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function TimeProjectionIcon() {
  // Generate uncertainty cone vertices
  const uncertaintyCone = useMemo(() => {
    const startX = 16;
    const endX = 79;
    const baseY = 48;
    const startSpread = 3;
    const endSpread = 18;

    // Create expanding cone shape
    return `M ${startX} ${baseY - startSpread}
            L ${endX} ${baseY - endSpread}
            L ${endX} ${baseY + endSpread}
            L ${startX} ${baseY + startSpread}
            Z`;
  }, []);

  // Timeline dots between 2025 and 2040
  const timelineDots = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      id: `dot-${i}`,
      cx: 37 + (i * 10),
      cy: 12,
    }));
  }, []);

  // Generate random path variations for dynamic movement
  const randomPaths = useMemo(() => {
    const generatePath = (baseTop: number, baseBottom: number) => {
      return Array.from({ length: 4 }).map(() => {
        const y = baseTop + Math.random() * (baseBottom - baseTop);
        return Math.round(y);
      });
    };

    return {
      path1: generatePath(32, 60),
      path2: generatePath(35, 58),
      path3: generatePath(38, 62),
    };
  }, []);

  return (
    <div className="w-full h-full">
      <svg viewBox="0 0 96 96" className="w-full h-full">
        <defs>
          {/* Gradient for uncertainty cone */}
          <linearGradient id="uncertainty-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#002D72" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#68ACE5" stopOpacity="0.06" />
          </linearGradient>

          {/* Glow filter for milestones */}
          <filter id="milestone-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Uncertainty cone - expanding area of possibilities */}
        <motion.path
          d={uncertaintyCone}
          fill="url(#uncertainty-gradient)"
          stroke="#68ACE5"
          strokeWidth="1.5"
          strokeOpacity="0.25"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ transformOrigin: "16px 48px" }}
        />

        {/* Shifting projection lines within cone - moving dynamically with randomization */}
        <g>
          {/* First projection line - randomized sweeping motion */}
          <motion.path
            d={`M 16 48 Q 40 ${randomPaths.path1[0]}, 79 ${randomPaths.path1[0]}`}
            fill="none"
            stroke="#68ACE5"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [0, 0.7, 0.7],
              d: randomPaths.path1.map((y) => `M 16 48 Q 40 ${y}, 79 ${y}`),
            }}
            transition={{
              pathLength: { duration: 1.5, ease: "easeOut" },
              opacity: { duration: 0.8 },
              d: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 },
            }}
          />
          {/* Moving dot at end of first line */}
          <motion.circle
            r="3"
            fill="#68ACE5"
            initial={{ cx: 16, cy: 48, opacity: 0 }}
            animate={{
              cx: 79,
              cy: [randomPaths.path1[0], randomPaths.path1[1], randomPaths.path1[2], randomPaths.path1[3]],
              opacity: [0, 0.8, 0.8, 0.8],
            }}
            transition={{
              cx: { duration: 1.5, ease: "easeOut" },
              cy: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 },
              opacity: { duration: 0.8 },
            }}
          />

          {/* Second projection line - randomized crossing pattern */}
          <motion.path
            d={`M 16 48 Q 40 ${randomPaths.path2[0]}, 79 ${randomPaths.path2[0]}`}
            fill="none"
            stroke="#F2C413"
            strokeWidth="2.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [0, 0.85, 0.85],
              d: randomPaths.path2.map((y) => `M 16 48 Q 40 ${y}, 79 ${y}`),
            }}
            transition={{
              pathLength: { duration: 1.5, ease: "easeOut" },
              opacity: { duration: 0.8 },
              d: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.7 },
            }}
          />
          {/* Moving dot at end of second line */}
          <motion.circle
            r="3.5"
            fill="#F2C413"
            initial={{ cx: 16, cy: 48, opacity: 0 }}
            animate={{
              cx: 79,
              cy: [randomPaths.path2[0], randomPaths.path2[1], randomPaths.path2[2], randomPaths.path2[3]],
              opacity: [0, 0.9, 0.9, 0.9],
            }}
            transition={{
              cx: { duration: 1.5, ease: "easeOut" },
              cy: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.7 },
              opacity: { duration: 0.8 },
            }}
          />

          {/* Third projection line - randomized dynamic wave */}
          <motion.path
            d={`M 16 48 Q 40 ${randomPaths.path3[0]}, 79 ${randomPaths.path3[0]}`}
            fill="none"
            stroke="#002D72"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [0, 0.6, 0.6],
              d: randomPaths.path3.map((y) => `M 16 48 Q 40 ${y}, 79 ${y}`),
            }}
            transition={{
              pathLength: { duration: 1.5, ease: "easeOut" },
              opacity: { duration: 0.8 },
              d: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.9 },
            }}
          />
          {/* Moving dot at end of third line */}
          <motion.circle
            r="3"
            fill="#002D72"
            initial={{ cx: 16, cy: 48, opacity: 0 }}
            animate={{
              cx: 79,
              cy: [randomPaths.path3[0], randomPaths.path3[1], randomPaths.path3[2], randomPaths.path3[3]],
              opacity: [0, 0.7, 0.7, 0.7],
            }}
            transition={{
              cx: { duration: 1.5, ease: "easeOut" },
              cy: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.9 },
              opacity: { duration: 0.8 },
            }}
          />
        </g>

        {/* Timeline dots between years - pulsing to show progression */}
        <g>
          {timelineDots.map((dot, idx) => (
            <motion.circle
              key={dot.id}
              cx={dot.cx}
              cy={dot.cy}
              r="1.5"
              fill="#002D72"
              opacity="0"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0.2, 0.5, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.8 + idx * 0.4,
              }}
            />
          ))}
        </g>

        {/* Time milestones */}
        <g>
          {/* 2025 - Present (Starting point) */}
          <g>
            <motion.circle
              cx="16"
              cy="48"
              r="7"
              fill="#002D72"
              filter="url(#milestone-glow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
            <motion.circle
              cx="16"
              cy="48"
              r="3"
              fill="white"
              opacity="0.4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            />
            {/* Pulsing ring to emphasize "now" */}
            <motion.circle
              cx="16"
              cy="48"
              r="7"
              fill="none"
              stroke="#002D72"
              strokeWidth="1.5"
              opacity="0"
              animate={{
                r: [7, 12],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <text x="16" y="16" textAnchor="middle" fill="#002D72" fontSize="11" fontWeight="700">
              2025
            </text>
          </g>

          {/* 2040 - Just text label, no dot */}
          <g>
            <text x="79" y="16" textAnchor="middle" fill="#002D72" fontSize="11" fontWeight="700">
              2040
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
