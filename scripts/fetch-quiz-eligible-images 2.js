#!/usr/bin/env node
/**
 * Fetch Wikimedia photos for quiz-eligible players still missing approved images.
 *
 *   npm run fetch:quiz-eligible-images
 *   npm run fetch:quiz-eligible-images -- --limit=50
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { players } from '../src/data/sampleData.js';
import approved from '../src/data/playerImageApproved.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const FETCH = join(root, 'scripts/fetch-wikimedia-player-images.js');

function parseArgs(argv) {
  const out = { limit: 50, passes: 6, force: false };
  for (const arg of argv) {
    if (arg.startsWith('--limit=')) out.limit = Number(arg.split('=')[1]) || 50;
    if (arg.startsWith('--passes=')) out.passes = Number(arg.split('=')[1]) || 6;
    if (arg === '--force' || arg === '--retry') out.force = true;
  }
  return out;
}

function missingQuizEligible() {
  const entries = approved.entries ?? approved;
  return players
    .filter((p) => p.quizEligible === true && !entries[p.id]?.imageUrl)
    .sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0) || a.id.localeCompare(b.id));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let remaining = missingQuizEligible();

  console.log(`Quiz-eligible missing photos: ${remaining.length}`);

  for (let pass = 0; pass < args.passes && remaining.length; pass += 1) {
    const batch = remaining.slice(0, args.limit);
    const ids = batch.map((p) => p.id).join(',');
    console.log(`\nPass ${pass + 1}: fetching ${batch.length} players…`);

    const fetchArgs = [FETCH, `--ids=${ids}`, '--force-large'];
    if (args.force) fetchArgs.push('--force');

    const result = spawnSync(process.execPath, fetchArgs, { stdio: 'inherit', cwd: root });

    if (result.status !== 0) {
      console.error('Batch failed');
      process.exit(result.status ?? 1);
    }

    remaining = missingQuizEligible();
    console.log(`Remaining after pass ${pass + 1}: ${remaining.length}`);
  }

  console.log(`\nDone. Quiz-eligible still missing: ${remaining.length}`);
}

main();
