# On-demand prerun results

The portal reads a pinned location index and one selected plot. Default result links start those two requests together; other selections resolve their plot reference from the index. It no longer downloads the entire location bundle for a prerun analysis. This applies to all 90 configured locations across Ryan White MSA, AJPH, CROI, and CDC testing. Custom simulation delivery and calibration use their existing contracts.

## Contract and scientific equivalence

`src/config/result-data-releases.json` pins every model/location index by decoded byte count and SHA-256. Each index preserves the original location metadata and identifies its original source URL, decoded byte count, and SHA-256. It lists every scenario/outcome/summary/breakdown, the exact plot object reference, and the breakdown's selectability using the same dimensional checks as the interface.

Both index and plot filenames contain their content hash:

- `results-v1/manifests/<sha256>.json`
- `results-v1/plots/<sha256>.json`

Paths are relative to each model's existing CloudFront data URL. Files are gzip encoded at rest, served as `application/json` with `Content-Encoding: gzip` and `Cache-Control: public,max-age=31536000,immutable`. Hashes and sizes describe decoded UTF-8 JSON, not the gzip stream.

`prepare-result-data.ts` does not recalculate or round results. It preserves each complete plot object, including all values, bounds, observations, metadata and row ordering; decompresses each staged artifact; and asserts deep equality with its source object. It rejects inconsistent location/selection identities, invalid indexes, oversize chunks, and immutable filename collisions. Non-selectable legacy combinations remain in the archive, with their original data unchanged.

The browser checks index/plot hashes, exact decoded sizes, model/location/selection identity and allowed paths before rendering. A broken chunk produces a retryable error; it does not silently fall back to the large mutable source bundle. New source generation does not change an existing deployed portal: promoting a data refresh requires publishing and validating artifacts, then updating the pinned binding in a reviewed portal release.

## Loading and retention

Previously viewed results are resolved from the verified in-memory cache during rendering, without an intermediate loading state. Uncached changes retain one complete displayed-result snapshot: plot/table, title, definition, units, location, scenario, timeline, summary and population breakdown. Requested controls are separate from that snapshot. A visible “Showing…” caption identifies the displayed result, including on mobile. The replacement commits only when its current request is verified. A short status appears after 150 ms for longer updates; its reserved line does not move the plot. A failed request leaves the previous result in place with a retry action.

Requests are cancelled on selection/model/location changes, timed out after 30 seconds, and ignored if they finish after supersession. Outcome/scenario/summary/breakdown controls are disabled while a new location index loads, so its choices are never validated against the previous location's catalogue. Location navigation remains usable. Exports and share buttons are disabled during pending/failed requests because the URL already represents the requested selection. Custom simulations continue to use the same result renderer with their existing delivery contract.

Direct result links wait for URL hydration before mounting either view, and never mount the map or fetch summaries/geometry. Mapbox is a separate lazy module. After an explicit map visit, the mounted map retains its layout, viewport and controls while hidden and inert behind results, avoiding repeated map requests on return.

`src/config/result-entry-plots.json` contains only default plot references derived from the pinned indexes. When the requested selection exactly matches that entry and its index hash matches the current release binding, the existing plot starts alongside the index. Neither is displayed before normal verification. A different selection or stale pointer uses index-then-plot loading. This eliminates a sequential round trip for default views without downloading any other outcomes.

A recency cache retains at most 64 plots and 16 MiB of decoded plot payloads, plus eight indexes and 4 MiB of decoded index payloads. These are retained serialized-byte budgets, not measured JavaScript heap usage. The currently rendered/transformed plot has its own working memory; during replacement it retains the last complete display until the next one commits. The largest plot in this release is about 5.3 MB decoded; streaming reads reject responses that exceed the expected size before JSON parsing. The location index is validated once per payload/model/location rather than on every outcome change. No predictive prefetching downloads unused outcomes. A cache miss may still use the browser HTTP cache; visible loading does not necessarily imply another origin request.

## Releasing or refreshing data

Use a local directory of the exact existing published location files, compressed or uncompressed. Keep the source snapshot while preparing the release. One model at a time:

```sh
node --import tsx scripts/prepare-result-data.ts \
  --model ryan-white \
  --source generated-data/result-chunks/source/ryan-white \
  --output generated-data/result-chunks/staged/ryan-white
```

The output contains compressed `results-v1/` artifacts, `binding.json`, and a per-location `verification.json`. All configured locations must be present. The source URL is the configured original bundle URL. This is a delivery snapshot, not a claim to recover the original simulation's complete historical provenance.

### Cost preflight before publishing

The operating target is $0. Publishing data is a separate operation from deploying the portal: **do not republish artifacts for a UI or caching change**. Reuse the local source snapshot, staged files, and test fixtures during development. S3 uploads and storage can cost money even when the site has no visitors.

Run the offline estimate before every publication. Use the saved, complete inventory for the exact destination prefix when available:

```sh
node scripts/estimate-result-release-cost.mjs \
  --staged generated-data/result-chunks/staged/ryan-white \
  --prefix portal/ryan-white/results-v1/ \
  --inventory generated-data/result-chunks/msa-inventory.json
```

Without `--inventory`, the estimate conservatively treats every staged object as new. The tool makes no network calls and writes no files. It reports new PUT requests, additional compressed storage, and gross US East S3 Standard cost before credits. Rates were checked on October 26, 2026: $0.005 per 1,000 PUT requests and $0.023 per GiB-month. Recheck [AWS pricing](https://aws.amazon.com/s3/pricing/) before a later release; account allowances and discounts must be established separately. Include the estimate in the release review, including any expected recurring charge, and resolve a departure from the $0 target before upload.

An inventory match means an existing content-addressed key with the same stored size; it does **not** prove remote content integrity or correct headers. The preparer and delivery verifier still provide those checks. A different size at an existing key is an immutable-object conflict: stop and investigate rather than overwriting it. The tool rejects truncated inventories, but cannot establish the freshness of an old snapshot. Refresh an inventory once when needed using the existing `list-objects-v2` command below with automatic pagination enabled (no `--max-items` or `--no-paginate`). LIST operations themselves have request costs; avoid repeated full inventories during development.

The estimate excludes existing storage, retries, verification requests, data transfer, other services, taxes and credits. It is not a spending cap or an estimate of the whole AWS bill. Do not repeatedly query Cost Explorer to monitor tiny charges: its API is charged per request. Existing AWS budget alerts provide detection; they do not stop spending.

### Upload and verify

Upload only the `results-v1/` subtree to the matching model prefix, without deleting existing releases. After the preflight has found no existing-key size conflicts, inspect a dry run with `--size-only`; otherwise recreated local file timestamps can cause unchanged objects to be uploaded again. The size-only comparison is appropriate for these prepared immutable keys, not arbitrary mutable source files:

```sh
aws s3 sync generated-data/result-chunks/staged/ryan-white/results-v1/ \
  s3://jheem-data-production/portal/ryan-white/results-v1/ \
  --size-only --dryrun \
  --content-type application/json --content-encoding gzip \
  --cache-control 'public,max-age=31536000,immutable'
```

The AWS dry run still lists remote objects and can incur LIST request costs, but performs no uploads. Check that the planned uploads match the estimate. Then publish with the same comparison; keep the existing metadata on skipped objects and never use this step to repair a conflicting immutable object:

```sh
aws s3 sync generated-data/result-chunks/staged/ryan-white/results-v1/ \
  s3://jheem-data-production/portal/ryan-white/results-v1/ \
  --size-only --content-type application/json --content-encoding gzip \
  --cache-control 'public,max-age=31536000,immutable' --only-show-errors
```

Use each model's configured data URL/S3 prefix. AJPH uses `ryan-white-state`; CROI uses `ryan-white-state-croi`. Merge the complete staged bindings into `src/config/result-data-releases.json`, retaining the unchanged models. The regression suite rejects missing or extra configured locations and invalid artifact references. After changing the binding, regenerate the default entry pointers from the same local staged indexes (no downloads or uploads):

```sh
node --import tsx scripts/prepare-result-entry-plots.ts generated-data/result-chunks/staged
```

The generator verifies each staged index against its pinned hash and size before extracting the default reference. Commit `src/config/result-entry-plots.json` with the changed binding and fixtures. If these pointers accidentally lag a deployed binding, the consumer safely falls back to sequential loading.

After upload, export an inventory and verify delivery before merging the portal change:

```sh
aws s3api list-objects-v2 --bucket jheem-data-production \
  --prefix portal/ryan-white/results-v1/ > generated-data/result-chunks/msa-inventory.json
node --import tsx scripts/verify-result-delivery.ts --model ryan-white \
  --staged generated-data/result-chunks/staged/ryan-white \
  --inventory generated-data/result-chunks/msa-inventory.json
```

The verifier compares every staged object's stored size to S3 and fetches every location index and default plot over CloudFront, checking content hashes, identities, CORS, gzip and immutable caching. Browser regressions cover additional selections, actual exports, delayed responses, retry, URL/history, mobile, and all model families. Review the numerical-equivalence report and refresh affected exact-source browser fixtures when pinning a new release.

The original aggregate files remain untouched for rollback and existing consumers. Roll back the portal deployment to revert the consumer. New artifacts can coexist with old releases and need no cache invalidation. This adds no runtime server, but additional storage and requests on the existing S3/CloudFront account can incur charges. Review retained releases deliberately; do not automatically expire or delete objects referenced by a deployed portal or retained for rollback.

### Initial publication cost review

The saved October 26 inventories contain 104,394 objects (104,304 plots and 90 indexes), totaling 2,012,811,835 compressed bytes (1.875 GiB). At the reference rates, one successful upload per object represents **$0.52197 in PUT requests**, plus **$0.04312 per full month** of incremental storage before credits. Ordinary portal deployments incur neither another full upload nor another copy of that storage.

Check account billing and alert delivery separately from the release estimate. Reporting can lag, and forecasts or previous $0 bills are not guarantees of future free usage.

## Initial release evidence

`result-data-verification.json` records the source hashes and sizes for all 90 locations and 104,304 plot objects checked for exact equality.

For Baltimore's default incidence view:

| Payload | Previous bundle | Index + selected plot |
| --- | ---: | ---: |
| Gzip file bytes | 16,159,642 | 49,297 |
| Decoded JSON bytes | 218,449,060 | 220,081 |

This is a 99.69% reduction in compressed result-data bytes and a 99.90% reduction in JSON bytes parsed for the initial selection. It excludes page JavaScript, map data, HTTP headers and other assets. It is not a claim of an equivalent percentage improvement in total page load time or a mobile-device heap benchmark.
