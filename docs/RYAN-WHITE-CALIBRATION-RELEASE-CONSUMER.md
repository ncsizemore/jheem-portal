# Ryan White Calibration Release Consumer

The portal consumes Ryan White calibration artifacts from one reviewed, immutable public release:

- repository: `CIPHER-Epi/jheem-simulations`;
- tag: `ryan-white-calibration-v1.0.0`;
- release ID: `383350377`; and
- tag commit: `af8d3fd12a193c5947b01c203792df89fdacc4d3`.

The complete machine-readable pin, including the exact name, byte length, and SHA-256 digest of
every release asset, is in `config/calibration-release-source.json`. Changing any part of that
identity is a reviewed source update, not a routine fetch.

## Trust and delivery boundary

GitHub Releases is the archival source of truth. It is not the browser delivery origin: release
downloads redirect to attachment storage and do not provide the stable URL and CORS contract the
portal needs.

This first consumer unit therefore stops at a verified, versioned static tree. It does not upload
to S3, invalidate CloudFront, change backend configuration, or make the portal UI read calibration
data. Those are separate, reviewable units. The intended next path is:

1. promote this exact staged tree to the new immutable prefix
   `calibration/ryan-white-calibration-v1.0.0`;
2. pin each product manifest URL and digest in backend model configuration; and
3. add the schema-validated, lazy portal presentation against those backend pins.

An existing prefix must never be overwritten. Rollback selects a previously published immutable
prefix through configuration.

## Fetch and validation

Fetch the pinned release into a new directory:

```sh
npm run fetch:calibration -- --output /tmp/ryan-white-calibration-release
```

The fetch fails closed unless GitHub independently confirms all of the following:

- the pinned repository, release ID, tag, target commit, public URL, and publication state;
- the release is immutable;
- the tag ref still resolves directly to the pinned commit;
- the server exposes exactly the five reviewed assets, with their pinned sizes and SHA-256
  digests; and
- every downloaded byte stream has the same pinned size and digest.

To validate an already downloaded release without extraction:

```sh
npm run prepare:calibration -- --source /tmp/ryan-white-calibration-release --verify-only
```

To produce the static delivery tree in a new directory:

```sh
npm run prepare:calibration -- \
  --source /tmp/ryan-white-calibration-release \
  --output /tmp/ryan-white-calibration-static
```

Staging verifies the outer checksum file and catalog; archive paths; every internal checksum;
catalog, manifest, location-index, coverage, and artifact identities; complete model/location/stage
coverage; stage-specific posterior sample counts and simulation releases; target registries and
availability states; posterior quantile ordering; and public observation source identifiers. It
then emits a deterministic `index.json` that maps the three release products to portal model IDs.

Only total and age panels are approved for the first portal presentation. Race and sex panels are
delivered in the scientific artifacts but are marked as withheld in the generated portal index
until their semantics and presentation receive separate review.

Both commands refuse an existing output directory. Temporary directories are removed on failure,
so a partial fetch or extraction cannot be mistaken for an accepted release.

## Accepted release footprint

The public release contains five assets totaling 12,352,175 bytes. The verified static tree is
approximately 86 MiB and contains 158 files: three product indexes and manifests plus 144
model/location/stage artifacts covering 31 MSA locations, 11 AJPH states, and 30 CROI states.

The live consumer acceptance on 2026-09-06 fetched the public release through the GitHub API,
reverified its immutable metadata and tag ref, downloaded and checked every asset, and staged all
three products successfully. Unit tests also prove rejection of a mutable release, a moved tag,
changed or extra assets, and artifact identity drift.
