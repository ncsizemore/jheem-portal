# CDC Testing Custom Simulations

**Parent plan:** [Custom Simulations Plan](./CUSTOM-SIMULATIONS-PLAN.md) (item 5 in Path Forward)
**Status:** Planning complete, ready to execute
**Date:** March 24, 2026

## Goal

Add custom simulation support for CDC Testing — the first non-Ryan-White model to get custom sims. This validates that the config-driven custom sim architecture generalizes beyond Ryan White's intervention pattern. It also retires the legacy CDC Testing Shiny custom sim app.

## Intervention Model

CDC Testing uses a different intervention pattern than Ryan White. Instead of 6 suppression-loss effects across ADAP/OAHS/other, it has 2 whole-population effects:

| Parameter | Quantity | Description |
|-----------|----------|-------------|
| **Testing reduction** | `cdc.effect` | How much CDC-funded testing is reduced (0-100%). 100% = full cessation. Value passed to jheem2 as `1 - (reduction/100)`. Registered as a model element with scale `proportion`. |
| **Proportion tested regardless** | `proportion.tested.regardless` | Fraction of people who continue testing without CDC funding (0-100%). Fixed user value (Shiny app does the same — the research script's beta distribution is for prerun scenarios, not user-specified custom sims). Registered as a model element. |

Both effects target `WHOLE.POPULATION`. No subgroup targeting, no expansion/nonexpansion split.

The prerun scenarios already cover timing variants (cessation, brief/prolonged interruption). Custom sims use cessation timing (permanent reduction) with user-specified magnitudes. Timing parameters can be added later if needed.

### Specification Version Dependency

**Critical finding:** The two parameters require a newer version of `cdc_testing_specification.R` than what the current container workspace was built from.

- **At commit `fc3fe1d`** (current container workspace): Only `cdc.effect` exists as a model element. `proportion.tested.regardless` is NOT registered in the specification. The prerun interventions handle it as a *parameter matrix* on the intervention object (1000 beta-distribution samples), not as a separate intervention effect on a model element.

- **At current HEAD of jheem_analyses**: Both `cdc.effect` AND `proportion.tested.regardless` are registered as model elements. The key quantity `cdc.funded.testing.of.undiagnosed` now explicitly depends on both: `super.testing.of.undiagnosed * fraction.diagnoses.from.cdc * cdc.effect`. The Shiny app sources current HEAD, which is why it can use both as separate intervention effects.

**Implication:** The CDC Testing container must rebuild its workspace from a newer jheem_analyses commit (current HEAD or close to it) to support both custom sim parameters. This happens naturally in Step 2 when we bump the container to base v1.3.0 — the workspace build already clones jheem_analyses, we just update the pinned commit.

**Reference code:**
- Research interventions: `jheem_analyses/applications/cdc_testing/cdc_testing_interventions.R`
- Model specification: `jheem_analyses/applications/cdc_testing/cdc_testing_specification.R` (must use version with `proportion.tested.regardless` registered)
- Shiny custom sim config: `jheem2_interactive/src/ui/config/pages/custom.yaml`
- Shiny intervention adapter: `jheem2_interactive/src/adapters/interventions/model_effects.R`
- Ryan White simulation script (pattern to follow): `jheem-base/simulation/simple_ryan_white.R`

## Execution Steps

### Step 1: `simple_cdc_testing.R` in jheem-base

New simulation script at `simulation/simple_cdc_testing.R`. Follows the `simple_ryan_white.R` pattern but with CDC Testing's 2-effect intervention:

```r
create_cdc_testing_intervention <- function(parameters) {
  testing_reduction <- parameters$testing_reduction  # 0-100
  proportion_tested <- parameters$proportion_tested_regardless  # 0-100

  # Effect 1: CDC testing reduction
  cdc_effect <- create.intervention.effect(
    quantity.name = "cdc.effect",
    start.time = START.YEAR,
    effect.values = 1 - (testing_reduction / 100),
    times = START.YEAR + LOSS.LAG,
    scale = "proportion",
    apply.effects.as = "value",
    allow.values.less.than.otherwise = TRUE,
    allow.values.greater.than.otherwise = FALSE
  )

  # Effect 2: Proportion tested regardless
  proportion_effect <- create.intervention.effect(
    quantity.name = "proportion.cdc.tests.done.regardless",
    start.time = -Inf,
    effect.values = proportion_tested / 100,
    times = 0,
    scale = "proportion",
    apply.effects.as = "value",
    allow.values.less.than.otherwise = TRUE,
    allow.values.greater.than.otherwise = TRUE
  )

  create.intervention(
    WHOLE.POPULATION,
    cdc_effect,
    proportion_effect,
    code = "cdct-custom"
  )
}
```

Key details:
- `cdc.effect` uses the same pattern as the research script's cessation scenario
- `proportion.cdc.tests.done.regardless` uses the research script's `proportion.tested.regardless.effect` pattern (start.time = -Inf, times = 0) — this is a baseline parameter, not time-dependent
- The quantity name must match the model specification. Research script uses `proportion.cdc.tests.done.regardless` — verify against `CDCT.SPECIFICATION`
- `run_custom_simulation()` can be shared with Ryan White (same pattern: copy simset, run intervention)

Also need: update `custom_simulation.R` in jheem-base to handle the CDC Testing simulation script (the `simulationScript` config in models.json controls which script is sourced).

Tag jheem-base v1.4.0 after adding this script.

### Step 2: Bump CDC Testing container

Update `jheem-cdc-testing-container/Dockerfile`:
- `BASE_VERSION=1.0.0` → latest jheem-base (1.3.0, or 1.4.0 if we tag a new base for the simulation script)
- **Update `JHEEM_ANALYSES_COMMIT`** from `fc3fe1d` to current HEAD (or a pinned recent commit). This is required so the workspace includes `proportion.tested.regardless` as a model element.
- Workspace builds from source (same pattern as current, just newer base + newer jheem_analyses)
- No jheem2 override needed (inherits base)
- Tag v2.1.0

Also fix image naming: currently `ghcr.io/ncsizemore/jheem-cdc-testing-model`, should be `ghcr.io/ncsizemore/jheem-cdc-testing` per naming convention. Update GHA workflow's `GHCR_IMAGE_NAME` and models.json together.

**Risk:** Updating jheem_analyses commit means the workspace is built from newer research code. The specification changes are additive (new `proportion.tested.regardless` element, existing quantities updated to reference it). The prerun simsets (`cdc-testing-v1.0.0`) were generated externally — verify they still extract correctly with the new workspace before going live.

### Step 3: `customSimulation` config in models.json

```json
"customSimulation": {
  "simulationScript": "simple_cdc_testing.R",
  "parameters": [
    { "id": "testing_reduction", "envVar": "TESTING_REDUCTION", "label": "CDC testing reduction", "keyPrefix": "t", "default": 100, "unit": "%" },
    { "id": "proportion_tested_regardless", "envVar": "PROPORTION_TESTED", "label": "Continue testing without CDC", "keyPrefix": "p", "default": 50, "unit": "%" }
  ],
  "facets": ["none", "age", "race", "sex", "risk"],
  "statistics": ["mean.and.interval", "median.and.interval"]
}
```

Scenario key example: `t100-p50` (100% reduction, 50% tested regardless).

### Step 4: Portal route

New page at `/cdc-testing/custom`. Simpler than the state-level page — no model toggle needed.

- Reuse `CustomSimulationExplorer` component
- Locations from `cdcTestingConfig.locations`
- State geography (same as AJPH/CROI)
- Add "Custom Simulations" link to CDC Testing nav section

### Step 5: Validate end-to-end

1. Trigger custom sim from portal for a test state (e.g., AL)
2. Verify workflow completes, data lands on CloudFront
3. Verify portal renders results correctly
4. Spot-check values against Shiny app with same parameters

## Open Questions

1. ~~**Quantity name for proportion tested**~~ **RESOLVED.** The specification at current HEAD registers `proportion.tested.regardless` as a model element. The intervention effect should target this quantity. The old research script's `proportion.cdc.tests.done.regardless` is a different name used in the older intervention code (pre-specification-refactor). Use `proportion.tested.regardless`.

2. **Start year:** Research script uses `CDC.TESTING.START.YEAR` derived from `CDC.TESTING.ANCHOR.YEAR`. The workspace sets anchor year to 2025, making start year 2025.75. The Shiny app's `model_effects.R` uses `start_time + 0.25` for the loss lag. Need to verify this matches the simset calibration.

3. **Simulation time range:** Ryan White uses `start.year=2025, end.year=2035`. CDC Testing prerun scenarios may use different bounds — check the Shiny app's `intervention_adapter.R` (uses `start_year=2025, end_year=2030`).

4. **`custom_simulation.R` dispatching:** Currently the container's `custom_simulation.R` sources `simple_ryan_white.R`. It needs to dispatch based on `SIMULATION_SCRIPT` env var (set from models.json `simulationScript`). May need minor refactor.

5. **Prerun data compatibility:** After rebuilding the workspace from newer jheem_analyses, verify that the existing prerun data (`cdc-testing-v1.0.0` simsets) still extracts correctly. The specification changes are additive, so this should be fine, but worth a smoke test.

## Risk Assessment

- **Low risk:** CDC container bump to v1.3.0+. Same pattern as CROI/AJPH, both succeeded.
- **Low risk:** Portal route. Same `CustomSimulationExplorer` component, just different config.
- **Medium risk:** New simulation script. Different intervention pattern means new R code to test. Mitigated by following the proven research script patterns closely.
- **Low risk:** Workspace compatibility. CDC Testing inherits base jheem2 (no version split like MSA).

## Estimated Scope

~2-3 sessions. The infrastructure is built — this is primarily a new R simulation script, a container bump, a models.json entry, and a thin route page.
