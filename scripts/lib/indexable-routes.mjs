/**
 * Indexable public pathnames for sitemap + edge 404 validation.
 * Shared by generate-sitemap.js and write-indexable-paths.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalUrlForPath, SITE_URL } from '../../src/utils/brand.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const DEFAULT_DATA_AS_OF = new Date().toISOString().slice(0, 10);

export function readDataAsOf() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'src/data/datasetMeta.js'), 'utf8');
    const m = raw.match(/dataAsOf:\s*'([^']+)'/);
    return m?.[1] ?? DEFAULT_DATA_AS_OF;
  } catch {
    return DEFAULT_DATA_AS_OF;
  }
}

export function absUrl(pathname) {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${SITE_URL}${p}`;
}

export function normalizePathname(pathname) {
  const raw = String(pathname ?? '').trim();
  if (!raw || raw === '/') return '/';
  const withoutQuery = raw.split('?')[0].split('#')[0];
  return withoutQuery.replace(/\/+$/, '') || '/';
}

/** @param {object} player */
export function isIndexablePlayer(player) {
  if (!player?.id) return false;
  if (player.leagueId === 'external') return false;
  // Core quizEligible flag survives editorial overlay split (hints live in overlay JSON).
  return player.quizEligible === true;
}

export async function loadIndexableData() {
  const { players, teams, leagues } = await import('../../src/data/sampleData.js');
  const { QUIZ_THEME_CATALOG } = await import('../../src/data/quizThemes.js');
  const { CLUB_QUIZ_CATEGORY_CATALOG } = await import('../../src/data/clubQuizCategories.js');
  const ntLive = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src/data/nationalTeamLive.json'), 'utf8'),
  );
  const { collections } = await import('../../src/data/collectionsData.js');
  const { learningPaths } = await import('../../src/data/learningPathsData.js');
  return {
    players,
    teams,
    leagues,
    liveNationalTeamIds: ntLive?.meta?.liveNationalTeamIds ?? [],
    collections,
    learningPaths,
    quizThemes: QUIZ_THEME_CATALOG,
    clubQuizCategories: CLUB_QUIZ_CATEGORY_CATALOG,
  };
}

/**
 * @returns {{ loc: string, pathname: string, lastmod: string }[]}
 */
export function buildIndexableRoutes(data, { dataAsOf = readDataAsOf() } = {}) {
  const urls = [];

  const staticIndexable = [
    '/',
    '/browse',
    '/teams',
    '/collections',
    '/learning-paths',
    '/national-teams',
    '/world-cup',
    '/quiz',
    '/compare',
    '/daily',
    '/onboarding',
    '/about',
    '/editorial',
    '/privacy',
    '/league/international',
    '/hubs',
    '/hubs/quizzes',
    '/hubs/quizzes/themes',
    '/hubs/quizzes/clubs',
    '/club-quiz',
    '/hubs/players/by-nationality',
    '/hubs/players/best-young-footballers',
    '/hubs/world-cup/player-quiz',
    '/hubs/learn/football-players',
  ];

  for (const p of staticIndexable) {
    urls.push({ loc: absUrl(p), pathname: p, lastmod: dataAsOf });
  }

  for (const theme of data.quizThemes ?? []) {
    if (!theme?.id) continue;
    const pathname = `/hubs/quizzes/theme/${theme.id}`;
    urls.push({ loc: absUrl(pathname), pathname, lastmod: dataAsOf });
  }

  for (const cat of data.clubQuizCategories ?? []) {
    if (!cat?.id) continue;
    const pathname = `/hubs/quizzes/clubs/${cat.id}`;
    urls.push({ loc: absUrl(pathname), pathname, lastmod: dataAsOf });
  }

  for (const league of data.leagues ?? []) {
    const pathname = `/league/${league.id}`;
    urls.push({ loc: absUrl(pathname), pathname, lastmod: dataAsOf });
    if (league.id !== 'external') {
      const hubPath = `/hubs/quizzes/league/${league.id}`;
      urls.push({ loc: absUrl(hubPath), pathname: hubPath, lastmod: dataAsOf });
    }
  }

  for (const team of data.teams ?? []) {
    if (team.leagueId === 'external') continue;
    const teamPath = `/team/${team.id}`;
    urls.push({ loc: absUrl(teamPath), pathname: teamPath, lastmod: dataAsOf });
    const quizPath = `/hubs/quizzes/team/${team.id}`;
    urls.push({ loc: absUrl(quizPath), pathname: quizPath, lastmod: dataAsOf });
  }

  for (const player of data.players ?? []) {
    if (!isIndexablePlayer(player)) continue;
    const pathname = `/player/${player.id}`;
    urls.push({ loc: absUrl(pathname), pathname, lastmod: dataAsOf });
  }

  const nationCounts = new Map();
  for (const player of data.players ?? []) {
    const nation = String(player?.nationality ?? '').trim();
    if (!nation) continue;
    nationCounts.set(nation, (nationCounts.get(nation) ?? 0) + 1);
  }
  const topNations = [...nationCounts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, 80)
    .map(([nation]) => nation);
  for (const nation of topNations) {
    const pathname = `/hubs/players/nationality/${encodeURIComponent(nation)}`;
    urls.push({ loc: absUrl(pathname), pathname, lastmod: dataAsOf });
  }

  for (const id of data.liveNationalTeamIds ?? []) {
    const pathname = `/national-team/${id}`;
    urls.push({ loc: absUrl(pathname), pathname, lastmod: dataAsOf });
  }

  for (const c of data.collections ?? []) {
    if (!c?.id) continue;
    const pathname = `/collections/${c.id}`;
    urls.push({ loc: absUrl(pathname), pathname, lastmod: dataAsOf });
  }

  for (const p of data.learningPaths ?? []) {
    if (!p?.id) continue;
    const pathname = `/learning-paths/${p.id}`;
    urls.push({ loc: absUrl(pathname), pathname, lastmod: dataAsOf });
  }

  const seen = new Set();
  return urls.filter((entry) => {
    const pathname = normalizePathname(entry.pathname);
    if (pathname.startsWith('/dev/')) return false;
    if (pathname.includes('?') || pathname.includes('#')) return false;
    if (seen.has(pathname)) return false;
    seen.add(pathname);
    entry.pathname = pathname;
    entry.loc = canonicalUrlForPath(pathname);
    return true;
  });
}

export function buildIndexablePathSet(routes) {
  return routes.map((row) => normalizePathname(row.pathname));
}
