import type { Map, MapEventOf, MapStyleDataEvent } from 'mapbox-gl';
import type { RefObject } from 'react';

export function initializeExplorerMap(
  event: MapStyleDataEvent,
  ref: RefObject<Map | null>,
) {
  // react-map-gl exposes the style payload type; Mapbox Evented also supplies
  // the target on the full event. Fit before the initial tile set is loaded.
  const map = (event as MapEventOf<'styledata'>).target;
  if (ref.current === map) return;
  ref.current = map;
  fitExplorerMap(map);
}

/** Fit national coverage into the actual space left by the instructions. */
export function fitExplorerMap(map: Map) {
  const container = map.getContainer();
  const panel =
    container.parentElement?.querySelector<HTMLElement>('[data-map-panel]');
  const wide = container.clientWidth >= 640;
  const padding = {
    top: wide
      ? 32
      : Math.min(
          (panel?.offsetHeight ?? 230) + 24,
          Math.max(0, container.clientHeight - 140),
        ),
    right: 24,
    bottom: 32,
    left: wide ? (panel?.offsetWidth ?? 320) + 40 : 24,
  };
  map.fitBounds(
    [
      [-125, 24],
      [-66, 50],
    ],
    { padding, duration: 0, maxZoom: 5 },
  );
}
