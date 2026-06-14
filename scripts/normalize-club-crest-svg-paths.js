#!/usr/bin/env node
/**
 * Ensure every clubCrestManifest entry uses /images/clubs/{teamId}.svg.
 * Raster crests (png/jpg) get a tiny SVG wrapper that references the raster file.
 *
 *   node scripts/normalize-club-crest-svg-paths.js
 *   node scripts/normalize-club-crest-svg-paths.js --dry-run
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const MANIFEST_PATH = join(root, 'src/data/clubCrestManifest.json');
const CLUBS_DIR = join(root, 'public/images/clubs');

function buildWrapperSvg(teamName, rasterFile) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${teamName} crest">
  <image href="${rasterFile}" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const entries = manifest.entries ?? {};
  let wrappers = 0;
  let manifestUpdates = 0;

  for (const [teamId, entry] of Object.entries(entries)) {
    const currentPath = String(entry?.path ?? '').trim();
    if (!currentPath.startsWith('/images/clubs/')) continue;

    const svgPath = `/images/clubs/${teamId}.svg`;
    const svgFile = join(CLUBS_DIR, `${teamId}.svg`);
    const currentFile = join(root, 'public', currentPath.replace(/^\//, ''));

    if (currentPath.endsWith('.svg')) {
      if (!existsSync(currentFile)) {
        console.error(`FAIL: ${teamId} manifest points to missing ${currentPath}`);
        process.exit(1);
      }
      if (currentPath !== svgPath) {
        entry.path = svgPath;
        manifestUpdates += 1;
      }
      continue;
    }

    if (!existsSync(currentFile)) {
      console.error(`FAIL: ${teamId} raster crest missing at ${currentPath}`);
      process.exit(1);
    }

    const rasterName = basename(currentPath);
    const wrapper = buildWrapperSvg(entry.teamName ?? teamId, rasterName);

    if (!dryRun) {
      writeFileSync(svgFile, wrapper, 'utf8');
    }
    wrappers += 1;

    if (entry.path !== svgPath) {
      entry.path = svgPath;
      manifestUpdates += 1;
    }

    console.log(`  ${teamId}: ${currentPath} → ${svgPath} (wrapper → ${rasterName})`);
  }

  if (!dryRun && manifestUpdates) {
    manifest.updatedAt = new Date().toISOString();
    manifest.entryCount = Object.keys(entries).length;
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  console.log(
    dryRun
      ? `Dry run: would write ${wrappers} wrapper(s), update ${manifestUpdates} manifest path(s)`
      : `Wrote ${wrappers} SVG wrapper(s), updated ${manifestUpdates} manifest path(s)`,
  );
}

main();
