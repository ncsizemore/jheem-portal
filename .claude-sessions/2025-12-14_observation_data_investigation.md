# Observation Data Discrepancy Investigation

**Date**: 2025-12-14
**Status**: Investigation in progress
**Priority**: High - Observation data is essential for validating model accuracy

---

## Problem Statement

Observation data extracted by our `extract_summary_data.R` script does not match what the Shiny app (via simplot) displays. This is critical because observation data allows users to see how well the simulation models fit real-world data.

### Example Discrepancy: `oahs.clients` outcome (Baltimore, cessation scenario, unfaceted)

**Our extraction** (6 data points):
| Year | Value |
|------|-------|
| 2017 | 8,873 |
| 2018 | 9,712 |
| 2019 | 9,844 |
| 2021 | 8,871 |
| 2022 | 9,150 |
| 2023 | 9,049 |

**Shiny app** (11 data points):
| Year | Value |
|------|-------|
| 2013 | 7,253 |
| 2014 | 5,742 |
| 2015 | 9,040 |
| 2016 | 9,047 |
| 2017 | 8,900 |
| 2018 | 9,740 |
| 2019 | 9,868 |
| 2020 | 9,096 |
| 2021 | 8,890 |
| 2022 | 9,167 |
| 2023 | 9,063 |

### Observed Issues

1. **Missing years**: 2013-2016 and 2020 are completely absent from our extraction
2. **Value discrepancies**: Even for overlapping years, values differ slightly (e.g., 2017: 8,873 vs 8,900)

---

## Root Cause Analysis

### How simplot pulls observation data

In `simplot_local_mods.R` (lines 459-466), the key pull arguments are:

```r
base_pull_args <- list(
  outcome = current_data_outcome_name_for_pull,
  dimension.values = c(dimension.values, list(location = outcome.locations[[...]]])),
  keep.dimensions = c("year", "location", facet.by, split.by),  # KEY!
  target.ontology = pull_target_ontology,
  na.rm = T,
  debug = F
)
```

For **unfaceted views**, `facet.by` and `split.by` are NULL, so:
- `keep.dimensions = c("year", "location")`

This means simplot pulls observation data at **year-only granularity**, regardless of whether finer-grained data exists.

### How our extraction pulls observation data

In `extract_summary_data.R` (lines 154-203):

```r
dim_combos <- list(
  c("year", "age", "sex", "race"),
  c("year", "age", "sex"),
  c("year", "age", "race"),
  c("year", "sex", "race"),
  c("year", "age"),
  c("year", "sex"),
  c("year", "race"),
  c("year")
)

for (dims in dim_combos) {
  obs_data <- data.manager$pull(
    outcome = dm_outcome,
    dimension.values = list(location = location),
    keep.dimensions = dims,
    ...
  )
  if (!is.null(obs_data) && length(obs_data) > 0) {
    used_dims <- dims
    break  # STOPS after first successful pull
  }
}
```

Our approach tries **finest granularity first**, then falls back to coarser. When `c("year", "age")` returns data for 2017-2023, we stop and never check if there's additional year-only data for 2013-2016 and 2020.

### The Data Manager Behavior

The jheem data manager appears to have:
- **Age-stratified Ryan White data** for 2017-2019, 2021-2023 (newer reporting)
- **Year-only aggregate data** for 2013-2016, 2020 (older reporting or aggregate sources)

When simplot asks for `year`-only data, it gets **all 11 years**.
When we ask for `year+age` data, we only get **6 years** (the ones with age breakdown).

### Value Discrepancies Explained

The ~27 difference between 8,873 (ours) and 8,900 (Shiny) for 2017 is likely because:
- We're summing age-stratified values: `350 + 1406 + 1411 + 2524 + 2458 + 724 = 8,873`
- Shiny is pulling a pre-aggregated year-only value: `8,900`

This suggests the data manager has **both** representations, and they don't perfectly reconcile (possibly due to rounding, data suppression rules, or different source datasets).

---

## Impact Assessment

| Issue | Severity | User Impact |
|-------|----------|-------------|
| Missing years | High | Users can't see full calibration history |
| Value discrepancies | Medium | Minor visual differences, doesn't affect interpretation significantly |
| Inconsistent granularity | Medium | Frontend needs to handle varying data structures |

---

## Recommended Path Forward

### Option A: Match simplot's approach (Recommended)

**Strategy**: Pull observation data at the same granularity simplot uses - determined by the facet selection.

**Implementation**:
1. For **unfaceted** display: Pull at `c("year")` only
2. For **faceted by age**: Pull at `c("year", "age")`
3. For **faceted by sex**: Pull at `c("year", "sex")`
4. etc.

**Pros**:
- Matches Shiny app exactly
- Simpler data structure (one representation per facet level)
- Smaller JSON file size

**Cons**:
- Need to store observation data at multiple granularities in the JSON
- Or: pull observation data dynamically based on facet selection (changes architecture)

### Option B: Pull and merge all granularities

**Strategy**: Pull at every granularity level and include all in the JSON. Frontend aggregates as needed.

**Implementation**:
1. Pull at `c("year")` - get all years as totals
2. Pull at `c("year", "age")` - get age breakdown where available
3. Pull at `c("year", "sex")` - get sex breakdown where available
4. Store all in separate sections of the observations object

**Pros**:
- Maximum data preservation
- Frontend can show finest available granularity

**Cons**:
- Complex data structure
- Larger JSON files
- Complex frontend logic to merge/prefer data sources
- May have conflicting values at same year

### Option C: Pull at year-only and accept loss of demographic breakdown

**Strategy**: Always pull at `c("year")` granularity for observations.

**Implementation**:
1. Change extraction to only request `keep.dimensions = c("year")`
2. Store simple year -> value mapping

**Pros**:
- Simplest implementation
- Matches simplot for unfaceted views
- Guaranteed to get all available years

**Cons**:
- Lose ability to show observation data when faceted by demographics
- Less useful for demographic-specific analysis

---

## Recommended Decision

**I recommend Option A** with a pragmatic implementation:

1. **For the JSON structure**, store observation data at `year` granularity only (simplest)
2. **For faceted views**, observation data will only appear in the "All" (unfaceted) aggregation
3. **Future enhancement**: Add demographic-stratified observations if/when needed

This matches simplot's behavior for the common case (unfaceted views) while keeping the implementation simple. Users rarely need observation data at demographic granularity since the primary comparison is aggregate simulation vs aggregate real-world.

---

## Confidence Level

**High confidence** in the diagnosis:
- Code path analysis clearly shows different `keep.dimensions` values
- The missing years (2013-2016, 2020) align with when Ryan White started reporting age breakdowns (~2017)
- The value discrepancies are consistent with summing vs pre-aggregated values

**Medium confidence** in the fix:
- Option A should work, but needs testing to confirm the data manager returns all years at `year` granularity
- May uncover additional edge cases once implemented

---

## Hypothesis Confirmation (2025-12-15)

**CONFIRMED**: Testing in container validates the diagnosis completely.

### Test Results

```r
# Using WEB.DATA.MANAGER for oahs.clients in Baltimore (C.12580)

# TEST 1: keep.dimensions = c("year", "age") - Our current approach
Years: 2017, 2018, 2019, 2021, 2022, 2023
Count: 6 years

# TEST 2: keep.dimensions = c("year") - Simplot's approach
Years: 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023
Count: 11 years
```

### Values Match Shiny App Exactly

| Year | Year-only Pull | Shiny App | Match |
|------|----------------|-----------|-------|
| 2013 | 7,253 | 7,253 | ✓ |
| 2014 | 5,742 | 5,742 | ✓ |
| 2015 | 9,040 | 9,040 | ✓ |
| 2016 | 9,047 | 9,047 | ✓ |
| 2017 | 8,900 | 8,900 | ✓ |
| 2018 | 9,740 | 9,740 | ✓ |
| 2019 | 9,868 | 9,868 | ✓ |
| 2020 | 9,096 | 9,096 | ✓ |
| 2021 | 8,890 | 8,890 | ✓ |
| 2022 | 9,167 | 9,167 | ✓ |
| 2023 | 9,063 | 9,063 | ✓ |

**Key Finding**: Must use `WEB.DATA.MANAGER` (not `SURVEILLANCE.MANAGER`) for Ryan White outcomes.

---

## Next Steps

1. [x] Confirm hypothesis by testing data manager pull at `year` granularity in the container
2. [ ] Implement Option A fix in `extract_summary_data.R`
3. [ ] Re-extract sample city and validate against Shiny app
4. [ ] Update frontend aggregation logic if needed (may be simpler since obs data is flat)
5. [ ] Document any remaining discrepancies

---

## Questions for Discussion

1. Is losing demographic-stratified observation data acceptable for V1?
2. Should we add a `target.ontology` parameter to match simplot's exact pull behavior?
3. Are there other outcomes with similar granularity issues we should test?
