#!/usr/bin/env node
/**
 * Merge editorial-overlays/players.premium-pass.json into playerEditorialOverlays.json.
 * Does not change quiz eligibility or player counts in sampleData.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASS_PATH = path.join(ROOT, 'editorial-overlays/players.premium-pass.json');
const OUT_PATH = path.join(ROOT, 'src/data/playerEditorialOverlays.json');

function cleanList(value, max = 6) {
  if (!Array.isArray(value)) return null;
  const items = value.map((v) => String(v ?? '').trim()).filter(Boolean);
  return items.length ? items.slice(0, max) : null;
}

function main() {
  const pass = JSON.parse(fs.readFileSync(PASS_PATH, 'utf8'));
  const players = pass?.players ?? {};
  const raw = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  const overlays = { ...(raw.overlays ?? {}) };
  let updated = 0;

  for (const [id, patch] of Object.entries(players)) {
    const prev = overlays[id] ?? {};
    const strengths = cleanList(patch.strengths) ?? prev.strengths;
    const knownFor = cleanList(patch.knownFor) ?? prev.knownFor;
    overlays[id] = {
      ...prev,
      ...(strengths ? { strengths } : {}),
      ...(knownFor ? { knownFor } : {}),
      ...(patch.playStyleSummary ? { playStyleSummary: patch.playStyleSummary } : {}),
      ...(patch.roleSummary ? { roleSummary: patch.roleSummary } : {}),
      ...(patch.careerContext ? { careerContext: patch.careerContext } : {}),
    };
    updated += 1;
  }

  const payload = {
    ...raw,
    premiumPassAt: new Date().toISOString(),
    overlayCount: Object.keys(overlays).length,
    overlays,
  };
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Premium pass: updated ${updated} player overlays in ${path.relative(ROOT, OUT_PATH)}`);
}

main();
