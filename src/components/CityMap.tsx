'use client';

import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { CityData } from '../data/cities';

interface CityMapProps {
  cities: CityData[];
  onCitySelect: (city: CityData) => void;
  selectedCity?: CityData | null;
  loading?: boolean;
}

export default function CityMap({ cities, onCitySelect, selectedCity, loading }: CityMapProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // US TopoJSON file URL (free from react-simple-maps)
  const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

  if (!isMounted) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Dark gradient background with subtle animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 -z-10">
        {/* Animated background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>
      
      {/* Glassmorphism header */}
      <div className="absolute top-6 left-6 z-20">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 max-w-sm">
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-cyan-100 font-bold text-2xl mb-2 tracking-tight">
            JHEEM Plot Explorer
          </h1>
          <p className="text-white/80 text-sm font-medium leading-relaxed">
            Ryan White HIV/AIDS Program Analysis
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
            <span className="text-white/70 text-xs font-medium tracking-wide">
              Interactive Discovery Platform
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced city count indicator */}
      <div className="absolute top-6 right-6 z-20">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
              <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-white font-semibold text-sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-cyan-400 rounded-full animate-spin"></div>
                  <span className="text-white/90">Discovering...</span>
                </span>
              ) : (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-100">
                  {cities.length} Cities Available
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced hover tooltip */}
      {hoveredCity && (
        <div className="absolute top-24 right-6 z-30 transform transition-all duration-300 ease-out">
          <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-6 max-w-xs">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mt-1 animate-pulse shadow-lg shadow-blue-500/50"></div>
              <div>
                <p className="font-bold text-gray-900 text-base leading-tight">
                  {hoveredCity.split(',')[0]}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {hoveredCity.split(',').slice(1).join(',').trim()}
                </p>
                <div className="mt-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3">
                  <p className="text-blue-600 text-xs font-medium flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Click to explore available plots
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Map with dark theme */}
      <div className="relative z-10">
        <ComposableMap
          projection="geoAlbersUsa"
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        >
        {/* US Geography with visible styling */}
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#374151"
                stroke="#4b5563"
                strokeWidth={1}
                style={{
                  default: { 
                    outline: "none",
                    transition: "all 0.3s ease"
                  },
                  hover: { 
                    outline: "none", 
                    fill: "#4b5563",
                    transition: "all 0.3s ease"
                  },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {/* Enhanced city markers with glow effects */}
        {cities.map((city) => {
          const isHovered = hoveredCity === city.name;
          const isSelected = selectedCity?.code === city.code;
          
          return (
            <Marker
              key={city.code}
              coordinates={city.coordinates}
              onMouseEnter={() => setHoveredCity(city.name)}
              onMouseLeave={() => setHoveredCity(null)}
              onClick={() => onCitySelect(city)}
            >
              {/* Outer glow ring for selected/hovered */}
              {(isHovered || isSelected) && (
                <circle
                  r={isSelected ? 18 : 15}
                  fill="none"
                  stroke={isSelected ? "#06b6d4" : "#3b82f6"}
                  strokeWidth="2"
                  opacity="0.6"
                  className="animate-ping"
                />
              )}
              
              {/* Main marker with gradient */}
              <circle
                r={isSelected ? 12 : (isHovered ? 10 : 7)}
                fill={isSelected ? "url(#selectedGradient)" : (isHovered ? "url(#hoveredGradient)" : "url(#defaultGradient)")}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-300 ease-out"
                style={{
                  filter: isHovered || isSelected 
                    ? `drop-shadow(0 0 12px ${isSelected ? '#06b6d4' : '#3b82f6'})` 
                    : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                }}
              />
              
              {/* Inner highlight */}
              <circle
                r={isSelected ? 6 : (isHovered ? 5 : 3)}
                fill="rgba(255, 255, 255, 0.8)"
                className="pointer-events-none"
              />
              
              {/* City label for selected city */}
              {isSelected && (
                <text
                  textAnchor="middle"
                  y={-20}
                  className="fill-white text-sm font-bold pointer-events-none select-none"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))',
                    fontSize: '14px'
                  }}
                >
                  {city.name.split(',')[0]}
                </text>
              )}
            </Marker>
          );
        })}
        
        {/* SVG Definitions for gradients and effects */}
        <defs>
          <radialGradient id="defaultGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>
          
          <radialGradient id="hoveredGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          
          <radialGradient id="selectedGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0e7490" />
          </radialGradient>
        </defs>
        </ComposableMap>
      </div>

      {/* Enhanced loading indicator */}
      {loading && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-4 text-white">
              <div className="relative">
                <div className="w-8 h-8 border-3 border-white/30 border-t-cyan-400 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-8 h-8 border-3 border-transparent border-t-blue-400 rounded-full animate-spin reverse-spin"></div>
              </div>
              <div>
                <p className="font-semibold text-lg">Discovering Cities</p>
                <p className="text-white/70 text-sm font-medium">
                  Scanning for available analysis data...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced empty state */}
      {!loading && cities.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 text-center max-w-md mx-6">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h2 className="text-gray-900 font-bold text-xl mb-4">No Data Available</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              No cities currently have generated plots. Run the batch plot generation script to populate the database with analysis results.
            </p>
            <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 rounded-xl p-4">
              <p className="text-blue-700 text-xs font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check backend services and ensure data processing is complete
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success indicator */}
      {!loading && cities.length > 0 && (
        <div className="absolute bottom-8 right-8 z-20">
          <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-400/30 rounded-xl shadow-xl p-4">
            <div className="flex items-center gap-3 text-emerald-300">
              <div className="relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="absolute inset-0 animate-ping">
                  <svg className="w-5 h-5 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-semibold">
                Discovery Complete
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
