// Contiguous-US Albers equal-area projection (standard parallels 29.5° / 45.5°).
// Boundaries are projected offline; markers and pan/zoom use the same transform.
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 600;
const radians = Math.PI / 180;
const n = (Math.sin(29.5 * radians) + Math.sin(45.5 * radians)) / 2;
const c = Math.cos(29.5 * radians) ** 2 + 2 * n * Math.sin(29.5 * radians);
const rho0 = Math.sqrt(c - 2 * n * Math.sin(38 * radians)) / n;
const scale = 1100;

export const projectGeography = Object.assign(
  ([longitude, latitude]: [number, number]): [number, number] => {
    const rho = Math.sqrt(c - 2 * n * Math.sin(latitude * radians)) / n;
    const theta = n * (longitude + 96) * radians;
    return [
      500 + scale * rho * Math.sin(theta),
      310 - scale * (rho0 - rho * Math.cos(theta)),
    ];
  },
  {
    invert: ([x, y]: [number, number]): [number, number] => {
      const dx = (x - 500) / scale;
      const dy = rho0 + (y - 310) / scale;
      const rho = Math.hypot(dx, dy);
      return [
        Math.atan2(dx, dy) / n / radians - 96,
        Math.asin((c - rho * rho * n * n) / (2 * n)) / radians,
      ];
    },
  },
);
