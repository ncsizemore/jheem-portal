# Ryan White Costing Context Input

`ryan-white-costing-jurisdiction-context.csv` supplies the two jurisdiction-level inputs that are not stored in the costing RData but are required to reproduce the manuscript displays.

- `diagnosed_hiv_weighted_urbanicity` uses each county's 2020 Census urban population share (`2020_UA_COUNTY.csv`) weighted by that county's 2021 diagnosed HIV prevalence from the JHEEM surveillance manager. The calculation follows `urbanicity_calculations_v2.R` in the Ryan White costing analysis directory.
- `medicaid_expansion` records ACA Medicaid expansion adoption for the study's 2025 baseline year. The modeled non-expansion jurisdictions are Alabama, Florida, Georgia, Mississippi, South Carolina, Tennessee, Texas, and Wisconsin; status was checked against [KFF State Health Facts](https://www.kff.org/affordable-care-act/state-indicator/state-activity-around-expanding-medicaid-under-the-affordable-care-act/).

The main exporter records the CSV filename, timestamp, size, and SHA-256 digest in `metadata.json`. Changes to the source year, weighting outcome, or Medicaid classification should therefore be made in this CSV and followed by a full data regeneration and validation.

Urbanicity source artifacts used for this snapshot:

- `surveillance.manager.rdata`: `b9dd8379adedc81ca47dec2f33c5614efc31174540f2683b2fa32e90bd19b412`
- `2020_UA_COUNTY.csv.zip`: `1be4162c5b9c1d3395a9c0b3404f2656aa10580bf414ffa2c97fdc8363053969`
