#!/usr/bin/env node
/**
 * Append quiz-eligible players missing from wikimedia-player-curated.mjs.
 *
 *   npm run expand:quiz-eligible-curated
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { players } from '../src/data/sampleData.js';
import curated from './data/wikimedia-player-curated.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURATED_PATH = join(__dirname, 'data/wikimedia-player-curated.mjs');

function verifyNameFromPlayer(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return parts[0] ?? 'Player';
}

function buildEntryLine(player) {
  const verifyName = verifyNameFromPlayer(player.name);
  const searchName = player.name.replace(/'/g, "\\'");
  return `    '${player.id}': { searchName: '${searchName}', verifyName: '${verifyName.replace(/'/g, "\\'")}' },`;
}

function main() {
  const existing = new Set(Object.keys(curated.entries ?? {}));
  const candidates = players
    .filter((p) => p.quizEligible === true)
    .filter((p) => !existing.has(p.id))
    .sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0) || a.id.localeCompare(b.id));

  if (!candidates.length) {
    console.log('All quiz-eligible players already in curated list.');
    return;
  }

  console.log(`Adding ${candidates.length} quiz-eligible curated entries…`);

  const block = [
    '',
    `    // Quiz-eligible batch — ${new Date().toISOString().slice(0, 10)}`,
    ...candidates.map(buildEntryLine),
  ].join('\n');

  const src = readFileSync(CURATED_PATH, 'utf8');
  const marker = '\n  },\n};';
  const idx = src.lastIndexOf(marker);
  if (idx === -1) throw new Error('Could not find entries closing marker in curated file');

  writeFileSync(CURATED_PATH, `${src.slice(0, idx)}${block}${src.slice(idx)}`, 'utf8');
  console.log(`Wrote ${candidates.length} entries to ${CURATED_PATH}`);
}

main();
