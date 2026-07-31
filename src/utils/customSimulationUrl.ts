/**
 * Merge a custom-simulation query string into a route that may already have
 * search parameters (for example, the state-level model selector).
 *
 * Using URL/URLSearchParams here avoids malformed URLs such as:
 *   /custom?model=croi?loc=CA
 */
export function mergeCustomSimulationQuery(basePath: string, queryString: string): string {
  const url = new URL(basePath, 'https://jheem.invalid');
  const dynamicParams = new URLSearchParams(queryString);

  dynamicParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return `${url.pathname}${url.search}${url.hash}`;
}
