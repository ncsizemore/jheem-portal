# prepare_hiv_age_data.R
# Processes JHEEM age_results data into web-ready JSON format
# Creates hiv-age-projections-aggregated.json for "By State" tab

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
cat("JHEEM AGE DATA PROCESSING\n")
cat("===========================================\n\n")

# Set working directory
setwd("/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis")

# Source helper functions
cat("Loading helper functions...\n")
source("helpers.R")

# Load data
cat("Loading data files...\n")
load("Rdata Objects/age_results.Rdata")
load("Rdata Objects/state_order.Rdata")
load("Rdata Objects/state_order_names.Rdata")

cat("✓ Data loaded successfully\n\n")

# Verify dimensions
cat("Verifying data structure...\n")
cat(sprintf("  age_results dimensions: %s\n", paste(dim(age_results), collapse=" x ")))
cat(sprintf("  Dimension names: %s\n", paste(names(dim(age_results)), collapse=", ")))

# Define states to include (all 24 available)
available_states <- dimnames(age_results)$location
cat(sprintf("\n✓ Found %d states\n", length(available_states)))
cat(sprintf("  States: %s\n", paste(available_states, collapse=", ")))

# Define year range for web app (2025-2040)
year_range <- as.character(2025:2040)
cat(sprintf("\n✓ Extracting years: %s to %s (%d years)\n",
            min(year_range), max(year_range), length(year_range)))

# ===== STEP 1: EXTRACT AND AGGREGATE DATA =====
cat("\n===========================================\n")
cat("STEP 1: Processing aggregated data\n")
cat("===========================================\n")
cat("Extracting diagnosed.prevalence for all states...\n")

# Extract diagnosed prevalence for desired years and intervention
# Dimensions: [year, age, sim, outcome, location, intervention]
# We want: [year, age, location] with sim collapsed via get_stats()

# Extract subset: years 2025-2040, all ages, diagnosed.prevalence, all states, noint
data_subset <- age_results[year_range, , , "diagnosed.prevalence", available_states, "noint"]

cat(sprintf("  Extracted dimensions: %s\n", paste(dim(data_subset), collapse=" x ")))
cat(sprintf("  Dimension names: %s\n", paste(names(dim(data_subset)), collapse=", ")))

# ===== STEP 2: CREATE "TOTAL" LOCATION =====
cat("\nCreating 'total' by summing all states...\n")

# Sum across location dimension to get total
# Result should be [year, age, sim]
total_arr <- apply(data_subset, c("year", "age", "sim"), sum)
cat(sprintf("  Total dimensions: %s\n", paste(dim(total_arr), collapse=" x ")))

# Combine state data with total
# Need to reshape to match: [year, age, sim, location]
cat("\nCombining state data with total...\n")

# Reorder data_subset dimensions to [year, age, sim, location]
data_with_sims <- apply(data_subset, c("year", "age", "sim", "location"), function(x) x)

# Add total as a new location
combined_dimnames <- dimnames(data_with_sims)
combined_dimnames$location <- c(available_states, "total")

# Combine arrays
combined_arr <- array(
  c(data_with_sims, total_arr),
  dim = c(
    year = length(year_range),
    age = 5,
    sim = 1000,
    location = length(available_states) + 1
  ),
  dimnames = combined_dimnames
)

cat(sprintf("  Combined dimensions: %s\n", paste(dim(combined_arr), collapse=" x ")))
cat(sprintf("  Locations: %s\n", paste(dimnames(combined_arr)$location, collapse=", ")))

# ===== STEP 3: CALCULATE STATISTICS =====
cat("\n===========================================\n")
cat("STEP 2: Calculating statistics\n")
cat("===========================================\n")
cat("Computing median and 95% confidence intervals...\n")

# Apply get_stats to collapse sim dimension
# Result: [metric, year, age, location]
stats_arr <- get_stats(combined_arr, keep.dimensions = c('year', 'age', 'location'))

cat(sprintf("  Stats dimensions: %s\n", paste(dim(stats_arr), collapse=" x ")))
cat(sprintf("  Metrics: %s\n", paste(dimnames(stats_arr)$metric, collapse=", ")))

# ===== STEP 4: FORMAT FOR WEB APP =====
cat("\n===========================================\n")
cat("STEP 3: Formatting for web application\n")
cat("===========================================\n")

# Helper function to format data for webapp
format_for_webapp <- function(stats_arr, location_codes) {
  cat(sprintf("Formatting data for %d locations...\n", length(location_codes)))

  states_list <- lapply(location_codes, function(loc) {
    # Extract data for this location: [metric, year, age]
    loc_data <- stats_arr[, , , loc]

    # Build years list
    years_list <- lapply(dimnames(loc_data)[["year"]], function(yr) {
      # Extract data for this year: [metric, age]
      year_data <- loc_data[, yr, ]

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

    # Get state name
    state_name <- if(loc == "total") {
      "Total"
    } else {
      tryCatch({
        get.location.name(loc)
      }, error = function(e) {
        # Fallback if locations package has issues
        if (loc %in% names(state_order_names)) {
          state_order_names[[loc]]
        } else {
          loc  # Use code as fallback
        }
      })
    }

    list(
      state_code = loc,
      state_name = state_name,
      data = years_list
    )
  })

  # Create output structure
  list(
    metadata = list(
      generated_date = format(Sys.Date(), "%Y-%m-%d"),
      source = "JHEEM HIV Age Projections Model",
      description = "Diagnosed HIV prevalence by age cohort and state (2025-2040)",
      years = as.integer(dimnames(stats_arr)[["year"]]),
      age_groups = dimnames(stats_arr)[["age"]],
      confidence_level = 0.95,
      notes = "Confidence intervals represent 2.5th and 97.5th percentiles across 1000 simulations"
    ),
    states = states_list
  )
}

# Format all locations (24 states + total)
all_locations <- c(available_states, "total")
output_data <- format_for_webapp(stats_arr, all_locations)

# ===== STEP 5: WRITE JSON FILE =====
cat("\n===========================================\n")
cat("STEP 4: Writing JSON file\n")
cat("===========================================\n")

output_path <- "/Users/cristina/wiley/Documents/jheem-portal/src/data/hiv-age-projections-aggregated.json"

cat(sprintf("Writing to: %s\n", output_path))

write_json(
  output_data,
  output_path,
  pretty = TRUE,
  auto_unbox = TRUE,
  digits = 0  # Round to whole numbers (case counts)
)

# Get file size
file_size_kb <- round(file.info(output_path)$size / 1024, 1)
cat(sprintf("✓ File written: %.1f KB\n", file_size_kb))

# ===== STEP 6: VALIDATION =====
cat("\n===========================================\n")
cat("STEP 5: Validation\n")
cat("===========================================\n")

# Sample output: California 2025
cat("\nSample data - California 2025:\n")
ca_2025 <- stats_arr[, "2025", , "CA"]
for (age in dimnames(ca_2025)[["age"]]) {
  cat(sprintf("  %s: %d (95%% CI: %d - %d)\n",
              age,
              ca_2025["median", age],
              ca_2025["lower", age],
              ca_2025["upper", age]))
}

ca_2025_total <- sum(ca_2025["median", ])
cat(sprintf("  TOTAL: %d cases\n", ca_2025_total))

# Sample output: Total 2025
cat("\nSample data - Total (all states) 2025:\n")
total_2025 <- stats_arr[, "2025", , "total"]
for (age in dimnames(total_2025)[["age"]]) {
  cat(sprintf("  %s: %d (95%% CI: %d - %d)\n",
              age,
              total_2025["median", age],
              total_2025["lower", age],
              total_2025["upper", age]))
}

total_2025_total <- sum(total_2025["median", ])
cat(sprintf("  TOTAL: %d cases\n", total_2025_total))

# Check total vs sum of states
cat("\nVerifying 'total' = sum of all states...\n")
manual_total <- sum(stats_arr["median", "2025", , available_states])
stored_total <- sum(stats_arr["median", "2025", , "total"])

cat(sprintf("  Sum of all states: %d\n", manual_total))
cat(sprintf("  Stored total:      %d\n", stored_total))
cat(sprintf("  Difference:        %d (%.2f%%)\n",
            abs(manual_total - stored_total),
            100 * abs(manual_total - stored_total) / manual_total))

if (abs(manual_total - stored_total) / manual_total < 0.001) {
  cat("  ✓ VERIFICATION PASSED (< 0.1% difference)\n")
} else {
  cat("  ⚠️  WARNING: Difference exceeds expected tolerance\n")
}

cat("\n===========================================\n")
cat("PROCESSING COMPLETE\n")
cat("===========================================\n\n")

cat("Generated file:\n")
cat(sprintf("  %s (%.1f KB)\n", output_path, file_size_kb))

cat("\nNext steps:\n")
cat("  1. Review JSON structure in text editor\n")
cat("  2. Update TypeScript to import this file\n")
cat("  3. Test in web app\n")
cat("  4. Compare visually to paper figure\n")
cat("\nReady for Step 2: Web app integration!\n\n")
