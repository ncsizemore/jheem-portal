import { useState, useEffect } from 'react';
import { ALL_CITIES, AVAILABLE_SCENARIOS, CityData } from '../data/cities';

interface UseAvailableCitiesReturn {
  availableCities: CityData[];
  loading: boolean;
  error: string | null;
  totalChecked: number;
  totalCities: number;
}

/**
 * Hook to discover which cities currently have plot data available
 * Uses single API call instead of checking each city/scenario individually
 */
export const useAvailableCities = (): UseAvailableCitiesReturn => {
  const [availableCities, setAvailableCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const discoverAvailableCities = async () => {
      setLoading(true);
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        setError('API base URL not configured');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching all available cities with single API call...');
        console.log('🌐 API URL:', `${baseUrl}/plots/cities`);
        
        // Add timeout for API calls
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(`${baseUrl}/plots/cities`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Response error:', errorText);
          
          // Provide more specific error messages
          if (response.status === 404) {
            throw new Error('Cities data endpoint not found. Please check API configuration.');
          } else if (response.status >= 500) {
            throw new Error('Server error occurred. Please try again later.');
          } else if (response.status === 403) {
            throw new Error('Access denied. Please check API permissions.');
          } else {
            throw new Error(`Failed to fetch cities: ${response.status} - ${errorText}`);
          }
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format: expected JSON object');
        }
        
        if (!data.cities || typeof data.cities !== 'object') {
          throw new Error('Invalid response format: missing or invalid cities data');
        }
        
        console.log('✅ Received city data:', data);

        // Map backend data to frontend city data with coordinates
        const citiesWithData: CityData[] = [];
        
        for (const [cityCode, scenarios] of Object.entries(data.cities)) {
          // Validate scenarios is an array
          if (!Array.isArray(scenarios)) {
            console.warn(`⚠️ Invalid scenarios data for city ${cityCode}:`, scenarios);
            continue;
          }
          
          // Find the city info with coordinates from our static data
          const cityInfo = ALL_CITIES.find(c => c.code === cityCode);
          
          if (cityInfo) {
            citiesWithData.push({
              ...cityInfo,
              availableScenarios: scenarios as string[]
            });
            console.log(`🎯 ${cityInfo.name}: ${scenarios.length} scenarios available`);
          } else {
            console.warn(`⚠️ City ${cityCode} found in database but not in static city list`);
          }
        }

        if (citiesWithData.length === 0) {
          throw new Error('No valid cities found with available data');
        }

        setAvailableCities(citiesWithData);
        console.log(`🚀 Discovery complete: ${citiesWithData.length} cities with data (single API call)`);

      } catch (err) {
        console.error('❌ Error during city discovery:', err);
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            setError('Request timed out. Please check your internet connection and try again.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Unknown error during discovery');
        }
      } finally {
        setLoading(false);
      }
    };

    discoverAvailableCities();
  }, []);

  return {
    availableCities,
    loading,
    error,
    totalChecked: availableCities.length, // Now this is immediate
    totalCities: availableCities.length
  };
};

/**
 * Hook to get available scenarios and outcomes for a specific city
 * This now uses cached data from the initial discovery call
 */
export const useCityData = (cityCode: string) => {
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cityCode) {
      setScenarios([]);
      return;
    }

    // In the future, this could use cached data from useAvailableCities
    // For now, keeping the existing implementation for compatibility
    const fetchCityData = async () => {
      setLoading(true);
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        setError('API base URL not configured');
        setLoading(false);
        return;
      }

      const availableScenarios: string[] = [];

      try {
        for (const scenario of AVAILABLE_SCENARIOS) {
          const searchUrl = `${baseUrl}/plots/search?city=${cityCode}&scenario=${scenario}`;
          const response = await fetch(searchUrl);
          
          if (response.ok) {
            const data = await response.json();
            if (data.total_plots && data.total_plots > 0) {
              availableScenarios.push(scenario);
            }
          }
        }

        setScenarios(availableScenarios);
      } catch (err) {
        console.error('Error fetching city data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch city data');
      } finally {
        setLoading(false);
      }
    };

    fetchCityData();
  }, [cityCode]);

  return { scenarios, loading, error };
};
