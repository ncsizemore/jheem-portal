'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CityData } from '@/data/cities';

interface CityHoverTooltipProps {
  city: CityData;
  position: { x: number; y: number };
}

export default React.memo(function CityHoverTooltip({ city, position }: CityHoverTooltipProps) {
  const scenarioCount = city.availableScenarios?.length || 0;
  const cityShortName = city.name.split(',')[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="fixed pointer-events-none z-[45]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -120%)'
      }}
    >
      <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl px-3 py-2 max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
          <span className="text-white font-semibold text-sm">
            {cityShortName}
          </span>
        </div>
        <div className="text-white/80 text-xs">
          {scenarioCount > 0 ? (
            <>
              {scenarioCount} scenario{scenarioCount !== 1 ? 's' : ''} available
              <div className="text-white/60 mt-0.5">Click to explore</div>
            </>
          ) : (
            <span className="text-white/60">No data available</span>
          )}
        </div>
      </div>
      
      {/* Small arrow pointing to city */}
      <div 
        className="absolute left-1/2 top-full w-0 h-0"
        style={{
          transform: 'translateX(-50%)',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '4px solid rgba(0, 0, 0, 0.9)'
        }}
      />
    </motion.div>
  );
});