# 📦 ARCHIVED - Technical Review: Median Age Implementation Plan

**Date**: 2025-11-04
**Reviewer**: Senior SWE (Independent Review)
**Original Status**: 🚨 **SIGNIFICANT CONCERNS - RECOMMEND REVISION**
**Current Status**: ⚠️ **ARCHIVED - Feature Postponed (2025-11-04)**

**Archive Note**: This review identified architectural issues with the original implementation plan and recommended a revised approach. However, the feature was ultimately postponed due to inability to validate colleague's median age calculations (62.5% match rate across 48 test points). See `DATA_FLOW_SUMMARY.md` for investigation details.

This document is preserved for:
- Historical context on architectural decisions
- Reference if feature is revisited
- Understanding of data structure patterns in the codebase

---

## Executive Summary (Original Review)

After reviewing the existing codebase and the proposed implementation plan, I have **major concerns about the approach** outlined in `IMPLEMENTATION_PLAN_MEDIAN_AGE.md`. The plan introduces unnecessary complexity, duplicate data structures, and technical debt that could be avoided by leveraging existing infrastructure.

### Key Findings

1. ✅ **Existing R scripts already handle median age data correctly**
2. ❌ **Proposed plan creates parallel data structures unnecessarily**
3. ❌ **JSON file structure is inconsistent with existing patterns**
4. ⚠️ **Bundle size estimate understated (actual: ~315KB, plan says ~46KB)**
5. ✅ **UI changes are reasonable** (tooltips, sparklines)

### Recommendation

**REVISE THE PLAN** to:
- Extend existing R scripts instead of creating new ones
- Merge median age data into existing JSON files
- Maintain consistent data structures
- Avoid creating separate median age files

---

## Detailed Analysis

### 1. Existing Infrastructure Review

#### What You Already Have (Working Well)

**R Processing Scripts** (3 files):
- `prepare_hiv_age_data.R` - Processes aggregated state data
- `prepare_race_data.R` - Processes race-stratified data
- `prepare_sex_data.R` - Processes sex-stratified data

**JSON Output Files** (3 files):
- `hiv-age-projections-aggregated.json` (290KB)
- `hiv-age-projections-by-race.json` (1.0MB)
- `hiv-age-projections-by-sex.json` (673KB)

**TypeScript Data Files** (3 files):
- `hiv-age-projections.ts` - Loads and transforms aggregated data
- `hiv-age-projections-race.ts` - Loads and transforms race data
- `hiv-age-projections-sex.ts` - Loads and transforms sex data

**Key Pattern**: Each view (states-only, race, sex) has:
1. R script that generates JSON with CIs
2. JSON file with consistent structure
3. TypeScript file that imports and transforms data

---

### 2. Problems with Proposed Plan

#### Problem 1: Creating Parallel Data Structures

**Current Plan** (from IMPLEMENTATION_PLAN_MEDIAN_AGE.md):
```
Create 3 new files:
- median-age-projections.json (separate from age cohort data)
- median-age-projections-race.json (separate from race data)
- median-age-projections-sex.json (separate from sex data)

Then merge in TypeScript...
```

**Why This Is Wrong**:
- Creates **6 JSON files total** instead of 3
- Forces TypeScript to load and merge data from 2 files per view
- Duplicates metadata (same years, states, confidence levels)
- Increases bundle size significantly
- Makes maintenance harder (2 files to keep in sync)

**Better Approach**:
```
Extend existing JSON files to include median age:

hiv-age-projections-aggregated.json:
{
  "year": 2025,
  "age_cohorts": { ... },
  "median_age": {         // ADD THIS
    "median": 51,
    "lower": 50,
    "upper": 52
  }
}
```

#### Problem 2: Inconsistent JSON Structure

**Existing Pattern** (working well):
```json
{
  "states": [
    {
      "state_code": "CA",
      "state_name": "California",
      "data": [ ... years ... ]
    }
  ]
}
```

**Proposed New Pattern** (race/sex median age files):
```json
{
  "combinations": [  // ← Different key name!
    {
      "state_code": "CA",
      "state_name": "California",
      "race": "black",
      "data": [ ... years ... ]
    }
  ]
}
```

**Why This Is Wrong**:
- Uses `combinations` instead of `states` (inconsistent)
- Flattens state-demographic hierarchy
- Makes TypeScript merging more complex
- Breaks pattern established in existing files

**Better Approach**: Keep nested structure matching existing files
```json
{
  "states": [
    {
      "state_code": "CA",
      "state_name": "California",
      "races": [
        {
          "race": "black",
          "data": [
            {
              "year": 2025,
              "age_cohorts": { ... },
              "median_age": { ... }  // ADD HERE
            }
          ]
        }
      ]
    }
  ]
}
```

#### Problem 3: Redundant R Scripts

**Proposed Plan**: Create 3 new R scripts
- `prepare_median_age_data.R` (180 lines)
- `process_colleague_median_age_race.R` (210 lines)
- `process_colleague_median_age_sex.R` (similar)

**Reality Check**: You could extend existing scripts with ~20-40 lines each

**Example** - What `prepare_hiv_age_data.R` needs:
```r
# After line 108 (after calculating stats_arr)

# Calculate median age
cat("\nCalculating median age...\n")
median_ages <- get_med_age(combined_arr,
                           keep.dimensions = c('year', 'location'))
median_stats <- get_stats(median_ages,
                          keep.dimensions = c('year', 'location'))

# Then modify format_for_webapp() function to include median_age
# Add ~15 lines in the years_list loop
```

That's it! Similar for race/sex scripts.

#### Problem 4: Bundle Size Underestimated

**Plan Says**: ~46KB increase
```
States: ~8 KB (25 states × 16 years × 3 values)
Race: ~23 KB (72 combinations × 16 years × 3 values)
Sex: ~15 KB (48 combinations × 16 years × 3 values)
```

**Reality**: Already generated 315KB
```bash
$ ls -lh median-age-*.json
189K  median-age-projections-race.json
126K  median-age-projections-sex.json
```

**Why the difference?**
- Plan forgot JSON formatting overhead (keys, brackets, commas, whitespace)
- Plan forgot metadata sections
- Actual JSON is ~7x larger than raw data size

**If merged into existing files**: ~50KB increase (reasonable!)
- Less overhead (no duplicate metadata)
- No duplicate state/year structures
- Just adding one field per year

---

### 3. Correct Implementation Approach

#### Phase 1: Extend Existing R Scripts (1-2 hours)

**File**: `scripts/prepare_hiv_age_data.R`

**Changes** (~30 lines added):
```r
# After line 108 (after get_stats call)

# ===== CALCULATE MEDIAN AGE =====
cat("\n===========================================\n")
cat("STEP 2.5: Calculating median age\n")
cat("===========================================\n")

cat("Computing median age for each location and year...\n")

# Calculate median age from the combined array (before stats)
# Input: combined_arr [year, age, sim, location]
median_ages <- get_med_age(combined_arr,
                           keep.dimensions = c('year', 'location'))

# Apply get_stats to get confidence intervals
# Result: [metric, year, location]
median_stats <- get_stats(median_ages,
                          keep.dimensions = c('year', 'location'))

cat(sprintf("  Median age stats dimensions: %s\n",
            paste(dim(median_stats), collapse=" x ")))

# Modify format_for_webapp() function
format_for_webapp <- function(stats_arr, median_stats_arr, location_codes) {
  # ... existing code ...

  years_list <- lapply(dimnames(stats_arr)[["year"]], function(yr) {
    # ... existing age_cohorts code ...

    # ADD MEDIAN AGE
    median_age <- list(
      median = as.numeric(median_stats_arr["median", yr, loc]),
      lower = as.numeric(median_stats_arr["lower", yr, loc]),
      upper = as.numeric(median_stats_arr["upper", yr, loc])
    )

    list(
      year = as.integer(yr),
      age_cohorts = age_cohorts,
      median_age = median_age  # NEW FIELD
    )
  })
}

# Update function call
output_data <- format_for_webapp(stats_arr, median_stats, all_locations)
```

**File**: `scripts/prepare_race_data.R`

**Changes** (~40 lines added):
```r
# After line 111 (after get_stats call)

# ===== CALCULATE MEDIAN AGE BY RACE =====
cat("\nCalculating median age for each race...\n")

# Need to go back to the age distribution data (before get_stats)
# Load race_results again if needed, or save intermediate step

# Calculate median age from combined_arr
# Input: combined_arr [year, age, race, sim, location]
median_ages_race <- get_med_age(combined_arr,
                                keep.dimensions = c('year', 'race', 'location'))

# Apply get_stats
# Result: [metric, year, race, location]
median_stats_race <- get_stats(median_ages_race,
                               keep.dimensions = c('year', 'race', 'location'))

# Modify format_for_webapp_race() to include median_age
# Add to years_list loop (similar to above)
```

**File**: `scripts/prepare_sex_data.R`

**Changes** (similar to race script)

#### Phase 2: Update TypeScript Interfaces (30 min)

**File**: `src/data/hiv-age-projections.ts`

**Changes**:
```typescript
// Add interface
export interface MedianAgeData {
  median: number;
  lower: number;
  upper: number;
}

// Update YearProjection interface
export interface YearProjection {
  year: number;
  age_cohorts: AgeCohortsData;
  median_age?: MedianAgeData;  // ADD THIS (optional for backward compatibility)
}

// Update transform code (if needed)
// The JSON already has it, so it should just work!
```

**Similar changes** for race/sex TypeScript files.

#### Phase 3: Update UI Components (as planned)

The UI changes in the original plan are **good as-is**:
- ✅ Add median age to tooltips
- ✅ Switch sparklines to median age
- ✅ Fix sparkline normalization
- ✅ Handle demographic-specific sparklines

---

### 4. Data Availability Check

**Question**: Do we need to run `get_med_age()` ourselves?

**Answer for States-Only**: YES
- You have `age_results.Rdata` with age cohort distributions
- Need to calculate weighted median from that
- The existing `prepare_hiv_age_data.R` already loads this
- Just need to add `get_med_age()` call

**Answer for Race**: MAYBE NOT
- Colleague provided `med_age_timeline_race_loc_arr.Rdata`
- This is **already the median age output** (not raw distributions)
- Just need to apply `get_stats()` for confidence intervals
- The scripts you created yesterday (`prepare_median_age_race_data.R`) are correct for this!

**Answer for Sex**: MAYBE NOT
- Colleague provided `med_age_timeline_sex_loc_arr.Rdata`
- Same as race - already median ages
- Just apply `get_stats()`

**Key Insight**: The issue is NOT with using colleague's data files. The issue is:
1. Creating separate JSON files instead of merging
2. Using inconsistent JSON structure
3. Not extending existing R scripts for states-only case

---

### 5. Revised Implementation Plan

#### Option A: Minimal Changes (Recommended)

**Use colleague's data for race/sex, generate states-only, merge into existing JSONs**

Time: **2-3 hours total**

1. **Extend `prepare_hiv_age_data.R`** (45 min)
   - Add `get_med_age()` call after extracting data_subset
   - Add `median_age` field to JSON output
   - Regenerate `hiv-age-projections-aggregated.json`

2. **Extend `prepare_race_data.R`** (45 min)
   - Load colleague's `med_age_timeline_race_loc_arr.Rdata`
   - Apply `get_stats()` to get confidence intervals
   - Add `median_age` field to existing race JSON structure
   - Regenerate `hiv-age-projections-by-race.json`

3. **Extend `prepare_sex_data.R`** (45 min)
   - Same approach as race
   - Regenerate `hiv-age-projections-by-sex.json`

4. **Update TypeScript interfaces** (30 min)
   - Add `median_age?: MedianAgeData` to `YearProjection` interfaces
   - No import changes needed (same files)
   - Add null checks in components

5. **Update UI** (as planned - 2 hours)
   - Tooltips, sparklines, etc.

**Total**: ~5 hours (same as original plan, but cleaner result)

#### Option B: Keep Separate Files (Not Recommended)

If you really want separate median age files:

**At minimum, fix the structure**:
- Change `combinations` to `states` in race/sex files
- Keep nested hierarchy consistent with existing files
- Update TypeScript to handle dual imports cleanly

**Time**: 6-7 hours (more complex TypeScript merging)

---

### 6. Specific Technical Concerns

#### Concern 1: "Going off the rails" for States-Only

**What happened in last session**:
```r
# Created prepare_median_age_data.R that:
1. Loaded age_results.Rdata
2. Called get_med_age() directly
3. Created separate JSON file
```

**Why this felt wrong**:
- You already have `prepare_hiv_age_data.R` that loads same file
- Why create a second script that does 90% the same thing?
- Why create a second JSON file with duplicate metadata?

**Fix**: Extend existing script (as shown above)

#### Concern 2: Median Age Calculation Method

**Original plan mentioned**:
```r
get_med_age(..., method = "pclm")
```

**Question**: Is this the right method?

**Answer**: Check `helpers.R` or existing code
- If colleague's data used PCLM, use PCLM for consistency
- If default method is different, be consistent
- Document the choice

**Recommendation**: Use same method colleague used for race/sex

#### Concern 3: "Total" Calculation

**For states-only**: Sum all states, then calculate median age ✅ (correct)

**For race/sex**: What should "Total" mean?
- Sum across all races/sexes? ✅
- Use states-only median age? ✅ (simpler)
- Both? 🤔

**Recommendation**: Use states-only median age for Total in all views
- Simpler
- Avoids recalculation
- Consistent across views

---

### 7. Testing Recommendations

**After implementing revised plan**:

1. **Data Validation**:
   ```r
   # In R scripts, verify:
   - Median age for CA 2025 ≈ 51 years
   - Median age for CA 2040 ≈ 62 years
   - Total 2025 ≈ 48-52 years (reasonable range)
   ```

2. **JSON Structure**:
   ```bash
   # Check file sizes are reasonable
   ls -lh src/data/*.json

   # Should see ~50KB increase per file
   # Total: 290KB → 340KB (aggregated)
   #        1.0MB → 1.05MB (race)
   #        673KB → 720KB (sex)
   ```

3. **TypeScript Compilation**:
   ```bash
   npm run build
   # Should have zero errors
   ```

4. **Runtime Validation**:
   ```javascript
   // In browser console
   console.log(HIV_AGE_PROJECTIONS[0].data[0]);
   // Should show: { year: 2025, age_cohorts: {...}, median_age: {...} }
   ```

---

## Conclusion

### Summary of Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Parallel data structures | 🔴 High | Maintenance burden, bundle size |
| Inconsistent JSON format | 🔴 High | Confusion, harder to merge |
| Redundant R scripts | 🟡 Medium | Code duplication |
| Bundle size estimate | 🟡 Medium | Wrong expectations |
| UI approach | 🟢 Low | Looks good! |

### Recommended Actions

1. **Stop**: Don't proceed with current plan as-is
2. **Revise**: Use "Option A: Minimal Changes" approach above
3. **Validate**: Run one script end-to-end before doing all three
4. **Test**: Check bundle size after first file to validate estimates

### Final Recommendation

**APPROVE with MAJOR REVISIONS**

The goal (adding median age to tooltips/sparklines) is sound, but the implementation approach needs significant changes to avoid technical debt. Follow the "Option A" approach above for a cleaner, more maintainable solution that respects the existing architecture.

---

## Questions for Product Owner

Before proceeding, clarify:

1. **Is colleague's data trusted?**
   - If yes: Use it for race/sex (simpler)
   - If no: Calculate everything from scratch (more work)

2. **Do you want confidence intervals in tooltips?**
   - Plan includes CIs in JSON but doesn't show them in UI
   - If not needed now, could save ~30% bundle size by storing median only
   - Easy to add CIs later if data structure supports it

3. **Should sparklines show demographic-specific trends?**
   - More accurate but more complex
   - Or show overall state trend with note? (simpler)

4. **Performance concerns?**
   - Current largest route: 423KB
   - After changes: ~500KB (18% increase)
   - Acceptable? Or need optimization?

---

**Review Status**: ⚠️ **CHANGES REQUESTED**

**Estimated Time with Revisions**: 4-5 hours (cleaner than original 5-hour plan)

**Risk Level**: Low (if revised approach is taken)
