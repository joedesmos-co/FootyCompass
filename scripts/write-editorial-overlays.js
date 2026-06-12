#!/usr/bin/env node
/**
 * Publish editorial overlay JSON for lazy client fetch (not bundled in sampleData).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/data/editorial');

const SOURCES = [
  {
    from: path.join(ROOT, 'src/data/playerEditorialOverlays.json'),
    to: path.join(OUT_DIR, 'player-overlays.json'),
    label: 'player-overlays.json',
  },
  {
    from: path.join(ROOT, 'src/data/teamEditorialOverlays.json'),
    to: path.join(OUT_DIR, 'team-overlays.json'),
    label: 'team-overlays.json',
  },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { from, to, label } of SOURCES) {
  if (!fs.existsSync(from)) {
    console.error(`Missing ${from}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(from);
  fs.writeFileSync(to, raw);
  const gzipKb = (gzipSync(raw).length / 1024).toFixed(1);
  console.log(`Wrote ${path.relative(ROOT, to)} (${(raw.length / 1024).toFixed(1)} KB raw, ${gzipKb} KB gzip)`);
}
