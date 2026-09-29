# Independently reproduce the portal's 2035 cost summaries from Ryan's
# September 2026 pipeline definitions. This check deliberately uses base-R
# matrix logic rather than sourcing the analysis/exporter, then compares every
# jurisdiction and the built-in pooled modeled total with the generated JSON.

suppressPackageStartupMessages(library(jsonlite))

args <- commandArgs(trailingOnly = TRUE)
get_arg <- function(flag, default) {
  index <- match(flag, args)
  if (!is.na(index) && length(args) >= index + 1) return(args[[index + 1]])
  default
}

portal <- normalizePath(get_arg("--portal", getwd()), mustWork = TRUE)
rdata_path <- get_arg("--rdata", Sys.getenv("RYAN_WHITE_COSTING_RDATA", unset = ""))
funding_path <- get_arg(
  "--funding-csv",
  Sys.getenv(
    "RYAN_WHITE_COSTING_FUNDING_CSV",
    unset = file.path(portal, "scripts", "data", "ryan-white-costing-funding.csv")
  )
)
price_path <- get_arg(
  "--art-price-csv",
  file.path(portal, "scripts", "data", "ryan-white-costing-art-price-tiers.csv")
)
context_path <- get_arg(
  "--jurisdiction-context-csv",
  file.path(portal, "scripts", "data", "ryan-white-costing-jurisdiction-context.csv")
)

if (!nzchar(rdata_path)) stop("Provide --rdata PATH or set RYAN_WHITE_COSTING_RDATA")
if (!nzchar(funding_path)) {
  stop("Provide --funding-csv PATH or set RYAN_WHITE_COSTING_FUNDING_CSV")
}

cat("Loading pinned model output...\n")
env <- new.env(parent = emptyenv())
load(normalizePath(rdata_path, mustWork = TRUE), envir = env)
results <- env$total.results
parameters <- env$all.parameters

years <- 2026:2035
year_names <- as.character(years)
states <- setdiff(dimnames(results)$location, "Total")
sims <- dimnames(results)$sim
n_sims <- length(sims)

prices <- read.csv(price_path, stringsAsFactors = FALSE)
drug_cost <- setNames(
  prices$annual_art_cost_2026[match(c("low", "median", "high"), prices$scenario)],
  c("low", "median", "high")
)
context <- read.csv(context_path, stringsAsFactors = FALSE)
expansion <- setNames(as.logical(context$medicaid_expansion), context$location)
funding <- read.csv(funding_path, stringsAsFactors = FALSE)
funding$location <- trimws(funding$location)

discount <- 1 / (1 + 0.03)^(0:9)
drug_inflation <- (1 + 0.054)^(0:9)
care_inflation <- (1 + 0.056)^(0:9)
routine_care <- sum(c(0.54, 0.37, 0.09) * c(1650, 2290, 16800)) *
  (591.677 / 549.084)
funding_deflator <- 591.677 / 580.498
base_return <- 0 * (1 - exp(-1.2 * (0:10)))

q_value <- function(values) {
  c(
    median = median(values, na.rm = TRUE),
    lower = quantile(values, 0.025, names = FALSE, na.rm = TRUE),
    upper = quantile(values, 0.975, names = FALSE, na.rm = TRUE)
  )
}

compute_location <- function(location) {
  diagnoses <- results[
    year_names, , "new", location, "adap.100.end.26", drop = TRUE
  ] - results[year_names, , "new", location, "noint", drop = TRUE]
  intervention_suppression <- results[
    year_names, , "suppression", location, "adap.100.end.26", drop = TRUE
  ]
  intervention_diagnosed <- results[
    year_names, , "diagnosed.prevalence", location, "adap.100.end.26", drop = TRUE
  ]
  care_post <- pmin(pmax(intervention_suppression / intervention_diagnosed, 0), 1)

  if (identical(location, "Total")) {
    disruption <- rep(1, n_sims)
  } else {
    baseline_suppression <- results[
      "2025", , "suppression", location, "noint", drop = TRUE
    ]
    adap_suppression <- results[
      "2025", , "adap.suppression", location, "noint", drop = TRUE
    ]
    loss_parameter <- if (isTRUE(expansion[[location]])) {
      "lose.adap.expansion.effect"
    } else {
      "lose.adap.nonexpansion.effect"
    }
    loss <- parameters[
      loss_parameter, , location, "adap.100.end.26", drop = TRUE
    ]
    disruption <- pmin(
      pmax(1 - (adap_suppression / baseline_suppression) * loss, 0),
      1
    )
  }

  immediate <- diagnoses * care_post
  nonstarters <- diagnoses - immediate
  adjusted_return <- outer(base_return, disruption, "*")
  increments <- adjusted_return -
    rbind(rep(0, n_sims), head(adjusted_return, -1))

  delayed <- matrix(0, nrow = length(years), ncol = n_sims)
  for (index_year in seq_along(years)) {
    for (offset in 1:10) {
      target <- index_year + offset
      if (target <= length(years)) {
        delayed[target, ] <- delayed[target, ] +
          nonstarters[index_year, ] * increments[offset + 1, ]
      }
    }
  }

  active <- apply(immediate + delayed, 2, cumsum)
  person_years <- apply(active, 2, cumsum)
  cumulative_costs <- lapply(drug_cost, function(price) {
    per_person <- price * drug_inflation + routine_care * care_inflation
    annual_discounted <- sweep(
      sweep(active, 1, per_person, "*"),
      1,
      discount,
      "*"
    )
    apply(annual_discounted, 2, cumsum)
  })

  annual_adap <- if (identical(location, "Total")) {
    sum(as.numeric(funding$adap), na.rm = TRUE)
  } else {
    as.numeric(funding$adap[match(location, funding$location)])
  }
  cumulative_adap <- annual_adap * funding_deflator * sum(discount)
  final_costs <- lapply(cumulative_costs, function(matrix) matrix[10, ])
  pooled_cost <- unlist(final_costs, use.names = FALSE)
  pooled_net <- pooled_cost - cumulative_adap

  list(
    care = q_value(pooled_cost),
    net = q_value(pooled_net),
    ratio = q_value(pooled_net / cumulative_adap),
    share = mean(pooled_net > 0),
    person_years = q_value(person_years[10, ]),
    cumulative_adap = cumulative_adap,
    final_costs = final_costs,
    pooled_cost = pooled_cost,
    pooled_net = pooled_net
  )
}

cat("Recomputing jurisdiction paths...\n")
location_results <- setNames(
  lapply(c(states, "Total"), compute_location),
  c(states, "Total")
)
summary_json <- fromJSON(
  file.path(portal, "src", "data", "ryan-white-costing", "summary.json"),
  simplifyVector = FALSE
)

max_state_difference <- 0
for (state in states) {
  expected <- summary_json$states[[which(vapply(
    summary_json$states,
    function(item) identical(item$state, state),
    logical(1)
  ))]]
  actual <- location_results[[state]]
  observed <- c(
    unlist(expected$pooledFinalYear$cumulativeCareCost),
    unlist(expected$pooledFinalYear$cumulativeNetCostVsAdap),
    1000 * unlist(expected$pooledFinalYear$cumulativeNetCostRatioVsAdap),
    1e6 * expected$pooledFinalYear$shareNetCostPositiveVsAdap,
    unlist(expected$finalYear$cumulativePersonYearsOnArt)
  )
  reproduced <- c(
    actual$care[c("median", "lower", "upper")],
    actual$net[c("median", "lower", "upper")],
    1000 * actual$ratio[c("median", "lower", "upper")],
    1e6 * actual$share,
    actual$person_years[c("median", "lower", "upper")]
  )
  max_state_difference <- max(
    max_state_difference,
    max(abs(observed - reproduced), na.rm = TRUE)
  )
}

cat("Reproducing pooled built-in modeled total...\n")
national <- location_results[["Total"]]
national_actual <- c(
  national$care,
  national$net,
  1000 * national$ratio,
  1e6 * national$share,
  national$person_years
)
national_expected <- c(
  unlist(summary_json$national$pooledFinalYear$cumulativeCareCost),
  unlist(summary_json$national$pooledFinalYear$cumulativeNetCostVsAdap),
  1000 * unlist(summary_json$national$pooledFinalYear$cumulativeNetCostRatioVsAdap),
  1e6 * summary_json$national$pooledFinalYear$shareNetCostPositiveVsAdap,
  unlist(summary_json$national$finalYear$cumulativePersonYearsOnArt)
)
max_national_difference <- max(abs(national_actual - national_expected), na.rm = TRUE)

# JSON costs/person-years are rounded to whole dollars/one decimal; ratios and
# shares are rounded to three and six decimals. The scaled comparison permits
# only those documented rounding differences.
if (max_state_difference > 1.1) {
  stop(sprintf("State cross-check failed; max scaled difference %.6f", max_state_difference))
}
if (max_national_difference > 1.1) {
  stop(sprintf(
    "Pooled modeled-total cross-check failed; max scaled difference %.6f",
    max_national_difference
  ))
}

cat(sprintf(
  paste0(
    "Cross-check passed: %d jurisdictions; state max scaled difference %.6f; ",
    "pooled modeled-total max scaled difference %.6f.\n"
  ),
  length(states),
  max_state_difference,
  max_national_difference
))
