# Dependency Security Review

## Temporary production exception: Next.js optional Sharp dependency

**Reviewed:** 2026-07-31  
**Advisory:** [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)  
**Affected installed package:** `sharp@0.34.5`, optional dependency of `next@16.2.12`  
**Status:** Time-bounded exception; review on every Next.js update

Next.js 16.2.12 is the current patched stable framework release used by the portal, but it declares
the optional dependency `sharp@^0.34.5`. The current Next.js canary line declares the same range.
The advisory is resolved in Sharp 0.35.x, which is outside Next.js's declared 0.x compatibility
range. Forcing that upgrade would bypass the framework's package contract.

The portal does not import `next/image`, accept user-uploaded images, or otherwise invoke the Next.js
image optimizer. `next.config.ts` also sets `images.unoptimized` so a future `next/image` import does
not silently activate this path. On that evidence, the affected optional native library is installed
but not reachable through the deployed application.

Do not add image optimization or user-controlled image processing while this exception is active.
Remove the exception and the `images.unoptimized` control when a supported stable Next.js release
accepts a patched Sharp version. Reassess immediately if the portal begins processing images on the
server, the advisory's affected behavior changes, or new reachability evidence appears.

## Temporary development exception: ESLint glob expansion

**Reviewed:** 2026-07-31  
**Advisory:** [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg)  
**Affected installed package:** `brace-expansion`, through ESLint and its plugins  
**Status:** Development-only exception; review with the lint/CI migration

The affected package is absent from `npm audit --omit=dev`. It is used by lint tooling against
static repository paths and receives no request or other user-controlled glob input. The advisory's
fixed brace-expansion major is outside the ranges accepted by the current ESLint dependency tree;
`npm audit fix --force` proposes breaking downgrades rather than a compatible remediation.

Do not pass externally supplied patterns to repository lint commands. Remove this exception when a
compatible ESLint toolchain accepts the fixed brace-expansion release, or reassess immediately if
linting begins to process untrusted paths or content.

## Audit policy

- Run `npm run audit:production` for the enforced production dependency review. Its allowlist is
  covered by pass/fail regression tests and contains only the documented Sharp advisory above.
- A critical production finding blocks release.
- A high production finding must be fixed or recorded here with reachability evidence, compensating
  controls, an owner-visible removal trigger, and a review date.
- Development-only findings remain actionable, but they should be triaged separately so they do not
  obscure production exposure.
