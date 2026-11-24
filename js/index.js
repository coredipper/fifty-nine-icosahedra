// Gallery page: one card per stellation, each with a rotating preview.
// All previews share one WebGL renderer, scene, lights and materials: a fixed,
// full-window canvas is drawn into each visible card's rectangle with scissor tests.

import * as THREE from 'three';
import { GROUPS, describe, getStellation, groupOf, matchesFilter, stellations } from './registry.js';
import {
  addLights, createEdgeMaterial, createFaceMaterial, createRenderer,
  createStellationObject, onReducedMotionChange, prefersReducedMotion, renderCells,
} from './render.js';

const grid = document.getElementById('grid');
const filterGroups = document.getElementById('filter-groups');
const searchInput = document.getElementById('gallery-search');
const statusEl = document.getElementById('gallery-status');
const emptyEl = document.getElementById('gallery-empty');
const emptyMessage = document.getElementById('gallery-empty-message');
const resetButton = document.getElementById('gallery-reset');

const previews = [];
const previewByElement = new Map();
const sections = [];

for (const [group, label] of Object.entries(GROUPS)) {
  const members = stellations.filter((s) => groupOf(s) === group);
  const heading = document.createElement('h2');
  heading.className = 'family-heading';
  heading.textContent = `${label} (${members.length})`;
  grid.appendChild(heading);

  const items = [];
  for (const entry of members) {
    const { card, item } = createCard(entry);
    grid.appendChild(card);
    items.push(item);
  }
  sections.push({ group, label, heading, items });
}

function createCard(entry) {
  const card = document.createElement('a');
  card.id = entry.id;
  card.className = 'polyhedron-card';
  card.href = `viewer.html?shape=${encodeURIComponent(entry.id)}`;

  const preview = document.createElement('div');
  preview.className = 'card-preview';
  card.appendChild(preview);

  const info = document.createElement('div');
  info.className = 'card-info';
  const title = document.createElement('h3');
  title.textContent = entry.name ? `${entry.index}. ${entry.name}` : `Stellation ${entry.index}`;
  const description = document.createElement('p');
  description.textContent = describe(entry);
  const tag = document.createElement('span');
  tag.className = 'card-tag';
  renderCells(tag, entry);
  info.append(title, description, tag);
  card.appendChild(info);

  const item = { entry, card, element: preview, object: null, phase: previews.length * 0.7, visible: false, failed: false };
  previews.push(item);
  previewByElement.set(preview, item);
  return { card, item };
}

// Group filter chips + search input.
const FILTER_LABELS = [
  ['all', `All (${stellations.length})`],
  ['mainline', `Main line (${sections.find((s) => s.group === 'mainline').items.length})`],
  ['reflexible', `Other reflexible (${sections.find((s) => s.group === 'reflexible').items.length})`],
  ['chiral', `Chiral (${sections.find((s) => s.group === 'chiral').items.length})`],
];

let activeGroup = 'all';
let scheduleRender = () => {};
const groupButtons = new Map();

for (const [group, label] of FILTER_LABELS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'control-button';
  button.textContent = label;
  button.setAttribute('aria-pressed', String(group === activeGroup));
  button.addEventListener('click', () => {
    if (activeGroup === group) return;
    activeGroup = group;
    for (const [key, btn] of groupButtons) btn.setAttribute('aria-pressed', String(key === activeGroup));
    applyFilter();
  });
  groupButtons.set(group, button);
  filterGroups.appendChild(button);
}

function applyFilter() {
  const query = searchInput.value;
  const filtered = activeGroup !== 'all' || query.trim() !== '';
  let shown = 0;

  for (const section of sections) {
    let sectionShown = 0;
    for (const item of section.items) {
      const match = matchesFilter(item.entry, { group: activeGroup, query });
      item.card.hidden = !match;
      if (match) sectionShown += 1;
    }
    section.heading.hidden = sectionShown === 0;
    section.heading.textContent =
      filtered && sectionShown !== section.items.length
        ? `${section.label} (${sectionShown} of ${section.items.length})`
        : `${section.label} (${section.items.length})`;
    shown += sectionShown;
  }

  emptyEl.hidden = shown > 0;
  if (shown === 0) {
    const trimmed = query.trim();
    emptyMessage.textContent = trimmed
      ? `No stellations match "${trimmed}".`
      : 'No stellations match the active filter.';
  }
  statusEl.textContent = filtered
    ? `Showing ${shown} of ${stellations.length} stellations.`
    : '';
  scheduleRender();
}

searchInput.addEventListener('input', applyFilter);
resetButton.addEventListener('click', () => {
  activeGroup = 'all';
  for (const [key, btn] of groupButtons) btn.setAttribute('aria-pressed', String(key === activeGroup));
  searchInput.value = '';
  applyFilter();
  searchInput.focus();
});
window.addEventListener('pageshow', applyFilter);
if (searchInput.value) applyFilter();

const renderer = createRenderer();
if (!renderer) {
  document.body.classList.add('no-webgl');
} else {
  const canvas = renderer.domElement;
  canvas.className = 'gallery-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  renderer.setScissorTest(true);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  addLights(scene);
  const faceMaterial = createFaceMaterial({ vertexColors: false });
  const edgeMaterial = createEdgeMaterial(0.3);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  let rafId = 0;
  let contextLost = false;
  let elapsed = 0;
  let lastTime = null;

  const renderFrame = (now) => {
    rafId = 0;
    if (contextLost || document.hidden) {
      lastTime = null;
      return;
    }

    const spin = !prefersReducedMotion();
    if (spin) {
      if (lastTime !== null) elapsed += Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
    } else {
      lastTime = null;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width === 0 || height === 0) return;

    renderer.setScissor(0, 0, width, height);
    renderer.clear();

    for (const preview of previews) {
      if (preview.card.hidden || !preview.visible || !preview.object) continue;
      const rect = preview.element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > height || rect.width === 0 || rect.height === 0) continue;

      renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height);
      renderer.setScissor(rect.left, height - rect.bottom, rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();

      if (spin) {
        preview.object.rotation.set(0.12 * elapsed + preview.phase, 0.3 * elapsed + preview.phase, 0);
      }
      scene.add(preview.object);
      renderer.render(scene, camera);
      scene.remove(preview.object);
    }

    if (spin) requestRender();
  };

  const requestRender = () => {
    if (!rafId && !contextLost && !document.hidden) {
      rafId = window.requestAnimationFrame(renderFrame);
    }
  };
  scheduleRender = requestRender;

  const initPreview = (preview) => {
    const object = createStellationObject(getStellation(preview.entry.id).cellSet, {
      radius: 1,
      colourable: false,
      faceMaterial,
      edgeMaterial,
    });
    object.rotation.set(preview.phase, preview.phase, 0);
    preview.object = object;
  };

  // Build each preview the first time its card scrolls into view.
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const preview = previewByElement.get(target);
      if (!preview) continue;
      preview.visible = isIntersecting;
      if (isIntersecting && !preview.object && !preview.failed) {
        try {
          initPreview(preview);
        } catch (error) {
          preview.failed = true; // keep the card; skip only its preview
          console.error(`Could not build stellation ${preview.entry.index}:`, error);
        }
      }
    }
    requestRender();
  }, { rootMargin: '100px' });
  for (const preview of previews) observer.observe(preview.element);

  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width === 0 || height === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    requestRender();
  });
  window.addEventListener('scroll', requestRender, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastTime = null;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    } else {
      requestRender();
    }
  });
  onReducedMotionChange(() => requestRender());

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    lastTime = null;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    requestRender();
  });

  requestRender();
}
