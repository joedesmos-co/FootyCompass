#!/usr/bin/env node
/**
 * Verify national team flag wiring (manifest → resolver → badge tiers).
 *
 *   node scripts/audit-national-team-flags.js
 */

import live from '../src/data/nationalTeamLive.json' with { type: 'json' };
import manifest from '../src/data/countryFlagManifest.json' with { type: 'json' };
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Mirror component fallback after fix: asset first, emoji if asset path missing file, initials last
import { getCountryFlag } from '../src/utils/footballDisplay.js';
import { resolveNationalTeamFlag } from '../src/utils/countryFlags.js';

const nts = live.nationalTeams ?? [];
const entries = manifest.entries ?? {};

let flagAsset = 0;
let flagEmojiOnly = 0;
let initials = 0;
let missingFiles = 0;
const uiTiers = { flagImage: 0, flagEmoji: 0, shieldInitials: 0 };

for (const nt of nts) {
  const resolved = resolveNationalTeamFlag(nt);
  const filePath = resolved.url ? join(root, 'public', resolved.url.replace(/^\//, '')) : null;
  const fileExists = filePath ? existsSync(filePath) : false;

  if (resolved.tier === 'flagAsset') flagAsset += 1;
  else if (resolved.tier === 'flagEmoji') flagEmojiOnly += 1;
  else initials += 1;

  if (resolved.tier === 'flagAsset' && !fileExists) missingFiles += 1;

  // Simulates NationalTeamBadge render tiers (imgFailed when file missing)
  const emoji = resolved.emoji ?? getCountryFlag(nt.country ?? nt.displayName);
  if (resolved.tier === 'flagAsset' && resolved.url && fileExists) {
    uiTiers.flagImage += 1;
  } else if (emoji) {
    uiTiers.flagEmoji += 1;
  } else {
    uiTiers.shieldInitials += 1;
  }
}

const report = {
  manifestEntries: Object.keys(entries).length,
  nationalTeams: nts.length,
  resolver: { flagAsset, flagEmojiOnly, initials },
  publicFilesMissing: missingFiles,
  uiExpected: uiTiers,
};

console.log(JSON.stringify(report, null, 2));

if (report.manifestEntries !== 55) {
  console.error('FAIL: expected 55 manifest entries');
  process.exit(1);
}
if (report.resolver.flagAsset !== 55) {
  console.error('FAIL: resolver should map all 55 teams to flagAsset');
  process.exit(1);
}
if (report.uiExpected.shieldInitials > 0) {
  console.error('FAIL: some teams would still render shield initials in UI');
  process.exit(1);
}

console.log('OK: all national teams resolve to flag image or emoji in UI');

// Verify Vite copied public/images into dist (Cloudflare Pages output).
const distFlagsDir = join(root, 'dist/images/flags');
const distFrance = join(distFlagsDir, 'france.svg');
if (!existsSync(distFrance)) {
  console.error('FAIL: dist/images/flags/france.svg missing — run npm run build');
  process.exit(1);
}

let distFlagCount = 0;
try {
  distFlagCount = readdirSync(distFlagsDir).filter((f) => !f.startsWith('.')).length;
} catch {
  console.error('FAIL: dist/images/flags/ not found');
  process.exit(1);
}

console.log(`OK: dist/images/flags/ has ${distFlagCount} files (france.svg present)`);
