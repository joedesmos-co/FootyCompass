#!/usr/bin/env node
/**
 * Generate sitemap.xml for static hosting.
 *
 * - Frontend-only: reads local data files at build time.
 * - Excludes dev routes and query-parameter spam routes (quiz, compare, etc.).
 * - Supports future scaling via sitemap index when URL count grows.
 *
 * Env:
 * - SITE_URL (recommended): https://footycompass.com
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { SITE_URL } from '../src/utils/brand.js';
import {
  buildIndexableRoutes,
  loadIndexableData,
  readDataAsOf,
} from './lib/indexable-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const MAX_URLS_PER_SITEMAP = 45000;
const DATA_AS_OF = readDataAsOf();

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod }) {
  const last = String(lastmod ?? '').trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(last) ? last : null;
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    iso ? `    <lastmod>${escapeXml(iso)}</lastmod>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

function writeSitemapFile(filename, urls) {
  const body = urls.map(urlEntry).join('\n');
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(PUBLIC_DIR, filename), xml);
}

function writeSitemapIndex(files) {
  const entries = files
    .map((file) => {
      const loc = `${SITE_URL}/${file}`;
      return [
        '  <sitemap>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${escapeXml(DATA_AS_OF)}</lastmod>`,
        '  </sitemap>',
      ].join('\n');
    })
    .join('\n');
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</sitemapindex>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);
}

async function main() {
  const data = await loadIndexableData();
  const urls = buildIndexableRoutes(data, { dataAsOf: DATA_AS_OF });
  const playerCount = urls.filter((u) => u.pathname.startsWith('/player/')).length;

  if (urls.length <= MAX_URLS_PER_SITEMAP) {
    writeSitemapFile('sitemap.xml', urls);
    console.log(`Wrote public/sitemap.xml (${urls.length} urls, ${playerCount} players)`);
    return;
  }

  const files = [];
  let i = 0;
  for (let offset = 0; offset < urls.length; offset += MAX_URLS_PER_SITEMAP) {
    i += 1;
    const chunk = urls.slice(offset, offset + MAX_URLS_PER_SITEMAP);
    const filename = `sitemap-${String(i).padStart(3, '0')}.xml`;
    writeSitemapFile(filename, chunk);
    files.push(filename);
  }
  writeSitemapIndex(files);
  console.log(`Wrote public/sitemap.xml index + ${files.length} chunks (${urls.length} urls)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
