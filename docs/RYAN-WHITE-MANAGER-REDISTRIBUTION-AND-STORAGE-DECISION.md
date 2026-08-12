# Ryan White Manager Redistribution and Storage Decision

**Status:** Controlled repository architecture selected; archive publication pending

**Reviewed:** 2026-08-12

**Artifacts:**

- April 2025 web/display manager, SHA-256
  `4f1b5063ae6f6e9ffa4b254d4cad71fdf088903295339fb59a17e71819f99989`;
- March 2026 full manager, SHA-256
  `cc227cb9bdf43d9948f97db54d9c2652f034c4b780a8515cb57c99ea6f735188`.

This is an engineering and data-governance risk assessment, not legal advice. A public release of
the manager binaries remains subject to institutional or source-owner confirmation.

## Decision

1. **Do not publish either RData manager as a public GitHub Release now.** The existing public
   syphilis-manager releases demonstrate build mechanics, but their release notes do not provide a
   source-by-source redistribution-rights manifest and are not sufficient precedent for this
   decision.
2. **Use a private `CIPHER-Epi/jheem-data-managers` repository as the canonical operational
   manager-artifact store, subject to institutional data-classification confirmation.** Store
   manager binaries as immutable, versioned GitHub Release assets rather than ordinary Git blobs or
   Git LFS objects. The repository is deliberately scoped to data managers; simulation/posterior
   sets, raw restricted inputs, and unrelated application artifacts remain elsewhere.
3. **Archive both exact byte streams in access-controlled, versioned storage.** The archive record
   must include the original and canonical filenames, digest, byte size, embedded creation and
   modification dates, scientific role, source inventory, provenance confidence, access policy,
   and redistribution status.
4. **Publish the compatibility reports, provenance metadata, target/source registry, and minimal
   derived calibration payloads.** Do not publish the general-purpose serialized manager merely to
   make the exporter reproducible.
5. **Revisit a full-manager public release only after a source-by-source rights review.** At minimum,
   this requires documented NASTAD reuse permission or terms, a CDC suppression/re-release check,
   an AIDSVu/IQVIA scope and attribution check for any included PrEP data, and a machine-readable
   license/source manifest shipped with the artifact.

This preserves the exact research artifacts without creating a new public redistribution event
whose scope is broader than the portal needs.

## Selected repository architecture

`CIPHER-Epi/jheem-data-managers` is the intended stable publication boundary for versioned JHEEM
data-manager artifacts. It should not become the universal home for every large or binary research
artifact.

- Build definitions remain with the source code that owns them unless a future data-engineering
  reorganization deliberately moves them. For example, the syphilis pipeline may continue building
  in `jheem_analyses` while eventually promoting a validated output into the central manager
  repository.
- Every canonical manager release is immutable and versioned. A reviewed registry or channel file
  may map a name such as `stable` to an immutable release and digest; production consumers pin the
  exact release and SHA-256 rather than depending on a delete-and-recreate `latest` release.
- Each release includes the manager asset, `manifest.json`, `SHA256SUMS`, provenance and validation
  reports, source repository and commit, workflow-run identity when applicable, build-input
  identities, data classification, and redistribution status.
- Cross-repository CI publication is a later security unit. It should use a narrowly scoped GitHub
  App or equivalent organization-managed credential and a separately reviewed promotion gate. It
  is not required to archive the two historical Ryan White managers.
- JHU-managed storage may hold a periodic cold disaster-recovery copy. GitHub Releases remain the
  engineering system of record; a personal OneDrive or mutable shared link does not.

The immediate implementation remains conservative: create the private repository and its release
contract, confirm the two manager files are permitted in that private organization-controlled
location, then publish the exact verified byte streams as controlled immutable releases. Migrating
the existing syphilis release flow is intentionally deferred until this pattern has been exercised.

## Evidence

### Artifact scope is broader than the calibration surface

The April manager contains 13 outcomes and source families registered under HRSA, NASTAD, NHSS,
IQVIA/AIDSVu, BRFSS, and local health departments. In addition to Ryan White observations, it
contains diagnosed prevalence, diagnoses, awareness, overall suppression, testing, PrEP, and total
prevalence. Publishing this binary would redistribute unrelated source material and serialized
manager behavior that the calibration surface does not need.

The March manager is narrower—11 outcomes under HRSA, NASTAD, and NHSS—but still combines material
from multiple publishers into a general-purpose R6 object. Its smaller size and stronger target
coverage do not by themselves establish redistribution rights or historical fitting provenance.

### Source-specific disposition

| Source family | Evidence | Engineering disposition |
|---|---|---|
| HRSA Ryan White reports | HRSA says its publications and products are generally public domain; the 2019 RWHAP report explicitly says it may be used and copied without permission, with citation appreciated. | Derived observations may be published with source/version citation. Preserve report-year and table provenance. |
| CDC/NHSS/AtlasPlus | CDC publishes aggregate extracts, but state and local re-release agreements require specific suppression levels and limit available stratifications. | Public derived values are acceptable only when copied from an already public suppressed release and validated not to reverse or bypass suppression. Record vintage, preliminary status, and citation. |
| NASTAD ADAP reports | Reports and tables are publicly viewable, but the reviewed ADAP Monitoring Project pages do not state a redistribution license for repackaged tables. | Limit publication to cited, minimally scoped values already used by the portal while institutional or source-owner confirmation is pursued; do not release the compiled manager binary without that confirmation. |
| AIDSVu/IQVIA | AIDSVu permits use with credit, while its PrEP data are supplied through an IQVIA-supported data-sharing agreement and AIDSVu retains copyright in the site. | If retained in a public derived artifact, limit to the public AIDSVu dataset, preserve suppression and required credit, and identify the dataset vintage. Exclude it entirely from Ryan White service-fit payloads when it is not an active target. |
| Local health departments | Rights and suppression rules can vary by jurisdiction; the manager does not encode a uniform redistribution license. | Do not bulk-publish these records as part of the web manager. Review per source if a future EHE target requires them. |

Authoritative references:

- [HRSA public-domain guidance](https://mchb.hrsa.gov/national-maternal-mental-health-hotline/order-faq)
- [HRSA Ryan White data reports](https://ryanwhite.hrsa.gov/data/reports)
- [CDC NHSS technical notes](https://www.cdc.gov/hiv-data/nhss/index.html)
- [CDC AtlasPlus historical-extract readme](https://www.cdc.gov/nchhstp/media/pdfs/2025/05/ReadMe_AtlasPlus_historical-data-extract_20250430.pdf)
- [NASTAD ADAP Monitoring Project](https://nastad.org/adap-monitoring-project)
- [AIDSVu data methods and reuse/citation guidance](https://aidsvu.org/data-methods/data-methods-statecounty/)

### Repository precedent is incomplete

`tfojo1/jheem_analyses` is public but declares no repository license in GitHub metadata. Its current
syphilis-manager releases include build inputs, commit identity, structural validation, and data
quality results, but no license, redistribution-rights review, or source-use manifest. That pipeline
is a useful reproducibility pattern, not proof that a Ryan White manager release is authorized.

## Storage contract

Do not rename or overwrite the downloaded file in place and do not modify the NAS. When a controlled
archive location is selected, copy and verify the exact bytes under canonical names such as:

- `ryan-white-web-display-manager_2025-04-08.rdata`;
- `ryan-white-full-manager_2026-03-16.rdata`.

Store a sibling immutable manifest with at least:

```json
{
  "schemaVersion": "jheem-data-manager-archive/v1",
  "managerId": "ryan-white-full-manager-2026-03-16",
  "canonicalFileName": "ryan-white-full-manager_2026-03-16.rdata",
  "originalFileName": "ryan.white.data.manager.2026-03-16.rdata",
  "sha256": "cc227cb9bdf43d9948f97db54d9c2652f034c4b780a8515cb57c99ea6f735188",
  "byteSize": 2218355,
  "role": "current-full-candidate",
  "historicalFittingIdentity": "unverified",
  "redistributionStatus": "controlled-only-pending-source-rights-review",
  "sourceFamilies": ["HRSA", "NASTAD", "NHSS"]
}
```

The final manifest should reverify the byte size and digest from the archived object, add embedded
manager dates and source coverage, and be signed or checksummed with the artifact index. The storage
system should provide immutable object versions, access logs, retention, and restore/version-history
behavior; a mutable shared-file URL is not enough.

The selected operational implementation is the private `CIPHER-Epi/jheem-data-managers` release
repository described above, with an optional JHU-managed cold backup. The existing public
`jheem_analyses` repository is not the controlled archive. Do not put these binaries in ordinary Git
history.

## Public delivery contract

The public calibration release should contain only what a reader and the portal need:

- the release-specific target registry and source/citation registry;
- the data-manager ID, digest, role, and provenance confidence, without the manager binary;
- per-location baseline summaries and selected observed points;
- coverage, suppression, source, sample-count, and checksum metadata; and
- the manager compatibility report and exporter revision.

The exporter must use an explicit allowlist. It must not copy every observation reachable through a
simset's `corresponding.observed.outcome`, and it must reject the legacy `adap.clients` to
`non.adap.clients` mapping. This design is more reproducible than the existing location bundles and
materially reduces redistribution scope.

## Conditions for revisiting a public manager release

A future proposal may change `redistributionStatus` only when all of the following are documented:

1. every included source has explicit reuse terms or written permission covering repackaged data;
2. public output preserves source-specific suppression and attribution requirements;
3. nonessential source families and serialized secrets/local paths are removed;
4. the artifact has a source/license manifest, checksum, validation report, and versioned build
   provenance;
5. the repository or release includes a deliberate license for project-owned code and metadata;
6. an institutional data-governance or legal reviewer accepts the release scope.

Until then, the public derived-artifact path is the approved route and is not blocked by the manager
binary remaining controlled.
