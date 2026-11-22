// Registry of the 59 stellations: catalog metadata plus cell sets.

import catalog from './catalog.js';
import { parseCells } from './geometry/stellation.js';

export const stellations = catalog;

const cache = new Map();

/** Catalog entry plus its cell set, or null. */
export function getStellation(id) {
  const entry = catalog.find((s) => s.id === id);
  if (!entry) return null;
  if (!cache.has(id)) cache.set(id, { ...entry, cellSet: parseCells(entry.cells, { chiralF1: entry.chiral }) });
  return cache.get(id);
}

export const GROUPS = {
  mainline: 'Main line',
  reflexible: 'Other reflexible stellations',
  chiral: 'Chiral stellations',
};

/** Gallery group of an entry. */
export function groupOf(entry) {
  if (entry.mainline) return 'mainline';
  return entry.chiral ? 'chiral' : 'reflexible';
}

/** One-line description for cards and page headers. */
export function describe(entry) {
  const symmetry = entry.chiral ? 'Chiral, right-handed form' : 'Reflexible';
  const wenninger = entry.wenninger ? ` Wenninger ${entry.wenninger.split(' ')[0]}.` : '';
  return `${symmetry}.${wenninger}`;
}

export default stellations;
