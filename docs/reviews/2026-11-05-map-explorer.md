# Geographic explorer performance and interaction review

## Finding and change

The explorer needs a national study selector: 31 metropolitan areas, or the 11/30/18 states in the configured state studies. The existing Mapbox Light basemap required a WebGL runtime, workers, style metadata, tiles, sprites and font resources. Fast location controls did not mean the geographic view was ready. The state hover handler also updated React on every pointer movement and rebuilt map-layer properties.

The city and state explorers now share a lazy SVG geographic selector built with the existing React Simple Maps dependency. Its prepared paths come from the portal's existing `public/us-states.json`. It makes no map-provider requests and does not download or project the full GeoJSON at runtime. Pan, wheel/pinch zoom, explicit zoom/reset controls, location previews, direct selectors and retained position on return from results remain available. Pan updates the group transform without redrawing the memoized feature tree; previews update on entering or focusing a location, rather than on every pointer movement.

The view deliberately focuses on the contiguous United States and regional study selection. It omits the prior basemap's international and street-level context. All currently modeled locations remain covered; a test fails if a future configured location is outside the prepared geography. This is a scoped renderer change, not a rewrite of result delivery or the analysis workspace.

## Presentation and scientific boundaries

The national view uses quiet boundaries and state labels, with the modeled locations as its primary content. Marker sizes remain readable on small screens and while zooming. The map fits below expanded mobile controls. City suppression thresholds and marker-size calculations, and state impact values and color scales, are unchanged. Legends now explain the city colors and marker sizes, and identify states outside the selected study.

Native focusable geographic controls open the same results as the direct selectors. Previews work on keyboard focus, use actual measured card dimensions to stay below the masthead and within the viewport, and use readable text colors independently of the map fill. A legacy state-summary formatting bug is corrected: viral suppression is shown as a percentage. Neither its value nor the source summary is modified.

The preparation script retains all polygons and rings for the 49 contiguous-US/DC features. It simplifies display coordinates at a tolerance of 0.12 units in a 1,000-unit-wide view and rounds them to one decimal: 39,992 source vertices become 9,231 display vertices. The generated JSON is 108,795 bytes, or 37,813 bytes with local gzip. This is cartographic simplification only. The original boundary source, all scientific results, summary files, release bindings and model configuration are unchanged. Generation is deterministic and checked against the committed source asset in the unit suite.

## Controlled comparison

Released baseline: `713881a9be6b0871668c184662206c8cf0471454` (PR 70). Local production builds, Chrome at 1280 × 800, 4× CPU throttling, three fresh browser contexts per map. The browser process is reused across contexts. Both versions receive empty summary fixtures after a fixed 150 ms; the comparison measures geographic rendering, not new estimate downloads.

The baseline replays one locally captured set of Mapbox assets, without added network latency. Session-only URL parameters are normalized; replay fails on any unmatched asset. Both baseline screenshots were inspected to confirm that tiles, labels and state boundaries actually rendered. An earlier replay that omitted tiles because of session parameters was discarded. No figures from that failed comparison are used here.

Baseline completion is Mapbox's first `idle` event after fitting the viewport. Candidate completion is the frame after the SVG geography has rendered and its responsive dimensions have been measured. These represent completion of their respective geographic views, not the same pixels or first possible land outline. They are controlled diagnostics, not field percentiles, real-phone timings or a guarantee under a particular network connection.

| Entry | Baseline controls | SVG controls | Baseline geographic view | SVG geographic view |
| --- | ---: | ---: | ---: | ---: |
| City explorer | 594 ms | 611 ms | 1,936 ms | 864 ms |
| State explorer | 625 ms | 609 ms | 2,018 ms | 855 ms |

The completed geographic views improve about 55–58%; selector readiness is effectively unchanged. The final candidate samples are 944/864/816 ms for cities and 871/852/855 ms for states. Earlier live-provider captures took roughly 3.7–3.8 seconds under the same CPU constraint, but are not used to calculate the improvement because their network conditions differ.

Reproduce the candidate measurement after a production build:

```sh
MAP_CPU=4 MAP_RUNS=3 MAP_REPORT=/tmp/map-timing npx playwright test --config=playwright.performance.config.ts map-rendering
node --import tsx scripts/prepare-explorer-geography.ts --check
```

The committed benchmark blocks external requests. `MAP_VISUAL_DATA` can point to locally cached `city.json` and `state.json` summaries for visual checks; those runs also check that real preview cards remain inside the viewport and below the masthead. Baseline captures and temporary timing instrumentation remain local diagnostic artifacts, not production code. Mapbox's [performance guidance](https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/) provides background on the costs of sources, layers and vertices; the decision to replace this particular overview follows from the local measurements and its limited geographic scope.

## Verification and cost

The 67 unit/contract checks pass, including deterministic geography preparation, complete configured-location coverage, ring preservation and legacy percentage formatting. The existing 51 browser cases and five new map cases have passed. The final map-focused run covers ten cases: city drag without accidental selection, keyboard previews, all state studies, touch zoom, fixed marker sizes, responsive controls, retained viewport/history and navigation with indefinitely stalled summaries. Build, type checking, lint, pinned-configuration verification and the production dependency audit pass. CI also runs the new map cases against its production build.

No dependencies or infrastructure were added. There are no S3 writes, bucket inventories, invalidations, result publications, simulations, billing API queries or emails. The only public scientific-data downloads for this audit were one city summary (40,653 bytes) and one state summary (14,509 bytes), then reused locally. Two bounded baseline map loads captured the existing provider assets; all repeated comparisons use local replay. Normal map entry still reads its existing summary; direct result links retain their existing request counts and avoid the map entirely. These changes remove Mapbox use from the explorers but do not claim to verify the whole AWS bill.
