/**
 * useAnalysisState - Manages selection state for AnalysisView
 *
 * Handles:
 * - Scenario, outcome, statistic, facet selection
 * - Facet dimension toggles (age, sex, race, risk)
 * - Computed facet key from active dimensions
 * - Default value initialization from config
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ModelConfig } from '@/config/model-configs';

export type FacetDimension = 'age' | 'sex' | 'race' | 'risk';

export interface FacetDimensionState {
  age: boolean;
  sex: boolean;
  race: boolean;
  risk: boolean;
}

export interface AvailableOptions {
  scenarios: string[];
  outcomes: string[];
  statistics: string[];
  facets: string[];
}

export interface UseAnalysisStateOptions {
  config: ModelConfig;
  availableOptions: AvailableOptions;
  isDataLoaded: boolean;
}

export interface AnalysisState {
  // Selection state
  selectedScenario: string;
  selectedOutcome: string;
  selectedStatistic: string;
  selectedFacet: string;

  // Facet dimensions
  facetDimensions: FacetDimensionState;
  availableFacetDimensions: FacetDimensionState;

  // Setters
  setSelectedScenario: (scenario: string) => void;
  setSelectedOutcome: (outcome: string) => void;
  setSelectedStatistic: (statistic: string) => void;

  // Facet helpers
  toggleFacetDimension: (dim: FacetDimension) => void;
  resetFacetDimensions: () => void;

  // Reset all selections (for location change)
  resetSelections: () => void;
}

const INITIAL_FACET_STATE: FacetDimensionState = {
  age: false,
  sex: false,
  race: false,
  risk: false,
};

export function useAnalysisState({
  config,
  availableOptions,
  isDataLoaded,
}: UseAnalysisStateOptions): AnalysisState {
  // Selection state
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('');
  const [selectedFacet, setSelectedFacet] = useState<string>('');

  // Facet dimension toggles
  const [facetDimensions, setFacetDimensions] = useState<FacetDimensionState>(INITIAL_FACET_STATE);

  // Compute which facet dimensions are available in the data
  const availableFacetDimensions = useMemo(() => {
    const dims: FacetDimensionState = { age: false, sex: false, race: false, risk: false };
    for (const facet of availableOptions.facets) {
      if (facet.includes('age')) dims.age = true;
      if (facet.includes('sex')) dims.sex = true;
      if (facet.includes('race')) dims.race = true;
      if (facet.includes('risk')) dims.risk = true;
    }
    return dims;
  }, [availableOptions.facets]);

  // Compute facet key from toggled dimensions
  const computedFacetKey = useMemo(() => {
    const activeDims = Object.entries(facetDimensions)
      .filter(([, active]) => active)
      .map(([dim]) => dim)
      .sort();
    return activeDims.length === 0 ? 'none' : activeDims.join('+');
  }, [facetDimensions]);

  // Sync selectedFacet with computed key
  useEffect(() => {
    if (availableOptions.facets.includes(computedFacetKey)) {
      setSelectedFacet(computedFacetKey);
    } else if (computedFacetKey !== 'none' && availableOptions.facets.length > 0) {
      // Requested facet combination not available, fall back
      setSelectedFacet(availableOptions.facets.includes('none') ? 'none' : availableOptions.facets[0]);
    }
  }, [computedFacetKey, availableOptions.facets]);

  // Set defaults when data loads
  useEffect(() => {
    if (isDataLoaded) {
      if (availableOptions.scenarios.length && !selectedScenario) {
        // Use first scenario from config that's available in data
        const availableScenario = config.scenarios.find(s => availableOptions.scenarios.includes(s.id));
        setSelectedScenario(availableScenario?.id || availableOptions.scenarios[0]);
      }
      if (availableOptions.outcomes.length && !selectedOutcome) {
        const defaultOutcome = availableOptions.outcomes.includes(config.defaults.outcome)
          ? config.defaults.outcome
          : availableOptions.outcomes[0];
        setSelectedOutcome(defaultOutcome);
      }
      if (availableOptions.statistics.length && !selectedStatistic) {
        const defaultStat = availableOptions.statistics.includes(config.defaults.statistic)
          ? config.defaults.statistic
          : availableOptions.statistics[0];
        setSelectedStatistic(defaultStat);
      }
    }
  }, [isDataLoaded, config, availableOptions, selectedScenario, selectedOutcome, selectedStatistic]);

  // Toggle handler for facet dimensions
  const toggleFacetDimension = useCallback((dim: FacetDimension) => {
    setFacetDimensions(prev => ({ ...prev, [dim]: !prev[dim] }));
  }, []);

  // Reset facet dimensions
  const resetFacetDimensions = useCallback(() => {
    setFacetDimensions(INITIAL_FACET_STATE);
  }, []);

  // Reset all selections (for location change)
  const resetSelections = useCallback(() => {
    setSelectedScenario('');
    setSelectedOutcome('');
    setSelectedStatistic('');
    setFacetDimensions(INITIAL_FACET_STATE);
  }, []);

  return {
    selectedScenario,
    selectedOutcome,
    selectedStatistic,
    selectedFacet,
    facetDimensions,
    availableFacetDimensions,
    setSelectedScenario,
    setSelectedOutcome,
    setSelectedStatistic,
    toggleFacetDimension,
    resetFacetDimensions,
    resetSelections,
  };
}
