#!/usr/bin/env Rscript
#
# Verify Calibration Data Against Paper Figure
#
# This script loads the RData files and outputs California data
# so it can be compared against Figure 1 in the paper.
#

webtool_dir <- "/Users/nicholas/Documents/jheem/code/jheem_analyses/applications/age_analysis/Webtool"

load_rdata <- function(filename) {
  e <- new.env()
  load(file.path(webtool_dir, filename), envir = e)
  get(ls(e)[1], envir = e)
}

# Load simulation data
prev_sim_age <- load_rdata("prevalence_sim_by_age.Rdata")
prev_sim_total <- load_rdata("prevalence_sim_by_total.Rdata")
diag_sim_age <- load_rdata("diagnoses_sim_by_age.Rdata")
diag_sim_total <- load_rdata("diagnoses_sim_by_total.Rdata")

# Key years to check against paper
years <- c(2010, 2015, 2020, 2025, 2030, 2035, 2040)
ages <- c("13-24 years", "25-34 years", "35-44 years", "45-54 years", "55+ years")

divider <- paste(rep("=", 70), collapse="")
divider2 <- paste(rep("-", 50), collapse="")

cat(divider, "\n")
cat("CALIFORNIA DATA FROM RDATA FILES\n")
cat("Compare these values against Figure 1 in the paper\n")
cat(divider, "\n\n")

# --- DIAGNOSED PREVALENCE ---
cat("DIAGNOSED PREVALENCE (Left column in paper)\n")
cat(divider2, "\n\n")

cat("Total (Top-left panel):\n")
cat(sprintf("%-6s %10s %10s %10s\n", "Year", "Mean", "Lower", "Upper"))
for (y in years) {
  row <- subset(prev_sim_total, location == "CA" & year == y)
  if (nrow(row) > 0) {
    cat(sprintf("%-6d %10.0f %10.0f %10.0f\n", y, row$mean, row$lower, row$upper))
  }
}

for (age in ages) {
  cat(sprintf("\n%s:\n", age))
  cat(sprintf("%-6s %10s %10s %10s\n", "Year", "Mean", "Lower", "Upper"))
  for (y in years) {
    row <- prev_sim_age[prev_sim_age$location == "CA" & prev_sim_age$year == y & prev_sim_age$age == age, ]
    if (nrow(row) > 0) {
      cat(sprintf("%-6d %10.0f %10.0f %10.0f\n", y, row$mean, row$lower, row$upper))
    }
  }
}

# --- NEW DIAGNOSES ---
cat("\n\n")
cat("NEW DIAGNOSES (Right column in paper)\n")
cat(divider2, "\n\n")

cat("Total (Top-right panel):\n")
cat(sprintf("%-6s %10s %10s %10s\n", "Year", "Mean", "Lower", "Upper"))
for (y in years) {
  row <- subset(diag_sim_total, location == "CA" & year == y)
  if (nrow(row) > 0) {
    cat(sprintf("%-6d %10.0f %10.0f %10.0f\n", y, row$mean, row$lower, row$upper))
  }
}

for (age in ages) {
  cat(sprintf("\n%s:\n", age))
  cat(sprintf("%-6s %10s %10s %10s\n", "Year", "Mean", "Lower", "Upper"))
  for (y in years) {
    row <- diag_sim_age[diag_sim_age$location == "CA" & diag_sim_age$year == y & diag_sim_age$age == age, ]
    if (nrow(row) > 0) {
      cat(sprintf("%-6d %10.0f %10.0f %10.0f\n", y, row$mean, row$lower, row$upper))
    }
  }
}

cat("\n")
cat(divider, "\n")
cat("KEY COMPARISON POINTS (check against paper Figure 1):\n")
cat(divider, "\n")
cat("\nNew Diagnoses Total:\n")
cat("  - 2010: Paper shows ~4,500, Data shows:", subset(diag_sim_total, location=="CA" & year==2010)$mean, "\n")
cat("  - 2020: Paper shows ~4,000, Data shows:", subset(diag_sim_total, location=="CA" & year==2020)$mean, "\n")
cat("  - 2040: Paper shows ~3,000, Data shows:", subset(diag_sim_total, location=="CA" & year==2040)$mean, "\n")
cat("\nPrevalence Total:\n")
cat("  - 2010: Paper shows ~85,000, Data shows:", subset(prev_sim_total, location=="CA" & year==2010)$mean, "\n")
cat("  - 2040: Paper shows ~130,000, Data shows:", subset(prev_sim_total, location=="CA" & year==2040)$mean, "\n")

# --- OBSERVED DATA ---
cat("\n")
cat(divider, "\n")
cat("OBSERVED DATA (CDC Surveillance - Green dots in paper)\n")
cat("This data should NOT vary between model runs!\n")
cat(divider, "\n")

# Load observed data (with correct file mapping based on content)
prev_obs_age <- load_rdata("prevalence_data_by_age.Rdata")
prev_obs_total <- load_rdata("diagnoses_data_by_age.Rdata")  # mislabeled file
diag_obs_age <- load_rdata("prevalence_data_by_total.Rdata")  # mislabeled file
diag_obs_total <- load_rdata("diagnoses_data_by_total.Rdata")

obs_years <- c(2010, 2015, 2020, 2021)

cat("\nPrevalence Total (observed):\n")
cat(sprintf("%-6s %10s\n", "Year", "Value"))
for (y in obs_years) {
  row <- prev_obs_total[prev_obs_total$location == "CA" & prev_obs_total$year == y, ]
  if (nrow(row) > 0) {
    cat(sprintf("%-6d %10.0f\n", y, row$value))
  }
}

cat("\nNew Diagnoses Total (observed):\n")
cat(sprintf("%-6s %10s\n", "Year", "Value"))
for (y in obs_years) {
  row <- diag_obs_total[diag_obs_total$location == "CA" & diag_obs_total$year == y, ]
  if (nrow(row) > 0) {
    cat(sprintf("%-6d %10.0f\n", y, row$value))
  }
}

cat("\n")
cat(divider, "\n")
cat("OBSERVED DATA COMPARISON:\n")
cat(divider, "\n")
cat("\nPrevalence Total (green dots in paper top-left):\n")
cat("  - 2010: Paper shows ~85,000, Data shows:", prev_obs_total[prev_obs_total$location=="CA" & prev_obs_total$year==2010, "value"], "\n")
cat("  - 2015: Paper shows ~105,000, Data shows:", prev_obs_total[prev_obs_total$location=="CA" & prev_obs_total$year==2015, "value"], "\n")

cat("\nNew Diagnoses Total (green dots in paper top-right):\n")
cat("  - 2010: Paper shows ~4,500, Data shows:", diag_obs_total[diag_obs_total$location=="CA" & diag_obs_total$year==2010, "value"], "\n")
cat("  - 2015: Paper shows ~4,500, Data shows:", diag_obs_total[diag_obs_total$location=="CA" & diag_obs_total$year==2015, "value"], "\n")
