# Cross-check the portal exporter's pooled per-state summaries against
# Ryan's pipeline (Cost_saving_analysis_v1.R formulas + the pooled convention
# from ADAP_supplemental_tables.R).
#
# NOTE: sourcing Ryan's script verbatim segfaults dplyr on the full 25M-row
# reshape (all 27 years x 15 outcomes). His pipeline immediately filters to
# {new, suppression, diagnosed.prevalence} x {2025..2035}, so we subset the
# array BEFORE reshaping (mathematically identical) and then run his formulas
# verbatim. The check that matters is unchanged: his dplyr cohort-expansion
# math vs the exporter's independent matrix math must agree.
#
#   Variant A = Ryan's draft conventions (un-inflated funding via the second
#               CSV read; routine care cost NOT CPI-deflated to 2026)
#   Variant B = exporter conventions (funding inflated 2025->2026; routine
#               care deflated 2023->2026)
# Variant B must match summary.json within rounding. A-vs-B deltas are
# reported as information for Ryan.

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(jsonlite)
})

JA <- "/Volumes/WD_Black/wiley/Documents/jheem/code/jheem_analyses"
PORTAL <- "/Volumes/WD_Black/wiley/Documents/jheem-portal"
RDATA <- file.path(JA, "applications/ryan_white/Ryan_white_costing/ryan_white_results_state_costing_ADAP2026_2026-04-03.Rdata")
FUNDING_CSV <- file.path(JA, "applications/ryan_white/Ryan_white_costing/rw_funding_by_state.csv")

cat("Loading RData...\n")
env <- new.env()
load(RDATA, envir = env)
total.results <- get("total.results", envir = env)
rm(env); invisible(gc())

# ---- Ryan's constants (verbatim from Cost_saving_analysis_v1.R) -----------
discount_rate <- 0.03
INFLATION_RATE_DRUG <- 0.054
INFLATION_RATE_CARE <- 0.056

discount_factors <- tibble(
  year            = 2026:2035,
  year_index      = 1:10,
  discount_factor = 1 / (1 + discount_rate)^(year_index - 1),
  inflation_factor_drug = (1 + INFLATION_RATE_DRUG)^(year_index - 1),
  inflation_factor_care = (1 + INFLATION_RATE_CARE)^(year_index - 1)
)

cd4_strata <- tibble(
  stratum     = c("CD4 >500", "CD4 200-500", "CD4 <200"),
  wt          = c(0.54, 0.37, 0.09),
  cost_on_art = c(1650, 2290, 16800)
)
cost_on_art_wtd <- sum(cd4_strata$wt * cd4_strata$cost_on_art)

cost_drug_low <- 18500; cost_drug_median <- 33000; cost_drug_high <- 47400

pi_reengage <- 0.86; lambda_reengage <- 1.2; horizon_years <- 10
F_cum <- function(t) pi_reengage * (1 - exp(-lambda_reengage * t))
reengage_schedule <- tibble(
  year_offset  = 0:horizon_years,
  F_cum        = F_cum(year_offset),
  incr_return  = F_cum - lag(F_cum, default = 0),
  still_offart = 1 - lag(F_cum, default = 0)
)

cost_grid <- tibble(
  cost_scenario = factor(c("Low cost", "Median cost", "High cost"),
                         levels = c("Low cost", "Median cost", "High cost")),
  annual_drug_cost = c(cost_drug_low, cost_drug_median, cost_drug_high)
)

deflator_2023_to_2026 <- 591.677 / 549.084
deflator_2025_to_2026 <- 591.677 / 580.498

# ---- reshape (subsetted first; then Ryan's formulas verbatim) --------------
arr <- total.results[as.character(2025:2035), ,
                     c("new", "suppression", "diagnosed.prevalence"), ,
                     c("noint", "adap.100.end.26"), drop = FALSE]
rm(total.results); invisible(gc())

df <- as.data.frame.table(arr, responseName = "value") %>%
  mutate(
    year         = as.integer(as.character(year)),
    sim          = as.integer(as.character(sim)),
    value        = as.numeric(value),
    location     = trimws(as.character(location)),
    outcome      = trimws(as.character(outcome)),
    intervention = trimws(as.character(intervention))
  )
rm(arr); invisible(gc())

baseline_2025 <- df %>%
  filter(year == 2025, intervention == "noint",
         outcome %in% c("suppression", "diagnosed.prevalence")) %>%
  dplyr::select(location, sim, outcome, value) %>%
  pivot_wider(names_from = outcome, values_from = value) %>%
  mutate(care_fraction_2025 = suppression / diagnosed.prevalence) %>%
  dplyr::select(location, sim, care_fraction_2025)

new_excess <- df %>%
  filter(year >= 2026, year <= 2035, outcome == "new",
         intervention %in% c("noint", "adap.100.end.26")) %>%
  dplyr::select(location, sim, year, intervention, value) %>%
  pivot_wider(names_from = intervention, values_from = value) %>%
  mutate(excess_new = `adap.100.end.26` - noint) %>%
  left_join(baseline_2025, by = c("location", "sim")) %>%
  mutate(
    immediate_starts = excess_new * care_fraction_2025,
    not_starting_now = excess_new - immediate_starts
  ) %>%
  arrange(location, sim, year)

nonstarter_followup <- new_excess %>%
  dplyr::select(location, sim, index_year = year, not_starting_now) %>%
  crossing(reengage_schedule) %>%
  mutate(
    year           = index_year + year_offset,
    delayed_starts = not_starting_now * incr_return,
    offart_pyears  = not_starting_now * still_offart
  ) %>%
  filter(year >= 2026, year <= 2035)

lagged_starts <- nonstarter_followup %>%
  filter(year_offset >= 1) %>%
  group_by(location, sim, year) %>%
  summarise(delayed_starts = sum(delayed_starts, na.rm = TRUE), .groups = "drop")

offart_stock <- nonstarter_followup %>%
  group_by(location, sim, year) %>%
  summarise(offart_pyears = sum(offart_pyears, na.rm = TRUE), .groups = "drop")

start_paths <- new_excess %>%
  dplyr::select(location, sim, year, excess_new, immediate_starts, not_starting_now) %>%
  left_join(lagged_starts, by = c("location", "sim", "year")) %>%
  left_join(offart_stock,  by = c("location", "sim", "year")) %>%
  mutate(
    delayed_starts = coalesce(delayed_starts, 0),
    offart_pyears  = coalesce(offart_pyears, 0),
    total_starts   = immediate_starts + delayed_starts
  ) %>%
  arrange(location, sim, year)

# ---- cost pipeline, parameterized on the two conventions -------------------
rebuild_compare <- function(care_cost_annual, funding_deflator) {
  inc <- start_paths %>%
    crossing(cost_grid) %>%
    left_join(discount_factors, by = "year") %>%
    mutate(
      total_on_art_cost_pp_inflated = (annual_drug_cost * inflation_factor_drug) +
        (care_cost_annual * inflation_factor_care)
    ) %>%
    arrange(location, sim, cost_scenario, year) %>%
    group_by(location, sim, cost_scenario) %>%
    mutate(
      active_excess_on_art         = cumsum(total_starts),
      annual_incremental_cost      = active_excess_on_art * total_on_art_cost_pp_inflated,
      annual_incremental_cost_disc = annual_incremental_cost * discount_factor,
      cumulative_incremental_cost  = cumsum(annual_incremental_cost_disc)
    ) %>%
    ungroup()

  funding <- read.csv(FUNDING_CSV, stringsAsFactors = FALSE) %>%
    mutate(
      location = trimws(as.character(location)),
      across(c(part_a, part_b, part_c, part_d, part_f, adap), as.numeric),
      annual_drug_only = adap * funding_deflator
    ) %>%
    dplyr::select(location, annual_drug_only) %>%
    crossing(year = 2026:2035) %>%
    left_join(discount_factors %>% dplyr::select(year, discount_factor), by = "year") %>%
    arrange(location, year) %>%
    group_by(location) %>%
    mutate(cumulative_drug_only = cumsum(annual_drug_only * discount_factor)) %>%
    ungroup() %>%
    dplyr::select(location, year, cumulative_drug_only)

  inc %>% left_join(funding, by = c("location", "year"))
}

cat("Building variant A (Ryan's draft conventions)...\n")
variant_a <- rebuild_compare(cost_on_art_wtd, 1)
cat("Building variant B (exporter conventions)...\n")
variant_b <- rebuild_compare(cost_on_art_wtd * deflator_2023_to_2026, deflator_2025_to_2026)

# ---- compare variant B pooled per-state vs exporter summary.json -----------
summary_json <- fromJSON(file.path(PORTAL, "src/data/ryan-white-costing/summary.json"),
                         simplifyVector = FALSE)

pooled_b <- function(loc) {
  d <- variant_b %>% filter(location == loc, year == 2035)
  adap <- d$cumulative_drug_only[[1]]
  net <- d$cumulative_incremental_cost - adap
  list(
    care_med = median(d$cumulative_incremental_cost),
    care_lo  = quantile(d$cumulative_incremental_cost, 0.025, names = FALSE),
    care_hi  = quantile(d$cumulative_incremental_cost, 0.975, names = FALSE),
    net_med  = median(net),
    net_lo   = quantile(net, 0.025, names = FALSE),
    net_hi   = quantile(net, 0.975, names = FALSE),
    ratio_med = median(net / adap),
    share_pos = mean(net > 0),
    n = nrow(d)
  )
}

counts_ryan <- function(loc) {
  inf <- new_excess %>%
    filter(location == loc, year <= 2035) %>%
    group_by(sim) %>%
    summarise(cum_excess = sum(excess_new, na.rm = TRUE), .groups = "drop")
  py <- start_paths %>%
    filter(location == loc, year <= 2035) %>%
    group_by(sim) %>%
    arrange(year, .by_group = TRUE) %>%
    mutate(active_on_art = cumsum(total_starts)) %>%
    summarise(py_on_art = sum(active_on_art, na.rm = TRUE), .groups = "drop")
  list(inf_med = median(inf$cum_excess), py_med = median(py$py_on_art))
}

states <- vapply(summary_json$states, function(s) s$state, character(1))
fails <- 0
worst <- list(care = 0, net = 0, ratio = 0, share = 0, inf = 0, py = 0)

for (i in seq_along(states)) {
  st <- states[[i]]
  exp_pooled <- summary_json$states[[i]]$pooledFinalYear
  exp_final <- summary_json$states[[i]]$finalYear
  b <- pooled_b(st)
  cnt <- counts_ryan(st)
  stopifnot(b$n == 3000)

  d_care  <- max(abs(b$care_med - exp_pooled$cumulativeCareCost$median),
                 abs(b$care_lo  - exp_pooled$cumulativeCareCost$lower),
                 abs(b$care_hi  - exp_pooled$cumulativeCareCost$upper))
  d_net   <- max(abs(b$net_med - exp_pooled$cumulativeNetCostVsAdap$median),
                 abs(b$net_lo  - exp_pooled$cumulativeNetCostVsAdap$lower),
                 abs(b$net_hi  - exp_pooled$cumulativeNetCostVsAdap$upper))
  d_ratio <- abs(b$ratio_med - exp_pooled$cumulativeNetCostRatioVsAdap$median)
  d_share <- abs(b$share_pos - exp_pooled$shareNetCostPositiveVsAdap)
  d_inf   <- abs(cnt$inf_med - exp_final$cumulativeExcessNewDiagnoses$median)
  d_py    <- abs(cnt$py_med  - exp_final$cumulativePersonYearsOnArt$median)

  worst$care  <- max(worst$care, d_care)
  worst$net   <- max(worst$net, d_net)
  worst$ratio <- max(worst$ratio, d_ratio)
  worst$share <- max(worst$share, d_share)
  worst$inf   <- max(worst$inf, d_inf)
  worst$py    <- max(worst$py, d_py)

  ok <- d_care <= 1 && d_net <= 1 && d_ratio <= 0.002 && d_share <= (1 / 3000 + 1e-9) &&
    d_inf <= 0.11 && d_py <= 0.11
  if (!ok) {
    fails <- fails + 1
    cat(sprintf("  MISMATCH %s: care=%.3f net=%.3f ratio=%.5f share=%.6f inf=%.3f py=%.3f\n",
                st, d_care, d_net, d_ratio, d_share, d_inf, d_py))
  }
}

cat(sprintf("\n[pooled] Exporter vs Ryan-pipeline-with-exporter-conventions, %d states:\n", length(states)))
cat(sprintf("  states failing tolerance: %d\n", fails))
cat(sprintf("  worst abs diffs: care=$%.4f net=$%.4f ratio=%.6f share=%.6f excess=%.4f py=%.4f\n",
            worst$care, worst$net, worst$ratio, worst$share, worst$inf, worst$py))

# ---- national (Total location, within-sim convention) ----------------------
tot_b <- variant_b %>% filter(location == "Total", year == 2035)
adap_by_state <- variant_b %>%
  filter(location %in% states, year == 2035) %>%
  distinct(location, cumulative_drug_only)
adap_total <- sum(adap_by_state$cumulative_drug_only)
net_total <- tot_b$cumulative_incremental_cost - adap_total
exp_nat <- summary_json$national$pooledFinalYear
cat(sprintf("\n[national] pooled (within-sim Total): care med diff=$%.4f, net med diff=$%.4f\n",
            abs(median(tot_b$cumulative_incremental_cost) - exp_nat$cumulativeCareCost$median),
            abs(median(net_total) - exp_nat$cumulativeNetCostVsAdap$median)))

# ---- quantify Ryan's-draft vs exporter-convention deltas (info for Ryan) ----
delta <- function(loc, adap_a = NULL, adap_b = NULL) {
  a <- variant_a %>% filter(location == loc, year == 2035)
  b <- variant_b %>% filter(location == loc, year == 2035)
  if (is.null(adap_a)) adap_a <- a$cumulative_drug_only[[1]]
  if (is.null(adap_b)) adap_b <- b$cumulative_drug_only[[1]]
  net_a <- a$cumulative_incremental_cost - adap_a
  net_b <- b$cumulative_incremental_cost - adap_b
  c(care_pct = 100 * (median(b$cumulative_incremental_cost) / median(a$cumulative_incremental_cost) - 1),
    net_pct  = 100 * (median(net_b) / median(net_a) - 1))
}
d_fl <- delta("FL")
d_tot <- delta("Total", adap_a = adap_total / deflator_2025_to_2026, adap_b = adap_total)
cat("\n[deltas] exporter conventions vs Ryan's draft, medians at 2035:\n")
cat(sprintf("  FL:    care %+0.2f%%  |  net vs ADAP %+0.2f%%\n", d_fl[["care_pct"]], d_fl[["net_pct"]]))
cat(sprintf("  Total: care %+0.2f%%  |  net vs ADAP %+0.2f%%\n", d_tot[["care_pct"]], d_tot[["net_pct"]]))

if (fails == 0) cat("\nCROSS-CHECK PASSED\n") else cat("\nCROSS-CHECK FAILED\n")
