# prepare_race_data.R
# Processes JHEEM race_results data into web-ready JSON format
# Creates hiv-age-projections-by-race.json for "By Race" tab

# Check for required packages
required_packages <- c("jsonlite", "locations")
missing_packages <- required_packages[!(required_packages %in% installed.packages()[,"Package"])]
if(length(missing_packages) > 0) {
  stop(paste("Missing required packages:", paste(missing_packages, collapse=", "),
             "\nPlease install with: install.packages(c('jsonlite', 'locations'))"))
}

library(jsonlite)
library(locations)

cat("\n===========================================\n")
cat("JHEEM RACE DATA PROCESSING\n")
cat("===========================================\n\n")

# Set working directory
setwd("/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis")

# Source helper functions
cat("Loading helper functions...\n")
source("helpers.R")

# Load data
cat("Loading data files...\n")
load("Rdata Objects/race_results.Rdata")
load("Rdata Objects/state_order.Rdata")
load("Rdata Objects/state_order_names.Rdata")

cat("✓ Data loaded successfully\n\n")

# Verify dimensions
cat("Verifying data structure...\n")
cat(sprintf("  race_results dimensions: %s\n", paste(dim(race_results), collapse=" x ")))
cat(sprintf("  Dimension names: %s\n", paste(names(dim(race_results)), collapse=", ")))

# Get race categories
race_categories <- dimnames(race_results)$race
cat(sprintf("\n✓ Found %d race categories: %s\n",
            length(race_categories),
            paste(race_categories, collapse=", ")))

# Define states to include (all 24 available)
available_states <- dimnames(race_results)$location
cat(sprintf("\n✓ Found %d states\n", length(available_states)))

# Define year range for web app (2025-2040)
year_range <- as.character(2025:2040)
cat(sprintf("\n✓ Extracting years: %s to %s (%d years)\n",
            min(year_range), max(year_range), length(year_range)))

# ===== STEP 1: EXTRACT DATA BY RACE =====
cat("\n===========================================\n")
cat("STEP 1: Processing data by race\n")
cat("===========================================\n")
cat("Extracting diagnosed.prevalence for all states and races...\n")

# Extract diagnosed prevalence for desired years
# Dimensions: [year, age, race, sim, outcome, location, intervention]
# We want: [year, age, race, location] with sim collapsed via get_stats()

data_subset <- race_results[year_range, , , , "diagnosed.prevalence", available_states, "noint"]

cat(sprintf("  Extracted dimensions: %s\n", paste(dim(data_subset), collapse=" x ")))
cat(sprintf("  Dimension names: %s\n", paste(names(dim(data_subset)), collapse=", ")))

# ===== STEP 2: CREATE "TOTAL" LOCATION =====
cat("\nCreating 'total' by summing all states...\n")

# Sum across location dimension to get total
# Result should be [year, age, race, sim]
total_arr <- apply(data_subset, c("year", "age", "race", "sim"), sum)
cat(sprintf("  Total dimensions: %s\n", paste(dim(total_arr), collapse=" x ")))

# Combine state data with total
cat("\nCombining state data with total...\n")

# Reorder dimensions to [year, age, race, sim, location]
data_with_sims <- apply(data_subset, c("year", "age", "race", "sim", "location"), function(x) x)

# Add total as a new location
combined_dimnames <- dimnames(data_with_sims)
combined_dimnames$location <- c(available_states, "total")

# Combine arrays
combined_arr <- array(
  c(data_with_sims, total_arr),
  dim = c(
    year = length(year_range),
    age = 5,
    race = length(race_categories),
    sim = 1000,
    location = length(available_states) + 1
  ),
  dimnames = combined_dimnames
)

cat(sprintf("  Combined dimensions: %s\n", paste(dim(combined_arr), collapse=" x ")))

# ===== STEP 3: CALCULATE STATISTICS =====
cat("\n===========================================\n")
cat("STEP 2: Calculating statistics\n")
cat("===========================================\n")
cat("Computing median and 95% confidence intervals...\n")

# Apply get_stats to collapse sim dimension
# Result: [metric, year, age, race, location]
stats_arr <- get_stats(combined_arr, keep.dimensions = c('year', 'age', 'race', 'location'))

cat(sprintf("  Stats dimensions: %s\n", paste(dim(stats_arr), collapse=" x ")))
cat(sprintf("  Metrics: %s\n", paste(dimnames(stats_arr)$metric, collapse=", ")))

# ===== STEP 4: FORMAT FOR WEB APP =====
cat("\n===========================================\n")
cat("STEP 3: Formatting for web application\n")
cat("===========================================\n")

# Helper function to format data for webapp
format_for_webapp_race <- function(stats_arr, location_codes) {
  cat(sprintf("Formatting data for %d locations...\n", length(location_codes)))

  states_list <- lapply(location_codes, function(loc) {
    # Extract data for this location: [metric, year, age, race]
    loc_data <- stats_arr[, , , , loc]

    # Build races list
    races_list <- lapply(dimnames(loc_data)[["race"]], function(race) {
      # Extract data for this race: [metric, year, age]
      race_data <- loc_data[, , , race]

      # Build years list
      years_list <- lapply(dimnames(race_data)[["year"]], function(yr) {
        # Extract data for this year: [metric, age]
        year_data <- race_data[, yr, ]

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

      # Create display label for race
      race_label <- switch(race,
        "black" = "Black",
        "hispanic" = "Hispanic",
        "other" = "Other",
        race  # fallback
      )

      list(
        race = race,
        race_label = race_label,
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
      races = races_list
    )
  })

  # Create output structure
  list(
    metadata = list(
      generated_date = format(Sys.Date(), "%Y-%m-%d"),
      source = "JHEEM HIV Age Projections Model",
      description = "Diagnosed HIV prevalence by age cohort, race, and state (2025-2040)",
      years = as.integer(dimnames(stats_arr)[["year"]]),
      age_groups = dimnames(stats_arr)[["age"]],
      race_categories = as.list(setNames(
        c("Black", "Hispanic", "Other"),
        dimnames(stats_arr)[["race"]]
      )),
      confidence_level = 0.95,
      notes = "Confidence intervals represent 2.5th and 97.5th percentiles across 1000 simulations. Race categories: Black, Hispanic, Other (includes White, Asian, Native American, and other groups)."
    ),
    states = states_list
  )
}

# Format all locations (24 states + total)
all_locations <- c(available_states, "total")
output_data <- format_for_webapp_race(stats_arr, all_locations)

# ===== STEP 5: WRITE JSON FILE =====
cat("\n===========================================\n")
cat("STEP 4: Writing JSON file\n")
cat("===========================================\n")

output_path <- "/Users/cristina/wiley/Documents/jheem-portal/src/data/hiv-age-projections-by-race.json"

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

# ===== STEP 6: VALIDATION =====
cat("\n===========================================\n")
cat("STEP 5: Validation\n")
cat("===========================================\n")

# Sample output: California 2025 by race
cat("\nSample data - California 2025 by race:\n")
for (race in dimnames(stats_arr)[["race"]]) {
  ca_2025_race <- stats_arr[, "2025", , race, "CA"]
  race_total <- sum(ca_2025_race["median", ])

  race_label <- switch(race,
    "black" = "Black",
    "hispanic" = "Hispanic",
    "other" = "Other",
    race
  )

  cat(sprintf("\n  %s: %d total cases\n", race_label, race_total))
  for (age in dimnames(ca_2025_race)[["age"]]) {
    cat(sprintf("    %s: %d (95%% CI: %d - %d)\n",
                age,
                ca_2025_race["median", age],
                ca_2025_race["lower", age],
                ca_2025_race["upper", age]))
  }
}

# Verify total across races matches aggregated data
cat("\nVerifying sum of races matches aggregated total...\n")
ca_2025_all_races <- sum(stats_arr["median", "2025", , , "CA"])
cat(sprintf("  Sum across all races: %d cases\n", ca_2025_all_races))
cat("  Expected from aggregated data: 140,471 cases\n")
cat(sprintf("  Difference: %d cases (%.1f%%)\n",
            abs(ca_2025_all_races - 140471),
            100 * abs(ca_2025_all_races - 140471) / 140471))

if (abs(ca_2025_all_races - 140471) / 140471 < 0.01) {
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
cat("  1. Add tab navigation to switch between 'By State' and 'By Race'\n")
cat("  2. Create ByRaceView component\n")
cat("  3. Test in web app\n")
cat("\nReady for UI implementation!\n\n")
