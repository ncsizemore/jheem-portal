# On-demand prerun results

The portal reads a pinned location index followed by one selected plot. It no longer downloads the entire location bundle for a prerun analysis. This applies to all 90 configured locations across Ryan White MSA, AJPH, CROI, and CDC testing. Custom simulation delivery and calibration use their existing contracts.

## Contract and scientific equivalence

`src/config/result-data-releases.json` pins every model/location index by decoded byte count and SHA-256. Each index preserves the original location metadata and identifies its original source URL, decoded byte count, and SHA-256. It lists every scenario/outcome/summary/breakdown, the exact plot object reference, and the breakdown's selectability using the same dimensional checks as the interface.

Both index and plot filenames contain their content hash:

- `results-v1/manifests/<sha256>.json`
- `results-v1/plots/<sha256>.json`

Paths are relative to each model's existing CloudFront data URL. Files are gzip encoded at rest, served as `application/json` with `Content-Encoding: gzip` and `Cache-Control: public,max-age=31536000,immutable`. Hashes and sizes describe decoded UTF-8 JSON, not the gzip stream.

`prepare-result-data.ts` does not recalculate or round results. It preserves each complete plot object, including all values, bounds, observations, metadata and row ordering; decompresses each staged artifact; and asserts deep equality with its source object. It rejects inconsistent location/selection identities, invalid indexes, oversize chunks, and immutable filename collisions. Non-selectable legacy combinations remain in the archive, with their original data unchanged.

The browser checks index/plot hashes, exact decoded sizes, model/location/selection identity and allowed paths before rendering. A broken chunk produces a retryable error; it does not silently fall back to the large mutable source bundle. New source generation does not change an existing deployed portal: promoting a data refresh requires publishing and validating artifacts, then updating the pinned binding in a reviewed portal release.

## Loading and retention

Selection changes immediately hide the previous plot. Requests are cancelled on selection/model/location changes, timed out after 30 seconds, and ignored if they finish after supersession. Controls remain usable during plot loading; exports remain disabled until the selected data is ready. The location index determines available choices, so preserving a compatible breakdown does not require downloading unrelated plots.

A recency cache retains at most six plots and 16 MiB of decoded plot payloads, plus eight indexes and 4 MiB of decoded index payloads. These are retained serialized-byte budgets, not measured JavaScript heap usage. The currently rendered/transformed plot has its own working memory. The largest plot in this release is about 5.3 MB decoded; streaming reads reject responses that exceed the expected size before JSON parsing. No predictive prefetching downloads unused outcomes.

## Releasing or refreshing data

Use a local directory of the exact existing published location files, compressed or uncompressed. Keep the source snapshot while preparing the release. One model at a time:

```sh
node --import tsx scripts/prepare-result-data.ts \
  --model ryan-white \
  --source generated-data/result-chunks/source/ryan-white \
  --output generated-data/result-chunks/staged/ryan-white
```

The output contains compressed `results-v1/` artifacts, `binding.json`, and a per-location `verification.json`. All configured locations must be present. The source URL is the configured original bundle URL. This is a delivery snapshot, not a claim to recover the original simulation's complete historical provenance.

Upload only the `results-v1/` subtree to the matching model prefix, without deleting existing releases:

```sh
aws s3 sync generated-data/result-chunks/staged/ryan-white/results-v1/ \
  s3://jheem-data-production/portal/ryan-white/results-v1/ \
  --content-type application/json --content-encoding gzip \
  --cache-control 'public,max-age=31536000,immutable' --only-show-errors
```

Use each model's configured data URL/S3 prefix. AJPH uses `ryan-white-state`; CROI uses `ryan-white-state-croi`. Merge the complete staged bindings into `src/config/result-data-releases.json`, retaining the unchanged models. The regression suite rejects missing or extra configured locations and invalid artifact references.

After upload, export an inventory and verify delivery before merging the portal change:

```sh
aws s3api list-objects-v2 --bucket jheem-data-production \
  --prefix portal/ryan-white/results-v1/ > generated-data/result-chunks/msa-inventory.json
node --import tsx scripts/verify-result-delivery.ts --model ryan-white \
  --staged generated-data/result-chunks/staged/ryan-white \
  --inventory generated-data/result-chunks/msa-inventory.json
```

The verifier compares every staged object's stored size to S3 and fetches every location index and default plot over CloudFront, checking content hashes, identities, CORS, gzip and immutable caching. Browser regressions cover additional selections, actual exports, delayed responses, retry, URL/history, mobile, and all model families. Review the numerical-equivalence report and refresh affected exact-source browser fixtures when pinning a new release.

The original aggregate files remain untouched for rollback and existing consumers. Roll back the portal deployment to revert the consumer. New artifacts can coexist with old releases and need no cache invalidation. There is no new runtime server or paid service; storage and request usage remain on the existing S3/CloudFront account.

## Initial release evidence

`result-data-verification.json` records the source hashes and sizes for all 90 locations and 104,304 plot objects checked for exact equality.

For Baltimore's default incidence view:

| Payload | Previous bundle | Index + selected plot |
| --- | ---: | ---: |
| Gzip file bytes | 16,159,642 | 49,297 |
| Decoded JSON bytes | 218,449,060 | 220,081 |

This is a 99.69% reduction in compressed result-data bytes and a 99.90% reduction in JSON bytes parsed for the initial selection. It excludes page JavaScript, map data, HTTP headers and other assets. It is not a claim of an equivalent percentage improvement in total page load time or a mobile-device heap benchmark.
