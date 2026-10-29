'use client';

import { useState, type ReactNode } from 'react';
import ExplorerLoading from './ExplorerLoading';

/** A direct result never mounts the map. Once opened, preserve it on return. */
export default function ExplorerFrame({
  ready,
  analysis,
  map,
}: {
  ready: boolean;
  analysis: ReactNode;
  map: ReactNode;
}) {
  const showMap = ready && !analysis;
  const [hasOpenedMap, setHasOpenedMap] = useState(false);
  if (showMap && !hasOpenedMap) setHasOpenedMap(true);
  return (
    <div className="flex-1 w-full overflow-hidden bg-slate-100 relative">
      {!ready ? (
        <ExplorerLoading />
      ) : (
        <>
          {(hasOpenedMap || showMap) && (
            <div
              className="absolute inset-0"
              style={{ visibility: showMap ? 'visible' : 'hidden' }}
              inert={!showMap}
              aria-hidden={!showMap}
            >
              {map}
            </div>
          )}
          {analysis}
        </>
      )}
    </div>
  );
}
