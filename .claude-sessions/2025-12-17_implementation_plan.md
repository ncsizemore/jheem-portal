# Native Plotting Implementation Plan

**Date**: 2025-12-17
**Status**: Ready for implementation
**Based on**: Reassessment document recommendations (Option B)

---

## Summary

After investigation revealed fundamental issues with direct data extraction (proportion aggregation, ontology mapping), we're pivoting to **leverage simplot's `prepare_plot_local()` function** to extract data frames instead of rendered plots.

This approach:
- Guarantees parity with Shiny app (uses exact same processing logic)
- Avoids reimplementing complex aggregation/ontology mapping
- Can ship quickly by modifying existing batch_plot_generator.R

---

## Technical Analysis

### prepare_plot_local() Return Structure

```r
list(
  df.sim = data.frame(
    year,              # numeric
    value,             # numeric (already aggregated correctly)
    value.lower,       # numeric (for mean.and.interval/median.and.interval)
    value.upper,       # numeric (for mean.and.interval/median.and.interval)
    simset,            # factor: "Baseline" or intervention label
    outcome,           # character: outcome ID
    outcome.display.name,  # character: human-readable name
    stratum,           # character: "" if no split.by
    facet.by1,         # character: if facet.by provided (e.g., age value)
    sim,               # factor: simulation number (for individual.simulation)
    groupid,           # character: unique identifier for line grouping
    linewidth,         # numeric: for styling
    alpha              # numeric: for styling
  ),

  df.truth = data.frame(
    year,              # numeric
    value,             # numeric
    source,            # character: data source name
    location,          # character: location code
    outcome,           # character: outcome ID
    outcome.display.name,  # character
    stratum,           # character
    facet.by1,         # character: if faceted
    data_url           # character: URL to source (optional)
  ),

  details = list(
    y.label,           # character: axis label
    plot.title,        # character: plot title
    outcome.metadata.list,  # list: metadata per outcome
    source.metadata.list,   # list: metadata per data source
    sim.labels.list    # list: labels for simsets
  )
)
```

### Key Insight

The data frames are **already correctly processed**:
- Proportions computed at the right aggregation level (by `keep.dimensions`)
- Ontology mappings applied via `get.ontology.mapping()`
- Percent conversions done (`display.as.percent * 100`)
- Multiple sources preserved in df.truth

---

## Implementation Plan

### Phase 1: Modify batch_plot_generator.R

Add `--output-mode` flag with options:
- `plot` (default): Current behavior - generate Plotly JSON
- `data`: New mode - output df.sim and df.truth as JSON

#### Changes to generate_single_plot()

```r
generate_single_plot <- function(..., output_mode = "plot") {
  # ... existing setup code ...

  # Get prepared data (this already exists in the flow)
  prepared_data <- prepare_plot_local(
    simset.list = sim_list_or_simset,
    outcomes = outcome,
    facet.by = facet_spec,
    data.manager = data_manager_to_use,
    summary.type = statistic,
    ...
  )

  if (output_mode == "data") {
    # NEW: Return data frames instead of rendering plot
    return(list(
      success = TRUE,
      data = list(
        sim = prepared_data$df.sim,
        obs = prepared_data$df.truth,
        metadata = list(
          y_label = prepared_data$details$y.label,
          plot_title = prepared_data$details$plot.title,
          outcome_metadata = prepared_data$details$outcome.metadata.list[[outcome]]
        )
      )
    ))
  }

  # ... existing plot rendering code ...
}
```

### Phase 2: Create Data Aggregation Script

New script: `aggregate_city_data.R`

```r
# Takes individual JSON chunks from batch generator
# Aggregates into single per-city JSON file

aggregate_city_data <- function(input_dir, city, output_file) {
  result <- list(
    metadata = list(
      city = city,
      city_label = get.location.name(city),
      generation_timestamp = Sys.time()
    ),
    data = list()
  )

  # Walk through scenario/outcome/statistic/facet structure
  for (scenario_dir in list.dirs(file.path(input_dir, city))) {
    scenario <- basename(scenario_dir)
    result$data[[scenario]] <- list()

    for (json_file in list.files(scenario_dir, pattern = "\\.json$")) {
      # Parse filename: {outcome}_{statistic}_{facet}.json
      parts <- parse_filename(json_file)
      chunk <- fromJSON(json_file)

      # Nest into structure
      result$data[[scenario]][[parts$outcome]][[parts$statistic]][[parts$facet]] <- chunk
    }
  }

  # Write aggregated file
  write_json(result, output_file, auto_unbox = TRUE)
}
```

### Phase 3: Output JSON Structure

Per-city file structure:

```json
{
  "metadata": {
    "city": "C.12580",
    "city_label": "Baltimore",
    "generation_timestamp": "2025-12-17T10:30:00Z",
    "outcomes": ["incidence", "prevalence", "testing", ...],
    "scenarios": ["cessation", "brief_interruption", "sustained_interruption"]
  },
  "data": {
    "cessation": {
      "incidence": {
        "mean.and.interval": {
          "none": {
            "sim": [
              {"year": 2010, "value": 500, "lower": 450, "upper": 550, "simset": "Baseline"},
              {"year": 2010, "value": 480, "lower": 430, "upper": 530, "simset": "Cessation"},
              ...
            ],
            "obs": [
              {"year": 2010, "value": 495, "source": "CDC HIV Surveillance"},
              ...
            ],
            "metadata": {
              "y_label": "Number of new diagnoses",
              "display_as_percent": false
            }
          },
          "age": {
            "sim": [...],  // Faceted by age
            "obs": [...]
          },
          "sex": { ... },
          "race": { ... }
        },
        "median.and.interval": { ... },
        "individual.simulation": { ... }
      },
      "prevalence": { ... },
      ...
    },
    "brief_interruption": { ... },
    "sustained_interruption": { ... }
  }
}
```

### Phase 4: Frontend Types

Update `src/types/native-plotting.ts`:

```typescript
// Per-combination data structure (what prepare_plot_local returns)
interface SimDataPoint {
  year: number;
  value: number;
  lower?: number;  // For interval statistics
  upper?: number;
  simset: string;  // "Baseline" or intervention name
  facet_by1?: string;  // If faceted
}

interface ObsDataPoint {
  year: number;
  value: number;
  source: string;
  url?: string;
  facet_by1?: string;
}

interface PlotData {
  sim: SimDataPoint[];
  obs: ObsDataPoint[];
  metadata: {
    y_label: string;
    display_as_percent: boolean;
  };
}

// Full city data structure
interface CityDataV2 {
  metadata: {
    city: string;
    city_label: string;
    generation_timestamp: string;
    outcomes: string[];
    scenarios: string[];
  };
  data: {
    [scenario: string]: {
      [outcome: string]: {
        [statistic: string]: {  // "mean.and.interval" | "median.and.interval" | "individual.simulation"
          [facet: string]: PlotData;  // "none" | "age" | "sex" | "race"
        };
      };
    };
  };
}
```

### Phase 5: Frontend Component

```typescript
// src/components/NativeSimulationChartV2.tsx
interface Props {
  cityData: CityDataV2;
  scenario: string;
  outcome: string;
  statistic: StatisticType;
  facetBy: FacetDimension;
  showBaseline: boolean;
  showObservations: boolean;
  showConfidenceInterval: boolean;
}

export function NativeSimulationChartV2({ cityData, scenario, outcome, statistic, facetBy, ...options }: Props) {
  // Data is ALREADY aggregated correctly - just render
  const plotData = cityData.data[scenario]?.[outcome]?.[statistic]?.[facetBy];

  if (!plotData) {
    return <div>No data available</div>;
  }

  // Separate baseline and intervention series
  const baselineSeries = plotData.sim.filter(d => d.simset === "Baseline");
  const interventionSeries = plotData.sim.filter(d => d.simset !== "Baseline");

  return (
    <ResponsiveContainer>
      <ComposedChart>
        {/* Confidence interval area */}
        {options.showConfidenceInterval && (
          <Area dataKey="value" ... />
        )}

        {/* Baseline line */}
        {options.showBaseline && (
          <Line data={baselineSeries} ... />
        )}

        {/* Intervention line */}
        <Line data={interventionSeries} ... />

        {/* Observation points */}
        {options.showObservations && (
          <Scatter data={plotData.obs} ... />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

---

## Estimated Call Count

| Dimension | Values |
|-----------|--------|
| Cities | 32 |
| Scenarios | 3 |
| Outcomes | ~14 |
| Statistics | 3 |
| Facets | 4 (none, age, sex, race) |

**Total**: 32 × 3 × 14 × 3 × 4 = **16,128 calls**

But similar to current batch approach with ~64K when including:
- Multiple scenario labels affecting output
- All statistics generating different views

**Realistic estimate**: ~16K-64K generations, but each is **much faster** (no Plotly rendering).

---

## Output Size Estimates

| Item | Size |
|------|------|
| Single plotData chunk | ~1-5 KB |
| Per-city aggregated JSON | ~10-20 MB |
| Gzipped | ~1-3 MB |
| All 32 cities | ~32-96 MB gzipped |

Compare to current Plotly JSON approach:
- 64K files × ~20KB = ~1.3 GB
- **~14x smaller with native approach**

---

## Migration Path

1. **Add `--output-mode data` flag** to batch_plot_generator.R
2. **Test with single city** (Baltimore) - verify data matches Shiny app
3. **Create aggregation script** - merge chunks into per-city files
4. **Update frontend types** - new CityDataV2 interface
5. **Build V2 chart component** - Recharts-based, uses pre-aggregated data
6. **Generate full dataset** - all 32 cities
7. **Deploy and validate** - side-by-side with existing Plotly

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| prepare_plot_local edge cases | Using battle-tested simplot code, falls back gracefully |
| File size concerns | Gzip compression, lazy loading by scenario |
| Data format changes | Version metadata in JSON, graceful degradation |
| Performance issues | Data is pre-aggregated, minimal frontend computation |

---

## Next Steps

1. [ ] Implement `--output-mode data` in batch_plot_generator.R
2. [ ] Test single city extraction and validate against Shiny
3. [ ] Create aggregate_city_data.R script
4. [ ] Update frontend types (CityDataV2)
5. [ ] Build NativeSimulationChartV2 component
6. [ ] Run full generation for all cities
7. [ ] Deploy to S3 and update API
