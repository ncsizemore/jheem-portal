# Ryan White ADAP Costing MVP Plan

**Status:** Planning for pseudo-MVP  
**Created:** 2026-07-02  
**Scope:** Frontend-first economics page for the Ryan White ADAP elimination analysis.

## Summary

Build an internal pseudo-MVP page that turns the supplied Ryan White ADAP costing inputs into
small static display artifacts and renders a purpose-built economics view in the portal.

This should start as a frontend-only deployment, similar in spirit to the HIV aging and GMHA pages,
rather than going through the full backend/container/CloudFront model pipeline immediately. The
production path can move the exporter into the backend/container system after the scientific
assumptions and desired visualizations are reviewed.

## Current Inputs

### Epidemiologic input

Supplied file:

```text
/Users/cristina/Downloads/ryan_white_results_state_costing_ADAP2026_2026-04-03.Rdata
```

The file contains:

- `total.results`
- `total.incidence`
- `incidence.by.race`
- `incidence.by.age`
- `incidence.by.sex.risk`
- `total.new`
- `total.pop`
- `total.sexual.transmission`
- `all.parameters`

Observed dimensions:

- years: `2010-2036`
- simulations: `1000`
- outcomes: `15`
- locations: 30 states plus `Total`
- interventions: `noint`, `adap.100.end.26`

The `Total` location in the RData equals the sum of the 30 modeled states for checked years.

### Funding input

Supplied file:

```text
/Volumes/WD_Black/wiley/Documents/jheem/code/jheem_analyses/applications/ryan_white/Ryan_white_costing/rw_funding_by_state.csv
```

Columns:

```text
location,part_a,part_b,part_c,part_d,part_f,adap
```

The CSV covers the same 30 modeled states plus `DC`. The RData does not contain DC epidemiologic output.

## Data Packaging Pattern

Use the newer GMHA application as the preferred precedent, not the older portal aging page.

Recommended pattern:

- keep tiny metadata and summary artifacts under `src/data/ryan-white-costing`;
- keep larger display series under `public/data/ryan-white-costing`;
- add typed accessors in `src/data/ryan-white-costing/index.ts`;
- validate generated artifacts in development with schemas;
- cache fetch promises and clear failed fetches so the UI can retry.

If the final generated payload is trivially small, the detailed data can be imported directly from
`src/data`. If it is more than a few hundred KB, prefer the split `src/data` plus `public/data` pattern
so the initial page bundle stays small.

Dependency note: `jheem-portal` does not currently include `zod`, `vitest`, or a test script. If we copy
the GMHA validation pattern directly, add `zod` deliberately. Defer `vitest` unless we are also adding
frontend test infrastructure for this repo.

## Working Assumptions

These assumptions are good enough for a pseudo-MVP, but should be surfaced in the page metadata and
reviewed before final publication.

1. Use only the 30 shared state codes for state-level and national model outputs.
2. Exclude `DC` from national summaries because no DC epidemiologic output is present.
3. Use the RData `Total` row for epidemiologic national totals, with a validation check that it still
   equals the sum of the 30 state rows.
4. Use 2026-2035 as the primary costing horizon.
5. Treat the fixed 2035 horizon as a limitation: downstream costs for infections occurring late in the
   horizon are truncated.
6. Apply the script's intended 2025-to-2026 CPI adjustment unless later review establishes the CSV is
   already in 2026 dollars.
7. Use the intended 2026-adjusted routine-care cost variable rather than the apparent stale pre-adjusted
   value in the draft script.
8. Use ADAP spending avoided as the primary funding comparator because the analysis is framed around
   ADAP elimination.
9. Include total RWHAP funding as a secondary comparator.
10. Avoid definitive "cost saving" language until the payer perspective and counterfactual are reviewed.
11. Default the UI to the median ART drug-cost scenario, while preserving low/high sensitivity data in
    the generated data.
12. Do not silently floor negative per-simulation excess infections. Preserve source-script behavior for
    the primary pseudo-MVP, but emit diagnostics and leave room for a floored sensitivity check.
13. Make any focus state configurable. `FL` can be the initial default only if documented as a UI default,
    not hardcoded into the data contract.
14. Do not expose the raw 416 MB RData file through the portal.

Model assumptions that should be surfaced for review:

- reengagement probability/hazard parameters, including `pi = 0.86` and `lambda = 1.2`;
- CD4 strata weights used for cost assignment;
- ART drug cost tiers for low, median, and high scenarios;
- routine care cost assumptions and dollar-year adjustments;
- immediate-start assumptions tied to 2025 care fractions;
- 3% annual discount rate;
- the costing perspective used to interpret ADAP spending avoided and downstream care costs.

## Known Script Issues

The current research script is useful but not production-ready as-is.

Source file:

```text
/Volumes/WD_Black/wiley/Documents/jheem/code/jheem_analyses/applications/ryan_white/Ryan_white_costing/Cost_saving_analysis_v1.R
```

Issues observed:

- `dplyr::dplyr::select` is a parse-breaking typo and should be `dplyr::select`.
- `rw_funding` is read twice; the second read appears to overwrite the CPI-adjusted version.
- `cost_on_art_wtd_2026` is computed but not used when building the incident-cost grid.
- The script assumes `total.results` is already present in memory.
- The script does not write a frontend-ready JSON artifact.
- `Total` has no funding row after joining with the CSV; aggregate funding must be computed from the 30
  matched states.
- `excess_new` can be negative for individual simulation/year combinations; this should be measured and
  explicitly documented rather than handled accidentally.
- The fixed 2035 horizon truncates downstream costs for late incident infections.
- The script mixes data extraction, costing assumptions, plotting, and reporting; the exporter should
  separate reproducible data derivation from presentation.

## MVP Data Contract

Generate static display artifacts:

```text
src/data/ryan-white-costing/metadata.json
src/data/ryan-white-costing/summary.json
public/data/ryan-white-costing/series.json
```

The artifacts should contain only display-ready data, not raw simulation arrays. Add matching
`types.ts`, `schemas.ts`, and `index.ts` files under `src/data/ryan-white-costing`.

Recommended shape:

```ts
type CostScenarioId = "low" | "median" | "high";
type IntervalLevel = "p025_p975" | "p05_p95" | "p25_p75";

interface QuantileValue {
  median: number;
  lower: number;
  upper: number;
}

interface ScenarioValues {
  low: QuantileValue;
  median: QuantileValue;
  high: QuantileValue;
}

interface AnnualCostPoint {
  year: number;
  cumulativeCareCost: ScenarioValues;
  cumulativeAdapSpendingAvoided: number;
  cumulativeTotalRwhapSpendingAvoided: number;
  cumulativeNetCostVsAdap: ScenarioValues;
  cumulativeNetCostVsTotalRwhap: ScenarioValues;
  cumulativeExcessNewDiagnoses: QuantileValue;
  cumulativePersonYearsOnArt: QuantileValue;
  negativeExcessNewShare?: number;
}

interface FinalYearSummary extends AnnualCostPoint {
  cumulativeNetCostRatioVsAdap: ScenarioValues;
  cumulativeNetCostRatioVsTotalRwhap: ScenarioValues;
  rankByNetCostVsAdap?: number;
  rankByNetCostRatioVsAdap?: number;
}

interface StateCostingSummary {
  state: string;
  finalYear: FinalYearSummary;
}

interface RyanWhiteCostingMetadata {
  generatedAt: string;
  sourceRData: string;
  sourceFundingCsv: string;
  horizon: { startYear: 2026; endYear: 2035 };
  intervalLevel: IntervalLevel;
  defaultCostScenario: CostScenarioId;
  defaultFocusState: string;
  dollarYear: string;
  fundingAdjustment: {
    applied: boolean;
    description: string;
  };
  modeledStates: string[];
  excludedFundingLocations: string[];
  assumptions: string[];
  deterministicFields: string[];
  modelParameters: {
    reengagementPi: number;
    reengagementLambda: number;
    discountRate: number;
    cd4Weights: Record<string, number>;
    artDrugCosts: Record<CostScenarioId, number>;
    routineCareCost: number;
    immediateStartCareFractionDescription: string;
  };
  validation: {
    totalEqualsStateSum: boolean;
    missingFundingLocations: string[];
    extraFundingLocations: string[];
    negativeExcessNewCount: number;
    negativeExcessNewShare: number;
  };
  reviewQuestions: string[];
}

interface RyanWhiteCostingSummary {
  national: {
    finalYear: FinalYearSummary;
  };
  states: StateCostingSummary[];
  sensitivity: {
    costScenarios: CostScenarioId[];
    primaryScenario: CostScenarioId;
  };
}

interface RyanWhiteCostingSeries {
  national: AnnualCostPoint[];
  states: Record<string, AnnualCostPoint[]>;
}
```

Suggested display fields:

- cumulative downstream HIV care cost for excess incident infections
- cumulative ADAP spending avoided
- net cost: care cost minus ADAP spending avoided
- ratio: net cost divided by ADAP spending avoided
- cumulative excess new diagnoses
- person-years on ART
- funding comparator values for ADAP and total RWHAP
- uncertainty intervals

For the MVP, store precomputed medians and intervals rather than raw per-simulation draws unless a
specific interactive uncertainty feature needs them. Compute each metric for each simulation path first,
including annual cumulative metrics, and only then summarize across simulations. Do not quantile inputs
and propagate those quantiles through the cost model.

Funding comparators from `rw_funding_by_state.csv` are deterministic under the current inputs. Store
them as scalar values, not uncertainty intervals. Net-cost uncertainty is care-cost-driven; it should be
computed explicitly from per-simulation net values, but because funding is fixed it is mathematically the
care-cost distribution shifted by a deterministic comparator.

Net-cost ratios should be final-year summary metrics only. Avoid annual ratio series because early
cumulative denominators can make the statistic unstable and difficult to interpret, especially for
smaller states.

## Generator Plan

Add a script:

```text
scripts/generate-ryan-white-costing-data.R
```

Responsibilities:

1. Load the supplied RData file.
2. Read `rw_funding_by_state.csv`.
3. Validate required objects, interventions, outcomes, years, and state sets.
4. Fix the research-script logic in a reproducible exporter rather than relying on sourcing the raw
   script directly.
5. Compute the annual and final-year metrics needed by the MVP page.
6. Compute uncertainty by simulation path first, then summarize with quantiles.
7. Emit diagnostics for state-set mismatch, missing funding, negative excess infections, and Total-vs-sum
   consistency.
8. Write the `src/data/ryan-white-costing` and `public/data/ryan-white-costing` artifacts.
9. Fail closed if validation checks break.

The generator should be deterministic and runnable locally. Do not require the raw RData file to live in
the repository.

## MVP Page Plan

Add a route:

```text
src/app/ryan-white-costing/page.tsx
```

Initial page sections:

1. Summary strip
   - final-year cumulative care cost
   - cumulative ADAP spending avoided
   - net cost
   - excess infections or person-years on ART

2. Main cumulative line chart
   - downstream HIV care cost
   - ADAP spending avoided
   - optional low/high sensitivity band
   - configurable focus state, with Florida as an acceptable initial default

3. State comparison table
   - state
   - cumulative care cost
   - cumulative ADAP spending avoided
   - net cost
   - net-cost ratio
   - excess infections

4. Cross-state ratio view
   - likely a scatter or ranked bar chart
   - sized or colored by ADAP spending, Medicaid expansion status, or another already-computed
     covariate if available

5. Assumptions panel
   - visible but not dominant
   - lists data scoping assumptions, model parameters, payer-perspective caveats, and validation notes

Use neutral labels in the MVP:

- "ADAP spending avoided" rather than "savings";
- "downstream care cost" rather than "cost penalty";
- "net cost under current perspective" rather than "net savings" unless the reviewed perspective supports
  that interpretation.

## Deployment Plan

### Pseudo-MVP

Frontend-only.

- Commit the generated display artifacts if they remain reasonably small.
- Import tiny metadata/summary data from `src/data/ryan-white-costing`.
- Serve larger series from `public/data/ryan-white-costing`.
- Keep the route directly accessible while under review.
- Avoid homepage navigation until the page is credible enough for broader exposure.

This avoids backend and container work while the scientific presentation is still being shaped.

### Production

Move toward the standard model-data pipeline if the page becomes public-facing.

Recommended production path:

1. Put the economics exporter under the reproducible backend/container workflow.
2. Pin the RData/funding inputs to a release artifact rather than a local file path.
3. Publish the derived JSON to S3/CloudFront.
4. Add a backend model/data config entry if the page needs to share infrastructure with other model
   outputs.
5. Add regression checks for the derived JSON headline metrics.

## Review Questions For Later

These are intentionally deferred until the pseudo-MVP gives reviewers something concrete to inspect.

1. Should DC be excluded, included through separate non-model funding context, or modeled separately?
2. Are the CSV dollars 2025 nominal dollars, 2026 dollars, or another fiscal-year convention?
3. Does `part_b` include ADAP funding, or is it Part B excluding ADAP?
4. Should low/median/high ART drug-cost assumptions be shown separately, pooled, or both?
5. Should the primary comparison be ADAP only, total RWHAP, or both?
6. What payer perspective should govern the "net" calculation?
7. In the counterfactual, would downstream care for excess infections be ADAP/RWHAP-eligible, and if so
   how should that be represented?
8. Should negative per-simulation excess infections be preserved, floored at zero, or shown as a
   sensitivity?
9. Which 2-4 visualizations should be treated as publication-facing defaults?

## Non-Goals For MVP

- Do not implement on-demand custom economic simulations.
- Do not add backend workflows before the data contract and visual priorities stabilize.
- Do not serve the raw RData file.
- Do not force this analysis into the existing epidemiologic `AnalysisView` selector model.
- Do not resolve every method ambiguity before producing the internal preview.

## Success Criteria

The pseudo-MVP is successful when:

- the data generator runs locally from the supplied RData and CSV;
- generated JSON is small enough for static hosting;
- validation checks catch obvious state-set and input-contract drift;
- the page renders the main economic conclusions clearly;
- assumptions are explicit enough for review without blocking iteration;
- scientific caveats are visible enough that reviewers can challenge the model, not just the data
  plumbing.
