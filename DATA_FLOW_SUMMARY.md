# Data Flow Summary: HIV Age Projections App

**Date**: 2025-11-04
**Last Updated**: 2025-11-04
**Purpose**: Document data sources and processing for the HIV Age Projections webapp

---

## Current State (Production ✅)

### Bar Chart Display (Age Cohort Counts)

**Data Flow**:
```
race_results.Rdata (source)
    ↓
prepare_race_data.R (processing)
    ↓
hiv-age-projections-by-race.json (output)
    ↓
hiv-age-projections-race.ts (TypeScript)
    ↓
ByRaceView.tsx (UI component)
```

**Example Data** (AL, Black, 2025):
- 13-24 years: **214 people**
- 25-34 years: **2,739 people**
- 35-44 years: **2,570 people**
- 45-54 years: **1,479 people**
- 55+ years: **2,971 people**

**Verification**: ✅ JSON matches source Rdata
**Status**: ✅ Working correctly, matches paper

---

## File Inventory

### Source Data Files (R)

**Location**: `/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis/Rdata Objects/`

| File | Contains | Dimensions | Purpose |
|------|----------|------------|---------|
| `race_results.Rdata` | Age cohort counts | [31 years, 5 ages, 3 races, 1000 sims, 9 outcomes, 24 states, 1 intervention] | Source for bar charts (race view) |
| `sex_results.Rdata` | Age cohort counts by sex | Similar to race_results | Source for bar charts (sex view) |
| `age_results.Rdata` | Age cohort counts (aggregated) | [31 years, 5 ages, 1000 sims, 8 outcomes, 24 states, 1 intervention] | Source for bar charts (states-only) |
| `race_sex_results.Rdata` | Age cohort counts (race × sex) | [31 years, 5 ages, 3 races, 3 sex, 1000 sims, 9 outcomes, 24 states, 1 intervention] | Most granular data (not currently used) |

### Processing Scripts (R)

**Location**: `/Users/cristina/wiley/Documents/jheem-portal/scripts/`

| Script | Source | Output | Status |
|--------|--------|--------|--------|
| `prepare_race_data.R` | race_results.Rdata | hiv-age-projections-by-race.json | ✅ Production |
| `prepare_sex_data.R` | sex_results.Rdata | hiv-age-projections-by-sex.json | ✅ Production |
| `prepare_hiv_age_data.R` | age_results.Rdata | hiv-age-projections-aggregated.json | ✅ Production |

### Output Data Files (JSON)

**Location**: `/Users/cristina/wiley/Documents/jheem-portal/src/data/`

| File | Size | Generated | Status |
|------|------|-----------|--------|
| `hiv-age-projections-by-race.json` | 1.0 MB | 2025-10-20 | ✅ Production |
| `hiv-age-projections-by-sex.json` | 673 KB | 2025-10-22 | ✅ Production |
| `hiv-age-projections-aggregated.json` | 290 KB | 2025-10-20 | ✅ Production |

### TypeScript Files

**Location**: `/Users/cristina/wiley/Documents/jheem-portal/src/data/`

| File | Purpose | Status |
|------|---------|--------|
| `hiv-age-projections-race.ts` | Imports race JSON, exports typed data | ✅ Production |
| `hiv-age-projections-sex.ts` | Imports sex JSON, exports typed data | ✅ Production |
| `hiv-age-projections.ts` | Imports states JSON, exports typed data | ✅ Production |

---

## Data Structure

### Age Cohort Counts (Current)

```json
{
  "year": 2025,
  "age_cohorts": {
    "13-24 years": { "median": 214, "lower": 198, "upper": 231 },
    "25-34 years": { "median": 2739, "lower": 2655, "upper": 2828 },
    "35-44 years": { "median": 2570, "lower": 2485, "upper": 2659 },
    "45-54 years": { "median": 1479, "lower": 1411, "upper": 1552 },
    "55+ years": { "median": 2971, "lower": 2872, "upper": 3073 }
  }
}
```

**Notes**:
- Values represent **number of people** with diagnosed HIV in each age cohort
- Median and 95% CI computed from 1000 JHEEM simulations
- Used to generate stacked bar charts in webapp

---

## Median Age Feature (Postponed)

### Background

**Team Request**: Add median age statistics to:
1. Chart tooltips (e.g., "Median Age: 51 years")
2. Sparkline indicators (replace 55+ percentage with median age trend)
3. Clarifying label that age cohort numbers are medians

### Investigation Summary (2025-11-04)

**Colleague provided pre-calculated files**:
- `med_age_timeline_race_loc_arr.Rdata` - [16 years, 24 states, 1000 sims, 3 races]
- `med_age_timeline_sex_loc_arr.Rdata` - [16 years, 24 states, 1000 sims, 2 sex]

**Validation Results**:
- Attempted to replicate calculation using PCLM method
- Tested with `race_results.Rdata` → 62.5% match (30/48 points within ±1 year)
- Tested with `race_sex_results.Rdata` (summed across sex) → 62.5% match (identical results)
- Maximum difference: 11 years (Florida, Hispanic, 2035)
- Mean absolute difference: 3.89 years across 48 test points

**Why We Couldn't Replicate Exactly**:

Possible causes for 62.5% match rate:
1. Different jheem2 package version (PCLM implementation may differ)
2. Different PCLM parameters not visible in colleague's scripts
3. Different version of source data file
4. Undocumented preprocessing steps

**Key Finding**: Even using the same source file (`race_sex_results.Rdata`) and method (PCLM), we could not achieve >90% match rate. The 62.5% consistency is insufficient for production use without understanding the discrepancy.

### Decision: Postponed

**Rationale**:
1. **Cannot verify correctness** - 62.5% match rate is too low for production deployment
2. **Disproportionate time investment** - Multiple hours spent debugging for sparkline/tooltip feature
3. **Better cost/benefit ratio** - Focus on higher-impact features
4. **Lack of colleague access** - Cannot verify computation environment or methods
5. **Clean implementation preferred** - If revisited, start fresh with colleague's direct involvement

**To Revisit This Feature**:
1. Schedule time with colleague who generated the files
2. Get exact jheem2 version, PCLM parameters, and preprocessing steps
3. Verify source data file versions match
4. Aim for >95% validation match before UI integration
5. Alternatively: Accept colleague's data with documentation noting source/methodology uncertainty

---

## File Locations Quick Reference

**Source Data**: `/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis/Rdata Objects/`
**R Scripts**: `/Users/cristina/wiley/Documents/jheem-portal/scripts/`
**JSON Output**: `/Users/cristina/wiley/Documents/jheem-portal/src/data/`
**TypeScript**: `/Users/cristina/wiley/Documents/jheem-portal/src/data/*.ts`
**Components**: `/Users/cristina/wiley/Documents/jheem-portal/src/components/`

---

**Status**: Production-ready, median age feature postponed
**Last Validation**: 2025-10-20 (age cohort counts verified against paper)
