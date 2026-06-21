#!/usr/bin/env node
/**
 * Download national flag SVGs from Wikimedia Commons to public/images/flags/.
 * Writes src/data/countryFlagManifest.json
 *
 *   npm run fetch:country-flags
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COUNTRY_FLAG_SOURCES, slugifyCountry } from './data/country-flag-sources.mjs';
import {
  API_DELAY_MS,
  downloadBinary,
  extFromMime,
  fetchCommonsFile,
  sleep,
} from './lib/wikimediaCommonsAsset.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const FLAGS_DIR = join(root, 'public/images/flags');
const MANIFEST_PATH = join(root, 'src/data/countryFlagManifest.json');

async function main() {
  mkdirSync(FLAGS_DIR, { recursive: true });

  const entries = {};
  let ok = 0;
  let fail = 0;

  for (const [country, commonsFile] of Object.entries(COUNTRY_FLAG_SOURCES)) {
    const slug = slugifyCountry(country);
    await sleep(API_DELAY_MS);

    const meta = await fetchCommonsFile(commonsFile);
    if (!meta?.originalUrl) {
      console.warn(`  skip ${country}: no file ${commonsFile}`);
      fail += 1;
      continue;
    }

    const ext = extFromMime(meta.mime, 'svg');
    const localPath = `/images/flags/${slug}.${ext}`;
    const dest = join(FLAGS_DIR, `${slug}.${ext}`);

    if (!existsSync(dest)) {
      await downloadBinary(meta.originalUrl, dest, (path, buf) => writeFileSync(path, buf));
    }

    entries[country] = {
      country,
      slug,
      path: localPath,
      commonsFile: meta.commonsFile,
      imageSource: 'Wikimedia Commons',
      imageSourceUrl: meta.pageUrl,
      imageLicense: meta.licenseShort || 'Public domain',
    };
    ok += 1;
    console.log(`  ✓ ${country} → ${localPath}`);
  }

  const manifest = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    entryCount: Object.keys(entries).length,
    entries,
  };

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${MANIFEST_PATH} (${ok} flags, ${fail} failed)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
