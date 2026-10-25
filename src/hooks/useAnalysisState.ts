import { useState } from 'react';
import type { ModelConfig } from '@/config/model-configs';
import type { AggregatedLocationData } from './useCityData';
import {
  canonicalFacet,
  DIMENSIONS,
  getFacetChoices,
  resolveFacet,
} from '@/utils/analysisFacets';
import { updateAnalysisQuery, useAnalysisQuery } from './useAnalysisQuery';

export type FacetDimension = 'age' | 'sex' | 'race' | 'risk';
export type FacetDimensionState = Record<FacetDimension, boolean>;
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
  scenarioData?: AggregatedLocationData['data'][string] | null;
  allScenarioData?: AggregatedLocationData['data'] | null;
}
const EMPTY: FacetDimensionState = {
  age: false,
  race: false,
  sex: false,
  risk: false,
};
function choose(
  requested: string | null,
  fallback: string,
  available: string[],
) {
  return requested && available.includes(requested)
    ? requested
    : available.includes(fallback)
      ? fallback
      : (available[0] ?? '');
}

export function useAnalysisState({
  config,
  availableOptions,
  isDataLoaded,
  scenarioData,
  allScenarioData,
}: UseAnalysisStateOptions) {
  const query = useAnalysisQuery();
  // Explicit changes retain compatible choices. Invalid URL values never enter a data lookup.
  const [notice, setNotice] = useState('');
  const selectedScenario = choose(
    query.get('scenario'),
    config.scenarios[0]?.id ?? '',
    allScenarioData ? Object.keys(allScenarioData) : availableOptions.scenarios,
  );
  const currentScenario = allScenarioData
    ? allScenarioData[selectedScenario]
    : scenarioData;
  const outcomes = currentScenario
    ? Object.keys(currentScenario)
    : availableOptions.outcomes;
  const selectedOutcome = choose(
    query.get('outcome'),
    config.defaults.outcome,
    outcomes,
  );
  const statistics = currentScenario?.[selectedOutcome]
    ? Object.keys(currentScenario[selectedOutcome])
    : availableOptions.statistics;
  const selectedStatistic = choose(
    query.get('summary'),
    config.defaults.statistic,
    statistics,
  );
  const facetChoices = getFacetChoices(
    currentScenario?.[selectedOutcome]?.[selectedStatistic],
  );
  const requestedFacet = query.get('breakdown') || 'none';
  const selectedFacet = isDataLoaded
    ? resolveFacet(requestedFacet, facetChoices)
    : '';
  const facetDimensions = { ...EMPTY };
  for (const dim of DIMENSIONS)
    facetDimensions[dim] = selectedFacet.split('+').includes(dim);
  const availableFacetDimensions = { ...EMPTY };
  for (const dim of DIMENSIONS) {
    const next =
      DIMENSIONS.filter((d) => facetDimensions[d] !== (d === dim)).join('+') ||
      'none';
    availableFacetDimensions[dim] = facetChoices.some(
      (c) => canonicalFacet(c.key) === next,
    );
  }
  const change = (values: Record<string, string | null>) => {
    setNotice('');
    updateAnalysisQuery(values);
  };
  const changeMeasure = (
    key: 'outcome' | 'summary' | 'scenario',
    value: string,
  ) => {
    const scenario = key === 'scenario' ? value : selectedScenario;
    const outcome = key === 'outcome' ? value : selectedOutcome;
    const summary = key === 'summary' ? value : selectedStatistic;
    const nextData = allScenarioData?.[scenario] ?? scenarioData;
    const nextOutcome = choose(
      outcome,
      config.defaults.outcome,
      nextData ? Object.keys(nextData) : outcomes,
    );
    const nextStatistics = nextData?.[nextOutcome]
      ? Object.keys(nextData[nextOutcome])
      : statistics;
    const nextSummary = choose(
      summary,
      config.defaults.statistic,
      nextStatistics,
    );
    const nextFacet = resolveFacet(
      selectedFacet,
      getFacetChoices(nextData?.[nextOutcome]?.[nextSummary]),
    );
    updateAnalysisQuery({
      [key]: value,
      outcome: nextOutcome,
      summary: nextSummary,
      breakdown: nextFacet,
    });
    setNotice(
      canonicalFacet(nextFacet) !== canonicalFacet(selectedFacet)
        ? 'That breakdown is unavailable for this result. Showing the whole population.'
        : '',
    );
  };
  return {
    selectedScenario,
    selectedOutcome,
    selectedStatistic,
    selectedFacet,
    facetDimensions,
    availableFacetDimensions,
    facetChoices,
    availableOutcomes: outcomes,
    availableStatistics: statistics,
    selectionNotice:
      notice ||
      (isDataLoaded &&
      canonicalFacet(requestedFacet) !== canonicalFacet(selectedFacet)
        ? 'The requested breakdown is unavailable for this result. Showing an available breakdown.'
        : ''),
    setSelectedScenario: (value: string) => changeMeasure('scenario', value),
    setSelectedOutcome: (value: string) => changeMeasure('outcome', value),
    setSelectedStatistic: (value: string) => changeMeasure('summary', value),
    setSelectedFacet: (value: string) =>
      change({ breakdown: resolveFacet(value, facetChoices) }),
    toggleFacetDimension: (dim: FacetDimension) =>
      change({
        breakdown: resolveFacet(
          DIMENSIONS.filter((d) => facetDimensions[d] !== (d === dim)).join(
            '+',
          ) || 'none',
          facetChoices,
        ),
      }),
    resetFacetDimensions: () => change({ breakdown: null }),
    resetSelections: () =>
      change({ scenario: null, outcome: null, summary: null, breakdown: null }),
  };
}
