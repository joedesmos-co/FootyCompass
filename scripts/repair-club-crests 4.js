#!/usr/bin/env node
/**
 * Remove low-confidence club crest manifest entries and re-fetch known clubs only.
 * Does not touch locked entries or valid crests.
 *
 *   npm run repair:club-crests
 *   npm run repair:club-crests -- --dry-run
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { teams } from '../src/data/sampleData.js';
import curated from './data/wikimedia-club-curated.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const MANIFEST_PATH = join(root, 'src/data/clubCrestManifest.json');
const CRESTS_DIR = join(root, 'public/images/clubs');
const FETCH = join(root, 'scripts/fetch-wikimedia-club-crests.js');

function tokenizeName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function isConfidentEntry(entry, teamName) {
  if (entry.locked) return true;
  const fileHay = String(entry.commonsFile ?? '').toLowerCase();
  const hay = `${entry.commonsFile ?? ''}`.toLowerCase();
  if (!/(logo|crest|emblem|badge|escudo|wappen|wordmark|shield)/i.test(hay)) return false;

  const tokens = tokenizeName(teamName);
  if (!tokens.length) return false;

  const fileMatches = tokens.filter((t) => fileHay.includes(t)).length;
  const hayMatches = tokens.filter((t) => hay.includes(t)).length;
  if (fileMatches === 0 && hayMatches < Math.min(2, tokens.length)) return false;
  return hayMatches >= 1;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const entries = manifest.entries ?? {};
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const removeIds = [];
  for (const [id, entry] of Object.entries(entries)) {
    const team = teamById.get(id);
    const name = entry.teamName ?? team?.name ?? id;
    if (!isConfidentEntry(entry, name)) removeIds.push(id);
  }

  console.log(`Removing ${removeIds.length} low-confidence crest entries…`);
  for (const id of removeIds) {
    const entry = entries[id];
    console.log(`  - ${entry?.teamName ?? id}: ${entry?.commonsFile ?? 'unknown'}`);
    if (dryRun) continue;
    delete entries[id];
    if (entry?.path) {
      const file = join(root, 'public', entry.path.replace(/^\//, ''));
      if (existsSync(file)) unlinkSync(file);
    }
  }

  if (!dryRun) {
    manifest.entries = entries;
    manifest.entryCount = Object.keys(entries).length;
    manifest.updatedAt = new Date().toISOString();
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  const refetchIds = removeIds.filter((id) => curated.entries?.[id]?.commonsFile);
  if (!refetchIds.length) {
    console.log('No known commons files to refetch.');
    return;
  }

  if (dryRun) {
    console.log(`Would refetch ${refetchIds.length} clubs with curated commonsFile.`);
    return;
  }

  console.log(`Refetching ${refetchIds.length} clubs with curated commonsFile…`);
  const result = spawnSync(
    process.execPath,
    [FETCH, `--ids=${refetchIds.join(',')}`, '--download', '--force', '--force-large'],
    { stdio: 'inherit', cwd: root },
  );
  process.exit(result.status ?? 0);
}

main();
