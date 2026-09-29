# Dependency Security Review

## Resolved production exception: Next.js optional Sharp dependency

**Reviewed:** 2026-09-29

**Advisory:** [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)

**Previously affected package:** `sharp@0.34.5`, optional dependency of `next@16.2.12`

**Status:** Resolved; exception removed

Next.js 16.3.3 declares the patched `sharp@^0.35.3` dependency range. The portal now resolves
`sharp@0.35.5`, so the temporary production exception and its audit allowlist have been removed.
The temporary `images.unoptimized` compensating control was removed with the exception. The
production audit now fails closed on every high- or critical-severity finding.

## Resolved development exception: ESLint dependency chain

**Reviewed:** 2026-09-29

**Previously affected packages:** `brace-expansion`, `js-yaml`, and `@humanfs/node` through ESLint

**Status:** Resolved; exception removed

The lint stack now uses `eslint@9.39.5`, `@eslint/eslintrc@3.3.7`, `js-yaml@4.3.2`, and
`@humanfs/node@0.16.8`. These compatible patch updates remove the earlier development-only
findings. The full npm audit reports zero known vulnerabilities.

## Audit policy

- Run `npm run audit:production` for the enforced production dependency review. It has no active
  production exceptions and is covered by pass/fail regression tests.
- A critical production finding blocks release.
- A high production finding must be fixed or recorded here with reachability evidence, compensating
  controls, an owner-visible removal trigger, and a review date.
- Development-only findings remain actionable, but they should be triaged separately so they do not
  obscure production exposure.
