// Triangles and edge lines for a stellation, ready for GPU buffers.
// Independent of three.js. Faces are convex diagram regions, so a fan
// triangulates them.

import { matVec, length, scale } from './vec.js';
import { NORMALS, PLANE_ROTATIONS, surfaceRegions, to3D } from './stellation.js';

const key2D = (p) => p.map((x) => (Math.abs(x) < 1e-9 ? 0 : x).toFixed(6)).join(',');
const key3D = (p) => p.map((x) => (Math.abs(x) < 1e-6 ? 0 : x).toFixed(5)).join(',');

/**
 * Region edges in plane 0 that are not shared by two coplanar surface regions
 * facing the same side. Opposite-side adjacent regions meet at a real 3D edge
 * where the solid crosses the plane, so their shared segment is kept.
 */
function outlineSegments(regions) {
  const bySide = [new Map(), new Map()];
  for (const { polygon, outward } of regions) {
    const map = bySide[outward ? 0 : 1];
    polygon.forEach((p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      const ka = key2D(p);
      const kb = key2D(q);
      const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const existing = map.get(k);
      if (existing) existing.count += 1;
      else map.set(k, { p, q, count: 1 });
    });
  }
  const outline = [];
  for (const map of bySide) {
    for (const { p, q, count } of map.values()) {
      if (count === 1) outline.push([to3D(p), to3D(q)]);
    }
  }
  return outline;
}

/**
 * Mesh data for a cell set, scaled so the farthest vertex is at `radius`.
 * Triangles are wound outward with outward-pointing normals, 3D edge segments
 * are deduplicated across the 20 planes, and `planes` (per triangle vertex)
 * lets the renderer colour faces by plane.
 */
export function meshData(set, radius = 1) {
  const regions = surfaceRegions(set);
  if (regions.length === 0) throw new Error('Cell set has no surface');
  const faces = regions.map((r) => ({ points: r.polygon.map(to3D), outward: r.outward }));
  const outline = outlineSegments(regions);
  let max = 0;
  for (const { points } of faces) for (const p of points) max = Math.max(max, length(p));
  const s = radius / max;

  const positions = [];
  const normals = [];
  const planes = [];
  const edges = [];
  const seenEdges = new Set();

  PLANE_ROTATIONS.forEach((g, plane) => {
    const nOut = NORMALS[plane];
    const nIn = scale(nOut, -1);
    for (const face of faces) {
      const n = face.outward ? nOut : nIn;
      const points = face.points.map((p) => scale(matVec(g, p), s));
      if (!face.outward) points.reverse();
      for (let i = 1; i < points.length - 1; i++) {
        for (const p of [points[0], points[i], points[i + 1]]) {
          positions.push(...p);
          normals.push(...n);
          planes.push(plane);
        }
      }
    }
    for (const [p, q] of outline) {
      const a = matVec(g, p);
      const b = matVec(g, q);
      const ka = key3D(a);
      const kb = key3D(b);
      const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      if (seenEdges.has(k)) continue;
      seenEdges.add(k);
      edges.push(...scale(a, s), ...scale(b, s));
    }
  });

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    planes: new Uint8Array(planes),
    edges: new Float32Array(edges),
  };
}
