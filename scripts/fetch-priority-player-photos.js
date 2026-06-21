#!/usr/bin/env node
/**
 * Batch-fetch player photos for priority players missing approved images.
 *
 * Source order (see scripts/lib/playerImageSourceResolver.mjs):
 *   1. Owner-licensed local/stock assets (player-image-licensed.mjs)
 *   2. Wikimedia Commons (curated + verified search)
 *
 * Priority (visibility score): quiz-ready → learning-path → WC stars → homepage featured → major-league starters
 *
 *   npm run fetch:priority-player-photos
 *   npm run fetch:priority-player-photos -- --limit=50 --quiz-ready-only
 *   npm run report:player-image-visibility-gaps
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTeamName, players } from '../src/data/sampleData.js';
import curated from './data/wikimedia-player-curated.mjs';
import {
  API_DELAY_MS,
  downloadImage,
  sleep,
} from './lib/wikimediaPlayerImage.mjs';
import {
  categorizeSkipReason,
  resolvePlayerImageSources,
} from './lib/playerImageSourceResolver.mjs';
import {
  MAX_AUTO_ATTEMPTS,
  isOnReviewList,
  promoteToReviewList,
  recordSkipAttempt,
  shouldAutoRetry,
} from './lib/playerImageReview.mjs';
import {
  computeVisibilityScore,
  hasRealPlayerPhoto,
  listMissingPhotoGaps,
} from './lib/playerImageVisibility.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const APPROVED_PATH = join(root, 'src/data/playerImageApproved.json');
const CACHE_PATH = join(root, 'generated-data/player-image-wikimedia-cache.json');
const RUN_LOG_PATH = join(root, 'generated-data/priority-player-photo-batch-last-run.json');
const IMAGES_DIR = join(root, 'public/images/players');

const DEFAULT_BATCH = 50;

function parseArgs(argv) {
  const out = {
    dryRun: argv.includes('--dry-run'),
    download: argv.includes('--download'),
    forceRetry: argv.includes('--force-retry'),
    unattemptedOnly: argv.includes('--unattempted-only'),
    quizReadyOnly: argv.includes('--quiz-ready-only'),
    offset: 0,
    limit: DEFAULT_BATCH,
  };
  for (const arg of argv) {
    if (arg.startsWith('--offset=')) out.offset = Number(arg.split('=')[1]) || 0;
    if (arg.startsWith('--limit=')) out.limit = Number(arg.split('=')[1]) || DEFAULT_BATCH;
  }
  return out;
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function autoPlayerSpec(player) {
  return {
    searchName: player.name,
    verifyName: player.name,
    requireExactName: true,
    requireContext: true,
    allowExactNameWithoutFootballContext: true,
    contextTerms: [player.nationalTeam, player.nationality, getTeamName(player.teamId)]
      .filter(Boolean),
  };
}

function buildPlayerSpec(player) {
  const base = curated.entries?.[player.id] ?? autoPlayerSpec(player);
  return {
    ...base,
    allowExactNameWithoutFootballContext:
      base.allowExactNameWithoutFootballContext ?? Boolean(base.commonsFile),
    contextTerms:
      base.contextTerms ??
      [player.nationalTeam, player.nationality, getTeamName(player.teamId)].filter(Boolean),
  };
}

function buildPriorityQueue(approvedEntries, cache, args) {
  const gaps = listMissingPhotoGaps();
  const pool = args.quizReadyOnly ? gaps.filter((row) => row.quizEligible) : gaps;

  return pool
    .filter((row) => {
      if (approvedEntries[row.id]?.imageUrl) return false;
      if (isOnReviewList(row.id)) return false;
      if (args.unattemptedOnly) {
        return !cache.skipped?.[row.id] && !cache.resolved?.[row.id];
      }
      if (!args.forceRetry && cache.skipped?.[row.id]) return false;
      if (args.forceRetry && !shouldAutoRetry(cache, row.id)) return false;
      return true;
    })
    .map((row) => {
      const player = players.find((p) => p.id === row.id);
      return {
        player,
        spec: buildPlayerSpec(player),
        visibilityScore: row.visibilityScore,
      };
    })
    .filter((row) => row.player)
    .sort(
      (a, b) =>
        b.visibilityScore - a.visibilityScore ||
        (b.player.importanceScore ?? 0) - (a.player.importanceScore ?? 0) ||
        a.player.id.localeCompare(b.player.id),
    );
}

function countQuizReadyGaps(approvedEntries) {
  return players.filter((p) => p.quizEligible && !approvedEntries[p.id]?.imageUrl && !hasRealPlayerPhoto(p)).length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const approved = readJson(APPROVED_PATH, { schemaVersion: 1, entries: {} });
  approved.entries ??= {};
  const cache = readJson(CACHE_PATH, { schemaVersion: 1, resolved: {}, skipped: {} });
  cache.resolved ??= {};
  cache.skipped ??= {};

  const queue = buildPriorityQueue(approved.entries, cache, args);
  const batch = queue.slice(args.offset, args.offset + args.limit);

  console.log('FootyCompass — priority player photo batch');
  console.log(`Queue: ${queue.length} eligible missing | Batch: ${batch.length} (offset ${args.offset})`);
  console.log(
    `Mode: ${args.dryRun ? 'dry-run' : 'write'}${args.download ? ' + download' : ''}${args.forceRetry ? ' + force-retry' : ''}${args.quizReadyOnly ? ' + quiz-ready-only' : ''}`,
  );
  console.log(`Manual review list skips: ${players.filter((p) => isOnReviewList(p.id)).length}`);
  console.log(`Max auto attempts before review: ${MAX_AUTO_ATTEMPTS}`);
  console.log('');

  if (!batch.length) {
    console.log('Nothing to process in this batch.');
    console.log(`Remaining quiz-ready gaps: ${countQuizReadyGaps(approved.entries)}`);
    return;
  }

  const stats = {
    startedAt: new Date().toISOString(),
    offset: args.offset,
    limit: args.limit,
    quizReadyOnly: args.quizReadyOnly,
    forceRetry: args.forceRetry,
    added: 0,
    rejected: 0,
    no_safe_match: 0,
    wrong_player_blocked: 0,
    sentToReview: 0,
    skippedReviewList: 0,
    details: { added: [], rejected: [], no_safe_match: [], wrong_player_blocked: [], sentToReview: [] },
  };

  for (let i = 0; i < batch.length; i += 1) {
    const { player, spec } = batch[i];
    const playerId = player.id;

    if (approved.entries[playerId]?.imageUrl) {
      console.log(`[${i + 1}/${batch.length}] ${playerId} (${player.name}): skip — already approved`);
      continue;
    }

    if (isOnReviewList(playerId)) {
      stats.skippedReviewList += 1;
      console.log(`[${i + 1}/${batch.length}] ${playerId} (${player.name}): skip — manual review list`);
      continue;
    }

    if (cache.skipped[playerId] && !args.forceRetry && !args.unattemptedOnly) {
      const bucket = categorizeSkipReason(cache.skipped[playerId].reason);
      stats[bucket] += 1;
      console.log(`[${i + 1}/${batch.length}] ${playerId} (${player.name}): skip — cached ${cache.skipped[playerId].reason}`);
      continue;
    }

    console.log(`[${i + 1}/${batch.length}] ${playerId} (${player.name}, visibility ${computeVisibilityScore(player)}): resolving…`);

    let result;
    try {
      result = await resolvePlayerImageSources(player, spec, {
        existingEntry: approved.entries[playerId],
      });
    } catch (err) {
      const reason = err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : `error:${err.message}`;
      stats.rejected += 1;
      stats.details.rejected.push({ playerId, name: player.name, reason });
      if (!args.dryRun) {
        const attempts = recordSkipAttempt(cache, playerId, reason);
        if (attempts >= MAX_AUTO_ATTEMPTS && promoteToReviewList(playerId, reason)) {
          stats.sentToReview += 1;
          stats.details.sentToReview.push({ playerId, name: player.name, reason });
        }
        writeJson(CACHE_PATH, { ...cache, updatedAt: new Date().toISOString() });
      }
      console.log(`  error: ${reason}`);
      continue;
    }

    if (result.skip) {
      const bucket = categorizeSkipReason(result.reason);
      if (result.reason !== 'existing_image_not_clearly_better') {
        stats[bucket] += 1;
        stats.details[bucket].push({ playerId, name: player.name, reason: result.reason, tier: result.tier });
      }
      if (!args.dryRun && result.reason !== 'existing_image_not_clearly_better') {
        const attempts = recordSkipAttempt(cache, playerId, result.reason);
        if (attempts >= MAX_AUTO_ATTEMPTS && promoteToReviewList(playerId, result.reason)) {
          stats.sentToReview += 1;
          stats.details.sentToReview.push({ playerId, name: player.name, reason: result.reason });
          console.log(`  → manual review list (attempt ${attempts})`);
        }
        writeJson(CACHE_PATH, { ...cache, updatedAt: new Date().toISOString() });
      }
      console.log(`  skip: ${result.reason}`);
      continue;
    }

    let entry = result.entry;

    if (args.download && result.tier === 'wikimedia' && result.meta?.thumbUrl) {
      mkdirSync(IMAGES_DIR, { recursive: true });
      const ext = result.meta.mime?.includes('png') ? 'png' : result.meta.mime?.includes('webp') ? 'webp' : 'jpg';
      const localRel = `/images/players/${playerId}.${ext}`;
      const localAbs = join(root, 'public', localRel.replace(/^\//, ''));
      if (!args.dryRun) {
        try {
          await downloadImage(result.meta.thumbUrl, localAbs, writeFileSync);
          entry = { ...entry, imageUrl: localRel };
        } catch (err) {
          const reason = `download_failed:${err.message}`;
          stats.rejected += 1;
          stats.details.rejected.push({ playerId, name: player.name, reason });
          const attempts = recordSkipAttempt(cache, playerId, reason);
          if (attempts >= MAX_AUTO_ATTEMPTS && promoteToReviewList(playerId, reason)) {
            stats.sentToReview += 1;
          }
          writeJson(CACHE_PATH, { ...cache, updatedAt: new Date().toISOString() });
          console.log(`  skip: ${reason}`);
          continue;
        }
      }
    }

    if (!args.dryRun) {
      if (result.tier === 'wikimedia' && result.meta) {
        cache.resolved[playerId] = { meta: result.meta, at: new Date().toISOString() };
      }
      delete cache.skipped[playerId];
      approved.entries[playerId] = entry;
      approved.updatedAt = new Date().toISOString().slice(0, 10);
      writeJson(APPROVED_PATH, approved);
      writeJson(CACHE_PATH, { ...cache, updatedAt: new Date().toISOString() });
    }

    stats.added += 1;
    stats.details.added.push({
      playerId,
      name: player.name,
      tier: result.tier,
      source: entry.commonsFile ?? entry.imageSourceUrl ?? entry.imageUrl,
    });
    console.log(`  added (${result.tier}): ${entry.commonsFile ?? entry.imageUrl}`);

    await sleep(API_DELAY_MS);
  }

  stats.finishedAt = new Date().toISOString();
  stats.remainingQuizReadyGaps = countQuizReadyGaps(approved.entries);
  if (!args.dryRun) writeJson(RUN_LOG_PATH, stats);

  console.log('\n--- Priority batch summary ---');
  console.log(`Added: ${stats.added}`);
  console.log(`Rejected: ${stats.rejected}`);
  console.log(`No safe match: ${stats.no_safe_match}`);
  console.log(`Wrong-player blocked: ${stats.wrong_player_blocked}`);
  console.log(`Sent to manual review: ${stats.sentToReview}`);
  console.log(`Remaining quiz-ready gaps: ${stats.remainingQuizReadyGaps}`);

  const nextOffset = args.offset + batch.length;
  if (nextOffset < queue.length) {
    const flags = [
      `--offset=${nextOffset}`,
      `--limit=${args.limit}`,
      args.quizReadyOnly ? '--quiz-ready-only' : '',
      args.forceRetry ? '--force-retry' : '',
    ]
      .filter(Boolean)
      .join(' ');
    console.log(`\nNext batch: npm run fetch:priority-player-photos -- ${flags}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
