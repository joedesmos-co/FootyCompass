#!/usr/bin/env node
/**
 * Rank missing player photos by visibility score (highest-impact gaps first).
 *
 *   npm run report:player-image-visibility-gaps
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import approved from '../src/data/playerImageApproved.json' with { type: 'json' };
import { players } from '../src/data/sampleData.js';
import { getReviewEntries } from './lib/playerImageReview.mjs';
import { listMissingPhotoGaps } from './lib/playerImageVisibility.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const OUT_DIR = join(root, 'generated-data');
const JSON_PATH = join(OUT_DIR, 'player-image-visibility-gaps.json');
const MD_PATH = join(OUT_DIR, 'player-image-visibility-gaps.md');

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { skipped: {} };
  }
}

const cache = readJson(join(OUT_DIR, 'player-image-wikimedia-cache.json'));
const approvedEntries = approved.entries ?? approved;
const gaps = listMissingPhotoGaps();
const quizMissing = gaps.filter((row) => row.quizEligible);
const reviewIds = new Set(Object.keys(getReviewEntries()));

const enriched = gaps.map((row) => ({
  ...row,
  onReviewList: reviewIds.has(row.id),
  fetchStatus: cache.skipped?.[row.id]?.reason ?? (cache.resolved?.[row.id] ? 'resolved-not-approved' : 'not_attempted'),
  attempts: cache.skipped?.[row.id]?.attempts ?? 0,
}));

const summary = {
  generatedAt: new Date().toISOString(),
  approvedPhotos: Object.values(approvedEntries).filter((e) => e?.imageUrl).length,
  totalPlayers: players.length,
  missingPhotos: gaps.length,
  quizReadyMissing: quizMissing.length,
  learningPathMissing: enriched.filter((r) => r.tiers.includes('learningPath')).length,
  worldCupMissing: enriched.filter((r) => r.tiers.includes('worldCupStar')).length,
  homepageFeaturedMissing: enriched.filter((r) => r.tiers.includes('homepageFeatured')).length,
  onManualReviewList: enriched.filter((r) => r.onReviewList).length,
  topGaps: enriched.slice(0, 40),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(JSON_PATH, `${JSON.stringify({ summary, gaps: enriched }, null, 2)}\n`, 'utf8');

const md = [
  '# Player image visibility gaps',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  '## Summary',
  '',
  '| Metric | Count |',
  '| --- | ---: |',
  `| Approved photos | ${summary.approvedPhotos} |`,
  `| Missing photos | ${summary.missingPhotos} |`,
  `| Quiz-ready missing | ${summary.quizReadyMissing} |`,
  `| Learning-path missing | ${summary.learningPathMissing} |`,
  `| World Cup prep missing | ${summary.worldCupMissing} |`,
  `| Homepage featured pool missing | ${summary.homepageFeaturedMissing} |`,
  `| On manual review list | ${summary.onManualReviewList} |`,
  '',
  '## Top visibility gaps',
  '',
  '| Score | Player | Club | Tiers | Status |',
  '| ---: | --- | --- | --- | --- |',
  ...summary.topGaps.map(
    (row) =>
      `| ${row.visibilityScore} | ${row.name} (\`${row.id}\`) | ${row.club} | ${row.tiers.join(', ')} | ${row.onReviewList ? 'manual review' : row.fetchStatus} |`,
  ),
  '',
].join('\n');

writeFileSync(MD_PATH, `${md}\n`, 'utf8');

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${MD_PATH}`);
console.log(`Quiz-ready missing: ${summary.quizReadyMissing}`);
console.log(`Top gap: ${summary.topGaps[0]?.name ?? '—'} (score ${summary.topGaps[0]?.visibilityScore ?? 0})`);
