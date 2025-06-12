'use client';

import { useState, useRef, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import { CityData } from '../data/cities';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxCityMapProps {
  cities: CityData[];
  onCitySelect: (city: CityData) => void;
  selectedCity?: CityData | null;
  loading?: boolean;
}

export default function MapboxCityMap({ cities, onCitySelect, selectedCity, loading }: MapboxCityMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -95.7,
    latitude: 37.1,
    zoom: 4.3, // Slightly out to keep California visible
    pitch: 60, // This gives us the 3D tilt effect
    bearing: 0
  });

  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  // Alternative: Use Mapbox's minimal style (requires token)
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.your-token-here';

  // Debugging: log the token (first few chars only)
  console.log('Mapbox token starts with:', MAPBOX_TOKEN?.substring(0, 10));

  // Use a simple style that should work
  const mapStyle = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'pk.your-token-here'
    ? "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"  // Force CartoDB dark no labels
    : "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"; // Fallback without labels

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Beautiful gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/20 pointer-events-none z-10"></div>

      {/* Glassmorphism header */}
      <div className="absolute top-6 left-6 z-20">
        <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 max-w-sm">
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-blue-100 font-bold text-2xl mb-2 tracking-tight">
            JHEEM Plot Explorer
          </h1>
          <p className="text-white/90 text-sm font-medium leading-relaxed">
            Ryan White HIV/AIDS Program Analysis
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
            <span className="text-white/80 text-xs font-medium tracking-wide">
              Interactive 3D Discovery
            </span>
          </div>
        </div>
      </div>

      {/* Interactive city list */}
      <div className="absolute top-6 right-6 z-20">
        <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-4 w-80">
          <div className="flex items-center gap-3 mb-3">
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
          
          {!loading && cities.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {cities.slice(0, 8).map((city) => (
                <button
                  key={city.code}
                  onClick={() => onCitySelect(city)}
                  onMouseEnter={() => setHoveredCity(city.name)}
                  onMouseLeave={() => setHoveredCity(null)}
                  className={`w-full text-left p-2 rounded-lg text-sm transition-all duration-200 ${
                    selectedCity?.code === city.code
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30'
                      : hoveredCity === city.name
                      ? 'bg-blue-500/20 text-blue-100 border border-blue-400/30'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {city.name.split(',')[0]}
                  <span className="text-xs opacity-60 ml-1">
                    {city.name.split(',').slice(1).join(',').trim()}
                  </span>
                </button>
              ))}
              {cities.length > 8 && (
                <div className="text-xs text-white/60 text-center pt-2 border-t border-white/10">
                  +{cities.length - 8} more cities
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mapbox GL Map with 3D tilt */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        dragPan={true}
        dragRotate={false}
        scrollZoom={true}
        doubleClickZoom={false}
        touchZoomRotate={false}
        attributionControl={false}
        reuseMaps={true}
      >
        {/* City markers with enhanced 3D effect */}
        {cities.map((city) => {
          const isHovered = hoveredCity === city.name;
          const isSelected = selectedCity?.code === city.code;

          return (
            <Marker
              key={city.code}
              longitude={city.coordinates[0]}
              latitude={city.coordinates[1]}
              anchor="center"
            >
              <div
                className={`relative cursor-pointer transition-all duration-300 transform ${
                  isHovered ? 'scale-125' : isSelected ? 'scale-110' : 'scale-100'
                }`}
                onMouseEnter={() => setHoveredCity(city.name)}
                onMouseLeave={() => setHoveredCity(null)}
                onClick={() => onCitySelect(city)}
                style={{
                  filter: isHovered || isSelected 
                    ? `drop-shadow(0 0 20px ${isSelected ? '#06b6d4' : '#3b82f6'})` 
                    : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
                }}
              >
                {/* Pulsing ring for selected/hovered */}
                {(isHovered || isSelected) && (
                  <div 
                    className={`absolute inset-0 rounded-full animate-ping ${
                      isSelected ? 'bg-cyan-400/40' : 'bg-blue-400/40'
                    }`}
                    style={{
                      width: '24px',
                      height: '24px',
                      left: '-4px',
                      top: '-4px'
                    }}
                  />
                )}
                
                {/* Clean, modern marker */}
                <div
                  className={`w-4 h-4 rounded-full ${
                    isSelected 
                      ? 'bg-gradient-to-br from-cyan-400 to-cyan-600' 
                      : isHovered 
                      ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                      : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                  }`}
                  style={{
                    boxShadow: isSelected || isHovered 
                      ? `0 0 12px ${isSelected ? 'rgba(6, 182, 212, 0.6)' : 'rgba(59, 130, 246, 0.6)'}` 
                      : '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                />
                
                {/* City label for selected OR hovered */}
                {(isSelected || isHovered) && (
                  <div 
                    className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-2 py-1 rounded text-xs font-semibold whitespace-nowrap"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
                  >
                    {city.name.split(',')[0]}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Enhanced loading indicator */}
      {loading && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6">
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
