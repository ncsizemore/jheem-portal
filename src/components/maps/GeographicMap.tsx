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
import context from '@/data/explorer-context.json';
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
  shortLabel?: string;
}
export interface GeographicMapProps {
  mode: 'city' | 'state';
  title: string;
  subtitle: string;
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

// Sparse reference lines add orientation without tiles or runtime GIS work.
const graticule = [
  ...[-120, -110, -100, -90, -80, -70].map((longitude) =>
    Array.from(
      { length: 19 },
      (_, i) => [longitude, 20 + i * 2] as [number, number],
    ),
  ),
  ...[20, 30, 40, 50].map((latitude) =>
    Array.from(
      { length: 36 },
      (_, i) => [-130 + i * 2, latitude] as [number, number],
    ),
  ),
]
  .map((line) =>
    line
      .map(
        (point, i) =>
          `${i ? 'L' : 'M'}${projectGeography(point)
            .map((n) => n.toFixed(1))
            .join(',')}`,
      )
      .join(''),
  )
  .join('');
const contextLabels = [
  { name: 'CANADA', point: [-105, 51.5], kind: 'land' },
  { name: 'MEXICO', point: [-105, 27], kind: 'land' },
  { name: 'Pacific Ocean', point: [-125, 29], kind: 'water' },
  { name: 'Atlantic Ocean', point: [-69.5, 32.5], kind: 'water' },
  { name: 'Gulf of Mexico', point: [-90, 25.5], kind: 'water' },
].map((label) => ({
  ...label,
  point: projectGeography(label.point as [number, number]),
}));

// Place a small set of direct labels without collisions. All locations remain
// selectable and named in previews and the native selector, at every zoom.
function cityLabels(locations: GeographicLocation[], scale: number) {
  const priorities = [
    'Seattle',
    'Los Angeles',
    'Chicago',
    'New York',
    'Miami',
    'Houston',
    'Atlanta',
    'Boston',
    'San Francisco',
  ];
  const points = locations.map((location) => ({
    ...location,
    label: location.shortLabel || location.name.split(',')[0].split('-')[0],
    point: projectGeography(location.coordinates!).map((n) => n * scale),
  }));
  const occupied: number[][] = [];
  const placements = new Map<
    string,
    { x: number; y: number; anchor: 'start' | 'end' }
  >();
  const priority = (label: string) =>
    priorities.includes(label) ? priorities.indexOf(label) : 100;
  for (const city of [...points].sort(
    (a, b) => priority(a.label) - priority(b.label),
  )) {
    if (scale < 0.65 && placements.size >= 5) break;
    if (scale < 1.2 && priority(city.label) === 100) continue;
    const radius = (city.size || 14) / 2;
    const width = city.label.length * 6.1;
    for (const [dx, dy, anchor] of [
      [radius + 6, 4, 'start'],
      [-radius - 6, 4, 'end'],
      [0, -radius - 8, 'start'],
    ] as const) {
      const x = city.point[0] + dx - (anchor === 'end' ? width : 0),
        y = city.point[1] + dy - 10;
      const rect = [x - 3, y - 3, x + width + 3, y + 14];
      if (
        rect[0] < 6 ||
        rect[2] > MAP_WIDTH * scale - 6 ||
        rect[1] < 6 ||
        rect[3] > MAP_HEIGHT * scale - 6
      )
        continue;
      if (
        occupied.some(
          (b) =>
            rect[0] < b[2] &&
            rect[2] > b[0] &&
            rect[1] < b[3] &&
            rect[3] > b[1],
        )
      )
        continue;
      if (
        points.some(
          (other) =>
            other.code !== city.code &&
            other.point[0] + (other.size || 14) / 2 > rect[0] &&
            other.point[0] - (other.size || 14) / 2 < rect[2] &&
            other.point[1] + (other.size || 14) / 2 > rect[1] &&
            other.point[1] - (other.size || 14) / 2 < rect[3],
        )
      )
        continue;
      occupied.push(rect);
      placements.set(city.code, { x: dx, y: dy, anchor });
      break;
    }
  }
  return placements;
}

function labelColor(color?: string) {
  if (!color) return '#697c84';
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
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
    const rect = (
      event.currentTarget.querySelector('[data-map-marker]') ||
      event.currentTarget
    ).getBoundingClientRect();
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
    onFocus: (event: FocusEvent<SVGElement>) => preview(location.code, event),
    onBlur: onLeave,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(location.code);
      }
      if (event.key === 'Escape') onLeave();
    },
  });
  const labels =
    mode === 'city'
      ? cityLabels(
          locations.filter((item) => item.coordinates),
          k * pixelScale,
        )
      : new Map();
  return (
    <>
      <g aria-hidden="true" pointerEvents="none">
        <path
          d={graticule}
          fill="none"
          stroke="#b4c9cc"
          strokeWidth={0.6}
          opacity={0.5}
          vectorEffect="non-scaling-stroke"
        />
        {context
          .filter((feature) => feature.kind === 'land')
          .map((feature) => (
            <path
              key={feature.name}
              d={feature.path}
              fill="#dfe5dc"
              stroke="#c1cec7"
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </g>
      {geography.map((state) => {
        const location =
          mode === 'state'
            ? locations.find((item) => item.code === state.code)
            : undefined;
        return (
          <path
            key={state.code}
            d={state.path}
            fill={location?.color || (location ? '#d4dedc' : '#f6f7f0')}
            stroke="#b1c1bb"
            strokeWidth={0.65}
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
      <g aria-hidden="true" pointerEvents="none">
        {context
          .filter((feature) => feature.kind === 'lake')
          .map((feature) => (
            <path
              key={feature.name}
              d={feature.path}
              fill="#e8efef"
              stroke="#b1c5c6"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {k * pixelScale >= 0.6 &&
          contextLabels.map((label) => (
            <text
              key={label.name}
              x={label.point[0]}
              y={label.point[1]}
              textAnchor="middle"
              fill={label.kind === 'land' ? '#7c8c82' : '#6b8c95'}
              fontFamily={
                label.kind === 'water'
                  ? 'var(--font-newsreader, Georgia), serif'
                  : undefined
              }
              fontStyle={label.kind === 'water' ? 'italic' : undefined}
              fontSize={label.kind === 'water' ? 17 : 11}
              letterSpacing={label.kind === 'land' ? 3 : 0.6}
            >
              {label.name}
            </text>
          ))}
      </g>
      {mode === 'state' && (
        <g
          aria-hidden="true"
          pointerEvents="none"
          fill="#697c84"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {geography
            .filter(
              (state) =>
                !['DC', 'DE', 'RI'].includes(state.code) &&
                (k * pixelScale >= 0.5 ||
                  !['NH', 'VT', 'MA', 'CT', 'NJ'].includes(state.code)),
            )
            .map((state) => (
              <text
                key={state.code}
                x={state.label[0]}
                y={state.label[1]}
                fontSize={
                  Math.max(8.5 / pixelScale, 10 / Math.sqrt(pixelScale)) /
                  Math.sqrt(k)
                }
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
      )}
      {mode === 'city' &&
        locations.map((location) => {
          if (!location.coordinates) return null;
          const point = projectGeography(location.coordinates);
          const label = labels.get(location.code);
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
                data-map-marker
                r={(location.size || 14) / 2}
                fill={location.color || '#f6f7f0'}
                stroke={location.color ? '#fffefa' : '#7d949c'}
                strokeWidth={1.5}
              />
              <circle
                className="marker-focus"
                r={(location.size || 14) / 2 + 3}
                fill="none"
                stroke="#173f55"
                strokeWidth={1.5}
                pointerEvents="none"
              />
              {label && (
                <text
                  className="city-label"
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  fontSize={11}
                  fill="#354e57"
                  stroke="#f6f7f0"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  aria-hidden="true"
                  pointerEvents="none"
                >
                  {location.shortLabel ||
                    location.name.split(',')[0].split('-')[0]}
                </text>
              )}
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
  const onMoveEnd = useCallback((next: MapPosition) => setPosition(next), []);
  useEffect(() => {
    const root = rootRef.current,
      drawing = drawingRef.current;
    const panel =
      root?.parentElement?.querySelector<HTMLElement>('[data-map-panel]');
    if (!root || !drawing) return;
    const observer = new ResizeObserver(() => {
      root.parentElement?.style.setProperty(
        '--map-panel-height',
        `${panel?.offsetHeight || 230}px`,
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
      className="atlas-map"
      data-geographic-map
      data-map-ready={measured}
    >
      <div className="atlas-map-heading">
        <h2>{props.title}</h2>
        <p>{props.subtitle}</p>
      </div>
      <div ref={drawingRef} className="atlas-drawing">
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
        className="atlas-map-controls"
        role="group"
        aria-label="Map controls"
      >
        <button
          type="button"
          aria-label="Zoom in"
          disabled={position.zoom >= 6}
          onClick={() => changeZoom(1.5)}
          className="text-lg"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={position.zoom <= 1}
          onClick={() => changeZoom(1 / 1.5)}
          className="text-lg"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            props.onMove();
            setPosition({ ...initial });
          }}
        >
          Reset map
        </button>
      </div>
      <p className="atlas-map-caption">
        Select a location to explore
        <br />
        <span className="atlas-caption-detail">
          Drag to pan · Scroll to zoom
        </span>
        <span className="atlas-caption-touch">Pinch to zoom</span>
      </p>
    </div>
  );
}

export default memo(GeographicMap);
