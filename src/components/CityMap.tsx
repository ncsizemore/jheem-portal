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
    <div className="relative h-screen w-screen">
      {/* Main Map Container - Simplified background */}
      <div className="absolute inset-0 bg-gray-900">
        
        {/* Clean title overlay */}
        <div className="absolute top-6 left-6 z-10">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h1 className="text-gray-900 font-bold text-xl mb-1">
              JHEEM Plot Explorer
            </h1>
            <p className="text-gray-600 text-sm">
              Ryan White HIV/AIDS Program Analysis
            </p>
          </div>
        </div>

        {/* Clean city count indicator */}
        <div className="absolute top-6 right-6 z-10">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-2 text-gray-900">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium">
                {loading ? 'Loading...' : `${cities.length} Cities Available`}
              </span>
            </div>
          </div>
        </div>

        {/* Simple hover tooltip */}
        {hoveredCity && (
          <div className="absolute top-24 right-6 bg-white rounded-lg shadow-lg p-4 z-20 max-w-xs">
            <p className="font-bold text-gray-900 text-base">{hoveredCity}</p>
            <p className="text-gray-600 text-sm">
              Click to explore available plots
            </p>
          </div>
        )}

        {/* Map */}
        <ComposableMap
          projection="geoAlbersUsa"
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        >
          {/* US Geography - Simplified styling */}
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
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#4b5563" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* City markers - Simplified styling, no expensive effects */}
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
                <circle
                  r={isHovered || isSelected ? 10 : 7}
                  fill={isSelected ? "#2563eb" : (isHovered ? "#3b82f6" : "#1d4ed8")}
                  stroke="#ffffff"
                  strokeWidth={2}
                  opacity={1}
                  className="cursor-pointer transition-all duration-200"
                />
                
                {/* City label for selected city */}
                {isSelected && (
                  <text
                    textAnchor="middle"
                    y={-18}
                    className="fill-white text-sm font-bold pointer-events-none"
                    style={{
                      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))'
                    }}
                  >
                    {city.name.split(',')[0]}
                  </text>
                )}
              </Marker>
            );
          })}
        </ComposableMap>

        {/* Simple loading indicator */}
        {loading && (
          <div className="absolute bottom-6 left-6 z-10">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-3 text-gray-900">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">
                  Loading cities...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && cities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
              <h2 className="text-gray-900 font-bold text-xl mb-4">No Data Available</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                No cities currently have generated plots. Run the batch plot generation script to populate the database with analysis results.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
