import type { ModelConfig } from '@/config/model-configs';
import { resultDataReleases } from '@/config/result-data-releases';
import { getResultEntryPlot } from '@/config/result-entry-plots';

/** A cold static page can start its known data requests before React hydrates.
 * Only hints: the normal consumer still validates every byte and identity.
 * No requests for other locations or unrequested default plots.
 */
export function explorerPreloadScript(config: ModelConfig) {
  const binding = resultDataReleases[config.id];
  const selection = {
    scenario: config.scenarios[0].id,
    outcome: config.defaults.outcome,
    statistic: config.defaults.statistic,
    facet: 'none',
  };
  const locations = Object.fromEntries(
    config.locations.map((location) => {
      const manifest = binding?.locations[location];
      const plot = getResultEntryPlot(binding, config.id, location, selection);
      return [
        location,
        manifest
          ? [
              `${binding.baseUrl}/${manifest.path}`,
              plot ? `${binding.baseUrl}/${plot.path}` : null,
            ]
          : null,
      ];
    }),
  );
  const json = JSON.stringify({ locations, selection }).replace(
    /</g,
    '\\u003c',
  );
  return `(()=>{const entry=${json};const q=new URLSearchParams(location.search);const refs=entry.locations[q.get('loc')];if(!refs)return;const defaults=entry.selection;const exact=(q.get('scenario')||defaults.scenario)===defaults.scenario&&(q.get('outcome')||defaults.outcome)===defaults.outcome&&(q.get('summary')||defaults.statistic)===defaults.statistic&&(q.get('breakdown')||'none')==='none';for(const url of [refs[0],exact&&refs[1]]){if(!url)continue;const link=document.createElement('link');link.rel='preload';link.as='fetch';link.crossOrigin='anonymous';link.href=url;document.head.appendChild(link)}})();`;
}

export default function ExplorerPreloads({ config }: { config: ModelConfig }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: explorerPreloadScript(config) }}
    />
  );
}
