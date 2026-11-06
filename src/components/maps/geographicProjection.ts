// A fixed Web Mercator overview. Both boundaries and markers use this projection.
// Coordinates are prepared once, outside the browser; no map tiles are needed.
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 600;
const scale = 940 / (((-66 + 125) * Math.PI) / 180);
const north = Math.log(Math.tan(Math.PI / 4 + (50 * Math.PI) / 360));

export const projectGeography = Object.assign(
  ([longitude, latitude]: [number, number]): [number, number] => [
    30 + (((longitude + 125) * Math.PI) / 180) * scale,
    25 +
      (north -
        Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360))) *
        scale,
  ],
  {
    invert: ([x, y]: [number, number]): [number, number] => [
      (((x - 30) / scale) * 180) / Math.PI - 125,
      ((2 * Math.atan(Math.exp(north - (y - 25) / scale)) - Math.PI / 2) *
        180) /
        Math.PI,
    ],
  },
);
