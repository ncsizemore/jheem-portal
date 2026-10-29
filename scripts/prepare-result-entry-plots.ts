/** Offline only: derive default plot pointers from already staged, pinned indexes. */
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import releases from '../src/config/result-data-releases.json';
import { modelConfigs } from '../src/config/model-configs';
import {
  parseResultManifest,
  validateResultRef,
} from '../src/utils/resultData';
import type { ResultEntryPlot } from '../src/config/result-entry-plots';

async function main() {
  const stagedRoot = process.argv[2];
  if (!stagedRoot)
    throw new Error(
      'Usage: node --import tsx scripts/prepare-result-entry-plots.ts <local-staged-root>',
    );
  const entries: Record<string, Record<string, ResultEntryPlot>> = {};
  for (const [model, binding] of Object.entries(releases)) {
    const config = modelConfigs[model];
    const selection = {
      scenario: config.scenarios[0].id,
      outcome: config.defaults.outcome,
      statistic: config.defaults.statistic,
      facet: 'none',
    };
    entries[model] = {};
    for (const [location, ref] of Object.entries(binding.locations)) {
      const payload = gunzipSync(
        await readFile(join(stagedRoot, model, ref.path)),
      );
      if (
        payload.length !== ref.bytes ||
        createHash('sha256').update(payload).digest('hex') !== ref.sha256
      )
        throw new Error(
          `Staged index does not match pinned release: ${model}/${location}`,
        );
      const manifest = parseResultManifest(
        JSON.parse(payload.toString('utf8')),
        model,
        location,
      );
      const plot =
        manifest.data[selection.scenario]?.[selection.outcome]?.[
          selection.statistic
        ]?.[selection.facet];
      if (!plot?.selectable)
        throw new Error(`Default plot missing: ${model}/${location}`);
      validateResultRef(plot, 'plots');
      entries[model][location] = { manifest: ref.sha256, selection, plot };
    }
  }
  const output = 'src/config/result-entry-plots.json';
  await writeFile(output, JSON.stringify(entries, null, 2) + '\n');
  console.log(
    `Wrote ${Object.values(entries).reduce((n, locations) => n + Object.keys(locations).length, 0)} default plot pointers to ${output}. No network requests or uploads.`,
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
