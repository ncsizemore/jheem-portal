'use client';

import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

// Mock city data for performance testing
const testCities = [
  { code: "NYC", name: "New York", coordinates: [-74.0059, 40.7128] },
  { code: "LA", name: "Los Angeles", coordinates: [-118.2437, 34.0522] },
  { code: "CHI", name: "Chicago", coordinates: [-87.6298, 41.8781] },
  { code: "HOU", name: "Houston", coordinates: [-95.3698, 29.7604] },
  { code: "PHX", name: "Phoenix", coordinates: [-112.0740, 33.4484] }
];

export default function MapSpeedTest() {
  const [loadStartTime] = useState(Date.now());
  const [mapLoadTime, setMapLoadTime] = useState<number | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    // Measure when component finishes mounting
    const timer = setTimeout(() => {
      setMapLoadTime(Date.now() - loadStartTime);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadStartTime]);

  const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Performance Stats Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            React Simple Maps - Performance Test
          </h1>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-600">Load Start:</span>
              <span className="ml-2 font-mono">{new Date(loadStartTime).toLocaleTimeString()}</span>
            </div>
            {mapLoadTime && (
              <div>
                <span className="text-gray-600">Map Load Time:</span>
                <span className="ml-2 font-mono font-bold text-blue-600">{mapLoadTime}ms</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Cities:</span>
              <span className="ml-2 font-bold">{testCities.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected City Info */}
      {selectedCity && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="max-w-6xl mx-auto">
            <p className="text-blue-800">
              <span className="font-semibold">Selected:</span> {selectedCity}
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="h-screen bg-gray-900 relative">
        {/* Performance indicator */}
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Performance Test</div>
          <div className="text-sm font-bold text-gray-900">
            {mapLoadTime ? `${mapLoadTime}ms` : 'Loading...'}
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredCity && (
          <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3">
            <div className="text-sm font-bold text-gray-900">{hoveredCity}</div>
            <div className="text-xs text-gray-600">Click to select</div>
          </div>
        )}

        <ComposableMap
          projection="geoAlbersUsa"
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        >
          {/* US Geography */}
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#374151"
                  stroke="#4b5563"
                  strokeWidth={0.8}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#4b5563" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* City markers */}
          {testCities.map((city) => (
            <Marker
              key={city.code}
              coordinates={city.coordinates}
              onMouseEnter={() => setHoveredCity(city.name)}
              onMouseLeave={() => setHoveredCity(null)}
              onClick={() => setSelectedCity(city.name)}
            >
              <circle
                r={selectedCity === city.name ? 12 : (hoveredCity === city.name ? 10 : 8)}
                fill={selectedCity === city.name ? "#2563eb" : (hoveredCity === city.name ? "#3b82f6" : "#1d4ed8")}
                stroke="#ffffff"
                strokeWidth={2}
                className="cursor-pointer transition-all duration-200"
              />
              {selectedCity === city.name && (
                <text
                  textAnchor="middle"
                  y={-18}
                  className="fill-white text-sm font-bold pointer-events-none"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }}
                >
                  {city.name}
                </text>
              )}
            </Marker>
          ))}
        </ComposableMap>

        {/* Load completion indicator */}
        {mapLoadTime && (
          <div className="absolute bottom-4 left-4 z-10 bg-green-500 text-white rounded-lg px-3 py-2 text-sm font-medium">
            ✓ Map loaded in {mapLoadTime}ms
          </div>
        )}
      </div>
    </div>
  );
}
