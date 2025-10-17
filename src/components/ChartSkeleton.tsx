'use client';

import React from 'react';

interface ChartSkeletonProps {
  count?: number;
  height?: number;
}

export default function ChartSkeleton({ count = 2, height = 400 }: ChartSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 animate-pulse"
        >
          {/* Chart Title Skeleton */}
          <div className="mb-4 text-center space-y-2">
            <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md w-3/4 mx-auto"></div>
            <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md w-1/2 mx-auto"></div>
          </div>

          {/* Chart Area Skeleton */}
          <div className="relative" style={{ height: `${height}px` }}>
            {/* Y-axis */}
            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-2 bg-gray-200 rounded w-full"></div>
              ))}
            </div>

            {/* Bars */}
            <div className="absolute left-10 right-8 top-0 bottom-8 flex items-end justify-around gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-gray-300 via-gray-200 to-gray-100 rounded-t-md"
                  style={{
                    height: `${Math.random() * 60 + 40}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                ></div>
              ))}
            </div>

            {/* X-axis */}
            <div className="absolute left-10 right-8 bottom-0 h-6 flex justify-around">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-2 bg-gray-200 rounded w-6"></div>
              ))}
            </div>
          </div>

          {/* Legend Skeleton */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
              >
                <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
                <div className="h-3 bg-gray-300 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .animate-pulse > * > .bg-gradient-to-r,
        .animate-pulse > * > * > .bg-gradient-to-r,
        .animate-pulse > * > * > * > .bg-gradient-to-t {
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
}
