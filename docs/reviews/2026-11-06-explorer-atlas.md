# Explorer atlas presentation

## Outcome

The fast SVG geographic selector now has a deliberate research-atlas composition:
shared study column, editorial headings, aligned native location selectors,
explicit legends, and a larger geographic field. The desktop guide stays visible;
on phones it expands in normal scrollable content above the map. Its state and
the map position survive result navigation and viewport changes.

City markers use a sequential teal-to-navy scale. All six existing suppression
thresholds are retained and labeled with inclusive/exclusive endpoints. The
existing logarithmic 14–28px diameter calculation and its 5,000/50,000 caps are
unchanged; a size key now explains them. Missing summaries use unfilled markers.
State maps retain their eight equal-width value bins, with a quieter sequential
umber palette, labeled endpoints, and an explicit warning that the range is
study-specific. Scientific values, coverage, scenario definitions and release
bindings are unchanged. The city map states the summary year; previews distinguish
current modeled metrics from projected increases if services end. City suppression
previews retain the source decimal so rounding cannot suggest a different legend bin.

Direct labels are selected for orientation, then placed to avoid markers, other
city labels and the initial map edges. Smaller screens show fewer labels; zoom
reveals more. Full metropolitan names remain in the selector and previews. Country
and ocean labels disappear when too small to read. Pan, zoom, keyboard selection,
touch zoom, and restrained focus/hover outlines remain available. No entrance
animation delays the map. The secondary model-fit link no longer prefetches on
map entry.

## Cartography and source

The contiguous-US map now uses Albers equal-area with standard parallels 29.5°
and 45.5°, central meridian −96°, and latitude of origin 38°. The local forward
projection agrees with D3's independent implementation for every cataloged city;
round-trip and coverage checks remain in place. Both study boundaries and markers
use this projection. All source jurisdiction polygons and interior rings remain.

Decorative neighboring land and five Great Lakes come from Natural Earth's 1:50m
country/lake data. Natural Earth explicitly places its datasets in the
[public domain](https://www.naturalearthdata.com/about/terms-of-use/).
The curated source extract in `scripts/data/explorer-context.geojson` retains
source URLs, original download SHA-256 digests, download date and clipping bounds
(−130° to −60°, 19° to 55°). Canada, Mexico, Cuba and the Bahamas are clipped to
those bounds; crossing edges are linearly interpolated. Only decorative context
uses this extract. The existing `public/us-states.json` remains the authority for
selectable jurisdictions and is unchanged.

`node --import tsx scripts/prepare-explorer-geography.ts` reproducibly prepares
both bundled path assets. Study boundaries use a 0.12-unit simplification tolerance;
context uses 0.3 units, in the 1,000-unit-wide view. The state asset is 106,741 bytes
(36,756 gzip); context is 29,770 bytes (11,913 gzip). Combined local gzip is 48,669
bytes versus 37,813 for the prior geography: a net addition of 10,856 bytes.
This is cartographic display preparation, not a scientific-data transformation.

## Performance and cost

Local production builds, 1280 × 800 Chrome, 4× CPU throttling, fresh contexts with
a reused browser process, and identical empty summary fixtures delayed by 150 ms.
All external requests are blocked. Before: deployed PR71 build, three samples;
after: final candidate, five samples. Readiness is the same frame after prepared
SVG geography and responsive measurement. These small sequential local samples
support retaining performance, not a field speedup or percentile claim.

| Median | Before | After |
| --- | ---: | ---: |
| City selector | 700 ms | 596 ms |
| City geographic view | 992 ms | 867 ms |
| State selector | 724 ms | 628 ms |
| State geographic view | 1,014 ms | 893 ms |

An intermediate run was noisier (city 1,047 ms; state 1,195 ms), reinforcing the
limits of these short local comparisons. The final run follows disabling the
secondary model-fit prefetch. No single change is credited with the timing delta.

No mapping service, dependency or infrastructure was added. Map runtime still
makes no map-provider or boundary-data requests. Existing scientific summaries
are fetched as before; all repeated visual/functional checks use cached public
data or fixtures. Natural Earth source files were downloaded once from GitHub.
No S3 uploads, inventories, invalidations, data republishing, simulations, billing
queries or emails are part of this pass. No claim about total AWS billing follows.

## Verification

- 69 unit/contract checks, including reproducibility, geographic coverage, source
  ring retention, independent projection agreement and complete lake context.
- Map journeys cover all state studies, keyboard previews/selection, pan without
  accidental navigation, touch zoom, fixed marker sizes, labels at 320/768/1280px,
  guide/viewport retention, and selection with indefinitely stalled summaries.
- Production views inspected with cached actual city and state summaries at
  1280, 390 and 320px, including previews and expanded guides.
- Production build, type checking, lint, pinned config and dependency audit.

This is a focused explorer pass. It does not redesign the other study overviews,
CIPHER, chart figures or custom simulation workflows.
