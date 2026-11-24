// Registry of the 59 stellations: catalog metadata plus cell sets.

import catalog from './catalog.js';
import { parseCells } from './geometry/stellation.js';

export const stellations = catalog;

const cache = new Map();

/** Catalog entry plus its cell set, or null. */
export function getStellation(id, { mirror = false } = {}) {
  const entry = catalog.find((s) => s.id === id);
  if (!entry) return null;
  const mirrored = Boolean(mirror && entry.chiral);
  const key = mirrored ? `${id}:mirror` : id;
  if (!cache.has(key)) {
    cache.set(key, { ...entry, cellSet: parseCells(entry.cells, { chiralF1: entry.chiral, mirror: mirrored }) });
  }
  return cache.get(key);
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
  const symmetry = entry.chiral ? 'Chiral' : 'Reflexible';
  const wenninger = entry.wenninger ? ` Wenninger ${entry.wenninger.split(' ')[0]}.` : '';
  return `${symmetry}.${wenninger}`;
}

const normalizeSearch = (text) =>
  String(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const searchIndex = new WeakMap();
function searchableText(entry) {
  if (!searchIndex.has(entry)) {
    const parts = [
      entry.index,
      `#${entry.index}`,
      entry.id,
      entry.title,
      entry.name ?? '',
      entry.cells,
      entry.faces,
      entry.wenninger ?? '',
      entry.wheeler ?? '',
      entry.bruckner ?? '',
      entry.chiral ? 'chiral enantiomorphic' : 'reflexible',
      GROUPS[groupOf(entry)],
    ];
    searchIndex.set(entry, normalizeSearch(parts.join(' ')));
  }
  return searchIndex.get(entry);
}

/** Whether a catalog entry matches the selected gallery group and search query. */
export function matchesFilter(entry, { group = 'all', query = '' } = {}) {
  if (group !== 'all' && groupOf(entry) !== group) return false;
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchableText(entry);
  return terms.every((term) => haystack.includes(term));
}

export default stellations;
