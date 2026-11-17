# Institutional team contact — 17 November 2026

## Contact update

Use `CIPHERteam@jh.edu` as the shared public contact for CIPHER and JHEEM. Both
sites retain one central contact setting; JHEEM's mail link, copy control and
server-side form recipient derive from it. Show the institutional address in
contact sections, with descriptive link labels retained in navigation. Keep the
JHEEM address and copy button together when the row wraps on narrow screens.

Personal researcher addresses remain distinct. The sites do not configure mailbox
membership, forwarding, GitHub organization contact settings or infrastructure
alert recipients. The old Gmail forwarding is historical setup, not a dependency
of the new public address.

## Release dependency fixes

Both builds reported Next.js advisory GHSA-mfr8-8qww-v76h. Update Next.js and its
ESLint configuration from 16.4.1 to 16.4.6, preserving the existing major/minor
release line. CIPHER's production audit also identified GHSA-mrhx-c7xc-m3w5 in
Zod; update its existing dependency to 4.6.6. No blanket dependency upgrade,
new service or infrastructure change is included. Both production-only audits
are clean after these compatible updates.

Sources:
- https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

## Verification

- JHEEM: 73 existing non-browser tests, lint, TypeScript through the production
  build, and production dependency audit pass.
- CIPHER: 34 existing tests, lint, TypeScript through the production build, and
  production dependency audit pass.
- Local production browser checks cover JHEEM's contact page and CIPHER's home,
  people, research, publications, news and SHIELD pages. All expose the intended
  mail link, contain no old Gmail links, and fit at 1280px and 320px.
- The copy control returns the new address; an intercepted local form submission
  reaches the success state. Existing delivery tests verify the configured
  recipient without contacting Resend. No external test message has been sent
  during these local checks.
- Final CI, deployments and any explicitly authorized delivery test are recorded
  in release artifacts.

## Roadmap steering

Hold off on changes to the costing experience while its manuscript is in review.
Custom simulations remain unchanged in this release; the user is considering
whether to remove them from public use given low demand. Revisit that product
choice before scheduling a custom-simulation design pass. The current work is
limited to the team contact update and the release dependency fixes above.
