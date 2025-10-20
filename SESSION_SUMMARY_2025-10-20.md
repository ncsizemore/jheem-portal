# 🎯 Session Summary - HIV Age Projections: Real Data Integration Planning

**Session Date:** October 20, 2025
**Duration:** ~3 hours
**Branch:** main
**Last Commit:** `c9d79c6` - refactor(hiv-projections): reorganize controls and enhance UX

---

## ✅ Session Accomplishments

### **1. UI Refinement & Polish Complete**

#### **A. Tooltip Color Fix**
**File:** `src/components/AgeDistributionChart.tsx`
**Issue:** Tooltip was showing gradient URLs instead of actual colors
**Fix Applied (Line 90-94):**
```tsx
const cohort = entry.dataKey.split('_').slice(-1)[0] as AgeCohort;
const actualColor = AGE_COHORT_COLORS[cohort];  // Use actual color, not gradient URL
```

#### **B. Chart Spacing Optimization**
**Files Modified:**
- `src/components/MultiStateChartGrid.tsx` - Card padding: `p-5` → `p-3`
- `src/components/AgeDistributionChart.tsx` - Chart margins reduced 50-67%, header tightened
**Result:** ~15% more chart area, cleaner appearance

#### **C. State Selector Enhancements**
**File:** `src/components/StateSelector.tsx`

**Changes:**
1. **Hover-only sparklines:** Changed from always-visible to `opacity-0 group-hover:opacity-100`
2. **Full state name tooltips:** Added dark tooltip overlay with state name + sparkline
3. **Total button distinction:** Gold gradient (`from-hopkins-gold to-amber-400`) + spans 2 columns
4. **7-column grid:** Changed from 8 to 7 columns for more even distribution
5. **"Select States" label:** Added header label matching Timeline Controls style

**Total Button Styling (Lines 134-142):**
```tsx
className={`... ${isTotal ? 'col-span-2' : ''} ${
  isTotal
    ? isSelected
      ? 'bg-gradient-to-br from-hopkins-gold to-amber-400 text-gray-900 border-hopkins-gold ...'
      : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border-gray-400 ...'
    : // ... regular state styling
}`}
```

#### **D. 3-Column Control Layout**
**File:** `src/app/hiv-age-projections/page.tsx`

**Structure (Lines 23-84):**
```tsx
<div className="flex flex-col lg:flex-row gap-4">
  {/* State Selector - ~38% width */}
  <div className="lg:w-[38%] ...">
    <StateSelector ... />
  </div>

  {/* Timeline Controls - ~38% width */}
  <div className="lg:w-[38%] ...">
    <TimelineControls ... />
  </div>

  {/* Display Mode and Export - ~24% width, stacked */}
  <div className="lg:w-[24%] flex flex-col gap-2">
    {/* Display Mode Toggle */}
    <div className="bg-gray-50 rounded-lg p-2.5 ...">
      <label className="text-[10px] font-semibold ...">Display Mode</label>
      <button onClick={() => setNormalized(!normalized)} ...>
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg">{normalized ? '📊' : '📈'}</span>
          <span>{normalized ? 'Proportional %' : 'Case Counts'}</span>
        </div>
      </button>
    </div>

    {/* Export PNG */}
    <div className="bg-gray-50 rounded-lg p-2.5 ...">
      <button onClick={() => window.dispatchEvent(new CustomEvent('exportCharts'))} ...>
        <svg className="w-5 h-5" ... />
        <span>Export PNG</span>
      </button>
    </div>
  </div>
</div>
```

**Key Change:** Export button moved to controls area, communicates with grid via `CustomEvent('exportCharts')`

#### **E. PNG Export Lab() Color Fix**
**File:** `src/components/MultiStateChartGrid.tsx` (Lines 97-130)

**Problem:** `html2canvas` doesn't support modern CSS `lab()` color functions
**Solution:** Added `onclone` callback to convert lab() colors to RGB before export

```tsx
onclone: (clonedDoc) => {
  const elements = clonedDoc.querySelectorAll('*');
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computedStyle = window.getComputedStyle(el);

    if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes('lab')) {
      htmlEl.style.backgroundColor = 'rgb(255, 255, 255)';
    }
    if (computedStyle.color && computedStyle.color.includes('lab')) {
      htmlEl.style.color = 'rgb(0, 0, 0)';
    }
    if (computedStyle.borderColor && computedStyle.borderColor.includes('lab')) {
      htmlEl.style.borderColor = 'rgb(200, 200, 200)';
    }
  });
}
```

#### **F. Dependencies Added**
**File:** `package.json`
- `html2canvas: ^1.4.1` - For PNG export functionality

---

### **2. Real Data Integration Planning**

#### **Context: Transition from Synthetic to Real Data**

**Colleague shared R script:**
- **Location:** `/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis/generate_stacked_area_chart.R`
- **Helper functions:** `/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis/helpers.R`
- **Rdata files:** Coming soon (not yet provided)

#### **Key Findings from R Script Analysis**

**A. Data Structure (from `generate_stacked_area_chart.R`):**

```r
# Line 30: age_results array dimensions
age_results[as.character(2025:2040),,,"diagnosed.prevalence",,]
#           ^^^^^^^^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^
#           year (16 values)             outcome metric
#                           ^^                           ^^
#                           (empty = summed dimensions)

# Likely full dimensions: [year, race, sex, outcome, location, sim]
```

**Known dimensions:**
- `year`: 2025-2040 (16 years) ✅ Matches current app
- `age`: 5 age groups ("13-24 years", "25-34 years", "35-44 years", "45-54 years", "55+ years") ✅ Matches current app
- `location`: State codes + "total" ✅ Matches current app
- `sim`: 1000 simulations per scenario (NEW - requires statistical processing)
- `race`: Unknown count/categories (to be determined in Step 0)
- `sex`: "msm", "heterosexual_male", "female" (to be confirmed in Step 0)

**B. Statistical Processing (from `helpers.R`):**

**`get_stats()` function (Lines 3-24):**
```r
get_stats <- function(arr, keep.dimensions='year', ...) {
    arr_data <- apply(arr, keep.dimensions, function(x) {
        rv <- c(lower = quantile(x, probs=0.025),    # 2.5th percentile
                median = median(x),                    # 50th percentile
                upper = quantile(x, probs=0.975))      # 97.5th percentile
        # ... optional quartiles and mean
        rv
    })
    # Returns array with 'metric' dimension: [lower, median, upper, ...]
}
```

**Output structure:**
- `median`: Main value to display
- `lower`: 95% CI lower bound (2.5th percentile)
- `upper`: 95% CI upper bound (97.5th percentile)
- Optional: `lowermid` (25th), `uppermid` (75th), `mean`

**C. Sex Category Mapping (from `helpers.R`, lines 140-152):**

```r
map_sex <- function(arr) {
    # Original: "msm", "heterosexual_male", "female"
    # Transformed to: "msm", "non_msm" (het male + female combined)

    het_arr <- array.access(arr, list(sex=c("heterosexual_male", "female")))
    msm_arr <- array.access(arr, list(sex="msm"))
    het_arr <- apply(het_arr, c(non_sex_non_sim_dims, "sim"), sum)
    # ... combines heterosexual_male + female into "non_msm"
}
```

**Implication:** "Sex" faceting is actually MSM vs Non-MSM (transmission risk groups)

**D. Percentage Calculation (Line 40 of generate script):**
```r
mutate(percentage=100*median/sum(median))
```
✅ Matches our current normalization approach exactly

---

## 🎯 Overall Project Objectives

### **Primary Goal:**
Create an interactive web application to visualize HIV age distribution projections across US states, replacing static figures from the research paper with dynamic, explorable charts.

### **Current State:**
- ✅ MVP complete with synthetic data
- ✅ Multi-state comparison (1-25 states)
- ✅ Timeline controls (2025-2040)
- ✅ Normalization toggle (absolute counts vs proportional %)
- ✅ Interactive tooltips with detailed breakdowns
- ✅ PNG export functionality
- ✅ Responsive 3-column layout
- ✅ Professional Hopkins branding

### **Next Phase:**
Replace synthetic data with real JHEEM model outputs and add demographic faceting (by race, by sex)

---

## 📋 Detailed Implementation Plan for Next Session

### **IMPORTANT: Wait for Rdata Files Before Starting**

The colleague will provide Rdata files from:
- `/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis/Rdata Objects/`

Expected files:
- `age_results.Rdata` - Main data array
- `total_results.Rdata` - Aggregate totals
- `state_order.Rdata` - State ordering
- `state_order_names.Rdata` - State name mappings

**Do NOT proceed until these files are available.**

---

### **Step 0: Data Exploration & Verification** 🔍

**Goal:** Understand actual structure before writing processing code

**Create:** `scripts/exploration.R`

```r
# exploration.R - Interactive data exploration

library(tidyverse)

# Set working directory to where Rdata files are located
setwd("/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis")

# Source helper functions
source("helpers.R")

# Load data files
load("Rdata Objects/age_results.Rdata")
load("Rdata Objects/total_results.Rdata")
load("Rdata Objects/state_order.Rdata")
load("Rdata Objects/state_order_names.Rdata")

# ===== CRITICAL: VERIFY DIMENSIONS =====
cat("=== AGE_RESULTS DIMENSIONS ===\n")
print(dim(age_results))
print(names(dim(age_results)))

# EXPECTED OUTPUT (verify):
# [1] 16    5    ?    4   25 1000
# [1] "year" "age" "race"/"sex"? "outcome" "location" "sim"

# What are the dimension names?
cat("\n=== DIMENSION NAMES ===\n")
for (dim_name in names(dim(age_results))) {
  cat(sprintf("\n%s (%d levels):\n", dim_name, length(dimnames(age_results)[[dim_name]])))
  print(dimnames(age_results)[[dim_name]])
}

# ===== VERIFY YEAR RANGE =====
cat("\n=== YEAR VALUES ===\n")
print(dimnames(age_results)$year)
# Expected: "2025" "2026" ... "2040" (16 years)

# ===== VERIFY AGE GROUPS =====
cat("\n=== AGE GROUPS ===\n")
print(dimnames(age_results)$age)
# Expected: "13-24 years" "25-34 years" "35-44 years" "45-54 years" "55+ years"

# ===== CRITICAL: IDENTIFY RACE CATEGORIES =====
cat("\n=== RACE CATEGORIES ===\n")
if ("race" %in% names(dim(age_results))) {
  print(dimnames(age_results)$race)
  cat(sprintf("Number of race categories: %d\n", length(dimnames(age_results)$race)))
} else {
  cat("ERROR: 'race' dimension not found! Actual dimensions:\n")
  print(names(dim(age_results)))
}

# ===== CRITICAL: IDENTIFY SEX CATEGORIES =====
cat("\n=== SEX CATEGORIES ===\n")
if ("sex" %in% names(dim(age_results))) {
  print(dimnames(age_results)$sex)
  cat(sprintf("Number of sex categories: %d\n", length(dimnames(age_results)$sex)))

  # Test map_sex() function
  cat("\n--- Testing map_sex() transformation ---\n")
  test_mapped <- map_sex(age_results[1:2, , , , 1:2, 1:10])  # Small subset
  print(dimnames(test_mapped)$sex)
  # Expected after mapping: "msm" "non_msm"
} else {
  cat("ERROR: 'sex' dimension not found! Actual dimensions:\n")
  print(names(dim(age_results)))
}

# ===== VERIFY STATE CODES =====
cat("\n=== LOCATION (STATE) CODES ===\n")
print(dimnames(age_results)$location)
cat(sprintf("Number of locations: %d\n", length(dimnames(age_results)$location)))
# Expected: 24 state codes + "total" = 25

# ===== VERIFY OUTCOME METRICS =====
cat("\n=== OUTCOME METRICS ===\n")
if ("outcome" %in% names(dim(age_results))) {
  print(dimnames(age_results)$outcome)
  # Expected: includes "diagnosed.prevalence"
} else {
  cat("'outcome' dimension not found\n")
}

# ===== VERIFY SIMULATION COUNT =====
cat("\n=== SIMULATION DIMENSION ===\n")
if ("sim" %in% names(dim(age_results))) {
  cat(sprintf("Number of simulations: %d\n", length(dimnames(age_results)$sim)))
  # Expected: 1000
} else {
  cat("ERROR: 'sim' dimension not found!\n")
}

# ===== TEST DATA EXTRACTION =====
cat("\n=== SAMPLE DATA: CALIFORNIA 2025 ===\n")

# Extract California 2025 data, all simulations
# Adjust indexing based on actual dimension order
ca_2025 <- age_results["2025", , , "diagnosed.prevalence", "CA", ]

cat("Structure of extracted data:\n")
print(str(ca_2025))

# Sum across race and sex to get totals by age
# (This mimics what the aggregated view will show)
ca_2025_by_age <- apply(ca_2025, "age", sum)
cat("\nCA 2025 totals by age (summed across race, sex, simulations):\n")
print(ca_2025_by_age)

# Calculate median across simulations for one age group
if (length(dim(ca_2025)) >= 1) {
  sample_age <- dimnames(ca_2025)$age[1]
  sample_data <- ca_2025[sample_age, , ]  # All race, sex, sim for one age
  sample_data_flat <- as.vector(sample_data)
  cat(sprintf("\nSample: %s in CA 2025\n", sample_age))
  cat(sprintf("Median: %d\n", median(sample_data_flat)))
  cat(sprintf("95%% CI: [%d, %d]\n",
              quantile(sample_data_flat, 0.025),
              quantile(sample_data_flat, 0.975)))
}

# ===== TEST get_stats() FUNCTION =====
cat("\n=== TESTING get_stats() FUNCTION ===\n")

# Test on small subset: CA, one year, all ages
test_arr <- age_results["2025", , , "diagnosed.prevalence", "CA", ]
test_stats <- get_stats(test_arr, keep.dimensions = "age")

cat("Output structure from get_stats():\n")
print(str(test_stats))
cat("\nSample values:\n")
print(test_stats)

# Expected structure:
# array with dimensions: [metric, age]
# where metric = c("lower", "median", "upper", "mean")

# ===== VERIFY TOTAL CALCULATION =====
cat("\n=== VERIFYING 'TOTAL' LOCATION ===\n")

all_states <- setdiff(dimnames(age_results)$location, "total")
cat(sprintf("Individual states: %d\n", length(all_states)))

# Manual calculation: sum all states for one year/age
manual_total <- apply(
  age_results["2025", , , "diagnosed.prevalence", all_states, ],
  c("age", "race", "sex", "sim"),  # Adjust dimensions as needed
  sum
)

stored_total <- age_results["2025", , , "diagnosed.prevalence", "total", ]

# Compare shapes
cat("\nManual total dimensions:\n")
print(dim(manual_total))
cat("Stored total dimensions:\n")
print(dim(stored_total))

# Compare values for one age group
if (identical(dim(manual_total), dim(stored_total))) {
  cat("\nDimensions match! Checking values...\n")
  are_equal <- all.equal(manual_total, stored_total, tolerance = 0.01)
  if (isTRUE(are_equal)) {
    cat("✓ Total verification PASSED: Stored total equals sum of states\n")
  } else {
    cat("✗ Total verification FAILED:\n")
    print(are_equal)
  }
} else {
  cat("✗ Dimension mismatch between manual and stored totals\n")
}

# ===== COMPARE TO PAPER FIGURE =====
cat("\n=== VISUAL COMPARISON TO PAPER ===\n")
cat("Manually check if these values roughly match the paper's figure:\n")
cat("- Look at California or Texas in 2025\n")
cat("- Check relative proportions of age groups\n")
cat("- Verify order of magnitude (thousands? tens of thousands?)\n")
```

**Deliverables from Step 0:**

Create a text file: `scripts/exploration_findings.txt` documenting:

1. **Confirmed dimensions:**
   - Exact order: `[year, ???, ???, outcome, location, sim]`
   - Names of all dimensions

2. **Race categories:**
   - Exact count (e.g., 5)
   - Exact names (e.g., "Black", "Hispanic", "White", "Asian", "Other")
   - Write these down verbatim

3. **Sex categories:**
   - Before mapping: (e.g., "msm", "heterosexual_male", "female")
   - After `map_sex()`: (should be "msm", "non_msm")

4. **Sample data validation:**
   - California 2025 median values by age group
   - Do they roughly match the paper's figure?

5. **Total verification:**
   - Does stored "total" = sum of all states?

6. **Any surprises:**
   - Unexpected dimensions?
   - Different outcome metrics available?
   - Data quality issues?

**DO NOT PROCEED TO STEP 1 UNTIL STEP 0 IS COMPLETE AND DOCUMENTED.**

---

### **Step 1: Create R Data Processing Script**

**Goal:** Convert Rdata → 3 JSON files for the web app

**Create:** `scripts/prepare_hiv_age_data.R`

**Template:**

```r
# prepare_hiv_age_data.R
# Processes JHEEM age_results data into web-ready JSON format
# Creates 3 files: aggregated, by-race, by-sex

library(tidyverse)
library(jsonlite)
library(locations)

# Set working directory
setwd("/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis")

# Source helper functions
source("helpers.R")

# Load data
load("Rdata Objects/age_results.Rdata")
load("Rdata Objects/state_order.Rdata")
load("Rdata Objects/state_order_names.Rdata")

# Define states to include
original_states <- c("AL", "CA", "FL", "GA", "IL", "LA", "MO", "MS",
                     "NY", "TX", "WI", "AR", "AZ", "CO", "KY", "MD",
                     "MI", "NC", "OH", "OK", "SC", "TN", "VA", "WA", "WI")
my_states <- intersect(state_order, original_states)

# Helper function to format data for webapp
format_for_webapp <- function(stats_arr, location_codes) {
  # stats_arr dimensions: [metric, year, age, location]
  # where metric = c("lower", "median", "upper")

  states_list <- lapply(location_codes, function(loc) {
    state_data <- stats_arr[, , , loc]

    years_list <- lapply(dimnames(state_data)[["year"]], function(yr) {
      year_data <- state_data[, yr, ]

      # Build age_cohorts object
      age_cohorts <- list()
      for (age in dimnames(year_data)[["age"]]) {
        age_cohorts[[age]] <- list(
          median = as.numeric(year_data["median", age]),
          lower = as.numeric(year_data["lower", age]),
          upper = as.numeric(year_data["upper", age])
        )
      }

      list(
        year = as.integer(yr),
        age_cohorts = age_cohorts
      )
    })

    list(
      state_code = loc,
      state_name = if(loc == "total") "Total" else get.location.name(loc),
      data = years_list
    )
  })

  list(
    metadata = list(
      generated_date = format(Sys.Date(), "%Y-%m-%d"),
      source = "JHEEM HIV Age Projections Model",
      years = as.integer(dimnames(stats_arr)[["year"]]),
      age_groups = dimnames(stats_arr)[["age"]],
      confidence_level = 0.95
    ),
    states = states_list
  )
}

# ===== VERSION 1: AGGREGATED (for "By State" tab) =====
cat("Processing aggregated data (sum across race and sex)...\n")

# Extract diagnosed prevalence, sum across race and sex
aggregated_arr <- apply(
  age_results[as.character(2025:2040), , , "diagnosed.prevalence", , ],
  c("year", "age", "location"),
  sum
)

# Calculate statistics (median, CI) across simulations
aggregated_stats <- get_stats(
  aggregated_arr,
  keep.dimensions = c('year', 'age', 'location')
)

# Format for webapp
all_locations <- c(my_states, "total")
output_aggregated <- format_for_webapp(aggregated_stats, all_locations)

# Write to JSON
output_path <- "../../jheem-portal/src/data/hiv-age-projections-aggregated.json"
write_json(output_aggregated, output_path, pretty = TRUE, auto_unbox = TRUE)
cat(sprintf("✓ Written: %s (%.1f KB)\n",
            output_path,
            file.info(output_path)$size / 1024))


# ===== VERSION 2: BY RACE (for "By Race" tab) =====
cat("\nProcessing by-race data (sum across sex only)...\n")

# Sum across sex dimension only
by_race_arr <- apply(
  age_results[as.character(2025:2040), , , "diagnosed.prevalence", , ],
  c("year", "age", "race", "location"),
  sum
)

# Calculate statistics
by_race_stats <- get_stats(
  by_race_arr,
  keep.dimensions = c('year', 'age', 'race', 'location')
)

# Format for webapp (more complex - need to nest by race)
format_for_webapp_race <- function(stats_arr, location_codes) {
  # stats_arr dimensions: [metric, year, age, race, location]

  states_list <- lapply(location_codes, function(loc) {
    loc_data <- stats_arr[, , , , loc]

    races_list <- lapply(dimnames(loc_data)[["race"]], function(race) {
      race_data <- loc_data[, , , race]

      years_list <- lapply(dimnames(race_data)[["year"]], function(yr) {
        year_data <- race_data[, yr, ]

        age_cohorts <- list()
        for (age in dimnames(year_data)[["age"]]) {
          age_cohorts[[age]] <- list(
            median = as.numeric(year_data["median", age]),
            lower = as.numeric(year_data["lower", age]),
            upper = as.numeric(year_data["upper", age])
          )
        }

        list(year = as.integer(yr), age_cohorts = age_cohorts)
      })

      list(
        race = race,
        data = years_list
      )
    })

    list(
      state_code = loc,
      state_name = if(loc == "total") "Total" else get.location.name(loc),
      races = races_list
    )
  })

  list(
    metadata = list(
      generated_date = format(Sys.Date(), "%Y-%m-%d"),
      source = "JHEEM HIV Age Projections Model",
      years = as.integer(dimnames(stats_arr)[["year"]]),
      age_groups = dimnames(stats_arr)[["age"]],
      race_categories = dimnames(stats_arr)[["race"]],
      confidence_level = 0.95
    ),
    states = states_list
  )
}

output_by_race <- format_for_webapp_race(by_race_stats, all_locations)

output_path <- "../../jheem-portal/src/data/hiv-age-projections-by-race.json"
write_json(output_by_race, output_path, pretty = TRUE, auto_unbox = TRUE)
cat(sprintf("✓ Written: %s (%.1f KB)\n",
            output_path,
            file.info(output_path)$size / 1024))


# ===== VERSION 3: BY SEX (for "By Sex" tab) =====
cat("\nProcessing by-sex data (sum across race only)...\n")

# First apply map_sex() to transform sex categories
age_results_mapped <- map_sex(
  age_results[as.character(2025:2040), , , "diagnosed.prevalence", , ]
)

# Sum across race dimension only
by_sex_arr <- apply(
  age_results_mapped,
  c("year", "age", "sex", "location"),
  sum
)

# Calculate statistics
by_sex_stats <- get_stats(
  by_sex_arr,
  keep.dimensions = c('year', 'age', 'sex', 'location')
)

# Format for webapp (similar to race, but with sex labels)
format_for_webapp_sex <- function(stats_arr, location_codes) {
  # stats_arr dimensions: [metric, year, age, sex, location]

  sex_labels <- list(
    msm = "MSM",
    non_msm = "Non-MSM"
  )

  states_list <- lapply(location_codes, function(loc) {
    loc_data <- stats_arr[, , , , loc]

    sex_groups_list <- lapply(dimnames(loc_data)[["sex"]], function(sex) {
      sex_data <- loc_data[, , , sex]

      years_list <- lapply(dimnames(sex_data)[["year"]], function(yr) {
        year_data <- sex_data[, yr, ]

        age_cohorts <- list()
        for (age in dimnames(year_data)[["age"]]) {
          age_cohorts[[age]] <- list(
            median = as.numeric(year_data["median", age]),
            lower = as.numeric(year_data["lower", age]),
            upper = as.numeric(year_data["upper", age])
          )
        }

        list(year = as.integer(yr), age_cohorts = age_cohorts)
      })

      list(
        sex = sex,
        sex_label = sex_labels[[sex]],
        data = years_list
      )
    })

    list(
      state_code = loc,
      state_name = if(loc == "total") "Total" else get.location.name(loc),
      sex_groups = sex_groups_list
    )
  })

  list(
    metadata = list(
      generated_date = format(Sys.Date(), "%Y-%m-%d"),
      source = "JHEEM HIV Age Projections Model",
      years = as.integer(dimnames(stats_arr)[["year"]]),
      age_groups = dimnames(stats_arr)[["age"]],
      sex_categories = list(
        msm = "MSM (Men who have sex with men)",
        non_msm = "Non-MSM (Heterosexual men and women)"
      ),
      confidence_level = 0.95
    ),
    states = states_list
  )
}

output_by_sex <- format_for_webapp_sex(by_sex_stats, all_locations)

output_path <- "../../jheem-portal/src/data/hiv-age-projections-by-sex.json"
write_json(output_by_sex, output_path, pretty = TRUE, auto_unbox = TRUE)
cat(sprintf("✓ Written: %s (%.1f KB)\n",
            output_path,
            file.info(output_path)$size / 1024))

cat("\n=== PROCESSING COMPLETE ===\n")
cat("Generated files:\n")
cat("  1. hiv-age-projections-aggregated.json (for 'By State' tab)\n")
cat("  2. hiv-age-projections-by-race.json (for 'By Race' tab)\n")
cat("  3. hiv-age-projections-by-sex.json (for 'By Sex' tab)\n")
cat("\nNext: Update TypeScript to import these files\n")
```

**Expected Output Files:**

Location: `src/data/`

1. **`hiv-age-projections-aggregated.json`** (~50-100 KB)
2. **`hiv-age-projections-by-race.json`** (~250-500 KB)
3. **`hiv-age-projections-by-sex.json`** (~100-200 KB)

---

### **Step 2: Integrate Aggregated Data (MVP - "By State" Tab Only)**

**Goal:** Replace synthetic data with real data, keep current UI unchanged

**Files to Modify:**

#### **A. Update Data Interface**

**File:** `src/data/hiv-age-projections.ts`

**Current structure (Lines 1-21):**
```typescript
export interface AgeCohortsData {
  '13-24': number;
  '25-34': number;
  '35-44': number;
  '45-54': number;
  '55+': number;
}
```

**Change to:**
```typescript
// Update to support CI data (even if not displayed yet)
export interface AgeCohortsData {
  '13-24': number;
  '25-34': number;
  '35-44': number;
  '45-54': number;
  '55+': number;
}

// Internal interface for loaded data (includes CI)
interface AgeCohortsDataWithCI {
  '13-24 years': { median: number; lower: number; upper: number };
  '25-34 years': { median: number; lower: number; upper: number };
  '35-44 years': { median: number; lower: number; upper: number };
  '45-54 years': { median: number; lower: number; upper: number };
  '55+ years': { median: number; lower: number; upper: number };
}
```

#### **B. Import Real Data**

**Add to top of file:**
```typescript
import realDataAggregated from './hiv-age-projections-aggregated.json';
```

#### **C. Transform Data**

**Replace synthetic data generator with:**
```typescript
// Transform real data to app format (extract median, strip " years" suffix)
export const HIV_AGE_PROJECTIONS: StateAgeData[] = realDataAggregated.states.map(state => ({
  state_code: state.state_code,
  state_name: state.state_name,
  data: state.data.map(yearData => ({
    year: yearData.year,
    age_cohorts: {
      '13-24': yearData.age_cohorts['13-24 years'].median,
      '25-34': yearData.age_cohorts['25-34 years'].median,
      '35-44': yearData.age_cohorts['35-44 years'].median,
      '45-54': yearData.age_cohorts['45-54 years'].median,
      '55+': yearData.age_cohorts['55+ years'].median,
    }
  }))
}));

// Store full data (with CI) for future use
export const HIV_AGE_PROJECTIONS_FULL = realDataAggregated.states;
```

#### **D. Verify Build**

```bash
npm run build
```

**Expected:** Clean build with no errors

#### **E. Manual Testing Checklist**

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Visual comparison:**
   - Open `http://localhost:3000/hiv-age-projections`
   - Select California and Texas (easy to compare to paper)
   - Do the bar heights roughly match the paper's figure?
   - Check 2025 vs 2040 - is aging trend visible?

3. **Data validation:**
   - Select "Total" - does it look like sum of all states?
   - Toggle normalization - do percentages sum to 100%?
   - Try all 25 states - any errors in console?

4. **Export test:**
   - Select a few states
   - Click "Export PNG"
   - Verify no lab() color errors
   - Check exported image quality

**If any issues:** Document them, investigate the R script's output

---

### **Step 3: Add "By Race" Tab**

**This step should be done AFTER Step 2 is verified working.**

**Goal:** Add new tab to show racial breakdown within selected states

#### **A. Create New Component**

**File:** `src/components/ByRaceView.tsx` (NEW)

```typescript
'use client';

import { useState, useMemo } from 'react';
import MultiStateChartGrid from './MultiStateChartGrid';
import StateSelector from './StateSelector';
import { getStatesByNames } from '@/data/hiv-age-projections';
import byRaceData from '@/data/hiv-age-projections-by-race.json';

export default function ByRaceView() {
  const [selectedStates, setSelectedStates] = useState<string[]>(['California']);
  const [selectedRaces, setSelectedRaces] = useState<string[]>([
    // Get from byRaceData.metadata.race_categories
    ...byRaceData.metadata.race_categories
  ]);
  const [yearRange, setYearRange] = useState<[number, number]>([2025, 2040]);
  const [normalized, setNormalized] = useState(false);

  // Calculate chart count
  const chartCount = selectedStates.length * selectedRaces.length;
  const maxCharts = 25;

  // Transform data for selected states and races
  const chartData = useMemo(() => {
    // TODO: Transform byRaceData into format MultiStateChartGrid expects
    // For each state, for each race, create a "virtual state" like "CA_Black"
    return [];
  }, [selectedStates, selectedRaces]);

  return (
    <div className="space-y-6">
      {/* State Selector */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <StateSelector
          selectedStates={selectedStates}
          onStateChange={setSelectedStates}
          maxStates={Math.floor(maxCharts / selectedRaces.length)}
        />
      </div>

      {/* Race Selector */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <label className="text-xs font-semibold text-gray-700 mb-2 block">
          Select Races
        </label>
        <div className="grid grid-cols-3 gap-2">
          {byRaceData.metadata.race_categories.map(race => (
            <label key={race} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedRaces.includes(race)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRaces([...selectedRaces, race]);
                  } else {
                    setSelectedRaces(selectedRaces.filter(r => r !== race));
                  }
                }}
              />
              <span className="text-sm">{race}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {chartCount} charts ({maxCharts} max)
        </div>
      </div>

      {/* Charts */}
      <MultiStateChartGrid
        states={chartData}
        normalized={normalized}
        yearRange={yearRange}
      />
    </div>
  );
}
```

**Note:** This is a skeleton. The data transformation logic needs to be implemented based on the actual JSON structure from Step 1.

#### **B. Add Tab to Main Page**

**File:** `src/app/hiv-age-projections/page.tsx`

**Add state (around line 14):**
```typescript
const [viewMode, setViewMode] = useState<'state' | 'race' | 'sex'>('state');
```

**Add tabs UI (before controls section):**
```tsx
<div className="flex gap-2 border-b-2 border-gray-200 mb-6">
  <button
    onClick={() => setViewMode('state')}
    className={`px-4 py-2 font-semibold transition-colors ${
      viewMode === 'state'
        ? 'text-hopkins-blue border-b-4 border-hopkins-blue -mb-[2px]'
        : 'text-gray-600 hover:text-gray-900'
    }`}
  >
    By State
  </button>
  <button
    onClick={() => setViewMode('race')}
    className={`px-4 py-2 font-semibold transition-colors ${
      viewMode === 'race'
        ? 'text-hopkins-blue border-b-4 border-hopkins-blue -mb-[2px]'
        : 'text-gray-600 hover:text-gray-900'
    }`}
  >
    By Race
  </button>
  <button
    onClick={() => setViewMode('sex')}
    className={`px-4 py-2 font-semibold transition-colors ${
      viewMode === 'sex'
        ? 'text-hopkins-blue border-b-4 border-hopkins-blue -mb-[2px]'
        : 'text-gray-600 hover:text-gray-900'
    }`}
    disabled
    title="Coming soon"
  >
    By Sex
  </button>
</div>
```

**Conditional rendering (replace current controls/grid):**
```tsx
{viewMode === 'state' && (
  <div className="space-y-4">
    {/* Current 3-column controls */}
    {/* Current MultiStateChartGrid */}
  </div>
)}

{viewMode === 'race' && (
  <ByRaceView />
)}

{viewMode === 'sex' && (
  <div className="text-center text-gray-500 py-12">
    By Sex view coming soon
  </div>
)}
```

---

### **Step 4: Add "By Sex" Tab**

**Similar to Step 3, but using `hiv-age-projections-by-sex.json`**

Create `src/components/BySexView.tsx` following same pattern as ByRaceView.

---

### **Step 5: Add Confidence Intervals (Future Enhancement)**

**When ready to enable CI visualization:**

1. **Add toggle to each view:**
```tsx
const [showCI, setShowCI] = useState(false);

<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={showCI}
    onChange={(e) => setShowCI(e.target.checked)}
  />
  Show 95% Confidence Intervals
</label>
```

2. **Update data transformation to include upper/lower:**
```typescript
// Instead of just median
'13-24': yearData.age_cohorts['13-24 years'].median

// Include full object
'13-24': {
  median: yearData.age_cohorts['13-24 years'].median,
  lower: yearData.age_cohorts['13-24 years'].lower,
  upper: yearData.age_cohorts['13-24 years'].upper
}
```

3. **Update AgeDistributionChart to render bands:**
```tsx
// Add Area components for CI bands
{showCI && (
  <>
    <Area
      dataKey={`${statePrefix}_55+_upper`}
      fill="#10B981"
      fillOpacity={0.2}
      stroke="none"
    />
    <Area
      dataKey={`${statePrefix}_55+_lower`}
      fill="#10B981"
      fillOpacity={0.2}
      stroke="none"
    />
  </>
)}
```

---

## 🎯 Success Criteria for Next Session

### **Minimum Viable Deliverables:**

1. ✅ **Step 0 complete:** `exploration_findings.txt` documenting actual data structure
2. ✅ **Step 1 complete:** 3 JSON files generated and committed to repo
3. ✅ **Step 2 complete:** App displays real data in "By State" tab
4. ✅ **Validation complete:** Visual comparison to paper's figure confirms accuracy

### **Stretch Goals (if time permits):**

5. ⭐ **Step 3 started:** "By Race" tab UI implemented
6. ⭐ **Step 4 started:** "By Sex" tab UI implemented

---

## 📚 Key Reference Files

### **Project Files (Existing):**

```
jheem-portal/
├── src/
│   ├── app/hiv-age-projections/
│   │   └── page.tsx                          # Main page, 3-column layout
│   ├── components/
│   │   ├── StateSelector.tsx                 # 7-col grid, Total button gold
│   │   ├── TimelineControls.tsx              # Year range slider + presets
│   │   ├── MultiStateChartGrid.tsx           # Grid layout + export
│   │   └── AgeDistributionChart.tsx          # Individual chart with tooltips
│   └── data/
│       └── hiv-age-projections.ts            # Current synthetic data (to be replaced)
└── package.json                              # Dependencies: html2canvas
```

### **External Files (Colleague's R Code):**

```
/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis/
├── generate_stacked_area_chart.R             # Main visualization script
├── helpers.R                                 # get_stats(), map_sex(), etc.
└── Rdata Objects/                            # Data files (coming soon)
    ├── age_results.Rdata                     # Main data array
    ├── total_results.Rdata                   # Aggregate totals
    ├── state_order.Rdata                     # State ordering
    └── state_order_names.Rdata               # State name mappings
```

### **Files to Create in Next Session:**

```
jheem-portal/
├── scripts/
│   ├── exploration.R                         # Step 0: Data exploration
│   ├── exploration_findings.txt              # Step 0: Documentation
│   └── prepare_hiv_age_data.R                # Step 1: Data processing
└── src/
    ├── data/
    │   ├── hiv-age-projections-aggregated.json   # Step 1: By State data
    │   ├── hiv-age-projections-by-race.json      # Step 1: By Race data
    │   └── hiv-age-projections-by-sex.json       # Step 1: By Sex data
    └── components/
        ├── ByRaceView.tsx                    # Step 3: Race tab component
        └── BySexView.tsx                     # Step 4: Sex tab component
```

---

## ⚠️ Critical Reminders for Next Session

1. **DO NOT START until Rdata files are available**
   - Ask the user to confirm files are in: `/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis/Rdata Objects/`

2. **ALWAYS run Step 0 (exploration) first**
   - The dimension structure might differ from assumptions
   - Race categories need to be confirmed
   - Sex categories need to be verified

3. **Document everything in exploration_findings.txt**
   - Future sessions depend on this documentation
   - Write down exact dimension names, categories, counts

4. **Test with 1-2 states before processing all 25**
   - California and Texas are good test cases (in the paper)
   - Verify output looks correct before scaling up

5. **Commit JSON files to git**
   - These should be version controlled
   - Update `.gitignore` if files are too large (use Git LFS)

6. **Don't optimize prematurely**
   - Get Step 2 working first (aggregated data only)
   - Then add race/sex tabs incrementally
   - CI visualization is explicitly "later"

---

## 🔄 Session Handoff Summary

**What we accomplished:**
- ✅ Polished UI with 3-column layout, gold Total button, hover tooltips
- ✅ Fixed tooltip colors, chart spacing, export PNG lab() error
- ✅ Analyzed R scripts to understand data structure
- ✅ Designed comprehensive real data integration plan
- ✅ Agreed on tabbed view approach for demographic faceting

**What's next:**
- 🎯 Wait for Rdata files from colleague
- 🎯 Run Step 0: Data exploration and documentation
- 🎯 Run Step 1: Generate 3 JSON files from Rdata
- 🎯 Run Step 2: Replace synthetic data with real aggregated data
- 🎯 Validate against paper's figure

**Blocked on:**
- ⏸️ Colleague providing Rdata files

**Ready to proceed when:**
- ✅ Rdata files are in place
- ✅ R environment is available (tidyverse, jsonlite, locations packages)
- ✅ This plan is reviewed at start of next session

---

**End of Session Summary**
