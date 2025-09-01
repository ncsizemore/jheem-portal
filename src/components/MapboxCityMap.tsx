'use client';

import { useState, memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker } from 'react-map-gl/mapbox';
import { CityData } from '../data/cities';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxCityMapProps {
  cities: CityData[];
  onCityHover?: (city: CityData, position: { x: number; y: number }) => void;
  onCityLeave?: () => void;
  onCityClick?: (city: CityData) => void;
  selectedCity?: CityData | null;
  hoveredCity?: CityData | null;
  loading?: boolean;
  sidebarOpen?: boolean;
  plotOpen?: boolean;
}

// Memoized city marker component to prevent unnecessary re-renders
const CityMarker = memo(({
  city,
  isHovered,
  isSelected,
  onHover,
  onLeave,
  onClick
}: {
  city: CityData;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: () => void;
}) => (
  <Marker
    key={city.code}
    longitude={city.coordinates[0]}
    latitude={city.coordinates[1]}
    anchor="center"
  >
    <div
      className={`relative cursor-pointer transition-all duration-300 transform ${isHovered ? 'scale-125' : isSelected ? 'scale-110' : 'scale-100'
        }`}
      onMouseEnter={(e) => onHover(e)}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        filter: isHovered || isSelected
          ? `drop-shadow(0 0 20px ${isSelected ? '#06b6d4' : '#3b82f6'})`
          : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
      }}
    >
      {/* Pulsing ring for selected/hovered */}
      {(isHovered || isSelected) && (
        <div
          className={`absolute inset-0 rounded-full animate-ping ${isSelected ? 'bg-cyan-400/40' : 'bg-blue-400/40'
            }`}
          style={{
            width: '24px',
            height: '24px',
            left: '-4px',
            top: '-4px'
          }}
        />
      )}

      {/* Enhanced clickable marker with visual feedback */}
      <div
        className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${isSelected
            ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 border-cyan-300'
            : isHovered
              ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300'
              : 'bg-gradient-to-br from-cyan-500 to-blue-500 border-white/40 hover:border-cyan-300'
          }`}
        style={{
          boxShadow: isSelected || isHovered
            ? `0 0 16px ${isSelected ? 'rgba(6, 182, 212, 0.8)' : 'rgba(59, 130, 246, 0.8)'}`
            : '0 3px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
        }}
      >
        {/* Click affordance - subtle inner highlight */}
        <div className="absolute inset-0.5 rounded-full bg-white/20"></div>
      </div>

      {/* City label for selected only (hide on hover since we show tooltip) */}
      {isSelected && !isHovered && (
        <div
          className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-2 py-1 rounded text-xs font-semibold whitespace-nowrap"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
        >
          {city.name.split(',')[0]}
        </div>
      )}
    </div>
  </Marker>
));

CityMarker.displayName = 'CityMarker';

const MapboxCityMap = memo(function MapboxCityMap({
  cities,
  onCityHover,
  onCityLeave,
  onCityClick,
  selectedCity,
  hoveredCity,
  loading,
  sidebarOpen,
  plotOpen
}: MapboxCityMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -95.7,
    latitude: 37.1,
    zoom: 4.3,
    pitch: 20,
    bearing: 0
  });

  const [localHoveredCity, setLocalHoveredCity] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  
  // Auto-hide instructions after 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInstructions(false);
    }, 15000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Hide instructions on first city interaction
  const hideInstructionsOnInteraction = useCallback(() => {
    if (showInstructions) {
      setShowInstructions(false);
    }
  }, [showInstructions]);
  
  // Map ref removed to fix TypeScript compatibility issues

  // Safe token management
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Choose appropriate style based on token availability
  const mapStyle = MAPBOX_TOKEN
    ? "mapbox://styles/mapbox/dark-v11"
    : "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

  // Filter cities based on search term
  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Smart display logic: show more when few cities, limit when many
  const maxDisplayCities = cities.length <= 10 ? cities.length : 8;
  const displayCities = filteredCities.slice(0, maxDisplayCities);
  const hasMoreCities = filteredCities.length > maxDisplayCities;

  return (
    <div
      className={`relative h-screen overflow-hidden transition-all duration-300 ${sidebarOpen && !plotOpen ? 'w-[calc(100%-384px)]' : 'w-screen'
        }`}
    >
      {/* Beautiful gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/20 pointer-events-none z-10"></div>

      {/* Enhanced header with clear instructions */}
      <AnimatePresence mode="wait">
        {showInstructions && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute top-6 left-6 z-20"
          >
            <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 max-w-sm relative">
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-blue-100 font-bold text-2xl mb-2 tracking-tight">
            JHEEM Plot Explorer
          </h1>
          <p className="text-white/90 text-sm font-medium leading-relaxed mb-3">
            Ryan White HIV/AIDS Program Analysis
          </p>
          
          {/* Clear instruction with visual cue */}
          <div className="bg-white/10 border border-cyan-400/30 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-cyan-100 text-sm font-semibold">How to Start</span>
            </div>
            <p className="text-white/80 text-xs leading-relaxed">
              Click any <span className="text-cyan-300 font-medium">blue dot</span> on the map to explore HIV funding scenarios and outcomes for that city
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
            <span className="text-white/70 text-xs font-medium tracking-wide">
              {loading ? 'Discovering available cities...' : `${cities.length} cities ready to explore`}
            </span>
          </div>
          
          {/* Dismiss button */}
          <button
            onClick={() => setShowInstructions(false)}
            className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors group"
            aria-label="Dismiss instructions"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
            </div>
          </motion.div>
        )}

        {/* Ready to Explore hint - shows after instructions dismiss */}
        {!showInstructions && !loading && cities.length > 0 && !plotOpen && (
          <motion.div
            key="ready-hint"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut", delay: 0.2 }}
            className="absolute top-6 left-6 z-20"
          >
            <div className="bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 rounded-xl shadow-xl p-4 max-w-64">
              <div className="flex items-start gap-3 text-blue-100">
                <div className="relative mt-1">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute inset-0 animate-ping opacity-75">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold block mb-1">
                    Ready to Explore
                  </span>
                  <p className="text-xs text-blue-200 leading-relaxed">
                    Click any city dot to see HIV funding analysis data
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive city list with search - hide when plot is open for cinematic effect */}
      {!plotOpen && (
        <div className="absolute bottom-6 left-6 z-20 transition-all duration-300">
          <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-3 w-64">
            <div className="flex items-center gap-2 mb-2">
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
              <>
                {/* Search input */}
                <div className="mb-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search cities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50"
                    />
                    <svg className="absolute right-3 top-2.5 w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchTerm && (
                    <div className="text-xs text-white/70 mt-1">
                      {filteredCities.length} result{filteredCities.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* City list */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {displayCities.map((city) => (
                    <button
                      key={city.code}
                      onClick={() => onCityClick?.(city)}
                      onMouseEnter={() => setLocalHoveredCity(city.name)}
                      onMouseLeave={() => setLocalHoveredCity(null)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all duration-200 ${selectedCity?.code === city.code
                          ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30'
                          : localHoveredCity === city.name
                            ? 'bg-blue-500/20 text-blue-100 border border-blue-400/30'
                            : 'text-white/80 border border-transparent hover:bg-white/5'
                        }`}
                    >
                      {city.name.split(',')[0]}
                      <span className="text-xs opacity-60 ml-1">
                        {city.name.split(',').slice(1).join(',').trim()}
                      </span>
                    </button>
                  ))}

                  {/* Show count of remaining cities */}
                  {hasMoreCities && (
                    <div className="text-xs text-white/60 text-center pt-2 border-t border-white/10">
                      {searchTerm ?
                        `+${filteredCities.length - maxDisplayCities} more matching "${searchTerm}"` :
                        `+${filteredCities.length - maxDisplayCities} more cities (use search to find specific cities)`
                      }
                    </div>
                  )}

                  {/* No results state */}
                  {searchTerm && filteredCities.length === 0 && (
                    <div className="text-center py-4">
                      <div className="text-white/60 text-sm">No cities found</div>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-cyan-400 text-xs hover:text-cyan-300 mt-1"
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mapbox GL Map with 3D tilt */}
      <Map
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
        {/* Optimized city markers with memoization */}
        {cities.map((city) => (
          <CityMarker
            key={city.code}
            city={city}
            isHovered={hoveredCity?.code === city.code}
            isSelected={selectedCity?.code === city.code}
            onHover={(e: React.MouseEvent) => {
              hideInstructionsOnInteraction();
              setLocalHoveredCity(city.name);
              if (onCityHover) {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                const position = {
                  x: rect.left + rect.width / 2,
                  y: rect.top
                };
                onCityHover(city, position);
              }
            }}
            onLeave={() => {
              setLocalHoveredCity(null);
              onCityLeave?.();
            }}
            onClick={() => {
              hideInstructionsOnInteraction();
              onCityClick?.(city);
            }}
          />
        ))}
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
      
      {/* Success indicator when city is selected */}
      {!loading && cities.length > 0 && sidebarOpen && (
        <div className="absolute bottom-8 right-8 z-20">
          <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-400/30 rounded-xl shadow-xl p-4">
            <div className="flex items-center gap-3 text-emerald-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold">
                City Selected
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MapboxCityMap.displayName = 'MapboxCityMap';

export default MapboxCityMap;
