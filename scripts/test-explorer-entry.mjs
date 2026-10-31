import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { explorerPreloadScript } from '../src/components/analysis/ExplorerPreloads.tsx';
import {
  ryanWhiteConfig,
  ajphStateLevelConfig,
  croiStateLevelConfig,
  cdcTestingConfig,
} from '../src/config/model-configs.ts';
import { resultDataReleases } from '../src/config/result-data-releases.ts';

function hints(config, search) {
  const links = [];
  vm.runInNewContext(explorerPreloadScript(config), {
    URLSearchParams,
    location: { search },
    document: {
      createElement: () => ({}),
      head: { appendChild: (link) => links.push(link) },
    },
  });
  return links;
}
for (const config of [
  ryanWhiteConfig,
  ajphStateLevelConfig,
  croiStateLevelConfig,
  cdcTestingConfig,
]) {
  test(`${config.id}: cold entry hints exactly its pinned index and requested default`, () => {
    const loc = config.locations[0];
    const binding = resultDataReleases[config.id];
    const links = hints(config, `?loc=${loc}`);
    assert.equal(links.length, 2);
    assert.equal(
      links[0].href,
      `${binding.baseUrl}/${binding.locations[loc].path}`,
    );
    assert.match(links[1].href, /results-v1\/plots\/[a-f0-9]{64}\.json$/);
    for (const link of links) assert.equal(link.crossOrigin, 'anonymous');
    assert.equal(hints(config, '').length, 0);
    assert.equal(hints(config, '?loc=unknown').length, 0);
    for (const change of [
      'outcome=other',
      'summary=individual.simulation',
      'scenario=other',
      'breakdown=sex',
    ])
      assert.equal(hints(config, `?loc=${loc}&${change}`).length, 1);
  });
}
