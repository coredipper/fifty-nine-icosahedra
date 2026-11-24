// Geometry tests. Run with `npm test` (Node 18+, no dependencies).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import catalog from '../js/catalog.js';
import { getStellation, matchesFilter } from '../js/registry.js';
import {
  CELL_TYPES, DIAGRAM, GROUP, PLANE_STABILISER, ROTATIONS, cellNames, parseCells, regionType,
  shells, surfaceRegions, to3D,
} from '../js/geometry/stellation.js';
import { meshData } from '../js/geometry/mesh.js';
import { cross, determinant, dot, length, matVec, sub } from '../js/geometry/vec.js';

const area = (P) => Math.abs(P.reduce((s, p, i) => s + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0)) / 2;
const fmt3 = (v) => v.map((x) => (Math.abs(x) < 5e-6 ? 0 : x).toFixed(5)).join(',');

/** Signature of each region type: the stellations whose surface uses it. */
function regionSignatureMap(names) {
  const sig = new Map();
  for (const row of catalog) {
    const set = parseCells(row.cells, { chiralF1: row.chiral, names });
    for (const region of surfaceRegions(set)) {
      const k = regionType(region);
      if (!sig.has(k)) sig.set(k, new Set());
      sig.get(k).add(row.index);
    }
  }
  return new Map([...sig.entries()].map(([k, s]) => [k, [...s].sort((a, b) => a - b).join(',')]));
}

/** Signature of each face number in Wikipedia's "Faces" column. */
function faceNumberSignatureMap() {
  const sig = new Map();
  for (const row of catalog) {
    for (const n of row.faces.replace(/'/g, '').split(/\s+/)) {
      if (!sig.has(n)) sig.set(n, new Set());
      sig.get(n).add(row.index);
    }
  }
  return new Map([...sig.entries()].map(([k, s]) => [k, [...s].sort((a, b) => a - b).join(',')]));
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

test('surfaces match Wikipedia face sets and underside orientations for all 59 (and fix e1/e2, g1/g2)', () => {
  const expectedByNum = faceNumberSignatureMap();
  const expectedSigs = new Set(expectedByNum.values());
  const sigToNum = new Map([...expectedByNum.entries()].map(([num, sig]) => [sig, num]));

  for (const e of [0, 1]) {
    for (const g of [0, 1]) {
      const gotMap = regionSignatureMap(cellNames({ e, g }));
      const gotSigs = new Set(gotMap.values());
      const same = gotSigs.size === expectedSigs.size && [...gotSigs].every((s) => expectedSigs.has(s));
      assert.equal(same, e === 0 && g === 0, `labelling e=${e} g=${g}`);

      if (e === 0 && g === 0) {
        for (const row of catalog) {
          const set = getStellation(row.id).cellSet;
          const computed = new Set(
            surfaceRegions(set).map((r) => {
              const num = sigToNum.get(gotMap.get(regionType(r)));
              return r.outward ? num : `${num}'`;
            }),
          );
          const expected = new Set(row.faces.split(/\s+/));
          assert.deepEqual(computed, expected, `oriented faces for stellation ${row.index}`);
        }
      }
    }
  }
});

test('the icosahedron (1) is one triangle per plane with edge 2', () => {
  const regions = surfaceRegions(getStellation('stellation-1').cellSet);
  assert.equal(regions.length, 1);
  assert.equal(regions[0].polygon.length, 3);
  assert.equal(regions[0].outward, true);
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

test('reflexible stellations are mirror symmetric; chiral ones pair under mirror reflection', () => {
  const mirror = PLANE_STABILISER.find((g) => determinant(g) < 0);
  for (const entry of catalog) {
    const regions = surfaceRegions(getStellation(entry.id).cellSet);
    assert.ok(regions.length > 0, `${entry.index} has a surface`);
    const centres = regions.map((r) => to3D(r.centre2D));
    const keys = new Set(centres.map(fmt3));
    const symmetric = centres.every((c) => keys.has(fmt3(matVec(mirror, c))));
    assert.equal(symmetric, !entry.chiral, `stellation ${entry.index}`);

    const mirroredRegions = surfaceRegions(getStellation(entry.id, { mirror: true }).cellSet);
    const mirroredKeys = new Set(mirroredRegions.map((r) => fmt3(to3D(r.centre2D))));
    const reflectedKeys = new Set(centres.map((c) => fmt3(matVec(mirror, c))));
    assert.deepEqual(mirroredKeys, reflectedKeys, `mirror enantiomorph for stellation ${entry.index}`);
  }
});

test('mesh data is closed, outward-oriented, finite and scaled to the unit sphere', () => {
  for (const entry of catalog) {
    const mesh = meshData(getStellation(entry.id).cellSet);
    assert.ok(mesh.positions.length > 0 && mesh.positions.length % 9 === 0);
    assert.equal(mesh.normals.length, mesh.positions.length);
    assert.equal(mesh.planes.length, mesh.positions.length / 3);
    assert.ok(mesh.positions.every(Number.isFinite) && mesh.normals.every(Number.isFinite) && mesh.edges.every(Number.isFinite));

    let max = 0;
    let signedVolume = 0;
    const directedEdges = new Map();
    const edgeNormals = new Map();

    for (let i = 0; i < mesh.positions.length; i += 9) {
      const a = [mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]];
      const b = [mesh.positions[i + 3], mesh.positions[i + 4], mesh.positions[i + 5]];
      const c = [mesh.positions[i + 6], mesh.positions[i + 7], mesh.positions[i + 8]];
      const na = [mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]];
      const nb = [mesh.normals[i + 3], mesh.normals[i + 4], mesh.normals[i + 5]];
      const nc = [mesh.normals[i + 6], mesh.normals[i + 7], mesh.normals[i + 8]];

      max = Math.max(max, length(a), length(b), length(c));
      assert.ok(Math.abs(length(na) - 1) < 1e-5, `unit normal on stellation ${entry.index}`);
      assert.ok(length(sub(na, nb)) < 1e-6 && length(sub(na, nc)) < 1e-6, `flat normal on stellation ${entry.index}`);

      const geomNormal = cross(sub(b, a), sub(c, a));
      assert.ok(dot(geomNormal, na) > 0, `outward winding on stellation ${entry.index}`);
      signedVolume += dot(a, cross(b, c)) / 6;

      const verts = [a, b, c];
      const nKey = fmt3(na);
      for (let e = 0; e < 3; e++) {
        const ka = fmt3(verts[e]);
        const kb = fmt3(verts[(e + 1) % 3]);
        const dirKey = `${ka}>${kb}`;
        directedEdges.set(dirKey, (directedEdges.get(dirKey) ?? 0) + 1);
        const undirKey = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        if (!edgeNormals.has(undirKey)) edgeNormals.set(undirKey, []);
        edgeNormals.get(undirKey).push(nKey);
      }
    }

    assert.ok(Math.abs(max - 1) < 1e-6, `unit sphere scale on stellation ${entry.index}`);
    assert.ok(signedVolume > 0, `positive signed volume on stellation ${entry.index}`);

    for (const [dirKey, count] of directedEdges) {
      const [ka, kb] = dirKey.split('>');
      assert.equal(directedEdges.get(`${kb}>${ka}`), count, `closed surface on stellation ${entry.index}`);
    }

    // Verify 3D edges: unique, symmetric, and matching every non-coplanar feature edge (including pinch edges).
    const actualEdges = new Set();
    for (let i = 0; i < mesh.edges.length; i += 6) {
      const a = [mesh.edges[i], mesh.edges[i + 1], mesh.edges[i + 2]];
      const b = [mesh.edges[i + 3], mesh.edges[i + 4], mesh.edges[i + 5]];
      assert.ok(length(sub(a, b)) > 1e-4, `non-degenerate edge on stellation ${entry.index}`);
      const ka = fmt3(a);
      const kb = fmt3(b);
      const undirKey = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      assert.equal(actualEdges.has(undirKey), false, `no duplicate 3D edge on stellation ${entry.index}`);
      actualEdges.add(undirKey);
    }

    const expectedEdges = new Set();
    for (const [undirKey, normals] of edgeNormals) {
      if (new Set(normals).size > 1) expectedEdges.add(undirKey);
    }
    assert.deepEqual(actualEdges, expectedEdges, `exact feature edges on stellation ${entry.index}`);
  }
});

test('parseCells and meshData reject invalid or empty inputs', () => {
  for (const bad of ['', ' ', 'e', 'f', 'g', 'a1', 'e3', 'I', 'Ef1 ', null]) {
    assert.throws(() => parseCells(bad), `rejects ${JSON.stringify(bad)}`);
  }
  assert.throws(() => meshData({ types: new Set(), halves: new Set() }));
});

test('diagram regions are bounded and every one touches a bounded cell', () => {
  assert.ok(DIAGRAM.every((r) => r.inside.bounded || r.outside.bounded));
});

test('gallery filter matches by group, number, name, cells, catalogue, and diacritics', () => {
  assert.equal(catalog.filter((s) => matchesFilter(s)).length, 59);
  assert.equal(catalog.filter((s) => matchesFilter(s, { group: 'mainline' })).length, 8);
  assert.equal(catalog.filter((s) => matchesFilter(s, { group: 'reflexible' })).length, 24);
  assert.equal(catalog.filter((s) => matchesFilter(s, { group: 'chiral' })).length, 27);

  // Diacritic-insensitive Wheeler match (Möbius)
  const mobius = catalog.filter((s) => matchesFilter(s, { query: 'mobius' }));
  assert.deepEqual(mobius.map((s) => s.index), [26]);

  // Multi-term query combining catalogue and symmetry
  const w24 = catalog.filter((s) => matchesFilter(s, { query: 'chiral W24' }));
  assert.deepEqual(w24.map((s) => s.index), [47]);

  // Cell notation + group combination
  const ef1Chiral = catalog.filter((s) => matchesFilter(s, { group: 'chiral', query: 'Ef1g1' }));
  assert.deepEqual(ef1Chiral.map((s) => s.index), [50]);

  // Number lookup with # prefix
  const num8 = catalog.filter((s) => matchesFilter(s, { query: '#8' }));
  assert.deepEqual(num8.map((s) => s.index), [8]);

  // Unmatched query
  assert.equal(catalog.filter((s) => matchesFilter(s, { query: 'nonexistent-shape' })).length, 0);
});
