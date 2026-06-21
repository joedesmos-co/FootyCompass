#!/usr/bin/env node
/**
 * Batch-fetch Wikimedia photos for players missing approved images.
 *
 *   npm run fetch:missing-player-images
 *   npm run fetch:missing-player-images -- --unattempted-only --limit=50 --passes=10
 *   npm run fetch:missing-player-images -- --force --limit=25 --passes=4
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { players } from '../src/data/sampleData.js';
import approved from '../src/data/playerImageApproved.json' with { type: 'json' };
import cache from '../generated-data/player-image-wikimedia-cache.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const FETCH = join(root, 'scripts/fetch-wikimedia-player-images.js');

function parseArgs(argv) {
  const out = { limit: 50, passes: 8, force: false, unattemptedOnly: false };
  for (const arg of argv) {
    if (arg.startsWith('--limit=')) out.limit = Number(arg.split('=')[1]) || 50;
    if (arg.startsWith('--passes=')) out.passes = Number(arg.split('=')[1]) || 8;
    if (arg === '--force' || arg === '--retry') out.force = true;
    if (arg === '--unattempted-only') out.unattemptedOnly = true;
  }
  return out;
}

function countMissing() {
  const entries = approved.entries ?? approved;
  return players.filter((p) => !entries[p.id]?.imageUrl).length;
}

function countUnattempted() {
  const entries = approved.entries ?? approved;
  return players.filter(
    (p) => !entries[p.id]?.imageUrl && !cache.skipped?.[p.id] && !cache.resolved?.[p.id],
  ).length;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Missing photos: ${countMissing()} | Unattempted: ${countUnattempted()}`);

  for (let pass = 0; pass < args.passes; pass += 1) {
    const remaining = args.unattemptedOnly ? countUnattempted() : countMissing();
    if (!remaining) break;

    console.log(`\nPass ${pass + 1}/${args.passes} (${remaining} remaining)…`);
    const fetchArgs = [
      FETCH,
      '--all-missing',
      '--offset=0',
      `--limit=${args.limit}`,
      '--force-large',
    ];
    if (args.force) fetchArgs.push('--force');
    if (args.unattemptedOnly) fetchArgs.push('--unattempted-only');

    const result = spawnSync(process.execPath, fetchArgs, { stdio: 'inherit', cwd: root });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }

  console.log(`\nDone. Missing photos: ${countMissing()}`);
}

main();
