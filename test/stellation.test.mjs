// Geometry tests. Run with `npm test` (Node 18+, no dependencies).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import catalog from '../js/catalog.js';
import { getStellation } from '../js/registry.js';
import {
  CELL_TYPES, DIAGRAM, GROUP, PLANE_STABILISER, ROTATIONS, cellNames, parseCells, regionType,
  shells, surfaceRegions, to3D,
} from '../js/geometry/stellation.js';
import { meshData } from '../js/geometry/mesh.js';
import { determinant, matVec } from '../js/geometry/vec.js';

const area = (P) => Math.abs(P.reduce((s, p, i) => s + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0)) / 2;

/** Signature of each region type: the stellations whose surface uses it. */
function regionSignatures(names) {
  const sig = new Map();
  for (const row of catalog) {
    const set = parseCells(row.cells, { chiralF1: row.chiral, names });
    for (const region of surfaceRegions(set)) {
      const k = regionType(region);
      if (!sig.has(k)) sig.set(k, new Set());
      sig.get(k).add(row.index);
    }
  }
  return new Set([...sig.values()].map((s) => [...s].sort((a, b) => a - b).join(',')));
}

/** Signature of each face number in Wikipedia's "Faces" column. */
function faceNumberSignatures() {
  const sig = new Map();
  for (const row of catalog) {
    for (const n of row.faces.replace(/'/g, '').split(/\s+/)) {
      if (!sig.has(n)) sig.set(n, new Set());
      sig.get(n).add(row.index);
    }
  }
  return new Set([...sig.values()].map((s) => [...s].sort((a, b) => a - b).join(',')));
}

test('icosahedral group and cell structure', () => {
  assert.equal(GROUP.length, 120);
  assert.equal(ROTATIONS.length, 60);
  assert.equal(PLANE_STABILISER.length, 6);
  const layout = shells().map((s) => s.types.length);
  assert.deepEqual(layout, [1, 1, 1, 1, 2, 2, 2, 1], 'shells a-h with e, f, g split in two');
  assert.equal(CELL_TYPES.length, 11);
  const chiral = CELL_TYPES.filter((t) => t.halves.length === 2);
  assert.equal(chiral.length, 1, 'only f1 is chiral');
  assert.equal(chiral[0], cellNames().f1);
});

test('catalog has the 59 stellations, 32 reflexible and 27 chiral', () => {
  assert.equal(catalog.length, 59);
  assert.deepEqual(catalog.map((s) => s.index), Array.from({ length: 59 }, (_, i) => i + 1));
  assert.equal(catalog.filter((s) => s.chiral).length, 27);
});

test('surfaces match the face sets listed on Wikipedia for all 59 (and fix e1/e2, g1/g2)', () => {
  const expected = faceNumberSignatures();
  for (const e of [0, 1]) {
    for (const g of [0, 1]) {
      const got = regionSignatures(cellNames({ e, g }));
      const same = got.size === expected.size && [...got].every((s) => expected.has(s));
      assert.equal(same, e === 0 && g === 0, `labelling e=${e} g=${g}`);
    }
  }
});

test('the icosahedron (1) is one triangle per plane with edge 2', () => {
  const regions = surfaceRegions(getStellation('stellation-1').cellSet);
  assert.equal(regions.length, 1);
  assert.equal(regions[0].polygon.length, 3);
  assert.ok(Math.abs(area(regions[0].polygon) - Math.sqrt(3)) < 1e-9);
});

test('compound of five tetrahedra (47): each plane shows parts of one centred equilateral triangle', () => {
  const regions = surfaceRegions(getStellation('stellation-47').cellSet);
  const points = regions.flatMap((r) => r.polygon);
  // Convex hull of all region vertices (gift wrapping).
  const hull = [];
  let p = points.reduce((a, b) => (b[0] < a[0] ? b : a));
  do {
    hull.push(p);
    let q = points[0];
    for (const r of points) {
      const c = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
      const farther = Math.hypot(r[0] - p[0], r[1] - p[1]) > Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (q === p || c < -1e-9 || (Math.abs(c) <= 1e-9 && farther)) q = r;
    }
    p = q;
  } while (p !== hull[0] && hull.length < 100);
  assert.equal(hull.length, 3, 'outline is a triangle');
  const sides = hull.map((a, i) => Math.hypot(a[0] - hull[(i + 1) % 3][0], a[1] - hull[(i + 1) % 3][1]));
  assert.ok(Math.max(...sides) - Math.min(...sides) < 1e-9, 'equilateral');
  const centre = [(hull[0][0] + hull[1][0] + hull[2][0]) / 3, (hull[0][1] + hull[1][1] + hull[2][1]) / 3];
  assert.ok(Math.hypot(...centre) < 1e-9, 'centred on the face');
});

test('reflexible stellations are mirror symmetric; chiral ones are not', () => {
  const mirror = PLANE_STABILISER.find((g) => determinant(g) < 0);
  for (const entry of catalog) {
    const regions = surfaceRegions(getStellation(entry.id).cellSet);
    assert.ok(regions.length > 0, `${entry.index} has a surface`);
    const fmt = (v) => v.map((x) => (Math.abs(x) < 5e-7 ? 0 : x).toFixed(5)).join(',');
    const centres = regions.map((r) => to3D(r.centre2D));
    const keys = new Set(centres.map(fmt));
    const symmetric = centres.every((c) => keys.has(fmt(matVec(mirror, c))));
    assert.equal(symmetric, !entry.chiral, `stellation ${entry.index}`);
  }
});

test('mesh data is finite and scaled to the unit sphere', () => {
  for (const entry of catalog) {
    const mesh = meshData(getStellation(entry.id).cellSet);
    assert.ok(mesh.positions.length > 0 && mesh.positions.length % 9 === 0);
    assert.ok(mesh.positions.every(Number.isFinite) && mesh.edges.every(Number.isFinite));
    let max = 0;
    for (let i = 0; i < mesh.positions.length; i += 3) max = Math.max(max, Math.hypot(mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]));
    assert.ok(Math.abs(max - 1) < 1e-6, `stellation ${entry.index}`);
  }
});

test('diagram regions are bounded and every one touches a bounded cell', () => {
  assert.ok(DIAGRAM.every((r) => r.inside.bounded || r.outside.bounded));
});
