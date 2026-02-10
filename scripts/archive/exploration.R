# exploration.R - Interactive data exploration
# Explores JHEEM age_results data structure before processing

# Set working directory to where Rdata files are located
setwd("/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis")

# Source helper functions
source("helpers.R")

cat("===========================================\n")
cat("JHEEM AGE RESULTS DATA EXPLORATION\n")
cat("===========================================\n\n")

# Load data files
cat("Loading data files...\n")
load("Rdata Objects/age_results.Rdata")
load("Rdata Objects/total_results.Rdata")
load("Rdata Objects/state_order.Rdata")
load("Rdata Objects/state_order_names.Rdata")

cat("✓ Data loaded successfully\n\n")

# ===== CRITICAL: VERIFY DIMENSIONS =====
cat("===========================================\n")
cat("1. AGE_RESULTS DIMENSIONS\n")
cat("===========================================\n")
cat("Array dimensions:\n")
print(dim(age_results))
cat("\nDimension names:\n")
print(names(dim(age_results)))

# What are the dimension values?
cat("\n===========================================\n")
cat("2. DIMENSION VALUES\n")
cat("===========================================\n")
for (dim_name in names(dim(age_results))) {
  cat(sprintf("\n--- %s (%d levels) ---\n", dim_name, length(dimnames(age_results)[[dim_name]])))
  print(dimnames(age_results)[[dim_name]])
}

# ===== VERIFY YEAR RANGE =====
cat("\n===========================================\n")
cat("3. YEAR RANGE VERIFICATION\n")
cat("===========================================\n")
year_values <- dimnames(age_results)$year
cat(sprintf("Years: %s to %s (%d years)\n",
            min(year_values), max(year_values), length(year_values)))
cat("Expected: 2025 to 2040 (16 years)\n")
if (identical(year_values, as.character(2025:2040))) {
  cat("✓ MATCHES EXPECTED RANGE\n")
} else {
  cat("✗ DIFFERENT FROM EXPECTED\n")
  cat("Actual years:\n")
  print(year_values)
}

# ===== VERIFY AGE GROUPS =====
cat("\n===========================================\n")
cat("4. AGE GROUPS VERIFICATION\n")
cat("===========================================\n")
age_groups <- dimnames(age_results)$age
cat("Age groups:\n")
print(age_groups)
expected_ages <- c("13-24 years", "25-34 years", "35-44 years", "45-54 years", "55+ years")
if (identical(age_groups, expected_ages)) {
  cat("✓ MATCHES EXPECTED AGE GROUPS\n")
} else {
  cat("✗ DIFFERENT FROM EXPECTED\n")
}

# ===== VERIFY RACE CATEGORIES =====
cat("\n===========================================\n")
cat("5. RACE CATEGORIES (CRITICAL)\n")
cat("===========================================\n")
if ("race" %in% names(dim(age_results))) {
  race_categories <- dimnames(age_results)$race
  cat(sprintf("Number of race categories: %d\n", length(race_categories)))
  cat("Race categories:\n")
  print(race_categories)
} else {
  cat("⚠️  'race' dimension not found in age_results!\n")
  cat("Available dimensions: ", paste(names(dim(age_results)), collapse=", "), "\n")
}

# ===== VERIFY SEX CATEGORIES =====
cat("\n===========================================\n")
cat("6. SEX CATEGORIES (CRITICAL)\n")
cat("===========================================\n")
if ("sex" %in% names(dim(age_results))) {
  sex_categories <- dimnames(age_results)$sex
  cat(sprintf("Number of sex categories: %d\n", length(sex_categories)))
  cat("Sex categories (before mapping):\n")
  print(sex_categories)

  # Test map_sex() function on a small subset
  cat("\n--- Testing map_sex() transformation ---\n")
  test_subset <- age_results[1:2, 1:2, , , 1:2, 1:10]
  tryCatch({
    test_mapped <- map_sex(test_subset)
    cat("Sex categories after map_sex():\n")
    print(dimnames(test_mapped)$sex)
    cat("Expected: 'msm', 'non_msm'\n")
  }, error = function(e) {
    cat("Error testing map_sex():", e$message, "\n")
  })
} else {
  cat("⚠️  'sex' dimension not found in age_results!\n")
  cat("Available dimensions: ", paste(names(dim(age_results)), collapse=", "), "\n")
}

# ===== VERIFY LOCATION CODES =====
cat("\n===========================================\n")
cat("7. LOCATION (STATE) CODES\n")
cat("===========================================\n")
location_codes <- dimnames(age_results)$location
cat(sprintf("Number of locations: %d\n", length(location_codes)))
cat("Location codes:\n")
print(location_codes)
cat("\nState order from Rdata:\n")
print(state_order)
cat("\nState names mapping (first 5):\n")
print(head(state_order_names, 5))

# ===== VERIFY OUTCOME METRICS =====
cat("\n===========================================\n")
cat("8. OUTCOME METRICS\n")
cat("===========================================\n")
if ("outcome" %in% names(dim(age_results))) {
  outcome_metrics <- dimnames(age_results)$outcome
  cat("Available outcome metrics:\n")
  print(outcome_metrics)
  if ("diagnosed.prevalence" %in% outcome_metrics) {
    cat("✓ 'diagnosed.prevalence' found (this is what we need)\n")
  } else {
    cat("⚠️  'diagnosed.prevalence' not found!\n")
  }
} else {
  cat("⚠️  'outcome' dimension not found\n")
}

# ===== VERIFY SIMULATION COUNT =====
cat("\n===========================================\n")
cat("9. SIMULATION DIMENSION\n")
cat("===========================================\n")
if ("sim" %in% names(dim(age_results))) {
  sim_count <- length(dimnames(age_results)$sim)
  cat(sprintf("Number of simulations: %d\n", sim_count))
  cat("Expected: 1000\n")
  if (sim_count == 1000) {
    cat("✓ MATCHES EXPECTED\n")
  } else {
    cat("⚠️  Different from expected 1000\n")
  }
} else {
  cat("⚠️  'sim' dimension not found!\n")
}

# ===== TEST DATA EXTRACTION =====
cat("\n===========================================\n")
cat("10. SAMPLE DATA EXTRACTION\n")
cat("===========================================\n")

# Try to extract California 2025 data
cat("Attempting to extract California 2025 data...\n")
tryCatch({
  # Adjust based on actual dimensions found
  if (all(c("year", "age", "outcome", "location", "sim") %in% names(dim(age_results)))) {
    ca_2025 <- age_results["2025", , , "diagnosed.prevalence", "CA", ]

    cat("\nStructure of CA 2025 data:\n")
    cat(sprintf("Dimensions: %s\n", paste(dim(ca_2025), collapse=" x ")))
    cat(sprintf("Dimension names: %s\n", paste(names(dim(ca_2025)), collapse=", ")))

    # Sum across all non-age dimensions to get totals by age
    if (length(dim(ca_2025)) > 1) {
      ca_2025_by_age <- apply(ca_2025, "age", sum)
      cat("\nCA 2025 totals by age (summed across all other dimensions):\n")
      print(ca_2025_by_age)

      # Calculate median for first age group
      sample_age <- names(ca_2025_by_age)[1]
      cat(sprintf("\nMedian for %s: %d cases\n", sample_age, median(ca_2025_by_age[1])))
    } else {
      cat("\nCA 2025 data is 1-dimensional, showing values:\n")
      print(ca_2025)
    }
  } else {
    cat("Cannot extract CA 2025 - missing expected dimensions\n")
  }
}, error = function(e) {
  cat("Error extracting CA 2025 data:", e$message, "\n")
  cat("This is okay - we'll adjust indexing based on actual structure\n")
})

# ===== TEST get_stats() FUNCTION =====
cat("\n===========================================\n")
cat("11. TESTING get_stats() FUNCTION\n")
cat("===========================================\n")

cat("Testing get_stats() with a small data subset...\n")
tryCatch({
  # Extract a small subset and test get_stats
  test_arr <- age_results["2025", , , "diagnosed.prevalence", "CA", ]

  # Apply get_stats - it should collapse 'sim' dimension
  test_stats <- get_stats(test_arr, keep.dimensions = "age")

  cat("\nOutput structure from get_stats():\n")
  cat(sprintf("Dimensions: %s\n", paste(dim(test_stats), collapse=" x ")))
  cat(sprintf("Dimension names: %s\n", paste(names(dim(test_stats)), collapse=", ")))

  cat("\nFirst few values:\n")
  print(head(test_stats, 10))

  cat("\nExpected structure: [metric, age] where metric = c('lower', 'median', 'upper', 'mean')\n")
}, error = function(e) {
  cat("Error testing get_stats():", e$message, "\n")
})

# ===== ADDITIONAL DATASETS =====
cat("\n===========================================\n")
cat("12. ADDITIONAL DATA FILES DISCOVERED\n")
cat("===========================================\n")
cat("Checking for additional Rdata files...\n")

rdata_files <- list.files("Rdata Objects", pattern="\\.Rdata$", full.names=FALSE)
cat("\nAll Rdata files found:\n")
print(rdata_files)

cat("\nFile sizes:\n")
file_info <- file.info(list.files("Rdata Objects", pattern="\\.Rdata$", full.names=TRUE))
for (i in 1:nrow(file_info)) {
  size_mb <- round(file_info$size[i] / 1024 / 1024, 1)
  cat(sprintf("  %s: %.1f MB\n", rownames(file_info)[i], size_mb))
}

cat("\n⚠️  IMPORTANT DISCOVERY:\n")
cat("Found race_results.Rdata and race_sex_results.Rdata!\n")
cat("These were not in the original plan - they may already have\n")
cat("the data pre-aggregated by race and sex.\n")

# ===== SUMMARY =====
cat("\n===========================================\n")
cat("EXPLORATION COMPLETE\n")
cat("===========================================\n")
cat("\nNext steps:\n")
cat("1. Review output above\n")
cat("2. Document findings in exploration_findings.txt\n")
cat("3. Decide whether to use age_results or race_results/race_sex_results\n")
cat("4. Adjust data processing script based on actual structure\n")
