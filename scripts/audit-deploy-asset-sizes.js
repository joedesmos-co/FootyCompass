#!/usr/bin/env node
/**
 * Fail if any static asset exceeds Cloudflare Pages' 25 MiB per-file limit.
 * Checks public/ (source) and dist/ (build output) when present.
 *
 *   npm run audit:deploy-asset-sizes
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

/** Cloudflare Pages single-asset limit — https://developers.cloudflare.com/pages/platform/limits/ */
const CLOUDFLARE_MAX_BYTES = 25 * 1024 * 1024;
const WARN_BYTES = 20 * 1024 * 1024;

function walkFiles(dir) {
  const hits = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      hits.push(...walkFiles(full));
      continue;
    }
    hits.push({ rel: relative(root, full), bytes: st.size });
  }
  return hits;
}

function auditDir(label, dir) {
  if (!existsSync(dir)) {
    console.log(`SKIP: ${label} not found (${relative(root, dir)})`);
    return { failures: [], warnings: [] };
  }

  const files = walkFiles(dir);
  const failures = files.filter((f) => f.bytes > CLOUDFLARE_MAX_BYTES);
  const warnings = files.filter((f) => f.bytes > WARN_BYTES && f.bytes <= CLOUDFLARE_MAX_BYTES);
  const largest = [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 5);

  console.log(`${label}: ${files.length} files scanned`);
  for (const f of largest) {
    console.log(`  largest: ${f.rel} (${(f.bytes / 1024 / 1024).toFixed(2)} MiB)`);
  }
  for (const f of warnings) {
    console.warn(`WARN: ${f.rel} is ${(f.bytes / 1024 / 1024).toFixed(2)} MiB (approaching 25 MiB limit)`);
  }
  for (const f of failures) {
    console.error(
      `FAIL: ${f.rel} is ${(f.bytes / 1024 / 1024).toFixed(2)} MiB — exceeds Cloudflare Pages 25 MiB limit`,
    );
  }

  return { failures, warnings };
}

const publicResult = auditDir('public/', join(root, 'public'));
const distResult = auditDir('dist/', join(root, 'dist'));

const failures = [...publicResult.failures, ...distResult.failures];
if (failures.length) {
  console.error(`\n${failures.length} file(s) exceed the 25 MiB deployment limit.`);
  process.exit(1);
}

console.log('OK: all deploy assets are within Cloudflare Pages 25 MiB per-file limit');
