# Generate display-ready data for the Ryan White ADAP costing MVP.
#
# The exporter intentionally avoids sourcing the draft analysis script. It keeps
# the same core costing logic, but fixes known implementation issues and writes
# small artifacts for the frontend.

required_packages <- c("jsonlite")
missing_packages <- required_packages[!(required_packages %in% installed.packages()[, "Package"])]
if (length(missing_packages) > 0) {
  stop(
    paste0(
      "Missing required packages: ",
      paste(missing_packages, collapse = ", "),
      "\nPlease install with: install.packages(c(",
      paste(sprintf("'%s'", missing_packages), collapse = ", "),
      "))"
    )
  )
}

library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)

get_arg <- function(flag, default) {
  match_idx <- match(flag, args)
  if (!is.na(match_idx) && length(args) >= match_idx + 1) {
    return(args[[match_idx + 1]])
  }
  default
}

repo_root <- normalizePath(get_arg("--repo-root", getwd()), mustWork = TRUE)
rdata_path <- get_arg(
  "--rdata",
  "/Users/cristina/Downloads/ryan_white_results_state_costing_ADAP2026_2026-04-03.Rdata"
)
funding_csv_path <- get_arg(
  "--funding-csv",
  "/Volumes/WD_Black/wiley/Documents/jheem/code/jheem_analyses/applications/ryan_white/Ryan_white_costing/rw_funding_by_state.csv"
)

src_output_dir <- file.path(repo_root, "src", "data", "ryan-white-costing")
public_output_dir <- file.path(repo_root, "public", "data", "ryan-white-costing")
dir.create(src_output_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(public_output_dir, recursive = TRUE, showWarnings = FALSE)

cat("\n===========================================\n")
cat("Ryan White ADAP Costing Data Generation\n")
cat("===========================================\n\n")
cat(sprintf("RData:       %s\n", rdata_path))
cat(sprintf("Funding CSV: %s\n", funding_csv_path))
cat(sprintf("Repo root:   %s\n\n", repo_root))

if (!file.exists(rdata_path)) {
  stop(sprintf("RData file not found: %s", rdata_path))
}
if (!file.exists(funding_csv_path)) {
  stop(sprintf("Funding CSV not found: %s", funding_csv_path))
}

data_env <- new.env(parent = emptyenv())
load(rdata_path, envir = data_env)

if (!exists("total.results", envir = data_env, inherits = FALSE)) {
  stop("RData must contain total.results")
}

total_results <- get("total.results", envir = data_env)
dim_names <- dimnames(total_results)

required_dim_names <- c("year", "sim", "outcome", "location", "intervention")
if (!identical(names(dim_names), required_dim_names)) {
  stop(
    sprintf(
      "Unexpected total.results dimensions. Expected %s, got %s",
      paste(required_dim_names, collapse = ", "),
      paste(names(dim_names), collapse = ", ")
    )
  )
}

required_years <- as.character(2026:2035)
required_outcomes <- c("new", "suppression", "diagnosed.prevalence")
required_interventions <- c("noint", "adap.100.end.26")

missing_years <- setdiff(c("2025", required_years), dim_names$year)
missing_outcomes <- setdiff(required_outcomes, dim_names$outcome)
missing_interventions <- setdiff(required_interventions, dim_names$intervention)

if (length(missing_years) > 0) {
  stop(sprintf("Missing years in total.results: %s", paste(missing_years, collapse = ", ")))
}
if (length(missing_outcomes) > 0) {
  stop(sprintf("Missing outcomes in total.results: %s", paste(missing_outcomes, collapse = ", ")))
}
if (length(missing_interventions) > 0) {
  stop(sprintf("Missing interventions in total.results: %s", paste(missing_interventions, collapse = ", ")))
}
if (!("Total" %in% dim_names$location)) {
  stop("total.results must contain a Total location")
}

modeled_states <- setdiff(dim_names$location, "Total")
output_locations <- c(modeled_states, "Total")

funding_raw <- read.csv(funding_csv_path, stringsAsFactors = FALSE)
required_funding_cols <- c("location", "part_a", "part_b", "part_c", "part_d", "part_f", "adap")
missing_funding_cols <- setdiff(required_funding_cols, names(funding_raw))
if (length(missing_funding_cols) > 0) {
  stop(sprintf("Funding CSV missing columns: %s", paste(missing_funding_cols, collapse = ", ")))
}

funding_raw$location <- trimws(as.character(funding_raw$location))
for (col in setdiff(required_funding_cols, "location")) {
  funding_raw[[col]] <- as.numeric(funding_raw[[col]])
}

funding_locations <- funding_raw$location
missing_funding_locations <- setdiff(modeled_states, funding_locations)
extra_funding_locations <- setdiff(funding_locations, modeled_states)

if (length(missing_funding_locations) > 0) {
  stop(sprintf(
    "Funding CSV is missing modeled states: %s",
    paste(missing_funding_locations, collapse = ", ")
  ))
}

funding_state_rows <- funding_raw[match(modeled_states, funding_raw$location), ]

# Economic assumptions from the draft script.
discount_rate <- 0.03
inflation_rate_drug <- 0.054
inflation_rate_care <- 0.056

years <- 2026:2035
year_index <- seq_along(years)
discount_factor <- 1 / (1 + discount_rate)^(year_index - 1)
inflation_factor_drug <- (1 + inflation_rate_drug)^(year_index - 1)
inflation_factor_care <- (1 + inflation_rate_care)^(year_index - 1)

cd4_weights <- c("CD4 >500" = 0.54, "CD4 200-500" = 0.37, "CD4 <200" = 0.09)
cd4_cost_on_art <- c("CD4 >500" = 1650, "CD4 200-500" = 2290, "CD4 <200" = 16800)
cost_on_art_wtd <- sum(cd4_weights * cd4_cost_on_art)

cost_drug <- c(low = 18500, median = 33000, high = 47400)

pi_reengage <- 0.86
lambda_reengage <- 1.2
horizon_years <- 10

f_cum <- function(t) pi_reengage * (1 - exp(-lambda_reengage * t))
year_offset <- 0:horizon_years
f_cumulative <- f_cum(year_offset)
incr_return <- f_cumulative - c(0, head(f_cumulative, -1))

cpi_2023 <- 549.084
cpi_2026 <- 591.677
deflator_2023_to_2026 <- cpi_2026 / cpi_2023
cost_on_art_wtd_2026 <- cost_on_art_wtd * deflator_2023_to_2026

cpi_2025 <- 580.498
deflator_2025_to_2026 <- cpi_2026 / cpi_2025

funding_state_rows$annual_rwhap_total <- rowSums(
  funding_state_rows[, c("part_a", "part_b", "part_c", "part_d", "part_f")],
  na.rm = TRUE
) * deflator_2025_to_2026
funding_state_rows$annual_adap <- funding_state_rows$adap * deflator_2025_to_2026

funding_by_location <- setNames(vector("list", length(output_locations)), output_locations)
for (state in modeled_states) {
  row <- funding_state_rows[funding_state_rows$location == state, ]
  annual_adap <- row$annual_adap
  annual_rwhap_total <- row$annual_rwhap_total
  funding_by_location[[state]] <- list(
    annualAdap = annual_adap,
    annualTotalRwhap = annual_rwhap_total,
    cumulativeAdap = cumsum(annual_adap * discount_factor),
    cumulativeTotalRwhap = cumsum(annual_rwhap_total * discount_factor)
  )
}

total_annual_adap <- sum(funding_state_rows$annual_adap)
total_annual_rwhap <- sum(funding_state_rows$annual_rwhap_total)
funding_by_location[["Total"]] <- list(
  annualAdap = total_annual_adap,
  annualTotalRwhap = total_annual_rwhap,
  cumulativeAdap = cumsum(total_annual_adap * discount_factor),
  cumulativeTotalRwhap = cumsum(total_annual_rwhap * discount_factor)
)

check_total_equals_state_sum <- function() {
  check_years <- c("2025", required_years)
  check_outcomes <- c("new", "suppression", "diagnosed.prevalence")
  max_abs_diff <- 0
  for (year in check_years) {
    for (outcome in check_outcomes) {
      for (intervention in required_interventions) {
        state_sum <- rowSums(total_results[year, , outcome, modeled_states, intervention, drop = TRUE])
        total_values <- total_results[year, , outcome, "Total", intervention, drop = TRUE]
        max_abs_diff <- max(max_abs_diff, max(abs(state_sum - total_values), na.rm = TRUE))
      }
    }
  }
  list(
    passed = isTRUE(max_abs_diff < 1e-6),
    max_abs_diff = max_abs_diff
  )
}

total_validation <- check_total_equals_state_sum()

new_noint <- total_results[required_years, , "new", output_locations, "noint", drop = TRUE]
new_adap <- total_results[required_years, , "new", output_locations, "adap.100.end.26", drop = TRUE]
excess_new <- new_adap - new_noint

suppression_2025 <- total_results["2025", , "suppression", output_locations, "noint", drop = TRUE]
diagnosed_2025 <- total_results["2025", , "diagnosed.prevalence", output_locations, "noint", drop = TRUE]
care_fraction_2025 <- suppression_2025 / diagnosed_2025

negative_excess_count <- sum(excess_new < 0, na.rm = TRUE)
negative_excess_share <- negative_excess_count / length(excess_new)

q_value <- function(values, digits = 0) {
  values <- values[is.finite(values)]
  if (length(values) == 0) {
    return(list(median = NA_real_, lower = NA_real_, upper = NA_real_))
  }
  list(
    median = round(as.numeric(stats::median(values)), digits),
    lower = round(as.numeric(stats::quantile(values, 0.025, names = FALSE)), digits),
    upper = round(as.numeric(stats::quantile(values, 0.975, names = FALSE)), digits)
  )
}

scenario_values <- function(values_by_scenario, digits = 0) {
  list(
    low = q_value(values_by_scenario$low, digits = digits),
    median = q_value(values_by_scenario$median, digits = digits),
    high = q_value(values_by_scenario$high, digits = digits)
  )
}

json_array <- function(values) {
  I(unname(as.vector(values)))
}

compute_location <- function(location) {
  location_idx <- match(location, output_locations)
  excess <- excess_new[, , location_idx, drop = TRUE]
  care_fraction <- care_fraction_2025[, location_idx]

  immediate_starts <- sweep(excess, 2, care_fraction, "*")
  not_starting_now <- excess - immediate_starts

  delayed_starts <- matrix(0, nrow = length(years), ncol = length(dim_names$sim))
  for (index_i in seq_along(years)) {
    for (offset_i in seq_along(year_offset)) {
      offset <- year_offset[[offset_i]]
      target_i <- index_i + offset
      if (offset >= 1 && target_i <= length(years)) {
        delayed_starts[target_i, ] <- delayed_starts[target_i, ] +
          not_starting_now[index_i, ] * incr_return[[offset_i]]
      }
    }
  }

  total_starts <- immediate_starts + delayed_starts
  active_excess_on_art <- apply(total_starts, 2, cumsum)
  cumulative_person_years_on_art <- apply(active_excess_on_art, 2, cumsum)
  cumulative_excess_new <- apply(excess, 2, cumsum)

  cumulative_costs <- setNames(vector("list", length(cost_drug)), names(cost_drug))
  for (scenario in names(cost_drug)) {
    total_on_art_cost_pp <- (cost_drug[[scenario]] * inflation_factor_drug) +
      (cost_on_art_wtd_2026 * inflation_factor_care)
    annual_cost <- sweep(active_excess_on_art, 1, total_on_art_cost_pp, "*")
    annual_cost_discounted <- sweep(annual_cost, 1, discount_factor, "*")
    cumulative_costs[[scenario]] <- apply(annual_cost_discounted, 2, cumsum)
  }

  funding <- funding_by_location[[location]]

  build_point <- function(year_i, include_ratios = FALSE) {
    care_values <- list(
      low = cumulative_costs$low[year_i, ],
      median = cumulative_costs$median[year_i, ],
      high = cumulative_costs$high[year_i, ]
    )
    net_vs_adap <- list(
      low = care_values$low - funding$cumulativeAdap[[year_i]],
      median = care_values$median - funding$cumulativeAdap[[year_i]],
      high = care_values$high - funding$cumulativeAdap[[year_i]]
    )
    net_vs_total_rwhap <- list(
      low = care_values$low - funding$cumulativeTotalRwhap[[year_i]],
      median = care_values$median - funding$cumulativeTotalRwhap[[year_i]],
      high = care_values$high - funding$cumulativeTotalRwhap[[year_i]]
    )

    point <- list(
      year = years[[year_i]],
      cumulativeCareCost = scenario_values(care_values, digits = 0),
      cumulativeAdapSpendingAvoided = round(funding$cumulativeAdap[[year_i]], 0),
      cumulativeTotalRwhapSpendingAvoided = round(funding$cumulativeTotalRwhap[[year_i]], 0),
      cumulativeNetCostVsAdap = scenario_values(net_vs_adap, digits = 0),
      cumulativeNetCostVsTotalRwhap = scenario_values(net_vs_total_rwhap, digits = 0),
      cumulativeExcessNewDiagnoses = q_value(cumulative_excess_new[year_i, ], digits = 1),
      cumulativePersonYearsOnArt = q_value(cumulative_person_years_on_art[year_i, ], digits = 1),
      negativeExcessNewShare = round(mean(excess[year_i, ] < 0, na.rm = TRUE), 6)
    )

    if (include_ratios) {
      ratio_vs_adap <- list(
        low = net_vs_adap$low / funding$cumulativeAdap[[year_i]],
        median = net_vs_adap$median / funding$cumulativeAdap[[year_i]],
        high = net_vs_adap$high / funding$cumulativeAdap[[year_i]]
      )
      ratio_vs_total_rwhap <- list(
        low = net_vs_total_rwhap$low / funding$cumulativeTotalRwhap[[year_i]],
        median = net_vs_total_rwhap$median / funding$cumulativeTotalRwhap[[year_i]],
        high = net_vs_total_rwhap$high / funding$cumulativeTotalRwhap[[year_i]]
      )
      point$cumulativeNetCostRatioVsAdap <- scenario_values(ratio_vs_adap, digits = 3)
      point$cumulativeNetCostRatioVsTotalRwhap <- scenario_values(ratio_vs_total_rwhap, digits = 3)
    }

    point
  }

  series <- lapply(seq_along(years), build_point, include_ratios = FALSE)
  final_year <- build_point(length(years), include_ratios = TRUE)

  list(series = series, finalYear = final_year)
}

cat("Computing per-simulation paths and summaries...\n")
location_results <- setNames(lapply(output_locations, compute_location), output_locations)

state_final_net <- vapply(
  modeled_states,
  function(state) location_results[[state]]$finalYear$cumulativeNetCostVsAdap$median$median,
  numeric(1)
)
state_final_ratio <- vapply(
  modeled_states,
  function(state) location_results[[state]]$finalYear$cumulativeNetCostRatioVsAdap$median$median,
  numeric(1)
)
net_ranks <- rank(-state_final_net, ties.method = "min")
ratio_ranks <- rank(-state_final_ratio, ties.method = "min")

state_summaries <- lapply(modeled_states, function(state) {
  final_year <- location_results[[state]]$finalYear
  final_year$rankByNetCostVsAdap <- as.integer(net_ranks[[state]])
  final_year$rankByNetCostRatioVsAdap <- as.integer(ratio_ranks[[state]])
  list(state = state, finalYear = final_year)
})

metadata <- list(
  generatedAt = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
  sourceRData = rdata_path,
  sourceFundingCsv = funding_csv_path,
  horizon = list(startYear = 2026, endYear = 2035),
  intervalLevel = "p025_p975",
  defaultCostScenario = "median",
  defaultFocusState = "FL",
  dollarYear = "2026 USD",
  fundingAdjustment = list(
    applied = TRUE,
    description = sprintf(
      "Funding CSV values multiplied by BLS medical-care CPI deflator 2025 to 2026: %.6f.",
      deflator_2025_to_2026
    )
  ),
  modeledStates = json_array(modeled_states),
  excludedFundingLocations = json_array(extra_funding_locations),
  assumptions = json_array(c(
    "State-level model outputs use the 30 locations shared by total.results and rw_funding_by_state.csv.",
    "DC funding is excluded from national summaries because no DC epidemiologic output is present.",
    "National funding is the sum of the 30 modeled states.",
    "The 2035 fixed horizon truncates downstream costs for infections occurring late in the horizon.",
    "Negative per-simulation excess infections are preserved and reported as diagnostics, not floored.",
    "Funding comparators are deterministic under the current CSV inputs.",
    "Net-cost uncertainty is driven by modeled care-cost uncertainty, with deterministic funding offsets."
  )),
  deterministicFields = json_array(c(
    "cumulativeAdapSpendingAvoided",
    "cumulativeTotalRwhapSpendingAvoided"
  )),
  modelParameters = list(
    reengagementPi = pi_reengage,
    reengagementLambda = lambda_reengage,
    discountRate = discount_rate,
    cd4Weights = as.list(cd4_weights),
    artDrugCosts = as.list(cost_drug),
    routineCareCost = round(cost_on_art_wtd_2026, 2),
    immediateStartCareFractionDescription = "Per simulation/location, immediate starts equal excess new diagnoses multiplied by the 2025 no-intervention suppression divided by diagnosed prevalence."
  ),
  validation = list(
    totalEqualsStateSum = total_validation$passed,
    totalEqualsStateSumMaxAbsDiff = total_validation$max_abs_diff,
    missingFundingLocations = json_array(missing_funding_locations),
    extraFundingLocations = json_array(extra_funding_locations),
    negativeExcessNewCount = negative_excess_count,
    negativeExcessNewShare = round(negative_excess_share, 6)
  ),
  reviewQuestions = json_array(c(
    "Should DC be excluded, included through separate non-model funding context, or modeled separately?",
    "Are the CSV dollars 2025 nominal dollars, 2026 dollars, or another fiscal-year convention?",
    "Does part_b include ADAP funding, or is it Part B excluding ADAP?",
    "Should low/median/high ART drug-cost assumptions be shown separately, pooled, or both?",
    "Should the primary comparison be ADAP only, total RWHAP, or both?",
    "What payer perspective should govern the net calculation?",
    "In the counterfactual, would downstream care for excess infections be ADAP/RWHAP-eligible?",
    "Should negative per-simulation excess infections be preserved, floored at zero, or shown as a sensitivity?"
  ))
)

summary_data <- list(
  national = list(finalYear = location_results[["Total"]]$finalYear),
  states = state_summaries,
  sensitivity = list(
    costScenarios = json_array(names(cost_drug)),
    primaryScenario = "median"
  )
)

series_data <- list(
  national = location_results[["Total"]]$series,
  states = setNames(lapply(modeled_states, function(state) location_results[[state]]$series), modeled_states)
)

write_artifact <- function(data, path) {
  jsonlite::write_json(
    data,
    path,
    pretty = TRUE,
    auto_unbox = TRUE,
    digits = 10,
    na = "null"
  )
  size_kb <- file.info(path)$size / 1024
  cat(sprintf("Wrote %s (%.1f KB)\n", path, size_kb))
}

write_artifact(metadata, file.path(src_output_dir, "metadata.json"))
write_artifact(summary_data, file.path(src_output_dir, "summary.json"))
write_artifact(series_data, file.path(public_output_dir, "series.json"))

cat("\nValidation summary:\n")
cat(sprintf("  Total equals state sum: %s (max abs diff %.8f)\n", total_validation$passed, total_validation$max_abs_diff))
cat(sprintf("  Extra funding locations excluded: %s\n", paste(extra_funding_locations, collapse = ", ")))
cat(sprintf("  Negative excess-new count/share: %d / %.6f\n", negative_excess_count, negative_excess_share))
cat("\nDone.\n")
