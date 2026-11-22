// Triangles and edge lines for a stellation, ready for GPU buffers.
// Independent of three.js. Faces are convex diagram regions, so a fan
// triangulates them.

import { matVec, length, scale } from './vec.js';
import { NORMALS, PLANE_ROTATIONS, surfaceRegions, to3D } from './stellation.js';

const key = (p) => p.map((x) => x.toFixed(6)).join(',');

/** Region edges in plane 0 that are not shared by two surface regions. */
function outlineSegments(regions) {
  const count = new Map();
  const segments = [];
  for (const { polygon } of regions) {
    polygon.forEach((p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      const k = [key(p), key(q)].sort().join('|');
      if (!count.has(k)) segments.push({ k, p, q });
      count.set(k, (count.get(k) ?? 0) + 1);
    });
  }
  return segments.filter((s) => count.get(s.k) === 1).map(({ p, q }) => [to3D(p), to3D(q)]);
}

/**
 * Mesh data for a cell set, scaled so the farthest vertex is at `radius`.
 * `plane` (per triangle vertex) lets the renderer colour faces by plane.
 */
export function meshData(set, radius = 1) {
  const regions = surfaceRegions(set);
  const polygons = regions.map((r) => r.polygon.map(to3D));
  const outline = outlineSegments(regions);
  let max = 0;
  for (const polygon of polygons) for (const p of polygon) max = Math.max(max, length(p));
  const s = radius / max;

  const positions = [];
  const normals = [];
  const planes = [];
  const edges = [];
  PLANE_ROTATIONS.forEach((g, plane) => {
    const n = NORMALS[plane];
    for (const polygon of polygons) {
      const points = polygon.map((p) => scale(matVec(g, p), s));
      for (let i = 1; i < points.length - 1; i++) {
        for (const p of [points[0], points[i], points[i + 1]]) {
          positions.push(...p);
          normals.push(...n);
          planes.push(plane);
        }
      }
    }
    for (const [p, q] of outline) edges.push(...scale(matVec(g, p), s), ...scale(matVec(g, q), s));
  });
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    planes: new Uint8Array(planes),
    edges: new Float32Array(edges),
    regionCount: regions.length * 20,
  };
}
