# exploration_race_sex.R - Explore race_results and race_sex_results
# These files were not in the original plan - let's see what they contain!

setwd("/Users/cristina/wiley/Documents/jheem/code/jheem_analyses/applications/age_analysis")

cat("===========================================\n")
cat("EXPLORING RACE_RESULTS.RDATA\n")
cat("===========================================\n\n")

load("Rdata Objects/race_results.Rdata")

cat("race_results dimensions:\n")
print(dim(race_results))
cat("\nDimension names:\n")
print(names(dim(race_results)))

cat("\n--- Dimension values ---\n")
for (dim_name in names(dim(race_results))) {
  cat(sprintf("\n%s (%d levels):\n", dim_name, length(dimnames(race_results)[[dim_name]])))
  if (dim_name == "sim") {
    cat("  [1-1000, showing first 5]\n")
    print(head(dimnames(race_results)[[dim_name]], 5))
  } else {
    print(dimnames(race_results)[[dim_name]])
  }
}

cat("\n\n===========================================\n")
cat("EXPLORING RACE_SEX_RESULTS.RDATA\n")
cat("===========================================\n\n")

load("Rdata Objects/race_sex_results.Rdata")

cat("race_sex_results dimensions:\n")
print(dim(race_sex_results))
cat("\nDimension names:\n")
print(names(dim(race_sex_results)))

cat("\n--- Dimension values ---\n")
for (dim_name in names(dim(race_sex_results))) {
  cat(sprintf("\n%s (%d levels):\n", dim_name, length(dimnames(race_sex_results)[[dim_name]])))
  if (dim_name == "sim") {
    cat("  [1-1000, showing first 5]\n")
    print(head(dimnames(race_sex_results)[[dim_name]], 5))
  } else {
    print(dimnames(race_sex_results)[[dim_name]])
  }
}

cat("\n\n===========================================\n")
cat("COMPARISON SUMMARY\n")
cat("===========================================\n\n")

cat("age_results:     [year, age, sim, outcome, location, intervention]\n")
cat("                  NO race or sex dimensions\n\n")

cat("race_results:     Has 'race' dimension?\n")
if (exists("race_results") && "race" %in% names(dim(race_results))) {
  cat("                  ✓ YES - ", length(dimnames(race_results)$race), " race categories\n")
  cat("                  Categories: ", paste(dimnames(race_results)$race, collapse=", "), "\n")
} else {
  cat("                  ✗ NO\n")
}

cat("\nrace_sex_results: Has 'race' and 'sex' dimensions?\n")
if (exists("race_sex_results")) {
  if ("race" %in% names(dim(race_sex_results))) {
    cat("                  ✓ Race - ", length(dimnames(race_sex_results)$race), " categories\n")
    cat("                  Categories: ", paste(dimnames(race_sex_results)$race, collapse=", "), "\n")
  }
  if ("sex" %in% names(dim(race_sex_results))) {
    cat("                  ✓ Sex - ", length(dimnames(race_sex_results)$sex), " categories\n")
    cat("                  Categories: ", paste(dimnames(race_sex_results)$sex, collapse=", "), "\n")
  }
}

cat("\n\n===========================================\n")
cat("RECOMMENDATION\n")
cat("===========================================\n\n")

cat("Based on file structure:\n")
cat("1. Use age_results for 'By State' tab (aggregated)\n")
cat("2. Use race_results for 'By Race' tab\n")
cat("3. Use race_sex_results for 'By Sex' tab\n")
cat("\nThis is MUCH simpler than the original plan which assumed\n")
cat("we'd need to aggregate race/sex dimensions ourselves!\n")
