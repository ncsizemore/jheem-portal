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
        
        // SINGLE API call instead of 96 calls
        const response = await fetch(`${baseUrl}/plots/cities`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch cities: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Received city data:', data);

        // Map backend data to frontend city data with coordinates
        const citiesWithData: CityData[] = [];
        
        for (const [cityCode, scenarios] of Object.entries(data.cities)) {
          // Find the city info with coordinates from our static data
          const cityInfo = ALL_CITIES.find(c => c.code === cityCode);
          
          if (cityInfo) {
            citiesWithData.push({
              ...cityInfo,
              availableScenarios: scenarios as string[]
            });
            console.log(`🎯 ${cityInfo.name}: ${(scenarios as string[]).length} scenarios available`);
          } else {
            console.warn(`⚠️ City ${cityCode} found in database but not in static city list`);
          }
        }

        setAvailableCities(citiesWithData);
        console.log(`🚀 Discovery complete: ${citiesWithData.length} cities with data (single API call)`);

      } catch (err) {
        console.error('❌ Error during city discovery:', err);
        setError(err instanceof Error ? err.message : 'Unknown error during discovery');
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
