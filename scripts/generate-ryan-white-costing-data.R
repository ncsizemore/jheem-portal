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
rdata_path <- get_arg("--rdata", Sys.getenv("RYAN_WHITE_COSTING_RDATA", unset = ""))
funding_csv_path <- get_arg(
  "--funding-csv",
  Sys.getenv("RYAN_WHITE_COSTING_FUNDING_CSV", unset = "")
)

if (!nzchar(rdata_path)) {
  stop("Provide --rdata PATH or set RYAN_WHITE_COSTING_RDATA")
}
if (!nzchar(funding_csv_path)) {
  stop("Provide --funding-csv PATH or set RYAN_WHITE_COSTING_FUNDING_CSV")
}

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

rdata_path <- normalizePath(rdata_path, mustWork = TRUE)
funding_csv_path <- normalizePath(funding_csv_path, mustWork = TRUE)

sha256_file <- function(path) {
  sha256sum <- Sys.which("sha256sum")
  if (nzchar(sha256sum)) {
    output <- suppressWarnings(system2(sha256sum, path, stdout = TRUE, stderr = TRUE))
    hash <- regmatches(output[[1]], regexpr("^[0-9a-fA-F]{64}", output[[1]]))
    if (length(hash) == 1 && nzchar(hash)) {
      return(tolower(hash))
    }
  }

  shasum <- Sys.which("shasum")
  if (nzchar(shasum)) {
    output <- suppressWarnings(system2(shasum, c("-a", "256", path), stdout = TRUE, stderr = TRUE))
    hash <- regmatches(output[[1]], regexpr("^[0-9a-fA-F]{64}", output[[1]]))
    if (length(hash) == 1 && nzchar(hash)) {
      return(tolower(hash))
    }
  }

  stop("Unable to compute SHA-256: neither sha256sum nor shasum is available")
}

artifact_provenance <- function(path) {
  info <- file.info(path)
  list(
    fileName = basename(path),
    sizeBytes = unname(info$size),
    modifiedAt = format(info$mtime, "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
    sha256 = sha256_file(path)
  )
}

data_env <- new.env(parent = emptyenv())
cat("Loading RData object...\n")
flush.console()
load(rdata_path, envir = data_env)
cat("Loaded RData object.\n")
flush.console()

required_objects <- c("total.results", "total.incidence", "total.new")
missing_objects <- required_objects[!vapply(
  required_objects,
  exists,
  logical(1),
  envir = data_env,
  inherits = FALSE
)]
if (length(missing_objects) > 0) {
  stop(sprintf("RData is missing required objects: %s", paste(missing_objects, collapse = ", ")))
}

total_results <- get("total.results", envir = data_env)
total_incidence <- get("total.incidence", envir = data_env)
total_new <- get("total.new", envir = data_env)
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
required_outcomes <- c("incidence", "new", "suppression", "diagnosed.prevalence")
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
    "Funding CSV is missing modeled jurisdictions: %s",
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
# End-of-year fraction still off ART. This is 1 - F(t), not the draft
# script's start-of-year person-time convention 1 - F(t - 1). Using the
# end-of-year stock makes the three mechanism categories mutually exclusive
# and exactly exhaustive of cumulative excess diagnoses.
still_offart_end_of_year <- 1 - f_cumulative

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

check_total_equals_jurisdiction_sum <- function() {
  check_years <- c("2025", required_years)
  check_outcomes <- c("incidence", "new", "suppression", "diagnosed.prevalence")
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

max_abs_array_diff <- function(left, right) {
  if (!identical(dim(left), dim(right)) || !identical(dimnames(left), dimnames(right))) {
    return(Inf)
  }
  max(abs(left - right), na.rm = TRUE)
}

total_validation <- check_total_equals_jurisdiction_sum()
incidence_array_max_abs_diff <- max_abs_array_diff(
  total_incidence,
  total_results[, , "incidence", , , drop = TRUE]
)
diagnosis_array_max_abs_diff <- max_abs_array_diff(
  total_new,
  total_results[, , "new", , , drop = TRUE]
)

diagnoses_noint <- total_results[required_years, , "new", output_locations, "noint", drop = TRUE]
diagnoses_adap <- total_results[required_years, , "new", output_locations, "adap.100.end.26", drop = TRUE]
excess_diagnoses <- diagnoses_adap - diagnoses_noint

infections_noint <- total_results[required_years, , "incidence", output_locations, "noint", drop = TRUE]
infections_adap <- total_results[required_years, , "incidence", output_locations, "adap.100.end.26", drop = TRUE]
excess_infections <- infections_adap - infections_noint

suppression_2025 <- total_results["2025", , "suppression", output_locations, "noint", drop = TRUE]
diagnosed_2025 <- total_results["2025", , "diagnosed.prevalence", output_locations, "noint", drop = TRUE]
care_fraction_2025 <- suppression_2025 / diagnosed_2025

negative_excess_diagnoses_count <- sum(excess_diagnoses < 0, na.rm = TRUE)
negative_excess_diagnoses_share <- negative_excess_diagnoses_count / length(excess_diagnoses)
negative_excess_infections_count <- sum(excess_infections < 0, na.rm = TRUE)
negative_excess_infections_share <- negative_excess_infections_count / length(excess_infections)

# Baseline (2025, no-intervention) program-dependence and epidemic-context
# measures for the heterogeneity explorer. Counts are medians; the manuscript
# context variables are means of per-simulation ratios. Jurisdictions only:
# rate-like outcomes are not meaningfully aggregable at the Total location.
context_outcomes <- c(
  "diagnosed.prevalence", "suppression", "adap.suppression", "rw.clients",
  "adap.clients", "oahs.clients", "testing", "sexual.transmission.rates", "new"
)
missing_context_outcomes <- setdiff(context_outcomes, dim_names$outcome)
if (length(missing_context_outcomes) > 0) {
  stop(sprintf(
    "Missing baseline-context outcomes in total.results: %s",
    paste(missing_context_outcomes, collapse = ", ")
  ))
}

median_of <- function(values, digits) {
  values <- values[is.finite(values)]
  if (length(values) == 0) {
    return(NA_real_)
  }
  round(as.numeric(stats::median(values)), digits)
}

baseline_context_for <- function(location) {
  v <- function(outcome) total_results["2025", , outcome, location, "noint", drop = TRUE]
  diagnosed <- v("diagnosed.prevalence")
  suppression <- v("suppression")
  adap_suppression <- v("adap.suppression")
  rw_clients <- v("rw.clients")
  adap_clients <- v("adap.clients")
  unsuppressed_diagnosed <- diagnosed - suppression
  transmission_rate <- v("sexual.transmission.rates") / unsuppressed_diagnosed
  list(
    diagnosedPrevalence = median_of(diagnosed, 1),
    suppression = median_of(suppression, 1),
    viralSuppressionPct = round(mean(suppression / diagnosed, na.rm = TRUE), 6),
    adapSuppression = median_of(adap_suppression, 1),
    propSuppressedOnAdap = round(mean(adap_suppression / suppression, na.rm = TRUE), 6),
    rwClients = median_of(rw_clients, 1),
    adapClients = median_of(adap_clients, 1),
    adapClientShare = median_of(adap_clients / rw_clients, 6),
    oahsClients = median_of(v("oahs.clients"), 1),
    testing = median_of(v("testing"), 6),
    sexualTransmissionRate = round(mean(transmission_rate[is.finite(transmission_rate)]), 8),
    baselineNewDiagnoses = median_of(v("new"), 1),
    baselineNewInfections = median_of(v("incidence"), 1)
  )
}

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

q_curve <- function(values, digits = 0) {
  values <- values[is.finite(values)]
  labels <- c("p025", "p05", "p10", "p25", "p50", "p75", "p90", "p95", "p975")
  probs <- c(0.025, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.975)

  if (length(values) == 0) {
    return(as.list(setNames(rep(NA_real_, length(labels)), labels)))
  }

  as.list(setNames(
    round(as.numeric(stats::quantile(values, probs, names = FALSE)), digits),
    labels
  ))
}

scenario_values <- function(values_by_scenario, digits = 0) {
  list(
    low = q_value(values_by_scenario$low, digits = digits),
    median = q_value(values_by_scenario$median, digits = digits),
    high = q_value(values_by_scenario$high, digits = digits)
  )
}

scenario_quantile_curves <- function(values_by_scenario, digits = 0) {
  list(
    low = q_curve(values_by_scenario$low, digits = digits),
    median = q_curve(values_by_scenario$median, digits = digits),
    high = q_curve(values_by_scenario$high, digits = digits)
  )
}

scenario_positive_shares <- function(values_by_scenario, digits = 6) {
  compute_share <- function(values) {
    values <- values[is.finite(values)]
    if (length(values) == 0) {
      return(NA_real_)
    }
    round(mean(values > 0), digits)
  }

  list(
    low = compute_share(values_by_scenario$low),
    median = compute_share(values_by_scenario$median),
    high = compute_share(values_by_scenario$high)
  )
}

json_array <- function(values) {
  I(unname(as.vector(values)))
}

compute_location <- function(location) {
  location_idx <- match(location, output_locations)
  diagnosis_excess <- excess_diagnoses[, , location_idx, drop = TRUE]
  infection_excess <- excess_infections[, , location_idx, drop = TRUE]
  care_fraction <- care_fraction_2025[, location_idx]

  immediate_starts <- sweep(diagnosis_excess, 2, care_fraction, "*")
  not_starting_now <- diagnosis_excess - immediate_starts

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
  cumulative_excess_diagnoses <- apply(diagnosis_excess, 2, cumsum)
  cumulative_excess_infections <- apply(infection_excess, 2, cumsum)

  # Mechanism decomposition: excess diagnoses to date are either active on ART
  # (having started immediately or after re-engagement) or still off ART.
  active_from_immediate <- apply(immediate_starts, 2, cumsum)
  active_from_delayed <- apply(delayed_starts, 2, cumsum)

  offart_stock <- matrix(0, nrow = length(years), ncol = length(dim_names$sim))
  for (index_i in seq_along(years)) {
    for (offset_i in seq_along(year_offset)) {
      offset <- year_offset[[offset_i]]
      target_i <- index_i + offset
      if (target_i <= length(years)) {
        offart_stock[target_i, ] <- offart_stock[target_i, ] +
          not_starting_now[index_i, ] * still_offart_end_of_year[[offset_i]]
      }
    }
  }

  mechanism_closure_max_abs_diff <- max(abs(
    active_from_immediate + active_from_delayed + offart_stock - cumulative_excess_diagnoses
  ), na.rm = TRUE)

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

    pooled_care <- c(care_values$low, care_values$median, care_values$high)
    pooled_net_vs_adap <- pooled_care - funding$cumulativeAdap[[year_i]]

    point <- list(
      year = years[[year_i]],
      cumulativeCareCost = scenario_values(care_values, digits = 0),
      cumulativeAdapSpendingAvoided = round(funding$cumulativeAdap[[year_i]], 0),
      cumulativeTotalRwhapSpendingAvoided = round(funding$cumulativeTotalRwhap[[year_i]], 0),
      cumulativeNetCostVsAdap = scenario_values(net_vs_adap, digits = 0),
      cumulativeNetCostVsTotalRwhap = scenario_values(net_vs_total_rwhap, digits = 0),
      cumulativeExcessNewDiagnoses = q_value(cumulative_excess_diagnoses[year_i, ], digits = 1),
      cumulativeExcessInfections = q_value(cumulative_excess_infections[year_i, ], digits = 1),
      cumulativePersonYearsOnArt = q_value(cumulative_person_years_on_art[year_i, ], digits = 1),
      negativeExcessDiagnosesShare = round(mean(diagnosis_excess[year_i, ] < 0, na.rm = TRUE), 6),
      negativeExcessInfectionsShare = round(mean(infection_excess[year_i, ] < 0, na.rm = TRUE), 6),
      pooledCumulativeCareCost = q_value(pooled_care, digits = 0),
      pooledCumulativeNetCostVsAdap = q_value(pooled_net_vs_adap, digits = 0),
      mechanism = list(
        activeOnArtImmediate = round(mean(active_from_immediate[year_i, ], na.rm = TRUE), 1),
        activeOnArtReengaged = round(mean(active_from_delayed[year_i, ], na.rm = TRUE), 1),
        offArtExcess = round(mean(offart_stock[year_i, ], na.rm = TRUE), 1)
      )
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
      point$cumulativeNetCostVsAdapQuantiles <- scenario_quantile_curves(net_vs_adap, digits = 0)
      point$cumulativeCareCostQuantiles <- scenario_quantile_curves(care_values, digits = 0)
      point$shareNetCostPositiveVsAdap <- scenario_positive_shares(net_vs_adap, digits = 6)
    }

    point
  }

  series <- lapply(seq_along(years), build_point, include_ratios = FALSE)
  final_year <- build_point(length(years), include_ratios = TRUE)

  # Pooled final-year summary matching ADAP_supplemental_tables.R: all three
  # drug-cost scenarios pooled with all simulation draws into one distribution;
  # median and interval both come from the pooled distribution.
  final_i <- length(years)
  pooled_care_final <- c(
    cumulative_costs$low[final_i, ],
    cumulative_costs$median[final_i, ],
    cumulative_costs$high[final_i, ]
  )
  pooled_net_final <- pooled_care_final - funding$cumulativeAdap[[final_i]]
  pooled_final_year <- list(
    cumulativeCareCost = q_value(pooled_care_final, digits = 0),
    cumulativeCareCostQuantiles = q_curve(pooled_care_final, digits = 0),
    cumulativeNetCostVsAdap = q_value(pooled_net_final, digits = 0),
    cumulativeNetCostVsAdapQuantiles = q_curve(pooled_net_final, digits = 0),
    cumulativeNetCostRatioVsAdap = q_value(
      pooled_net_final / funding$cumulativeAdap[[final_i]],
      digits = 3
    ),
    shareNetCostPositiveVsAdap = round(mean(pooled_net_final > 0), 6)
  )

  list(
    series = series,
    finalYear = final_year,
    pooledFinalYear = pooled_final_year,
    validation = list(mechanismClosureMaxAbsDiff = mechanism_closure_max_abs_diff)
  )
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
  list(
    state = state,
    finalYear = final_year,
    pooledFinalYear = location_results[[state]]$pooledFinalYear,
    baselineContext = baseline_context_for(state)
  )
})

mechanism_closure_max_abs_diff <- max(vapply(
  location_results,
  function(result) result$validation$mechanismClosureMaxAbsDiff,
  numeric(1)
))

generator_path <- file.path(repo_root, "scripts", "generate-ryan-white-costing-data.R")

metadata <- list(
  dataContractVersion = "2.0.0",
  generatedAt = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
  sourceArtifacts = list(
    rData = artifact_provenance(rdata_path),
    fundingCsv = artifact_provenance(funding_csv_path),
    generator = artifact_provenance(generator_path)
  ),
  horizon = list(startYear = 2026, endYear = 2035),
  simulationDraws = length(dim_names$sim),
  intervalLevel = "p025_p975",
  defaultCostScenario = "median",
  # Which estimand the UI treats as the headline: "pooled" or a scenario id.
  # Stays "median" until Ryan confirms the pooled convention as primary;
  # flipping it is a one-line regeneration, not a rework.
  primaryEstimand = "median",
  pooledConvention = list(
    description = paste(
      "Pooled values combine all three ART drug-cost scenarios with all",
      "simulation draws into one distribution, matching ADAP_supplemental_tables.R;",
      "the drug-cost scenario is treated as an additional source of uncertainty."
    ),
    nationalTotal = paste(
      "National pooled and per-scenario summaries use the RData Total location",
      "(within-simulation sum across modeled jurisdictions). The supplemental table instead",
      "bootstraps jurisdictions independently; pending Ryan's answer, the web",
      "convention is within-simulation summation."
    )
  ),
  defaultFocusJurisdiction = "FL",
  dollarYear = "2026 USD",
  fundingAdjustment = list(
    applied = TRUE,
    description = sprintf(
      "Funding CSV values multiplied by BLS medical-care CPI deflator 2025 to 2026: %.6f.",
      deflator_2025_to_2026
    )
  ),
  modeledJurisdictions = json_array(modeled_states),
  modeledJurisdictionCount = length(modeled_states),
  excludedFundingLocations = json_array(extra_funding_locations),
  outcomeDefinitions = list(
    infections = list(
      field = "cumulativeExcessInfections",
      source = "total.results outcome 'incidence'",
      description = "Additional incident HIV infections under complete ADAP elimination versus no intervention."
    ),
    diagnoses = list(
      field = "cumulativeExcessNewDiagnoses",
      source = "total.results outcome 'new'",
      description = "Additional new HIV diagnoses under complete ADAP elimination versus no intervention."
    ),
    costingCohort = "Excess new diagnoses drive immediate and delayed ART starts and downstream care costs in the current costing model."
  ),
  assumptions = json_array(c(
    sprintf(
      "Jurisdiction-level model outputs and funding inputs cover %d modeled jurisdictions, including DC.",
      length(modeled_states)
    ),
    sprintf("The modeled-jurisdiction funding total is the sum of those %d jurisdictions.", length(modeled_states)),
    "The 2035 fixed horizon truncates downstream costs for infections occurring late in the horizon.",
    "Negative per-simulation excess infections and diagnoses are preserved and reported as diagnostics, not floored.",
    "Funding comparators are deterministic under the current CSV inputs.",
    "Net-cost uncertainty is driven by modeled care-cost uncertainty, with deterministic funding offsets.",
    "Pooled cost summaries treat the drug-cost scenario as an additional source of uncertainty (all scenarios x simulations in one distribution).",
    "Baseline counts are medians across 2025 no-intervention simulations; manuscript context ratios are means of per-simulation ratios.",
    "Sexual transmission rate is the manuscript-defined numerator divided within simulation by diagnosed prevalence minus viral suppression.",
    "Mechanism series report means of mutually exclusive end-of-year stocks; components close to cumulative excess diagnoses within simulation."
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
    totalEqualsJurisdictionSum = total_validation$passed,
    totalEqualsJurisdictionSumMaxAbsDiff = total_validation$max_abs_diff,
    incidenceArrayMatchesTotalResults = isTRUE(incidence_array_max_abs_diff < 1e-10),
    incidenceArrayMaxAbsDiff = incidence_array_max_abs_diff,
    diagnosisArrayMatchesTotalResults = isTRUE(diagnosis_array_max_abs_diff < 1e-10),
    diagnosisArrayMaxAbsDiff = diagnosis_array_max_abs_diff,
    mechanismClosureMaxAbsDiff = mechanism_closure_max_abs_diff,
    missingFundingLocations = json_array(missing_funding_locations),
    extraFundingLocations = json_array(extra_funding_locations),
    negativeExcessDiagnosesCount = negative_excess_diagnoses_count,
    negativeExcessDiagnosesShare = round(negative_excess_diagnoses_share, 6),
    negativeExcessInfectionsCount = negative_excess_infections_count,
    negativeExcessInfectionsShare = round(negative_excess_infections_share, 6)
  )
)

summary_data <- list(
  national = list(
    finalYear = location_results[["Total"]]$finalYear,
    pooledFinalYear = location_results[["Total"]]$pooledFinalYear
  ),
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
cat(sprintf("  Total equals jurisdiction sum: %s (max abs diff %.8f)\n", total_validation$passed, total_validation$max_abs_diff))
cat(sprintf("  Incidence array matches total.results: %s (max abs diff %.8f)\n", incidence_array_max_abs_diff < 1e-10, incidence_array_max_abs_diff))
cat(sprintf("  Diagnosis array matches total.results: %s (max abs diff %.8f)\n", diagnosis_array_max_abs_diff < 1e-10, diagnosis_array_max_abs_diff))
cat(sprintf("  Mechanism closure max abs diff: %.8f\n", mechanism_closure_max_abs_diff))
cat(sprintf("  Extra funding locations excluded: %s\n", paste(extra_funding_locations, collapse = ", ")))
cat(sprintf("  Negative excess diagnoses count/share: %d / %.6f\n", negative_excess_diagnoses_count, negative_excess_diagnoses_share))
cat(sprintf("  Negative excess infections count/share: %d / %.6f\n", negative_excess_infections_count, negative_excess_infections_share))
cat("\nDone.\n")
