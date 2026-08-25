# Ryan White Calibration `v1.0.0-rc.2` Independent Review

**Review date:** 2026-08-25  
**Decision:** Accepted as the source candidate for finalization; not approved for publication under
its current release identity or archive repository.

## Candidate identity

| Field | Value |
| --- | --- |
| Candidate | `ryan-white-calibration-v1.0.0-rc.2` |
| Production run | [`32667856224`](https://github.com/CIPHER-Epi/jheem-data-managers/actions/runs/32667856224), attempt 2 |
| Manager-repository revision | `afa743d54aea1f7d02a724829a65765f8769b867` |
| Exporter revision | `d11c5ae6f945dbc12466615d3fa15a4131edb3bb` |
| Retained Actions artifact | [`9545743597`](https://github.com/CIPHER-Epi/jheem-data-managers/actions/runs/32667856224/artifacts/9545743597) |
| Actions artifact digest | `sha256:fc3d3bf000917d788957a83195cc799892ad73a975eeb3f69093b9e17a3c17da` |
| Actions artifact size | 12,355,293 bytes |
| Candidate retention | Through 2026-09-24; individual shard artifacts expire approximately 2026-09-06 through 2026-09-08 |

The first attempt failed only while GitHub Releases was transferring the California AJPH source
asset. GitHub reported a connection reset; every other shard completed. Rerunning failed jobs
repeated only AJPH shard 01, which passed unchanged, and the downstream assembly then passed. This
is evidence for a missing transfer retry, not a scientific or deterministic-output failure.

## Independent checks

The review downloaded only the retained derived candidate and the earlier retained representative
derived artifacts. It did not download a manager binary, model workspace, or raw posterior asset.
The checks were performed outside the producing workflow and did not treat the workflow's green
status as sufficient evidence.

| Gate | Result |
| --- | --- |
| Outer and per-product checksums | Passed. `SHA256SUMS` verified the catalog and all three bundles; every inner checksum verified its manifest, indexes, coverage report, and location artifacts. |
| Archive safety and inventory | Passed. MSA contains 66 files, AJPH 26, and CROI 64, exactly matching four product metadata files plus two JSON artifacts per location. No absolute/traversing paths, manager files, posterior archives, R objects, CSV files, or unexpected members were present. |
| Pinned source identity | Passed. Direct byte-stream hashes at exporter revision `d11c5ae6` match the recorded artifact schema, exporter, target registry, coverage scanner, and all three coverage locks. |
| JSON Schema | Passed. The catalog, all three manifests, and all 144 artifacts validate against the pinned JSON Schema 2020-12 contracts. |
| Product/location coverage | Passed. The committed inventory and candidate agree exactly on 31 MSA, 11 AJPH, and 30 CROI locations and both stages for every location. No location or stage is missing or extra. |
| Provenance contract | Passed. Every artifact matches its model, portal model, location, stage, immutable runtime-image digest, simulation release/asset digest, manager release/digest, registry digest, exporter digest, and coverage-lock digest. |
| Scientific/numeric invariants | Passed. All numeric values are finite; all 187,181 posterior summary points have ordered `q025 <= q250 <= q500 <= q750 <= q975`; all 65,467 observations identify at least one public source; and recomputed coverage summaries match the bundled reports exactly. |
| Target contract | Passed. The candidate contains 864 target records and 2,910 panels. The excluded legacy ADAP target is absent. Twelve target/location occurrences are explicitly unavailable according to the locked coverage evidence, and the registered sex/risk target is explicitly `not_exported` in each of the 72 Ryan White-stage artifacts rather than silently omitted. |
| Representative regression | Passed. MSA Atlanta and AJPH/CROI Alabama artifacts for both stages have identical scientific, panel, posterior-summary, and observation payloads to acceptance run `31846981011`. The only differences are the expected coverage source, target availability state, and updated exporter digest added by the coverage-contract revision. |
| Controlled-input/privacy boundary | Passed. No credentials, local runner paths, SharePoint/OneDrive links, private delivery URLs, raw draws, manager payloads, or workspace payloads were found. Serialized workspace and manager filenames occur only as digest-bound provenance strings. |

The independently verified release-level hashes are:

```text
eba73cef7cf6431317d379c421c876cf917a01325c5ac081994d857226e6fe81  catalog.json
ccfcd621e36d519bfa434b5c3e2353921749cd34fcdf0d7e73b4a22dc5fa9cb1  ryan-white-ajph-ryan-white-calibration-v1.0.0-rc.2.tar.gz
dd689d0e54d2badb09ec7d328a1dfd58ce9cbb91d2483e9e397b8bc77b80e91f  ryan-white-croi-ryan-white-calibration-v1.0.0-rc.2.tar.gz
b77feb1330014bc6bffcc2e16632f2047fc8c3d0c273877e3533dd915d8d8842  ryan-white-msa-ryan-white-calibration-v1.0.0-rc.2.tar.gz
```

## Review boundary and required finalization

The candidate is accepted as the scientific and provenance source for the final release. It is not
itself the final public release for two explicit reasons:

1. the catalog and all manifests embed the `ryan-white-calibration-v1.0.0-rc.2` identity; and
2. the catalog names `ncsizemore/jheem-simulations`, while the selected long-term archive should be
   the organization-owned public `CIPHER-Epi/jheem-simulations` repository.

Do not rename the candidate or publish it under a contradictory tag. The existing public archive
was transferred intact to `CIPHER-Epi/jheem-simulations` on 2026-08-25 with its repository ID,
release IDs, asset IDs, sizes, and digests preserved. Update the committed publication registry and
run an assembly-only finalization from the retained, checksum-verified shard artifacts. The
resulting `ryan-white-calibration-v1.0.0` package
must repeat the release/manifest/schema/checksum gates and demonstrate that stage artifact content
is unchanged except for deliberately regenerated release metadata.

Publication remains a separate approval gate. The public release must include source/citation and
reuse metadata appropriate to the derived outputs; manager binaries and raw posterior assets remain
private. After publication, promote the exact approved release bytes to a new immutable
S3/CloudFront prefix and bind the backend only to that manifest URL and digest.

## Finalization outcome — 2026-08-25

The organization archive transfer and registry migration completed, and assembly-only
[run `32897836534`](https://github.com/CIPHER-Epi/jheem-data-managers/actions/runs/32897836534)
produced the private `ryan-white-calibration-v1.0.0` package as artifact `9581909653`. The run
locked production run `32667856224`, attempt 2, all 16 retained shards, RC2 artifact `9545743597`,
and the reviewed exporter/schema identities. It proved all 144 scientific payloads byte-identical
to RC2 while regenerating only the final release and organization archive metadata.

A fresh download passed all outer checksums, safe archive-member checks, manifest identities, and
31/11/30 location coverage. The final hashes are:

```text
8c2ed45f7e90e3abbcb17eaa8e878f94b99cdc915a85fdb08789835d7d955438  catalog.json
1e10cc920e156c21c0461a1deb2e4a6b68cc3046fde207db559867c817eb58a4  ryan-white-ajph-ryan-white-calibration-v1.0.0.tar.gz
805378bedc59abdaecc67e36192fd49ecce3521c2014973840024aafb2818ca7  ryan-white-croi-ryan-white-calibration-v1.0.0.tar.gz
57e446c6361306efe61a3b73b1972ada0ad2ca680b2f2d4ed056d82be6b9a31a  ryan-white-msa-ryan-white-calibration-v1.0.0.tar.gz
```

Final assembly is complete. Public release creation remains explicitly unperformed and gated on
reviewed citation/reuse metadata and publication approval.

## Bounded follow-up

- Add retry with backoff and partial-download cleanup around GitHub release-asset transfers before
  the next exhaustive source-data run. This is operational hardening and does not invalidate the
  accepted candidate.
- **Completed:** final assembly reused the retained shards in run `32897836534`; no repeat of the
  roughly 142 GB source-data transfer was required.
- Preserve the candidate artifact and this review record until the final GitHub Release,
  S3/CloudFront promotion, and backend digest pin have all been verified.
