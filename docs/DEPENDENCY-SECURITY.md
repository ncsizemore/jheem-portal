# Dependency Security Review

## Resolved production dependency exception

The temporary exception for Sharp advisory
[GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) was removed on 2026-09-29.
The portal now uses `next@16.3.7`, whose supported dependency range installs patched `sharp@0.35.5`.
The production audit once again blocks every high- or critical-severity finding without an allowlist.

The former development-only `brace-expansion` exception was also removed on 2026-09-29. Compatible
lockfile updates now leave both the full dependency audit and the production-only audit clean.

## Audit policy

- Run `npm run audit:production` for the enforced production dependency review.
- A critical production finding blocks release.
- A high production finding must be fixed or recorded here with reachability evidence, compensating
  controls, an owner-visible removal trigger, and a review date.
- Development-only findings remain actionable, but they should be triaged separately so they do not
  obscure production exposure.

## November 2026 contact release

Next.js and its ESLint configuration are updated from 16.4.1 to 16.4.6. The build
reported [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h),
which affects Next.js 16.3.0–16.4.4. The portal does not use the reported nested
`use cache` / `unstable_cache` pattern; the supported patch removes the affected
dependency rather than relying on that reachability assessment. No audit exception
is added.
