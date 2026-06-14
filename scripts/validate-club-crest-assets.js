#!/usr/bin/env node
/**
 * Validate app-referenced and committed club crest assets.
 *
 * Untracked local files are ignored so accidental workspace copies do not block CI.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const MANIFEST_PATH = join(root, 'src/data/clubCrestManifest.json');
const DIST_DIR = join(root, 'dist');
const MAX_CLUB_ASSET_BYTES = 1024 * 1024;

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const entries = Object.entries(manifest.entries ?? {});
const errors = [];
const checked = new Map();

function addCheckedAsset(teamId, path, publicPath) {
  const bytes = statSync(publicPath).size;
  checked.set(path, { teamId, path, bytes });
  if (bytes > MAX_CLUB_ASSET_BYTES) {
    errors.push(`${teamId}: ${path} is ${(bytes / 1024 / 1024).toFixed(2)} MiB, max is 1.00 MiB`);
  }
}

if (manifest.entryCount !== entries.length) {
  errors.push(`clubCrestManifest entryCount is ${manifest.entryCount}, expected ${entries.length}`);
}

for (const [teamId, entry] of entries) {
  const path = String(entry?.path ?? '').trim();
  if (!path) {
    errors.push(`${teamId}: missing path`);
    continue;
  }
  if (!path.startsWith('/images/clubs/')) {
    errors.push(`${teamId}: club crest path must live under /images/clubs/: ${path}`);
    continue;
  }

  const expectedPath = `/images/clubs/${teamId}.svg`;
  if (path !== expectedPath) {
    errors.push(`${teamId}: manifest path must be ${expectedPath}, got ${path}`);
    continue;
  }

  const publicPath = join(root, 'public', path.replace(/^\//, ''));
  if (!existsSync(publicPath)) {
    errors.push(`${teamId}: missing public asset ${path}`);
    continue;
  }

  addCheckedAsset(teamId, path, publicPath);

  if (existsSync(DIST_DIR)) {
    const distPath = join(DIST_DIR, path.replace(/^\//, ''));
    if (!existsSync(distPath)) {
      errors.push(`${teamId}: missing dist asset ${path} (run npm run build)`);
    }
  }
}

try {
  const trackedClubAssets = execFileSync('git', ['ls-files', '--cached', '--', 'public/images/clubs'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((path) => !path.endsWith('/.gitkeep'));

  for (const relativePath of trackedClubAssets) {
    const publicPath = join(root, relativePath);
    if (!existsSync(publicPath)) continue;
    const assetPath = `/${relativePath.replace(/^public\//, '')}`;
    if (checked.has(assetPath)) continue;
    addCheckedAsset('tracked-club-asset', assetPath, publicPath);
  }
} catch (error) {
  errors.push(`could not list tracked club assets: ${error.message}`);
}

const checkedRows = [...checked.values()];
const largest = checkedRows.sort((a, b) => b.bytes - a.bytes).slice(0, 5);
console.log(`Club crest assets: ${entries.length} manifest entries checked, ${checkedRows.length} committed assets checked`);
if (existsSync(DIST_DIR)) {
  console.log('dist/: manifest crest paths verified when present');
}
for (const row of largest) {
  console.log(`  largest: ${row.teamId} ${row.path} (${(row.bytes / 1024).toFixed(1)} KiB)`);
}

if (errors.length) {
  console.error('\nClub crest asset validation failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('validate:club-crests OK');
