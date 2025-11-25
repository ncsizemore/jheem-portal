# ⚠️ POSTPONED - HIV Age Projections - Median Age Implementation Plan

**Status**: POSTPONED as of 2025-11-04
**Reason**: Could not validate colleague's median age calculations (62.5% match rate using PCLM)

See `DATA_FLOW_SUMMARY.md` for full investigation details and decision rationale.

**To Resume This Feature**:
1. Contact colleague who generated `med_age_timeline_*_loc_arr.Rdata` files
2. Get exact jheem2 version, PCLM parameters, and preprocessing steps used
3. Verify source data file versions match
4. Achieve >95% validation match rate before proceeding with UI integration
5. Alternative: Accept colleague's data with documentation noting methodology uncertainty

---

## Original Plan (Kept for Reference)

**Date**: 2025-11-04
**Goal**: Add median age data to tooltips and sparklines across all views

---

## Overview

### What We're Adding

1. **Chart Tooltips** - Add median age statistic and clarifying labels
2. **Sparklines** - Switch from 55+ % to median age with proper normalization
3. **All Three Views** - States Only, States × Race, States × Sex

### Team Feedback Summary

- Tooltips should clarify that age cohort numbers are **medians** (not point estimates)
- Add **median age statistic** to tooltip (e.g., "Median Age: 51 years")
- Sparklines should show **median age trend** (51 → 62 years), not 55+ percentage
- Sparklines need **normalization fix** (absolute Y-axis scale for comparability)
- Faceted view sparklines need to show **demographic-specific** median age

---

## Data Sources

### What We Have

✅ **Colleague provided**:
- `med_age_timeline_race_loc_arr.Rdata` - [year, location, sim, race]
- `med_age_timeline_sex_loc_arr.Rdata` - [year, location, sim, sex]

❌ **Need to generate**:
- States-only median age - [year, location, sim]

### Data Structure

**Format after get_stats()**:
```r
stats_arr[metric, year, location, demographic]
# metric = c("lower", "median", "upper", "mean")
# year = 2025:2040 (16 years)
# location = 24 state codes + "total"
# demographic = race (3) or sex (2) or none
```

**JSON Output (median with CIs)**:
```json
{
  "metadata": {
    "generated_date": "2025-11-04",
    "source": "JHEEM HIV Age Projections Model",
    "description": "Median age by state and year",
    "confidence_level": 0.95,
    "notes": "Confidence intervals represent 2.5th and 97.5th percentiles across 1000 simulations"
  },
  "states": [
    {
      "state_code": "CA",
      "state_name": "California",
      "data": [
        {
          "year": 2025,
          "median_age": {
            "median": 51,
            "lower": 50,
            "upper": 52
          }
        },
        {
          "year": 2026,
          "median_age": {
            "median": 52,
            "lower": 51,
            "upper": 53
          }
        }
        // ... through 2040
      ]
    }
    // ... all states
  ]
}
```

---

## Implementation Plan

### Phase 1: Data Generation (R Scripts) - 1.5 hours

#### Task 1: Process colleague's race data (30 min)
**Script**: `scripts/process_colleague_median_age_race.R`
**Input**: `Rdata Objects/med_age_timeline_race_loc_arr.Rdata`
**Output**: `src/data/median-age-projections-race.json`

```r
# Load and process
source('helpers.R')
load('Rdata Objects/med_age_timeline_race_loc_arr.Rdata')

# Apply get_stats to collapse simulations
stats_arr <- get_stats(med_age_timeline_race_arr,
                       keep.dimensions = c('year', 'location', 'race'))

# Format for webapp (by state × race)
# 24 states × 3 races = 72 combinations
# Each with 16 years of median age values

write_json(output, 'median-age-projections-race.json')
```

#### Task 2: Process colleague's sex data (30 min)
**Script**: `scripts/process_colleague_median_age_sex.R`
**Input**: `Rdata Objects/med_age_timeline_sex_loc_arr.Rdata`
**Output**: `src/data/median-age-projections-sex.json`

```r
# Same structure as race, but for sex dimension
# 24 states × 2 sex categories = 48 combinations
```

#### Task 3: Generate states-only median age (30 min)
**Script**: `scripts/prepare_median_age_data.R`
**Input**: `Rdata Objects/age_results.Rdata`
**Output**: `src/data/median-age-projections.json`

```r
# Load age_results (aggregated, no demographics)
load('Rdata Objects/age_results.Rdata')

# Extract subset
data_subset <- age_results["2025":"2040", , , "diagnosed.prevalence", , "noint"]

# Calculate median age using get_med_age()
median_ages <- get_med_age(data_subset, keep.dimensions = c('year', 'location'))

# Apply get_stats
stats_arr <- get_stats(median_ages, keep.dimensions = c('year', 'location'))

# Add "total" by summing all states
# Format for webapp
# 24 states + 1 total = 25 entries
```

**Note**: Include CIs in the JSON files (median, lower, upper) for future use. Currently only displaying median in UI, but having CIs available will make it easy to add confidence bands or tooltips later.

---

### Phase 2: TypeScript Integration (1 hour)

#### Task 4: Integrate median age data into TypeScript (30 min)

**Files to modify**:
- `src/data/hiv-age-projections.ts`
- `src/data/hiv-age-projections-race.ts`
- `src/data/hiv-age-projections-sex.ts`

**Changes**:
```typescript
// Import new JSON files
import medianAgeData from './median-age-projections.json';
import medianAgeRaceData from './median-age-projections-race.json';
import medianAgeSexData from './median-age-projections-sex.json';

// Update interface
export interface MedianAgeData {
  median: number;
  lower: number;
  upper: number;
}

export interface YearProjection {
  year: number;
  age_cohorts: AgeCohortsData;
  median_age?: MedianAgeData;  // NEW - optional for backward compatibility
}

// Merge median age into existing data structures
export const HIV_AGE_PROJECTIONS: StateAgeData[] = realDataAggregated.states.map(state => {
  const medianAgeForState = medianAgeData.states.find(s => s.state_code === state.state_code);

  return {
    state_code: state.state_code,
    state_name: state.state_name,
    data: state.data.map((yearData, index) => ({
      year: yearData.year,
      age_cohorts: {
        '13-24': yearData.age_cohorts['13-24 years'].median,
        '25-34': yearData.age_cohorts['25-34 years'].median,
        '35-44': yearData.age_cohorts['35-44 years'].median,
        '45-54': yearData.age_cohorts['45-54 years'].median,
        '55+': yearData.age_cohorts['55+ years'].median,
      },
      median_age: medianAgeForState?.data[index]?.median_age  // NEW - includes {median, lower, upper}
    }))
  };
});
```

#### Task 5: Verify data loads correctly (30 min)
- Test in browser console
- Check sample values (CA 2025 should be ~51 years)
- Verify all 25 states have median age
- Check race/sex data merges correctly

---

### Phase 3: Chart Tooltip Updates (30 min)

#### Task 6: Add median age and clarifying labels to tooltip

**File**: `src/components/AgeDistributionChart.tsx`
**Location**: `CustomTooltip` function (lines 71-137)

**Changes**:
```typescript
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);

    // NEW: Get median age for this year
    const yearData = data.find(d => d.year === label);
    const medianAge = yearData?.median_age?.median;  // Extract median value

    return (
      <div className="relative z-50 bg-white/98 backdrop-blur-xl p-4 border-2 border-gray-200/60 rounded-2xl shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="mb-3 pb-2 border-b border-gray-200/70">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {stateName}
          </p>
          <p className="text-xl font-bold text-hopkins-blue">
            {label}
          </p>

          {/* NEW: Median age line */}
          {medianAge && (
            <p className="text-sm text-gray-700 mt-1 font-medium">
              Median Age: {medianAge} years
            </p>
          )}

          {/* NEW: Clarifying label */}
          <p className="text-[9px] text-gray-500 mt-1 italic">
            Median case counts (1000 simulations)
          </p>
        </div>

        {/* Age cohort data - UNCHANGED */}
        <div className="space-y-2">
          {payload.reverse().map((entry, index) => (
            // ... existing cohort display
          ))}
        </div>

        {/* Total - UNCHANGED */}
        {!normalized && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            // ... existing total display
          </div>
        )}
      </div>
    );
  }
  return null;
};
```

**Test**:
- Hover over California 2025 → should show "Median Age: 51 years"
- Hover over California 2040 → should show "Median Age: 62 years"
- Check tooltip doesn't overflow or look cluttered

---

### Phase 4: Sparkline Updates (2 hours)

#### Task 7: Fix sparkline normalization (30 min)

**File**: `src/components/StateSelector.tsx`
**Location**: `AgingSparkline` component (lines 13-53)

**Current issue**: Each sparkline scaled to its own min/max (relative scaling)
```typescript
// CURRENT - Makes all trends look equally steep
const y = range > 0 ? height - ((value - min) / range) * height : height / 2;
```

**Fix**: Use absolute Y-axis scale
```typescript
// NEW - Use fixed scale for comparability
const GLOBAL_MIN = 40;  // Minimum expected median age
const GLOBAL_MAX = 75;  // Maximum expected median age
const globalRange = GLOBAL_MAX - GLOBAL_MIN;

const y = globalRange > 0
  ? height - ((value - GLOBAL_MIN) / globalRange) * height
  : height / 2;
```

**Test**:
- States with slow aging (48 → 52) should show gentle slope
- States with fast aging (51 → 72) should show steep slope
- All sparklines visually comparable

#### Task 8: Switch sparklines from 55+ % to median age (45 min)

**File**: `src/components/StateSelector.tsx`
**Location**: `AgingSparkline` component (lines 13-53)

**Current**: Calculate 55+ percentage
```typescript
const trend = useMemo(() => {
  return stateData.data.map(yearData => {
    const total = Object.values(yearData.age_cohorts).reduce((sum, val) => sum + val, 0);
    return (yearData.age_cohorts['55+'] / total) * 100; // Percentage
  });
}, [stateData]);
```

**New**: Use median age
```typescript
const trend = useMemo(() => {
  return stateData.data.map(yearData => {
    return yearData.median_age?.median || 0; // Median age in years
  });
}, [stateData]);
```

**Update tooltip display** (lines 154-161):
```typescript
{/* OLD */}
<span className="text-[10px] text-gray-400">55+ trend:</span>

{/* NEW */}
<div className="flex flex-col gap-0.5">
  <span className="text-[10px] text-gray-400">Median age:</span>
  <span className="text-[9px] font-semibold text-emerald-400">
    {stateData.data[0].median_age?.median}y → {stateData.data[stateData.data.length - 1].median_age?.median}y
  </span>
</div>
```

**Display example**:
```
California
Median age:
51y → 62y
[sparkline showing trend]
```

**Test**:
- Hover over CA button → should show "51y → 62y"
- Sparkline should rise from left to right
- Values match tooltip when clicking state

#### Task 9: Fix faceted view sparklines (45 min)

**File**: `src/components/DemographicView.tsx`
**Location**: StateSelector usage (lines 177-186)

**Current issue**: StateSelector always shows aggregate state data, not demographic-specific

**Two approaches**:

**Approach A: Pass demographic data to StateSelector**
```typescript
// In DemographicView, create demographic-specific state objects
const demographicStateData = useMemo(() => {
  return selectedStateNames.map(stateName => {
    // Get median age for this state × demographic combination
    const stateCode = getStateCode(stateName);
    const demographicData = getDemographicMedianAge(stateCode, selectedCategories);

    return {
      state_name: stateName,
      data: demographicData  // Has median_age per year for this state+demographic
    };
  });
}, [selectedStateNames, selectedCategories]);

// Pass to StateSelector
<StateSelector
  selectedStates={selectedStateNames}
  onStateChange={onStateChange}
  maxStates={maxStates}
  demographicData={demographicStateData}  // NEW prop
/>
```

**Approach B: Show aggregate sparklines with note**
- Keep sparklines showing overall state median age
- Add note: "Sparkline shows overall state trend"
- Simpler but less accurate for demographic views

**Recommendation**: Approach A for accuracy

**Test**:
- States × Race view: Hover CA → should show Black median age if Black selected
- States × Sex view: Hover CA → should show MSM median age if only MSM selected
- If multiple categories selected, show range or aggregate

---

## Testing Checklist

### Data Validation
- [ ] All 3 JSON files generated successfully
- [ ] File sizes reasonable (~3-8 KB each)
- [ ] Sample values match expectations:
  - [ ] CA 2025: ~51 years
  - [ ] CA 2040: ~62 years
  - [ ] CA Black 2025: ~51 years
  - [ ] CA MSM 2040: ~72 years

### States Only View
- [ ] Chart tooltip shows median age
- [ ] Chart tooltip shows "median case counts" label
- [ ] Sparklines show median age (not 55+ %)
- [ ] Sparklines properly normalized (comparable slopes)
- [ ] Sparkline tooltip shows "51y → 62y" format

### States × Race View
- [ ] Chart tooltip shows median age for selected race
- [ ] Sparklines show race-specific median age
- [ ] All 3 race categories work correctly

### States × Sex View
- [ ] Chart tooltip shows median age for selected sex
- [ ] Sparklines show sex-specific median age
- [ ] Both sex categories work correctly

### Visual/UX
- [ ] Tooltips don't overflow or look cluttered
- [ ] Median age line clearly visible
- [ ] Sparklines visually comparable across states
- [ ] No performance regression (chart rendering speed)

---

## Bundle Size Impact

**Expected increase**: ~46 KB total (median + CIs)
- States: ~8 KB (25 states × 16 years × 3 values)
- Race: ~23 KB (72 combinations × 16 years × 3 values)
- Sex: ~15 KB (48 combinations × 16 years × 3 values)

**Current largest route**: 423 KB
**After changes**: ~469 KB (11% increase)

**Rationale**: Including CIs now (even if not displayed) makes future enhancements easier:
- Can add confidence bands to tooltips later
- Can show uncertainty in sparklines
- Clean data structure (no need for separate files)

---

## Time Estimate

| Phase | Time |
|-------|------|
| Phase 1: R scripts (3 files) | 1.5 hours |
| Phase 2: TypeScript integration | 1 hour |
| Phase 3: Chart tooltips | 0.5 hours |
| Phase 4: Sparklines | 2 hours |
| **Total** | **5 hours** |

---

## Files to Create/Modify

### New Files (R Scripts)
- [ ] `scripts/process_colleague_median_age_race.R`
- [ ] `scripts/process_colleague_median_age_sex.R`
- [ ] `scripts/prepare_median_age_data.R`

### New Files (JSON Data - includes CIs)
- [ ] `src/data/median-age-projections.json`
- [ ] `src/data/median-age-projections-race.json`
- [ ] `src/data/median-age-projections-sex.json`

### Modified Files
- [ ] `src/data/hiv-age-projections.ts` - Add median_age field, merge data
- [ ] `src/data/hiv-age-projections-race.ts` - Add median_age field, merge data
- [ ] `src/data/hiv-age-projections-sex.ts` - Add median_age field, merge data
- [ ] `src/components/AgeDistributionChart.tsx` - Add median age to tooltip
- [ ] `src/components/StateSelector.tsx` - Fix normalization, switch to median age
- [ ] `src/components/DemographicView.tsx` - Pass demographic data to sparklines

---

## Notes

- Colleague provided race and sex data already computed with `get_med_age()`
- We only need to generate states-only data ourselves
- CIs included in JSON files (median, lower, upper) for future use
- Currently displaying median only, but CIs available for future enhancements
- Sparkline normalization uses fixed 40-75 year range (adjustable if needed)
- Bundle size increase (~46 KB) is acceptable for data-rich visualization app

---

## Success Criteria

✅ Users see "Median Age: XX years" in chart tooltips
✅ Users understand age cohort numbers are medians (clear label)
✅ Sparklines show median age trend (not 55+ %)
✅ Sparklines visually comparable (proper normalization)
✅ All three views work (states, race, sex)
✅ Bundle size increase < 20 KB
✅ No performance regression
