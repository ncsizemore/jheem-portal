# Portal Model Configuration Sync

The portal commits its generated `src/config/model-configs.ts` file so ordinary installs and builds
do not depend on a moving backend branch or on network availability. The exact backend source is
recorded in `config/backend-model-config-source.json`.

## Updating the model contract

1. Review and merge the intended backend configuration change.
2. Replace `ref` in `config/backend-model-config-source.json` with the full immutable backend commit
   SHA that contains the approved configuration.
3. Run `npm run sync-config`.
4. Review and commit both the source descriptor and generated TypeScript file in the same portal PR.
5. Run `npm run verify-config`, the focused tests, and the production build.

`npm run verify-config` fetches the pinned backend file, regenerates the output in memory, and fails
if it differs from the committed artifact. A deliberate local source or ref can be tested with
`JHEEM_CONFIG_PATH` or `JHEEM_CONFIG_REF`, but production builds consume only the committed file.

Do not point the source descriptor at a branch or mutable tag. A portal release should identify the
exact backend model contract that it presents.
