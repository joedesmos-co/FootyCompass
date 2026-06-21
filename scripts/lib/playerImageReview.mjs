/**
 * Curated manual-review queue for players where automated Wikimedia matching fails repeatedly.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTeamName, players } from '../../src/data/sampleData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const REVIEW_PATH = join(root, 'scripts/data/player-image-curated-review.mjs');
const CACHE_PATH = join(root, 'generated-data/player-image-wikimedia-cache.json');

export const MAX_AUTO_ATTEMPTS = 2;

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadReviewModuleText() {
  try {
    return readFileSync(REVIEW_PATH, 'utf8');
  } catch {
    return '';
  }
}

function parseReviewEntriesFromFile() {
  const text = loadReviewModuleText();
  const match = text.match(/entries:\s*\{([\s\S]*?)\n\s*\},?\s*\n\};/);
  if (!match) return {};

  const entries = {};
  const rowRe =
    /'([^']+)':\s*\{\s*name:\s*([^,]+),\s*club:\s*([^,]+),\s*reason:\s*([^,]+),\s*notes:\s*([^,]+),\s*addedAt:\s*([^}]+)\s*\}/g;

  for (const row of match[1].matchAll(rowRe)) {
    entries[row[1]] = {
      name: JSON.parse(row[2].trim()),
      club: JSON.parse(row[3].trim()),
      reason: JSON.parse(row[4].trim()),
      notes: JSON.parse(row[5].trim()),
      addedAt: JSON.parse(row[6].trim()),
    };
  }

  return entries;
}

export function getReviewEntries() {
  return parseReviewEntriesFromFile();
}

export function isOnReviewList(playerId) {
  return Boolean(getReviewEntries()[playerId]);
}

export function getSkipAttempts(cache, playerId) {
  return cache.skipped?.[playerId]?.attempts ?? (cache.skipped?.[playerId] ? 1 : 0);
}

export function shouldAutoRetry(cache, playerId) {
  if (isOnReviewList(playerId)) return false;
  return getSkipAttempts(cache, playerId) < MAX_AUTO_ATTEMPTS;
}

export function recordSkipAttempt(cache, playerId, reason) {
  cache.skipped ??= {};
  const prev = cache.skipped[playerId];
  const attempts = (prev?.attempts ?? (prev ? 1 : 0)) + 1;
  cache.skipped[playerId] = {
    reason,
    attempts,
    at: new Date().toISOString(),
    lastReason: reason,
  };
  return attempts;
}

function serializeReviewModule(entries) {
  const sorted = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));
  const lines = sorted.map(([id, row]) => {
    const player = players.find((p) => p.id === id);
    const name = row.name ?? player?.name ?? id;
    const club = row.club ?? getTeamName(player?.teamId);
    const reason = row.reason ?? 'no_safe_match';
    const notes = row.notes ?? 'Needs manual Commons file or licensed local asset.';
    return `    '${id}': { name: ${JSON.stringify(name)}, club: ${JSON.stringify(club)}, reason: ${JSON.stringify(reason)}, notes: ${JSON.stringify(notes)}, addedAt: ${JSON.stringify(row.addedAt ?? new Date().toISOString().slice(0, 10))} },`;
  });

  return `/**
 * Players where automated Wikimedia ingest failed ${MAX_AUTO_ATTEMPTS}+ times.
 * Add a verified commonsFile to wikimedia-player-curated.mjs, or a licensed local asset
 * in player-image-licensed.mjs, then remove the player from this list.
 */
export default {
  schemaVersion: 1,
  updatedAt: '${new Date().toISOString().slice(0, 10)}',
  entries: {
${lines.join('\n')}
  },
};
`;
}

export function promoteToReviewList(playerId, reason, notes = null) {
  const entries = getReviewEntries();
  if (entries[playerId]) return false;

  const player = players.find((p) => p.id === playerId);
  entries[playerId] = {
    name: player?.name ?? playerId,
    club: getTeamName(player?.teamId),
    reason,
    notes: notes ?? `Automated ingest stopped after ${MAX_AUTO_ATTEMPTS} attempts.`,
    addedAt: new Date().toISOString().slice(0, 10),
  };

  writeFileSync(REVIEW_PATH, `${serializeReviewModule(entries)}\n`, 'utf8');
  return true;
}

export function bootstrapReviewFromCache() {
  const cache = readJson(CACHE_PATH, { skipped: {} });
  let added = 0;

  for (const [playerId, row] of Object.entries(cache.skipped ?? {})) {
    const attempts = row.attempts ?? 1;
    if (attempts >= MAX_AUTO_ATTEMPTS && promoteToReviewList(playerId, row.lastReason ?? row.reason ?? 'no_safe_match')) {
      added += 1;
    }
  }

  return added;
}
