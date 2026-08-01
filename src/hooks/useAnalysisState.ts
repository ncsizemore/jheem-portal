/**
 * useAnalysisState - Manages selection state for AnalysisView
 *
 * Handles:
 * - Scenario, outcome, statistic, facet selection
 * - Facet dimension toggles (age, sex, race, risk)
 * - Computed facet key from active dimensions
 * - Default value initialization from config
 */

import { useState, useCallback, useMemo } from 'react';
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
  // Facet dimension toggles
  const [facetDimensions, setFacetDimensions] = useState<FacetDimensionState>(INITIAL_FACET_STATE);

  const resolvedScenario = selectedScenario || (isDataLoaded
    ? config.scenarios.find((scenario) => availableOptions.scenarios.includes(scenario.id))?.id
      || availableOptions.scenarios[0]
      || ''
    : '');
  const resolvedOutcome = selectedOutcome || (isDataLoaded
    ? (availableOptions.outcomes.includes(config.defaults.outcome)
        ? config.defaults.outcome
        : availableOptions.outcomes[0] || '')
    : '');
  const resolvedStatistic = selectedStatistic || (isDataLoaded
    ? (availableOptions.statistics.includes(config.defaults.statistic)
        ? config.defaults.statistic
        : availableOptions.statistics[0] || '')
    : '');

  // Get the set of facet keys available for the current outcome/statistic.
  const availableFacetKeys = useMemo(() => {
    // Try per-outcome lookup
    if (scenarioData && resolvedOutcome && resolvedStatistic) {
      const statData = scenarioData[resolvedOutcome]?.[resolvedStatistic];
      if (statData) return new Set(Object.keys(statData) as string[]);
    }
    // Fallback: global facet list
    return new Set(availableOptions.facets);
  }, [availableOptions.facets, scenarioData, resolvedOutcome, resolvedStatistic]);

  const effectiveFacetDimensions = useMemo(() => {
    const activeDims = (Object.entries(facetDimensions) as Array<[FacetDimension, boolean]>)
      .filter(([, active]) => active)
      .map(([dimension]) => dimension)
      .sort();
    const key = activeDims.length === 0 ? 'none' : activeDims.join('+');
    return key !== 'none' && !availableFacetKeys.has(key)
      ? INITIAL_FACET_STATE
      : facetDimensions;
  }, [availableFacetKeys, facetDimensions]);

  // Compute which facet dimensions can be toggled given the current selection.
  // A dimension is available if toggling it would produce a facet key that exists in the data.
  const availableFacetDimensions = useMemo(() => {
    const dims: FacetDimensionState = { age: false, sex: false, race: false, risk: false };
    const allDims: FacetDimension[] = ['age', 'sex', 'race', 'risk'];

    for (const dim of allDims) {
      // Build the facet key that would result from toggling this dimension
      const hypothetical = { ...effectiveFacetDimensions, [dim]: !effectiveFacetDimensions[dim] };
      const activeDims = allDims.filter(d => hypothetical[d]).sort();
      const key = activeDims.length === 0 ? 'none' : activeDims.join('+');
      dims[dim] = availableFacetKeys.has(key);
    }
    return dims;
  }, [availableFacetKeys, effectiveFacetDimensions]);

  // Compute facet key from toggled dimensions
  const computedFacetKey = useMemo(() => {
    const activeDims = Object.entries(effectiveFacetDimensions)
      .filter(([, active]) => active)
      .map(([dim]) => dim)
      .sort();
    return activeDims.length === 0 ? 'none' : activeDims.join('+');
  }, [effectiveFacetDimensions]);

  const selectedFacet = availableFacetKeys.has(computedFacetKey)
    ? computedFacetKey
    : computedFacetKey !== 'none' && availableFacetKeys.size > 0
      ? (availableFacetKeys.has('none') ? 'none' : [...availableFacetKeys][0])
      : '';

  // Toggle handler for facet dimensions
  const toggleFacetDimension = useCallback((dim: FacetDimension) => {
    setFacetDimensions((previous) => {
      const activeDims = (Object.entries(previous) as Array<[FacetDimension, boolean]>)
        .filter(([, active]) => active)
        .map(([dimension]) => dimension)
        .sort();
      const key = activeDims.length === 0 ? 'none' : activeDims.join('+');
      const base = key !== 'none' && !availableFacetKeys.has(key)
        ? INITIAL_FACET_STATE
        : previous;
      return { ...base, [dim]: !base[dim] };
    });
  }, [availableFacetKeys]);

  const selectOutcome = useCallback((outcome: string) => {
    setSelectedOutcome(outcome);
    setFacetDimensions(INITIAL_FACET_STATE);
  }, []);

  const selectStatistic = useCallback((statistic: string) => {
    setSelectedStatistic(statistic);
    setFacetDimensions(INITIAL_FACET_STATE);
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
    selectedScenario: resolvedScenario,
    selectedOutcome: resolvedOutcome,
    selectedStatistic: resolvedStatistic,
    selectedFacet,
    facetDimensions: effectiveFacetDimensions,
    availableFacetDimensions,
    setSelectedScenario,
    setSelectedOutcome: selectOutcome,
    setSelectedStatistic: selectStatistic,
    toggleFacetDimension,
    resetFacetDimensions,
    resetSelections,
  };
}
