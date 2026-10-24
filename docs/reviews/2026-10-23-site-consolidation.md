# Site consolidation and visitor journey — 23 October 2026

This pass preserves the accepted visual identity and focuses on reliability and
continuity between CIPHER, JHEEM research pages, and the collaboration form.
It is an engineering/design walkthrough, not a substitute for reader testing.

## Completed checks and correction

- The CIPHER home, publications archive, and JHEEM home were inspected live. The
  deployed publication archive has 19 records; the JHEEM handoff applies the
  program filter and shows 15. Preprints remain labeled.
- The work-with-us link opens CIPHER's filtered archive in a new tab and preserves
  the collaboration page. The selected program is visible on arrival.
- The corrected Ryan White study page derives its metro list from the explorer's
  model configuration and shared location registry. All 31 IDs match the audited
  figure source. Full metro/state labels avoid listing Newark, Oakland, or Fort
  Lauderdale as separate modeled metros. No estimates or scenario definitions
  were changed.
- Desktop and narrow phone layouts were inspected for the corrected list. The
  phone browser reported a 354 CSS-pixel viewport with no horizontal overflow;
  the single-column names wrap clearly. Desktop uses three columns.
- Mobile navigation reaches Work with us, and Get in touch reaches the form.
  Message and optional email fields remain readable. No submission was sent.
- The live city explorer loaded all 31 metros; selecting Baltimore reached its
  cessation chart, and the Table control exposed 26 annual rows. This used stored
  results and did not launch a simulation. The local preview lacked its Mapbox
  token and showed a data-fetch failure, so the full explorer journey was checked
  on production instead. The public summary endpoint separately returned HTTP 200
  with 31 cities and an allowed local origin. No hosting settings were changed.
- Type checking, focused lint, and the production build pass. The monitor's
  independent CI passes 14 offline tests; its live read-only Redis check passed.

## Next design work, kept separate from this small release

The portal study and analytical routes retain a denser application vocabulary
than the public introduction: Prerun Explorer, Custom Simulations, calibration,
and stratification. These may be reasonable for experienced users, but the next
workflow pass should test whether a first-time public-health reader understands
which route answers their question. Coordinate with the existing portal workflow
work rather than introducing a second competing navigation redesign.

The result chart exposes two legend images as "[object Object] legend icon" in
the accessibility tree. Fix those decorative icon labels in the analytical
component pass. The scenario text is present and the table alternative works,
but this is a concrete accessibility cleanup item. Also evaluate clearer labels
for Incidence and Mean & Interval with intended readers.

The mobile study header plus secondary navigation occupies substantial vertical
space. Evaluate that alongside the analytical workflow; the collaboration page
already lets its header scroll away. This pass does not change sticky behavior.

The CIPHER figure remains explicitly sourced to the portal release. The outstanding
manuscript-source question is in `../research/ryan-white-source-follow-up.md`.
Do not obscure that distinction through presentation changes.

## Short reader exercise

Use two or three intended readers, ideally including someone unfamiliar with the
model. No committee design approval is needed. Allow about 15 minutes each and
ask them to think aloud without coaching the route.

1. Starting on CIPHER, find research relevant to a local HIV funding decision.
   Ask what the group does and which program they chose.
2. Find results for a familiar city. Ask which scenario is shown, what the time
   period is, and what the shaded region represents. Record their actual words.
3. Find the supporting publication and explain how they would contact the team.
   Have them stop before sending a message; no synthetic inquiry is needed.

Record hesitation, wrong turns, interpretation errors, and whether the reader
can finish without help. Prioritize those observed problems over requests for
additional visual effects. Recruiting people and sending invitations remain
separate actions; no one has been contacted by this work.

## Pending operational choices

- Hopkins forwarding destination and ownership of initial triage.
- Infrastructure-alert recipient, then activation of the private monitoring PR
  and a hosted check. Real test-email delivery requires explicit permission.
- Final manuscript input/reporting revision, via the prepared source question.
- A durable CIPHER domain, respecting the user's preference for free tiers.

The existing design-language guide remains authoritative for further page work.
Dark mode, another identity exploration, and a replacement impact visual remain
parked while these concrete tasks are completed.
