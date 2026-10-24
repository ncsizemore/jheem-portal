# Ryan White featured-figure source follow-up

23 October 2026. Draft for a model/manuscript owner; no message has been sent.
This records a bounded source question, not a proposal to change published values.

## Draft question

We have been tracing the CIPHER homepage figure back to the underlying Ryan White
results. The March 2026 portal values reproduce from the released 80-draw web
simulation sets. For Baltimore and Columbus, all 80 draws match specific parameter
vectors in the original 1,000-draw archive, so we can now separate the draw-selection
effect from the smaller differences in their stored trajectories.

The June 16 and July 1 city archives give identical incidence arrays. They produce
75,433 additional infections overall and 1,158 for Columbus after rounding, while
the published Figure 3 reports 75,436 and 1,161. The overall interval also differs.
The other June 26 archive contains state results, so it does not explain this.

Do you have the saved input file and reporting-code revision that produced the
final Figure 3, particularly the Columbus row and overall interval? A file path,
checksum, or archived manuscript-output folder would let us close this without
rerunning the model. If there is also a record of the preparation run that produced
`ryan-white-msa-v1.0.0`, that would help explain the remaining trajectory differences
for otherwise identical parameter draws.

## Evidence available locally

- Original city archive: `ryan_white_results_city_2025-07-01.Rdata`;
  SHA-256 `9e3971ed817ef706332b8c468451102bdc8a62e013c0faf9161014fbb7ef4053`.
- Four public release files: Baltimore and Columbus, baseline and cessation;
  file sizes and hashes match the published release digests.
- All 44 annual rows / 132 mean-and-bound comparisons match the frozen portal
  data to its four decimal places. This verifies two metros, not all 31.
- All 320 file/draw parameter comparisons match uniquely; the original indices
  are 13, 25, 38, …, 1,000, paired consistently across the two scenarios.
- Compact June extracts and the full July archive are downloaded for offline work.
- The detailed scripts, manifests, and comparisons are under the ignored local
  `generated-data/research-audit/ryan-white/` folder in the primary portal checkout.
  Large simulation files do not belong in the website repository.

The current homepage consistently uses the portal aggregation and explicitly
identifies its difference from the paper. Do not rescale a curve, mix a published
headline with another source's trajectory, or remove the qualification to create
apparent agreement. Once the source question is resolved, pin the inputs and
regenerate headline, curves, and source notes together.
