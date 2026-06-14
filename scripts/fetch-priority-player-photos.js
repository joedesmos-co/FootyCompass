#!/usr/bin/env node
/**
 * Batch-fetch player photos for priority players missing approved images.
 *
 * Source order (see scripts/lib/playerImageSourceResolver.mjs):
 *   1. Owner-licensed local/stock assets (player-image-licensed.mjs)
 *   2. Wikimedia Commons (curated + verified search)
 *
 * FootyRenders and similar render sites are excluded (non-commercial-only, no scraping).
 *
 * Priority order:
 *   1. Quiz-ready players
 *   2. Learning-path players
 *   3. World Cup / national-team prep players
 *   4. High-importance major-league players
 *   5. Remaining players
 *
 *   npm run fetch:priority-player-photos
 *   npm run fetch:priority-player-photos -- --limit=50 --quiz-ready-only --force
 *   npm run fetch:priority-player-photos -- --dry-run --limit=10
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collections } from '../src/data/collectionsData.js';
import { learningPaths } from '../src/data/learningPathsData.js';
import { getTeamName, players, teams } from '../src/data/sampleData.js';
import live from '../src/data/nationalTeamLive.json' with { type: 'json' };
import qualifiedManifest from '../editorial-overlays/world-cup-2026-qualified-teams.json' with { type: 'json' };
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const APPROVED_PATH = join(root, 'src/data/playerImageApproved.json');
const CACHE_PATH = join(root, 'generated-data/player-image-wikimedia-cache.json');
const RUN_LOG_PATH = join(root, 'generated-data/priority-player-photo-batch-last-run.json');
const IMAGES_DIR = join(root, 'public/images/players');

const MAJOR_LEAGUE_IDS = new Set([
  'premier-league',
  'la-liga',
  'bundesliga',
  'serie-a',
  'ligue-1',
]);

const DEFAULT_BATCH = 50;

function parseArgs(argv) {
  const out = {
    dryRun: argv.includes('--dry-run'),
    download: argv.includes('--download'),
    force: argv.includes('--force'),
    forceRetry: argv.includes('--force-retry') || argv.includes('--force'),
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

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function collectLearningPathPlayerIds() {
  const ids = new Set();
  const collectionIds = new Set();
  const byId = new Map(collections.map((c) => [c.id, c]));

  for (const path of learningPaths) {
    if (path.collectionId) collectionIds.add(path.collectionId);
    for (const step of path.steps ?? []) {
      if (step.entityType === 'player' && step.id) ids.add(step.id);
      if (step.collectionId) collectionIds.add(step.collectionId);
    }
  }

  for (const collectionId of collectionIds) {
    for (const item of byId.get(collectionId)?.items ?? []) {
      if (item.type === 'player' && item.id) ids.add(item.id);
    }
  }

  return ids;
}

function collectWorldCupPrepPlayerIds() {
  const ids = new Set();
  const qualifiedIds = new Set((qualifiedManifest.teams ?? []).map((team) => team.id));

  for (const collection of collections) {
    const isWorldCupCollection =
      collection.tags?.includes('World Cup') || /world cup/i.test(collection.title ?? '');
    if (!isWorldCupCollection) continue;
    for (const item of collection.items ?? []) {
      if (item.type === 'player' && item.id) ids.add(item.id);
    }
  }

  for (const membership of live.nationalMemberships ?? []) {
    if (!qualifiedIds.has(membership.nationalTeamId)) continue;
    if (membership.playerId) ids.add(membership.playerId);
  }

  return ids;
}

function priorityRank(player, learningPathIds, worldCupIds) {
  if (player.quizEligible === true) return 1;
  if (learningPathIds.has(player.id)) return 2;
  if (worldCupIds.has(player.id)) return 3;
  const team = teams.find((t) => t.id === player.teamId);
  if (team && MAJOR_LEAGUE_IDS.has(team.leagueId) && (player.importanceScore ?? 0) >= 65) return 4;
  return 5;
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
  const learningPathIds = collectLearningPathPlayerIds();
  const worldCupIds = collectWorldCupPrepPlayerIds();

  return players
    .filter((player) => {
      if (approvedEntries[player.id]?.imageUrl) return false;
      if (args.quizReadyOnly && player.quizEligible !== true) return false;
      if (args.unattemptedOnly) {
        return !cache.skipped?.[player.id] && !cache.resolved?.[player.id];
      }
      if (!args.forceRetry && cache.skipped?.[player.id]) return false;
      return true;
    })
    .map((player) => ({
      player,
      spec: buildPlayerSpec(player),
      rank: priorityRank(player, learningPathIds, worldCupIds),
      importance: player.importanceScore ?? 0,
    }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.importance - a.importance ||
        a.player.id.localeCompare(b.player.id),
    );
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
  console.log(`Queue: ${queue.length} priority missing | Batch: ${batch.length} (offset ${args.offset})`);
  console.log(
    `Mode: ${args.dryRun ? 'dry-run' : 'write'}${args.download ? ' + download' : ''}${args.forceRetry ? ' + force-retry' : ''}${args.quizReadyOnly ? ' + quiz-ready-only' : ''}`,
  );
  console.log('Sources: licensed local → Wikimedia Commons (FootyRenders excluded)');
  console.log('');

  if (!batch.length) {
    console.log('Nothing to process in this batch.');
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
    alreadyApproved: 0,
    notClearlyBetter: 0,
    details: { added: [], rejected: [], no_safe_match: [], wrong_player_blocked: [] },
  };

  for (let i = 0; i < batch.length; i += 1) {
    const { player, spec } = batch[i];
    const playerId = player.id;
    const existingEntry = approved.entries[playerId];

    if (existingEntry?.imageUrl && !args.force) {
      stats.alreadyApproved += 1;
      console.log(`[${i + 1}/${batch.length}] ${playerId} (${player.name}): skip — already approved`);
      continue;
    }

    if (cache.skipped[playerId] && !args.forceRetry) {
      const bucket = categorizeSkipReason(cache.skipped[playerId].reason);
      stats[bucket] += 1;
      stats.details[bucket].push({
        playerId,
        name: player.name,
        reason: cache.skipped[playerId].reason,
        cached: true,
      });
      console.log(`[${i + 1}/${batch.length}] ${playerId} (${player.name}): skip — cached ${cache.skipped[playerId].reason}`);
      continue;
    }

    console.log(`[${i + 1}/${batch.length}] ${playerId} (${player.name}): resolving…`);

    let result;
    try {
      result = await resolvePlayerImageSources(player, spec, {
        existingEntry,
      });
    } catch (err) {
      const reason = err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : `error:${err.message}`;
      stats.rejected += 1;
      stats.details.rejected.push({ playerId, name: player.name, reason });
      if (!args.dryRun) {
        cache.skipped[playerId] = { reason, at: new Date().toISOString() };
        writeJson(CACHE_PATH, { ...cache, updatedAt: new Date().toISOString() });
      }
      console.log(`  error: ${reason}`);
      continue;
    }

    if (result.skip) {
      const bucket = categorizeSkipReason(result.reason);
      if (result.reason === 'existing_image_not_clearly_better') {
        stats.notClearlyBetter += 1;
      } else {
        stats[bucket] += 1;
        stats.details[bucket].push({ playerId, name: player.name, reason: result.reason, tier: result.tier });
      }
      if (!args.dryRun && result.reason !== 'existing_image_not_clearly_better') {
        cache.skipped[playerId] = { reason: result.reason, at: new Date().toISOString() };
        writeJson(CACHE_PATH, { ...cache, updatedAt: new Date().toISOString() });
      }
      console.log(`  skip: ${result.reason}`);
      continue;
    }

    let entry = result.entry;
    let imageUrl = entry.imageUrl;

    if (args.download && result.tier === 'wikimedia' && result.meta?.thumbUrl) {
      mkdirSync(IMAGES_DIR, { recursive: true });
      const ext = result.meta.mime?.includes('png') ? 'png' : result.meta.mime?.includes('webp') ? 'webp' : 'jpg';
      const localRel = `/images/players/${playerId}.${ext}`;
      const localAbs = join(root, 'public', localRel.replace(/^\//, ''));
      if (!args.dryRun) {
        try {
          await downloadImage(result.meta.thumbUrl, localAbs, writeFileSync);
          imageUrl = localRel;
          entry = { ...entry, imageUrl: localRel };
        } catch (err) {
          const reason = `download_failed:${err.message}`;
          stats.rejected += 1;
          stats.details.rejected.push({ playerId, name: player.name, reason });
          cache.skipped[playerId] = { reason, at: new Date().toISOString() };
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
      identityNote: entry.identityNote,
    });
    console.log(`  added (${result.tier}): ${entry.commonsFile ?? entry.imageUrl}`);

    await sleep(API_DELAY_MS);
  }

  stats.finishedAt = new Date().toISOString();
  if (!args.dryRun) writeJson(RUN_LOG_PATH, stats);

  console.log('\n--- Priority batch summary ---');
  console.log(`Added: ${stats.added}`);
  console.log(`Rejected: ${stats.rejected}`);
  console.log(`No safe match: ${stats.no_safe_match}`);
  console.log(`Wrong-player blocked: ${stats.wrong_player_blocked}`);
  console.log(`Already approved: ${stats.alreadyApproved}`);
  if (stats.notClearlyBetter) console.log(`Existing kept (not clearly better): ${stats.notClearlyBetter}`);

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
