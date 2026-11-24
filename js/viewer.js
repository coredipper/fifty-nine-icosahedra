// Interactive viewer for one stellation (viewer.html?shape=<id>).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GROUPS, describe, getStellation, groupOf, stellations } from './registry.js';
import {
  addLights, createEdgeMaterial, createFaceMaterial, createRenderer,
  createStellationObject, onReducedMotionChange, prefersReducedMotion, renderCells,
} from './render.js';

const $ = (id) => document.getElementById(id);
const shapeIdFromUrl = () => new URLSearchParams(window.location.search).get('shape');
const indexForId = (id) => stellations.findIndex((s) => s.id === id);

const mobileQuery = window.matchMedia('(max-width: 600px)');
const syncDetailsOpen = () => {
  $('shape-details').open = !mobileQuery.matches;
};
syncDetailsOpen();
mobileQuery.addEventListener('change', syncDetailsOpen);

const initialId = shapeIdFromUrl();
const initialIndex = indexForId(initialId);

if (initialIndex < 0) {
  document.title = `${initialId ? 'Stellation not found' : 'No stellation specified'} · The Fifty-Nine Icosahedra`;
  $('shape-name').textContent = initialId ? 'Stellation not found' : 'No stellation specified';
  $('shape-description').textContent = initialId
    ? `There is no stellation with the id "${initialId}".`
    : 'Open a stellation from the gallery.';
  $('viewer-panel').hidden = true;
} else {
  try {
    initViewer(initialIndex);
  } catch (error) {
    console.error(error);
    $('shape-name').textContent = 'Could not build this stellation';
    $('shape-description').textContent = error instanceof Error ? error.message : String(error);
    $('viewer-panel').hidden = true;
  }
}

function showInfo(s, { mirror = false } = {}) {
  document.title = `${s.title} · The Fifty-Nine Icosahedra`;
  $('back-link').href = `index.html#${encodeURIComponent(s.id)}`;
  $('shape-family').textContent = `${GROUPS[groupOf(s)]} · No. ${s.index} of 59`;
  $('shape-name').textContent = s.title;
  $('shape-description').textContent = describe(s);

  const list = $('shape-facts');
  list.replaceChildren();
  const add = (term, value) => {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    if (typeof value === 'function') value(dd);
    else dd.textContent = value;
    list.append(dt, dd);
  };
  add('Cells', (dd) => renderCells(dd, s));
  add('Diagram faces', s.faces);
  add(
    'Symmetry',
    s.chiral
      ? (mirror ? 'Chiral (I), enantiomorphic (mirrored)' : 'Chiral (I), enantiomorphic')
      : 'Reflexible (Ih)',
  );
  if (s.wenninger) add('Wenninger', s.wenninger);
  if (s.wheeler) add('Wheeler', s.wheeler);
  if (s.bruckner) add('Brückner', s.bruckner);
}

function updateNavigation(index) {
  const neighbour = (step) => stellations[(index + step + stellations.length) % stellations.length];
  const link = (element, entry, label) => {
    element.href = `viewer.html?shape=${encodeURIComponent(entry.id)}`;
    element.title = `${label}: ${entry.title}`;
    element.setAttribute('aria-label', `${label}: ${entry.title}`);
  };
  link($('prev-link'), neighbour(-1), 'Previous');
  link($('next-link'), neighbour(1), 'Next');
  $('position').textContent = `${index + 1} / ${stellations.length}`;
}

function initViewer(startIndex) {
  let currentIndex = startIndex;
  let edgesVisible = true;
  let coloured = false;
  let mirror = false;

  const setPressed = (button, on) => button.setAttribute('aria-pressed', String(on));

  const container = $('canvas-container');
  const renderer = createRenderer();
  if (!renderer) {
    const initial = getStellation(stellations[currentIndex].id);
    showInfo(initial);
    updateNavigation(currentIndex);
    container.textContent = 'This viewer needs WebGL, which is not available in this browser.';
    container.classList.add('webgl-error');
    return;
  }

  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  renderer.setSize(width, height);
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  addLights(scene);
  const faceMaterial = createFaceMaterial({ vertexColors: true });
  const edgeMaterial = createEdgeMaterial(0.4);

  // Camera distance that keeps the bounding sphere (radius 1.5) in view,
  // using the narrower field of view (portrait phones).
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  const fitDistance = () => {
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const halfFov = Math.min(vertical, horizontal);
    return (1.41 * 1.5) / Math.sin(halfFov);
  };
  camera.position.set(0, 0, Math.min(25, Math.max(2, fitDistance())));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 25;
  controls.autoRotate = !prefersReducedMotion();
  controls.autoRotateSpeed = 1.2;

  let currentObject = null;
  const loadStellation = (index, { push = false } = {}) => {
    currentIndex = (index + stellations.length) % stellations.length;
    const entry = stellations[currentIndex];
    const stellation = getStellation(entry.id, { mirror });
    const nextObject = createStellationObject(stellation.cellSet, {
      radius: 1.5,
      faceMaterial,
      edgeMaterial,
    });
    if (currentObject) {
      nextObject.rotation.copy(currentObject.rotation);
      scene.remove(currentObject);
      currentObject.userData.dispose();
    } else {
      nextObject.rotation.set(0.35, 0.6, 0);
    }
    nextObject.userData.edges.visible = edgesVisible;
    nextObject.userData.setColoured(coloured);
    scene.add(nextObject);
    currentObject = nextObject;

    showInfo(stellation, { mirror: stellation.chiral && mirror });
    updateNavigation(currentIndex);
    renderer.domElement.setAttribute('aria-label', `3D model of ${stellation.title}`);

    const mirrorButton = $('toggle-mirror');
    mirrorButton.hidden = !stellation.chiral;
    setPressed(mirrorButton, mirror);

    if (push) {
      const url = `viewer.html?shape=${encodeURIComponent(entry.id)}`;
      window.history.pushState({ shape: entry.id }, '', url);
    }
    requestRender();
  };

  // On-demand render loop: runs continuously only while auto-rotating,
  // dragging, or settling OrbitControls damping, then goes idle.
  let rafId = 0;
  let interacting = false;
  let contextLost = false;
  const prevPosition = new THREE.Vector3();
  const prevTarget = new THREE.Vector3();

  const frame = () => {
    rafId = 0;
    if (contextLost) return;
    prevPosition.copy(camera.position);
    prevTarget.copy(controls.target);
    controls.update();
    renderer.render(scene, camera);

    const moved =
      prevPosition.distanceToSquared(camera.position) > 1e-10 ||
      prevTarget.distanceToSquared(controls.target) > 1e-10;
    if (controls.autoRotate || interacting || moved) {
      rafId = window.requestAnimationFrame(frame);
    }
  };

  const requestRender = () => {
    if (!rafId && !contextLost) {
      rafId = window.requestAnimationFrame(frame);
    }
  };

  controls.addEventListener('start', () => {
    interacting = true;
    requestRender();
  });
  controls.addEventListener('end', () => {
    interacting = false;
    requestRender();
  });
  controls.addEventListener('change', requestRender);

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    requestRender();
  });

  const rotateButton = $('toggle-rotate');
  setPressed(rotateButton, controls.autoRotate);
  rotateButton.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    setPressed(rotateButton, controls.autoRotate);
    requestRender();
  });
  onReducedMotionChange((reduced) => {
    if (reduced && controls.autoRotate) {
      controls.autoRotate = false;
      setPressed(rotateButton, false);
    }
  });

  const edgesButton = $('toggle-edges');
  setPressed(edgesButton, edgesVisible);
  edgesButton.addEventListener('click', () => {
    edgesVisible = !edgesVisible;
    currentObject.userData.edges.visible = edgesVisible;
    setPressed(edgesButton, edgesVisible);
    requestRender();
  });

  const coloursButton = $('toggle-colours');
  setPressed(coloursButton, coloured);
  coloursButton.addEventListener('click', () => {
    coloured = !coloured;
    currentObject.userData.setColoured(coloured);
    setPressed(coloursButton, coloured);
    requestRender();
  });

  const mirrorButton = $('toggle-mirror');
  mirrorButton.addEventListener('click', () => {
    mirror = !mirror;
    setPressed(mirrorButton, mirror);
    loadStellation(currentIndex);
  });

  const handleStepClick = (step) => (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    loadStellation(currentIndex + step, { push: true });
  };
  $('prev-link').addEventListener('click', handleStepClick(-1));
  $('next-link').addEventListener('click', handleStepClick(1));

  // Arrow keys browse. No single-letter shortcuts (WCAG 2.1.4).
  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft') loadStellation(currentIndex - 1, { push: true });
    else if (event.key === 'ArrowRight') loadStellation(currentIndex + 1, { push: true });
  });

  window.addEventListener('popstate', () => {
    const nextIndex = indexForId(shapeIdFromUrl());
    if (nextIndex >= 0 && nextIndex !== currentIndex) loadStellation(nextIndex);
  });

  const offset = new THREE.Vector3();
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === 0 || h === 0) return;
    const before = fitDistance();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const after = fitDistance();
    offset.copy(camera.position).sub(controls.target);
    const nextDist = THREE.MathUtils.clamp(offset.length() * (after / before), controls.minDistance, controls.maxDistance);
    offset.setLength(nextDist);
    camera.position.copy(controls.target).add(offset);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    requestRender();
  });

  loadStellation(startIndex);
}
