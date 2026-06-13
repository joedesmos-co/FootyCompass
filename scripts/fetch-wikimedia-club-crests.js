#!/usr/bin/env node
/**
 * Fetch club crests from Wikimedia Commons → public/images/clubs/
 * Writes src/data/clubCrestManifest.json (never overwrites manually locked entries).
 *
 *   npm run fetch:wikimedia-club-crests
 *   npm run fetch:wikimedia-club-crests -- --limit=30 --offset=0
 *   npm run fetch:wikimedia-club-crests -- --download
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { teams } from '../src/data/sampleData.js';
import curated from './data/wikimedia-club-curated.mjs';
import {
  API_DELAY_MS,
  downloadBinary,
  extFromMime,
  fetchCommonsFile,
  searchCommonsFiles,
  sleep,
} from './lib/wikimediaCommonsAsset.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const MANIFEST_PATH = join(root, 'src/data/clubCrestManifest.json');
const CACHE_PATH = join(root, 'generated-data/club-crest-wikimedia-cache.json');
const CRESTS_DIR = join(root, 'public/images/clubs');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const MAX_CLUB_ASSET_BYTES = 1024 * 1024;

function parseArgs(argv) {
  const out = {
    dryRun: argv.includes('--dry-run'),
    download: argv.includes('--download'),
    force: argv.includes('--force'),
    forceLarge: argv.includes('--force-large'),
    offset: 0,
    limit: DEFAULT_LIMIT,
    ids: null,
  };
  for (const arg of argv) {
    if (arg.startsWith('--offset=')) out.offset = Number(arg.split('=')[1]) || 0;
    if (arg.startsWith('--limit=')) out.limit = Number(arg.split('=')[1]) || DEFAULT_LIMIT;
    if (arg.startsWith('--ids=')) out.ids = arg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (!out.forceLarge && out.limit > MAX_LIMIT) out.limit = MAX_LIMIT;
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

function tokenizeName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function verifyClubLogo(meta, teamName, excludeTerms = []) {
  const fileHay = String(meta.commonsFile ?? '').toLowerCase();
  const hay = `${meta.description} ${meta.commonsFile}`.toLowerCase();
  if (!/(logo|crest|emblem|badge|escudo|wappen|wordmark|shield)/i.test(hay)) return false;

  for (const term of excludeTerms) {
    if (term && hay.includes(String(term).toLowerCase())) return false;
  }

  const tokens = tokenizeName(teamName);
  if (!tokens.length) return false;

  const fileMatches = tokens.filter((t) => fileHay.includes(t)).length;
  const hayMatches = tokens.filter((t) => hay.includes(t)).length;

  // Direct commonsFile hits must include a club-name token in the filename.
  if (fileMatches === 0 && hayMatches < Math.min(2, tokens.length)) return false;

  return hayMatches >= 1;
}

async function resolveClubCrest(spec, team) {
  if (spec.commonsFile) {
    await sleep(API_DELAY_MS);
    const direct = await fetchCommonsFile(spec.commonsFile);
    if (direct?.originalUrl && verifyClubLogo(direct, team.name, spec.excludeTerms)) {
      return direct;
    }
  }

  const searchTerms = [
    spec.searchTerm,
    `${team.name} logo`,
    `${team.name} FC logo`,
    `${team.name} crest`,
  ].filter(Boolean);

  for (const term of searchTerms) {
    await sleep(API_DELAY_MS);
    const search = await searchCommonsFiles(`${term} svg`, 8);
    if (search.error) return { error: search.error };

    const hit = (search.results ?? []).find(
      (r) =>
        verifyClubLogo(r, team.name, spec.excludeTerms) &&
        (r.width ?? 0) >= 64 &&
        (r.height ?? 0) >= 64,
    );
    if (hit) return hit;
  }

  return null;
}

function buildManifestEntry(team, meta, localPath) {
  return {
    teamId: team.id,
    teamName: team.name,
    path: localPath,
    commonsFile: meta.commonsFile,
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: meta.pageUrl,
    imageLicense: meta.licenseShort || 'See Commons file page',
    locked: false,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(CRESTS_DIR, { recursive: true });

  const manifest = readJson(MANIFEST_PATH, { schemaVersion: 1, entries: {} });
  const cache = readJson(CACHE_PATH, { entries: {} });
  const locked = new Set(
    Object.entries(manifest.entries ?? {})
      .filter(([, e]) => e.locked)
      .map(([id]) => id),
  );

  let queue = teams.filter((t) => !locked.has(t.id));
  queue = queue.filter((t) => !manifest.entries?.[t.id]?.path || args.force);

  if (args.ids) {
    const idSet = new Set(args.ids);
    queue = queue.filter((t) => idSet.has(t.id));
  }

  queue = queue.slice(args.offset, args.offset + args.limit);

  let resolved = 0;
  let skipped = 0;

  for (const team of queue) {
    const spec = curated.entries?.[team.id] ?? { searchTerm: `${team.name} logo` };
    const cacheKey = team.id;

    if (!args.force && cache.entries?.[cacheKey]?.status === 'skip') {
      skipped += 1;
      continue;
    }
    if (!args.force && manifest.entries?.[team.id]?.path) {
      skipped += 1;
      continue;
    }

    const result = await resolveClubCrest(spec, team);
    if (result?.error) {
      cache.entries[cacheKey] = { status: 'skip', reason: result.error, at: new Date().toISOString() };
      skipped += 1;
      console.log(`  skip ${team.name}: ${result.error}`);
      continue;
    }
    if (!result?.originalUrl) {
      cache.entries[cacheKey] = { status: 'skip', reason: 'no_match', at: new Date().toISOString() };
      skipped += 1;
      console.log(`  skip ${team.name}: no_match`);
      continue;
    }

    const ext = extFromMime(result.mime, 'svg');
    const localPath = `/images/clubs/${team.id}.${ext}`;
    const dest = join(CRESTS_DIR, `${team.id}.${ext}`);

    if (!args.dryRun) {
      if (args.download || !existsSync(dest)) {
        await downloadBinary(result.originalUrl, dest, (path, buf) => writeFileSync(path, buf));
      }
      const assetBytes = statSync(dest).size;
      if (assetBytes > MAX_CLUB_ASSET_BYTES) {
        if (existsSync(dest)) unlinkSync(dest);
        cache.entries[cacheKey] = {
          status: 'skip',
          reason: `asset_too_large:${assetBytes}`,
          at: new Date().toISOString(),
        };
        skipped += 1;
        console.log(`  skip ${team.name}: asset_too_large (${(assetBytes / 1024 / 1024).toFixed(2)} MiB)`);
        continue;
      }
      manifest.entries = manifest.entries ?? {};
      manifest.entries[team.id] = buildManifestEntry(team, result, localPath);
      cache.entries[cacheKey] = {
        status: 'resolved',
        commonsFile: result.commonsFile,
        at: new Date().toISOString(),
      };
    }

    resolved += 1;
    console.log(`  ✓ ${team.name} → ${localPath}`);
  }

  if (!args.dryRun) {
    manifest.updatedAt = new Date().toISOString();
    manifest.entryCount = Object.keys(manifest.entries ?? {}).length;
    writeJson(MANIFEST_PATH, manifest);
    writeJson(CACHE_PATH, cache);
  }

  console.log(`\nResolved ${resolved}, skipped ${skipped} (batch ${args.offset}-${args.offset + args.limit})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
