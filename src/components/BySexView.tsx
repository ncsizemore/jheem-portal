'use client';

import DemographicView, { DemographicDataItem } from './DemographicView';
import { getMultiStateSexData, SEX_CATEGORIES, SexCategory } from '@/data/hiv-age-projections-sex';

interface BySexViewProps {
  selectedStateNames: string[];
  onStateChange: (states: string[]) => void;
  selectedSexCategories: SexCategory[];
  onSexCategoriesChange: (sexCategories: SexCategory[]) => void;
  normalized: boolean;
  onNormalizedChange: (normalized: boolean) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
}

/**
 * BySexView - Sex-stratified demographic analysis
 *
 * This component provides sex-specific breakdowns using the generic DemographicView.
 * It shows data for MSM (Men who have Sex with Men) vs Non-MSM categories.
 */
export default function BySexView({
  selectedStateNames,
  onStateChange,
  selectedSexCategories,
  onSexCategoriesChange,
  normalized,
  onNormalizedChange,
  yearRange,
  onYearRangeChange,
}: BySexViewProps) {

  // Adapter function to convert sex data to generic demographic data format
  const getSexData = (stateCodes: string[], categories: SexCategory[]): DemographicDataItem[] => {
    const sexData = getMultiStateSexData(stateCodes, categories);

    // Transform to generic format
    return sexData.map(item => ({
      state_code: item.state_code,
      state_name: item.state_name,
      category: item.sex,
      category_label: item.sex_label,
      data: item.data
    }));
  };

  return (
    <DemographicView
      selectedStateNames={selectedStateNames}
      onStateChange={onStateChange}
      selectedCategories={selectedSexCategories}
      onCategoriesChange={onSexCategoriesChange}
      normalized={normalized}
      onNormalizedChange={onNormalizedChange}
      yearRange={yearRange}
      onYearRangeChange={onYearRangeChange}
      categoryLabel="Sex Categories"
      categorySingular="category"
      categoryOptions={SEX_CATEGORIES}
      getDataFn={getSexData}
      emptyMessage="Please select at least one state and one sex category to view data."
    />
  );
}
