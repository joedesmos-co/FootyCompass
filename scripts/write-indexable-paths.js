#!/usr/bin/env node
/**
 * Publish indexable path list for Cloudflare Pages 404 middleware.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildIndexablePathSet,
  buildIndexableRoutes,
  loadIndexableData,
  readDataAsOf,
} from './lib/indexable-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'public/data/indexable-paths.json');

async function main() {
  const dataAsOf = readDataAsOf();
  const data = await loadIndexableData();
  const routes = buildIndexableRoutes(data, { dataAsOf });
  const paths = buildIndexablePathSet(routes);

  const playerPaths = paths.filter((p) => p.startsWith('/player/'));

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    dataAsOf,
    pathCount: paths.length,
    playerPathCount: playerPaths.length,
    paths,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload)}\n`);

  console.log(
    `Wrote ${path.relative(ROOT, OUT_PATH)} (${paths.length} paths, ${playerPaths.length} players)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
