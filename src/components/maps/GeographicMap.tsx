'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
  type FocusEvent,
  type MouseEvent,
} from 'react';
import {
  ComposableMap,
  ZoomableGroup,
  useZoomPanContext,
  type MapPosition,
} from 'react-simple-maps';
import geography from '@/data/explorer-geography.json';
import {
  projectGeography,
  MAP_WIDTH,
  MAP_HEIGHT,
} from './geographicProjection';

export interface GeographicLocation {
  code: string;
  name: string;
  coordinates?: [number, number];
  color?: string;
  size?: number;
}
export interface GeographicMapProps {
  mode: 'city' | 'state';
  locations: GeographicLocation[];
  onSelect: (code: string) => void;
  onPreview: (code: string, position: { x: number; y: number }) => void;
  onLeave: () => void;
  onMove: () => void;
}
const initial: MapPosition = {
  coordinates: projectGeography.invert([MAP_WIDTH / 2, MAP_HEIGHT / 2]),
  zoom: 1,
};
const extent: [[number, number], [number, number]] = [
  [0, 0],
  [MAP_WIDTH, MAP_HEIGHT],
];

function labelColor(color?: string) {
  if (!color) return '#697c84';
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18 ? '#fff' : '#432a1c';
}

const MapShapes = memo(function MapShapes({
  mode,
  locations,
  onSelect,
  onPreview,
  onLeave,
  pixelScale,
  k,
}: GeographicMapProps & { pixelScale: number; k: number }) {
  const preview = (
    code: string,
    event: MouseEvent<SVGElement> | FocusEvent<SVGElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onPreview(code, { x: rect.left + rect.width / 2, y: rect.top });
  };
  const actions = (location: GeographicLocation) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `Explore ${location.name}`,
    onClick: () => onSelect(location.code),
    onMouseEnter: (event: MouseEvent<SVGElement>) =>
      preview(location.code, event),
    onMouseLeave: onLeave,
    onFocus: (event: FocusEvent<SVGElement>) =>
      preview(location.code, event),
    onBlur: onLeave,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(location.code);
      }
      if (event.key === 'Escape') onLeave();
    },
  });
  return (
    <>
      {geography.map((state) => {
        const location =
          mode === 'state'
            ? locations.find((item) => item.code === state.code)
            : undefined;
        return (
          <path
            key={state.code}
            d={state.path}
            fill={location?.color || (location ? '#d8e2e5' : '#f9faf8')}
            stroke="#b9c6ca"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
            className={
              location
                ? 'geographic-state cursor-pointer focus:outline-none'
                : ''
            }
            {...(location ? actions(location) : {})}
          >
            <title>{state.name}</title>
          </path>
        );
      })}
      <g
        aria-hidden="true"
        pointerEvents="none"
        fill="#697c84"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {geography
          .filter((state) => !['DC', 'DE', 'RI'].includes(state.code))
          .map((state) => (
            <text
              key={state.code}
              x={state.label[0]}
              y={state.label[1]}
              fontSize={10 / (Math.sqrt(k) * Math.sqrt(pixelScale))}
              letterSpacing={1 / k}
              fill={
                mode === 'state'
                  ? labelColor(
                      locations.find(
                        (location) => location.code === state.code,
                      )?.color,
                    )
                  : undefined
              }
            >
              {state.code}
            </text>
          ))}
      </g>
      {mode === 'city' &&
        locations.map((location) => {
          if (!location.coordinates) return null;
          const point = projectGeography(location.coordinates);
          return (
            <g
              key={location.code}
              transform={`translate(${point[0]} ${point[1]}) scale(${1 / (k * pixelScale)})`}
              className="geographic-city cursor-pointer focus:outline-none"
              {...actions(location)}
            >
              <circle
                r={Math.max(11, (location.size || 14) / 2 + 4)}
                fill="transparent"
              />
              <circle
                r={(location.size || 14) / 2}
                fill="#fff"
                stroke={location.color || '#607a89'}
                strokeWidth={2.5}
              />
              <circle
                r={(location.size || 14) / 5}
                fill={location.color || '#607a89'}
              />
            </g>
          );
        })}
    </>
  );
});

// Panning changes the group's transform; only a zoom or resize needs to redraw
// marker sizes. Keep the feature tree out of pointer-move React updates.
function MapFeatures(props: GeographicMapProps & { pixelScale: number }) {
  const { k } = useZoomPanContext();
  return <MapShapes {...props} k={k} />;
}

function GeographicMap(props: GeographicMapProps) {
  const { onMove } = props;
  const [position, setPosition] = useState(initial);
  const [pixelScale, setPixelScale] = useState(1);
  const [measured, setMeasured] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<HTMLDivElement>(null);
  const onMoveEnd = useCallback(
    (next: MapPosition) => setPosition(next),
    [],
  );
  useEffect(() => {
    const root = rootRef.current,
      drawing = drawingRef.current;
    const panel =
      root?.parentElement?.querySelector<HTMLElement>('[data-map-panel]');
    if (!root || !drawing) return;
    const observer = new ResizeObserver(() => {
      root.style.setProperty(
        '--map-panel-height',
        `${(panel?.offsetHeight || 144) + 24}px`,
      );
      const scale = Math.min(
        drawing.clientWidth / MAP_WIDTH,
        drawing.clientHeight / MAP_HEIGHT,
      );
      if (scale > 0) {
        setPixelScale(scale);
        setMeasured(true);
      }
      onMove();
    });
    observer.observe(drawing);
    if (panel) observer.observe(panel);
    return () => observer.disconnect();
  }, [onMove]);
  const changeZoom = (factor: number) => {
    props.onMove();
    setPosition((p) => {
      const zoom = Math.min(6, Math.max(1, p.zoom * factor));
      const center = projectGeography(p.coordinates);
      return {
        zoom,
        coordinates: projectGeography.invert([
          Math.max(
            MAP_WIDTH / (2 * zoom),
            Math.min(MAP_WIDTH - MAP_WIDTH / (2 * zoom), center[0]),
          ),
          Math.max(
            MAP_HEIGHT / (2 * zoom),
            Math.min(MAP_HEIGHT - MAP_HEIGHT / (2 * zoom), center[1]),
          ),
        ]),
      };
    });
  };
  return (
    <div
      ref={rootRef}
      className="geographic-map absolute inset-0 bg-[#eaf0f1]"
      data-geographic-map
      data-map-ready={measured}
    >
      <div
        ref={drawingRef}
        className="absolute inset-x-2 top-[var(--map-panel-height,168px)] bottom-16 sm:left-[350px] sm:right-5 sm:top-6 sm:bottom-16"
      >
        <ComposableMap
          projection={projectGeography}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="h-full w-full touch-none"
          aria-label="Contiguous United States study locations"
          role="group"
        >
          <ZoomableGroup
            center={position.coordinates}
            zoom={position.zoom}
            minZoom={1}
            maxZoom={6}
            translateExtent={extent}
            onMoveStart={props.onMove}
            onMoveEnd={onMoveEnd}
          >
            <MapFeatures {...props} pixelScale={pixelScale} />
          </ZoomableGroup>
        </ComposableMap>
      </div>
      <div
        className="absolute bottom-5 right-4 flex items-center rounded border border-rule bg-white text-xs text-ink shadow-sm"
        role="group"
        aria-label="Map controls"
      >
        <button
          type="button"
          aria-label="Zoom in"
          disabled={position.zoom >= 6}
          onClick={() => changeZoom(1.5)}
          className="h-10 w-10 text-lg disabled:opacity-30"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={position.zoom <= 1}
          onClick={() => changeZoom(1 / 1.5)}
          className="h-10 w-10 border-l border-rule text-lg disabled:opacity-30"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            props.onMove();
            setPosition({ ...initial });
          }}
          className="h-10 border-l border-rule px-3"
        >
          Reset map
        </button>
      </div>
      <p className="absolute bottom-7 left-4 text-[11px] text-muted sm:left-[360px]">
        <span className="hidden lg:inline">
          Select a location to explore ·{' '}
        </span>
        Contiguous United States
      </p>
      <style>{`.geographic-state:hover,.geographic-state:focus-visible{stroke:#153b55;stroke-width:2;filter:brightness(.97)}.geographic-city:hover circle:nth-child(2),.geographic-city:focus-visible circle:nth-child(2){stroke-width:4}`}</style>
    </div>
  );
}

export default memo(GeographicMap);
