// Derive a display asset from the portal's existing boundaries. Model data and
// the source GeoJSON are untouched. Run with: npx tsx scripts/prepare-explorer-geography.ts
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { projectGeography } from '../src/components/maps/geographicProjection';
import { STATE_NAME_TO_CODE, ALL_STATES } from '../src/data/states';

type Point = [number, number];
function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t =
    dx || dy
      ? Math.max(
          0,
          Math.min(
            1,
            ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) /
              (dx * dx + dy * dy),
          ),
        )
      : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function simplify(points: Point[]): Point[] {
  let distance = 0.12,
    index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToSegment(
      points[i],
      points[0],
      points[points.length - 1],
    );
    if (d > distance) {
      distance = d;
      index = i;
    }
  }
  if (!index) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1)).slice(0, -1),
    ...simplify(points.slice(index)),
  ];
}
async function main() {
  const source = JSON.parse(
    await readFile('public/us-states.json', 'utf8'),
  ) as GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon,
    { NAME: string }
  >;
  let originalPoints = 0,
    displayPoints = 0;
  const states = source.features
    .flatMap((feature) => {
      const name = feature.properties.NAME;
      const code = STATE_NAME_TO_CODE[name];
      // Current studies cover the contiguous US. Keep every covered jurisdiction,
      // including DC, and fail the coverage check in tests if that scope changes.
      if (!code || ['AK', 'HI'].includes(code)) return [];
      const polygons =
        feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
      let largest = 0,
        centroid: Point = [0, 0];
      const path = polygons
        .map((polygon) =>
          polygon
            .map((ring, ringIndex) => {
              const points = ring.map((p) => projectGeography(p as Point));
              originalPoints += points.length;
              let simplified = simplify(points);
              if (simplified.length < 4) simplified = points;
              displayPoints += simplified.length;
              if (ringIndex === 0) {
                let area = 0,
                  x = 0,
                  y = 0;
                for (let i = 0; i < points.length - 1; i++) {
                  const [a, b] = [points[i], points[i + 1]];
                  const cross = a[0] * b[1] - b[0] * a[1];
                  area += cross;
                  x += (a[0] + b[0]) * cross;
                  y += (a[1] + b[1]) * cross;
                }
                if (Math.abs(area) > largest) {
                  largest = Math.abs(area);
                  centroid = [x / (3 * area), y / (3 * area)];
                }
              }
              return (
                simplified
                  .map(
                    (p, i) =>
                      `${i ? 'L' : 'M'}${p.map((v) => +v.toFixed(1)).join(',')}`,
                  )
                  .join('') + 'Z'
              );
            })
            .join(''),
        )
        .join('');
      const knownCenter = ALL_STATES.find(
        (state) => state.code === code,
      )?.coordinates;
      return [
        {
          code,
          name,
          path,
          label: (knownCenter
            ? projectGeography(knownCenter)
            : centroid
          ).map((n) => +n.toFixed(1)),
        },
      ];
    })
    .sort((a, b) => a.code.localeCompare(b.code));
  const output = JSON.stringify(states) + '\n';
  const destination = 'src/data/explorer-geography.json';
  if (process.argv.includes('--check')) {
    if ((await readFile(destination, 'utf8')) !== output) {
      throw new Error(
        'Explorer geography is stale. Run node --import tsx scripts/prepare-explorer-geography.ts',
      );
    }
  } else await writeFile(destination, output);
  console.log({
    states: states.length,
    originalPoints,
    displayPoints,
    bytes: Buffer.byteLength(output),
    gzip: gzipSync(output).length,
  });
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
