// Interactive viewer for one stellation (viewer.html?shape=<id>).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GROUPS, describe, getStellation, groupOf, stellations } from './registry.js';
import { addLights, createRenderer, createStellationObject, prefersReducedMotion, renderCells } from './render.js';

const $ = (id) => document.getElementById(id);
const shapeId = new URLSearchParams(window.location.search).get('shape');
const index = stellations.findIndex((s) => s.id === shapeId);

if (index < 0) {
  $('shape-name').textContent = shapeId ? 'Stellation not found' : 'No stellation specified';
  $('shape-description').textContent = shapeId
    ? `There is no stellation with the id "${shapeId}".`
    : 'Open a stellation from the gallery.';
  $('viewer-panel').hidden = true;
} else {
  try {
    const stellation = getStellation(shapeId);
    showInfo(stellation);
    setUpNavigation();
    initViewer(stellation);
  } catch (error) {
    console.error(error);
    $('shape-name').textContent = 'Could not build this stellation';
    $('shape-description').textContent = error instanceof Error ? error.message : String(error);
    $('viewer-panel').hidden = true;
  }
}

function showInfo(s) {
  document.title = `${s.title} · The Fifty-Nine Icosahedra`;
  $('shape-family').textContent = `${GROUPS[groupOf(s)]} · No. ${s.index} of 59`;
  $('shape-name').textContent = s.title;
  $('shape-description').textContent = describe(s);

  const list = $('shape-facts');
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
  add('Symmetry', s.chiral ? 'Chiral (I), right-handed form' : 'Reflexible (Ih)');
  if (s.wenninger) add('Wenninger', s.wenninger);
  if (s.wheeler) add('Wheeler', s.wheeler);
  if (s.bruckner) add('Brückner', s.bruckner);
  if (window.matchMedia('(max-width: 600px)').matches) $('shape-details').open = false;
}

function setUpNavigation() {
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

function initViewer(stellation) {
  const container = $('canvas-container');
  const renderer = createRenderer();
  if (!renderer) {
    container.textContent = 'This viewer needs WebGL, which is not available in this browser.';
    container.classList.add('webgl-error');
    return;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', `3D model of ${stellation.title}`);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  addLights(scene);
  const object = createStellationObject(stellation.cellSet, { radius: 1.5, edgeOpacity: 0.35 });
  object.rotation.set(0.35, 0.6, 0);
  scene.add(object);

  // Camera distance that keeps the bounding sphere (radius 1.5) in view,
  // using the narrower field of view (portrait phones).
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  const fitDistance = () => {
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    return (1.41 * 1.5) / Math.sin(Math.min(vertical, horizontal));
  };
  camera.position.set(0, 0, fitDistance());

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 25;
  controls.autoRotate = !prefersReducedMotion();
  controls.autoRotateSpeed = 1.2;

  const setPressed = (button, on) => button.setAttribute('aria-pressed', String(on));
  const toggle = (id, initial, apply) => {
    let on = initial;
    const button = $(id);
    setPressed(button, on);
    button.addEventListener('click', () => {
      on = !on;
      apply(on);
      setPressed(button, on);
    });
  };
  toggle('toggle-rotate', controls.autoRotate, (on) => { controls.autoRotate = on; });
  toggle('toggle-edges', true, (on) => { object.userData.edges.visible = on; });
  toggle('toggle-colours', false, (on) => object.userData.setColoured(on));

  // Arrow keys browse. No single-letter shortcuts (WCAG 2.1.4).
  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft') $('prev-link').click();
    else if (event.key === 'ArrowRight') $('next-link').click();
  });

  window.addEventListener('resize', () => {
    const before = fitDistance();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.position.multiplyScalar(fitDistance() / before);
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}
