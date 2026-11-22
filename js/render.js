// Shared three.js setup for the gallery and the viewer.

import * as THREE from 'three';
import { meshData } from './geometry/mesh.js';

export const FACE_COLOR = 0x7aa2f7;

export function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(5, 10, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(FACE_COLOR, 0.8);
  rim.position.set(-5, -5, -5);
  scene.add(rim);
}

/** One colour per face plane, spread round the hue circle. */
const PLANE_COLORS = Array.from({ length: 20 }, (_, i) => new THREE.Color().setHSL((i * 0.618034) % 1, 0.55, 0.6));

/**
 * Mesh plus edge lines for a cell set. Returns a group with userData.mesh,
 * userData.edges and userData.setColoured(on) to switch per-plane colours.
 */
export function createStellationObject(cellSet, { radius = 1, edgeOpacity = 0.3 } = {}) {
  const data = meshData(cellSet, radius);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  const colors = new Float32Array(data.positions.length);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const base = new THREE.Color(FACE_COLOR);
  const setColoured = (on) => {
    for (let v = 0; v < data.planes.length; v++) {
      const c = on ? PLANE_COLORS[data.planes[v]] : base;
      colors[3 * v] = c.r;
      colors[3 * v + 1] = c.g;
      colors[3 * v + 2] = c.b;
    }
    geometry.attributes.color.needsUpdate = true;
  };
  setColoured(false);

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.3,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
    // Push faces back slightly so the edge lines do not z-fight with them.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(data.edges, 3));
  const edges = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: edgeOpacity }),
  );

  const group = new THREE.Group();
  group.add(mesh, edges);
  group.userData = { mesh, edges, setColoured, regionCount: data.regionCount };
  return group;
}

/** WebGL renderer, or null when WebGL is not available. */
export function createRenderer(options) {
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, ...options });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    return renderer;
  } catch (error) {
    console.error('WebGL is not available:', error);
    return null;
  }
}

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = () => reducedMotionQuery.matches;

/** Append Coxeter's cell notation to an element, with the chiral f1 in italics. */
export function renderCells(element, entry) {
  for (const token of entry.cells.match(/[A-H]|[a-h][12]?/g)) {
    if (entry.chiral && token === 'f1') {
      const em = document.createElement('em');
      em.textContent = token;
      element.appendChild(em);
    } else {
      element.appendChild(document.createTextNode(token));
    }
  }
}
