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
  // Optional: scenario data keyed by outcome > statistic > facet.
  // When provided, facet availability is computed per-outcome/statistic
  // instead of from the global facet list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scenarioData?: Record<string, any> | null;
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
  scenarioData,
}: UseAnalysisStateOptions): AnalysisState {
  // Selection state
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [selectedStatistic, setSelectedStatistic] = useState<string>('');
  const [selectedFacet, setSelectedFacet] = useState<string>('');

  // Facet dimension toggles
  const [facetDimensions, setFacetDimensions] = useState<FacetDimensionState>(INITIAL_FACET_STATE);

  // Get the set of facet keys available for the current outcome/statistic.
  const availableFacetKeys = useMemo(() => {
    // Try per-outcome lookup
    if (scenarioData && selectedOutcome && selectedStatistic) {
      const statData = scenarioData[selectedOutcome]?.[selectedStatistic];
      if (statData) return new Set(Object.keys(statData) as string[]);
    }
    // Fallback: global facet list
    return new Set(availableOptions.facets);
  }, [availableOptions.facets, scenarioData, selectedOutcome, selectedStatistic]);

  // Compute which facet dimensions can be toggled given the current selection.
  // A dimension is available if toggling it would produce a facet key that exists in the data.
  const availableFacetDimensions = useMemo(() => {
    const dims: FacetDimensionState = { age: false, sex: false, race: false, risk: false };
    const allDims: FacetDimension[] = ['age', 'sex', 'race', 'risk'];

    for (const dim of allDims) {
      // Build the facet key that would result from toggling this dimension
      const hypothetical = { ...facetDimensions, [dim]: !facetDimensions[dim] };
      const activeDims = allDims.filter(d => hypothetical[d]).sort();
      const key = activeDims.length === 0 ? 'none' : activeDims.join('+');
      dims[dim] = availableFacetKeys.has(key);
    }
    return dims;
  }, [availableFacetKeys, facetDimensions]);

  // Compute facet key from toggled dimensions
  const computedFacetKey = useMemo(() => {
    const activeDims = Object.entries(facetDimensions)
      .filter(([, active]) => active)
      .map(([dim]) => dim)
      .sort();
    return activeDims.length === 0 ? 'none' : activeDims.join('+');
  }, [facetDimensions]);

  // When available facet keys change (e.g., outcome switch), reset dimensions
  // if the current combo is no longer valid.
  useEffect(() => {
    const activeDims = (['age', 'sex', 'race', 'risk'] as FacetDimension[]).filter(d => facetDimensions[d]).sort();
    const currentKey = activeDims.length === 0 ? 'none' : activeDims.join('+');
    if (currentKey !== 'none' && !availableFacetKeys.has(currentKey)) {
      setFacetDimensions(INITIAL_FACET_STATE);
    }
  // Only trigger on facet key changes, not on facetDimensions changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableFacetKeys]);

  // Sync selectedFacet with computed key
  useEffect(() => {
    if (availableFacetKeys.has(computedFacetKey)) {
      setSelectedFacet(computedFacetKey);
    } else if (computedFacetKey !== 'none' && availableFacetKeys.size > 0) {
      // Requested facet combination not available, fall back
      setSelectedFacet(availableFacetKeys.has('none') ? 'none' : [...availableFacetKeys][0]);
    }
  }, [computedFacetKey, availableFacetKeys]);

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
