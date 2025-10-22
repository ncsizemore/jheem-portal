'use client';

import DemographicView, { DemographicDataItem } from './DemographicView';
import { getMultiStateRaceData, RACE_CATEGORIES, RaceCategory } from '@/data/hiv-age-projections-race';

interface ByRaceViewProps {
  selectedStateNames: string[];
  onStateChange: (states: string[]) => void;
  selectedRaces: RaceCategory[];
  onRacesChange: (races: RaceCategory[]) => void;
  normalized: boolean;
  onNormalizedChange: (normalized: boolean) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
}

/**
 * ByRaceView - Race-stratified demographic analysis
 *
 * This component provides race-specific breakdowns using the generic DemographicView.
 * It shows data for Black, Hispanic, and Other racial categories.
 */
export default function ByRaceView({
  selectedStateNames,
  onStateChange,
  selectedRaces,
  onRacesChange,
  normalized,
  onNormalizedChange,
  yearRange,
  onYearRangeChange,
}: ByRaceViewProps) {

  // Adapter function to convert race data to generic demographic data format
  const getRaceData = (stateCodes: string[], categories: RaceCategory[]): DemographicDataItem[] => {
    const raceData = getMultiStateRaceData(stateCodes, categories);

    // Transform to generic format
    return raceData.map(item => ({
      state_code: item.state_code,
      state_name: item.state_name,
      category: item.race,
      category_label: item.race_label,
      data: item.data
    }));
  };

  return (
    <DemographicView
      selectedStateNames={selectedStateNames}
      onStateChange={onStateChange}
      selectedCategories={selectedRaces}
      onCategoriesChange={onRacesChange}
      normalized={normalized}
      onNormalizedChange={onNormalizedChange}
      yearRange={yearRange}
      onYearRangeChange={onYearRangeChange}
      categoryLabel="Races"
      categorySingular="race"
      categoryOptions={RACE_CATEGORIES}
      categoryTooltips={{
        other: 'Includes White, Asian, Native American, and multiracial groups'
      }}
      getDataFn={getRaceData}
      emptyMessage="Please select at least one state and one race to view data."
    />
  );
}
