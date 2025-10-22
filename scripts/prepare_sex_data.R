# prepare_sex_data.R
# Processes JHEEM race_sex_results data into web-ready JSON format
# Creates hiv-age-projections-by-sex.json for "By Sex" tab
# Aggregates race dimension, splits sex into MSM vs Non-MSM

# Check for required packages
required_packages <- c("jsonlite", "locations", "jheem2")
missing_packages <- required_packages[!(required_packages %in% installed.packages()[,"Package"])]
if(length(missing_packages) > 0) {
  stop(paste("Missing required packages:", paste(missing_packages, collapse=", "),
             "\nPlease install with: install.packages(c('jsonlite', 'locations', 'jheem2'))"))
}

library(jsonlite)
library(locations)
library(jheem2)

cat("\n===========================================\n")
cat("JHEEM SEX DATA PROCESSING\n")
cat("===========================================\n\n")

# Set working directory
setwd("/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis")

# Source helper functions
cat("Loading helper functions...\n")
source("helpers.R")

# Load data
cat("Loading data files...\n")
load("Rdata Objects/race_sex_results.Rdata")
load("Rdata Objects/state_order.Rdata")
load("Rdata Objects/state_order_names.Rdata")

cat("✓ Data loaded successfully\n\n")

# Verify dimensions
cat("Verifying data structure...\n")
cat(sprintf("  race_sex_results dimensions: %s\n", paste(dim(race_sex_results), collapse=" x ")))
cat(sprintf("  Dimension names: %s\n", paste(names(dim(race_sex_results)), collapse=", ")))

# Get sex categories (before mapping)
sex_categories_raw <- dimnames(race_sex_results)$sex
cat(sprintf("\n✓ Found %d sex categories: %s\n",
            length(sex_categories_raw),
            paste(sex_categories_raw, collapse=", ")))

# Define states to include (all 24 available)
available_states <- dimnames(race_sex_results)$location
cat(sprintf("\n✓ Found %d states\n", length(available_states)))

# Define year range for web app (2025-2040)
year_range <- as.character(2025:2040)
cat(sprintf("\n✓ Extracting years: %s to %s (%d years)\n",
            min(year_range), max(year_range), length(year_range)))

# ===== STEP 1: EXTRACT DATA AND AGGREGATE RACE =====
cat("\n===========================================\n")
cat("STEP 1: Processing data and aggregating race\n")
cat("===========================================\n")
cat("Extracting diagnosed.prevalence and summing across race...\n")

# Extract diagnosed prevalence for desired years
# Dimensions: [year, age, race, sex, sim, outcome, location, intervention]
# We want: [year, age, sex, location] with race aggregated and sim collapsed

data_subset <- race_sex_results[year_range, , , , , "diagnosed.prevalence", available_states, "noint"]

cat(sprintf("  Extracted dimensions: %s\n", paste(dim(data_subset), collapse=" x ")))
cat(sprintf("  Dimension names: %s\n", paste(names(dim(data_subset)), collapse=", ")))

# Sum across race dimension
# Result: [year, age, sex, sim, location]
cat("\nSumming across race dimension...\n")
data_no_race <- apply(data_subset, c("year", "age", "sex", "sim", "location"), sum)
cat(sprintf("  Dimensions after aggregating race: %s\n", paste(dim(data_no_race), collapse=" x ")))

# ===== STEP 2: MAP SEX CATEGORIES (MSM vs Non-MSM) =====
cat("\n===========================================\n")
cat("STEP 2: Mapping sex categories\n")
cat("===========================================\n")
cat("Using map_sex() to convert:\n")
cat("  heterosexual_male + female → non_msm\n")
cat("  msm → msm\n\n")

# Apply map_sex function to transform sex dimension
# This combines heterosexual_male + female into "non_msm" and keeps "msm"
data_mapped_sex <- map_sex(data_no_race)

cat(sprintf("  Dimensions after mapping: %s\n", paste(dim(data_mapped_sex), collapse=" x ")))
cat(sprintf("  New sex categories: %s\n", paste(dimnames(data_mapped_sex)$sex, collapse=", ")))

# ===== STEP 3: CREATE "TOTAL" LOCATION =====
cat("\n===========================================\n")
cat("STEP 3: Creating 'total' location\n")
cat("===========================================\n")
cat("Summing all states...\n")

# Sum across location dimension to get total
# Result should be [year, age, sex, sim]
total_arr <- apply(data_mapped_sex, c("year", "age", "sex", "sim"), sum)
cat(sprintf("  Total dimensions: %s\n", paste(dim(total_arr), collapse=" x ")))

# Combine state data with total
cat("\nCombining state data with total...\n")

# Reorder dimensions to [year, age, sex, sim, location]
data_with_sims <- apply(data_mapped_sex, c("year", "age", "sex", "sim", "location"), function(x) x)

# Add total as a new location
combined_dimnames <- dimnames(data_with_sims)
combined_dimnames$location <- c(available_states, "total")

# Combine arrays
combined_arr <- array(
  c(data_with_sims, total_arr),
  dim = c(
    year = length(year_range),
    age = 5,
    sex = 2,  # msm, non_msm
    sim = 1000,
    location = length(available_states) + 1
  ),
  dimnames = combined_dimnames
)

cat(sprintf("  Combined dimensions: %s\n", paste(dim(combined_arr), collapse=" x ")))

# ===== STEP 4: CALCULATE STATISTICS =====
cat("\n===========================================\n")
cat("STEP 4: Calculating statistics\n")
cat("===========================================\n")
cat("Computing median and 95% confidence intervals...\n")

# Apply get_stats to collapse sim dimension
# Result: [metric, year, age, sex, location]
stats_arr <- get_stats(combined_arr, keep.dimensions = c('year', 'age', 'sex', 'location'))

cat(sprintf("  Stats dimensions: %s\n", paste(dim(stats_arr), collapse=" x ")))
cat(sprintf("  Metrics: %s\n", paste(dimnames(stats_arr)$metric, collapse=", ")))

# ===== STEP 5: FORMAT FOR WEB APP =====
cat("\n===========================================\n")
cat("STEP 5: Formatting for web application\n")
cat("===========================================\n")

# Helper function to format data for webapp
format_for_webapp_sex <- function(stats_arr, location_codes) {
  cat(sprintf("Formatting data for %d locations...\n", length(location_codes)))

  states_list <- lapply(location_codes, function(loc) {
    # Extract data for this location: [metric, year, age, sex]
    loc_data <- stats_arr[, , , , loc]

    # Build sex categories list
    sex_list <- lapply(dimnames(loc_data)[["sex"]], function(sex) {
      # Extract data for this sex: [metric, year, age]
      sex_data <- loc_data[, , , sex]

      # Build years list
      years_list <- lapply(dimnames(sex_data)[["year"]], function(yr) {
        # Extract data for this year: [metric, age]
        year_data <- sex_data[, yr, ]

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

      # Create display label for sex
      sex_label <- switch(sex,
        "msm" = "MSM",
        "non_msm" = "Non-MSM",
        sex  # fallback
      )

      list(
        sex = sex,
        sex_label = sex_label,
        data = years_list
      )
    })

    # Get state name
    state_name <- if(loc == "total") {
      "Total"
    } else {
      tryCatch({
        get.location.name(loc)
      }, error = function(e) {
        if (loc %in% names(state_order_names)) {
          state_order_names[[loc]]
        } else {
          loc
        }
      })
    }

    list(
      state_code = loc,
      state_name = state_name,
      sex_categories = sex_list
    )
  })

  # Create output structure
  list(
    metadata = list(
      generated_date = format(Sys.Date(), "%Y-%m-%d"),
      source = "JHEEM HIV Age Projections Model",
      description = "Diagnosed HIV prevalence by age cohort, sex, and state (2025-2040)",
      years = as.integer(dimnames(stats_arr)[["year"]]),
      age_groups = dimnames(stats_arr)[["age"]],
      sex_categories = as.list(setNames(
        c("MSM", "Non-MSM"),
        dimnames(stats_arr)[["sex"]]
      )),
      confidence_level = 0.95,
      notes = "Confidence intervals represent 2.5th and 97.5th percentiles across 1000 simulations. Sex categories: MSM (men who have sex with men), Non-MSM (heterosexual males and females combined). Race dimension has been aggregated."
    ),
    states = states_list
  )
}

# Format all locations (24 states + total)
all_locations <- c(available_states, "total")
output_data <- format_for_webapp_sex(stats_arr, all_locations)

# ===== STEP 6: WRITE JSON FILE =====
cat("\n===========================================\n")
cat("STEP 6: Writing JSON file\n")
cat("===========================================\n")

output_path <- "/Users/cristina/wiley/Documents/jheem-portal/src/data/hiv-age-projections-by-sex.json"

cat(sprintf("Writing to: %s\n", output_path))

write_json(
  output_data,
  output_path,
  pretty = TRUE,
  auto_unbox = TRUE,
  digits = 0
)

# Get file size
file_size_kb <- round(file.info(output_path)$size / 1024, 1)
cat(sprintf("✓ File written: %.1f KB\n", file_size_kb))

# ===== STEP 7: VALIDATION =====
cat("\n===========================================\n")
cat("STEP 7: Validation\n")
cat("===========================================\n")

# Sample output: California 2025 by sex
cat("\nSample data - California 2025 by sex:\n")
for (sex in dimnames(stats_arr)[["sex"]]) {
  ca_2025_sex <- stats_arr[, "2025", , sex, "CA"]
  sex_total <- sum(ca_2025_sex["median", ])

  sex_label <- switch(sex,
    "msm" = "MSM",
    "non_msm" = "Non-MSM",
    sex
  )

  cat(sprintf("\n  %s: %d total cases\n", sex_label, sex_total))
  for (age in dimnames(ca_2025_sex)[["age"]]) {
    cat(sprintf("    %s: %d (95%% CI: %d - %d)\n",
                age,
                ca_2025_sex["median", age],
                ca_2025_sex["lower", age],
                ca_2025_sex["upper", age]))
  }
}

# Verify total across sex categories matches aggregated data
cat("\nVerifying sum of sex categories matches aggregated total...\n")
ca_2025_all_sex <- sum(stats_arr["median", "2025", , , "CA"])
cat(sprintf("  Sum across all sex categories: %d cases\n", ca_2025_all_sex))
cat("  Expected from aggregated data: 140,471 cases\n")
cat(sprintf("  Difference: %d cases (%.1f%%)\n",
            abs(ca_2025_all_sex - 140471),
            100 * abs(ca_2025_all_sex - 140471) / 140471))

if (abs(ca_2025_all_sex - 140471) / 140471 < 0.01) {
  cat("  ✓ VERIFICATION PASSED (< 1% difference)\n")
} else {
  cat("  ⚠️  WARNING: Difference exceeds expected tolerance\n")
}

cat("\n===========================================\n")
cat("PROCESSING COMPLETE\n")
cat("===========================================\n\n")

cat("Generated file:\n")
cat(sprintf("  %s (%.1f KB)\n", output_path, file_size_kb))

cat("\nNext steps:\n")
cat("  1. Create BySexView component\n")
cat("  2. Enable sex tab in navigation\n")
cat("  3. Test in web app\n")
cat("\nReady for UI implementation!\n\n")
