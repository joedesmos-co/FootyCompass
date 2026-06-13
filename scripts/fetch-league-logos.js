#!/usr/bin/env node
/**
 * Fetch league logos from Wikimedia Commons → public/images/leagues/
 * Writes src/data/leagueLogoManifest.json
 *
 *   npm run fetch:league-logos
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LEAGUE_LOGO_SOURCES } from './data/league-logo-sources.mjs';
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
const LOGOS_DIR = join(root, 'public/images/leagues');
const MANIFEST_PATH = join(root, 'src/data/leagueLogoManifest.json');

async function resolveLogo(leagueId, spec) {
  if (spec.commonsFile) {
    await sleep(API_DELAY_MS);
    const direct = await fetchCommonsFile(spec.commonsFile);
    if (direct?.originalUrl) return direct;
  }

  if (spec.searchFallback) {
    await sleep(API_DELAY_MS);
    const search = await searchCommonsFiles(`${spec.searchFallback} svg logo`, 6);
    const hit = (search.results ?? []).find((r) =>
      /logo|emblem|badge/i.test(r.commonsFile) && (r.width ?? 0) >= 80,
    );
    if (hit) return hit;
  }

  return null;
}

async function main() {
  mkdirSync(LOGOS_DIR, { recursive: true });

  const entries = {};

  for (const [leagueId, spec] of Object.entries(LEAGUE_LOGO_SOURCES)) {
    const meta = await resolveLogo(leagueId, spec);
    if (!meta?.originalUrl) {
      console.warn(`  skip ${leagueId}: no logo found`);
      continue;
    }

    const ext = extFromMime(meta.mime, 'svg');
    const localPath = `/images/leagues/${leagueId}.${ext}`;
    const dest = join(LOGOS_DIR, `${leagueId}.${ext}`);

    if (!existsSync(dest)) {
      await downloadBinary(meta.originalUrl, dest, (path, buf) => writeFileSync(path, buf));
    }

    entries[leagueId] = {
      leagueId,
      path: localPath,
      commonsFile: meta.commonsFile,
      colors: spec.colors ?? null,
      imageSource: 'Wikimedia Commons',
      imageSourceUrl: meta.pageUrl,
      imageLicense: meta.licenseShort || 'See Commons file page',
    };
    console.log(`  ✓ ${leagueId} → ${localPath}`);
  }

  const manifest = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    entryCount: Object.keys(entries).length,
    entries,
  };

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${MANIFEST_PATH} (${manifest.entryCount} leagues)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
