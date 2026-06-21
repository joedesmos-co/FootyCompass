#!/usr/bin/env node
/**
 * Priority visual asset coverage report.
 *
 * This intentionally reports real asset gaps, not placeholder coverage.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collections } from '../src/data/collectionsData.js';
import { learningPaths } from '../src/data/learningPathsData.js';
import {
  getLeagueName,
  getTeamName,
  players,
  teams,
} from '../src/data/sampleData.js';
import clubManifest from '../src/data/clubCrestManifest.json' with { type: 'json' };
import qualityConfig from '../src/data/playerImageQuality.json' with { type: 'json' };
import live from '../src/data/nationalTeamLive.json' with { type: 'json' };
import qualifiedManifest from '../editorial-overlays/world-cup-2026-qualified-teams.json' with { type: 'json' };
import curatedPlayerImages from './data/wikimedia-player-curated.mjs';
import curatedClubCrests from './data/wikimedia-club-curated.mjs';
import { resolvePlayerImageSource } from '../src/utils/playerImageManifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const OUT_DIR = join(root, 'generated-data');
const JSON_PATH = join(OUT_DIR, 'priority-visual-coverage-report.json');
const MD_PATH = join(OUT_DIR, 'priority-visual-coverage-report.md');
const PLAYER_IMAGE_CACHE_PATH = join(OUT_DIR, 'player-image-wikimedia-cache.json');
const CLUB_CREST_CACHE_PATH = join(OUT_DIR, 'club-crest-wikimedia-cache.json');
const playerImageCache = readJson(PLAYER_IMAGE_CACHE_PATH, { resolved: {}, skipped: {} });
const clubCrestCache = readJson(CLUB_CREST_CACHE_PATH, { entries: {} });

const MAJOR_LEAGUE_IDS = new Set([
  'premier-league',
  'la-liga',
  'bundesliga',
  'serie-a',
  'ligue-1',
]);

const PRIORITY = {
  quizReadyPlayer: { code: 'A', label: 'Quiz-ready player', order: 1 },
  learningPathPlayer: { code: 'B', label: 'Learning-path player', order: 2 },
  worldCupPlayer: { code: 'C', label: 'World Cup prep player', order: 3 },
  majorClub: { code: 'D', label: 'Major-league club', order: 4 },
  remainingClub: { code: 'E', label: 'Remaining club', order: 5 },
  remainingPlayer: { code: 'F', label: 'Remaining player', order: 6 },
};

function hasRealPlayerPhoto(player) {
  return Boolean(resolvePlayerImageSource(player).url);
}

function hasRealClubCrest(team) {
  return Boolean(team.crestUrl || clubManifest.entries?.[team.id]?.path);
}

function collectionById() {
  return new Map(collections.map((collection) => [collection.id, collection]));
}

function collectLearningPathPlayerIds() {
  const byId = collectionById();
  const ids = new Set();
  const collectionIds = new Set();

  for (const path of learningPaths) {
    if (path.collectionId) collectionIds.add(path.collectionId);
    for (const step of path.steps ?? []) {
      if (step.entityType === 'player' && step.id) ids.add(step.id);
      if (step.collectionId) collectionIds.add(step.collectionId);
    }
  }

  for (const collectionId of collectionIds) {
    const collection = byId.get(collectionId);
    for (const item of collection?.items ?? []) {
      if (item.type === 'player' && item.id) ids.add(item.id);
    }
  }

  return ids;
}

function collectWorldCupPrepPlayerIds() {
  const ids = new Set();
  const qualifiedIds = new Set((qualifiedManifest.teams ?? []).map((team) => team.id));

  for (const collection of collections) {
    const isWorldCupCollection =
      collection.tags?.includes('World Cup') || /world cup/i.test(collection.title ?? '');
    if (!isWorldCupCollection) continue;
    for (const item of collection.items ?? []) {
      if (item.type === 'player' && item.id) ids.add(item.id);
    }
  }

  for (const membership of live.nationalMemberships ?? []) {
    if (!qualifiedIds.has(membership.nationalTeamId)) continue;
    if (membership.playerId) ids.add(membership.playerId);
  }

  return ids;
}

function nationalTeamForPlayerId(playerId) {
  const row = (live.nationalMemberships ?? []).find((m) => m.playerId === playerId);
  return row?.nationalTeamId ?? null;
}

function playerPriority(player, learningPathIds, worldCupIds) {
  if (player.quizEligible === true) return PRIORITY.quizReadyPlayer;
  if (learningPathIds.has(player.id)) return PRIORITY.learningPathPlayer;
  if (worldCupIds.has(player.id)) return PRIORITY.worldCupPlayer;
  return PRIORITY.remainingPlayer;
}

function playerPriorityScore(player, learningPathIds, worldCupIds) {
  const priority = playerPriority(player, learningPathIds, worldCupIds);
  const learningBoost = learningPathIds.has(player.id) ? 8 : 0;
  const worldCupBoost = worldCupIds.has(player.id) ? 5 : 0;
  return (player.importanceScore ?? 0) + learningBoost + worldCupBoost;
}

function crestPriorityScore(team) {
  const roster = players.filter((player) => player.teamId === team.id);
  const quizReady = roster.filter((player) => player.quizEligible === true).length;
  const maxImportance = Math.max(0, ...roster.map((player) => player.importanceScore ?? 0));
  return maxImportance + quizReady * 6 + Math.min(roster.length, 12);
}

function imageSpecKind(spec) {
  if (!spec) return 'no curated spec yet';
  if (spec.commonsFile) return 'curated Commons file';
  return 'curated search spec';
}

function directSpecIsDenylisted(spec) {
  if (!spec?.commonsFile) return false;
  return (qualityConfig.denyCommonsFiles ?? []).some(
    (file) => file.toLowerCase() === spec.commonsFile.toLowerCase(),
  );
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function playerFetchStatus(playerId) {
  if (playerImageCache.resolved?.[playerId]) return 'cached resolved, not approved';
  const skipped = playerImageCache.skipped?.[playerId];
  if (skipped?.reason) return `cached reject: ${skipped.reason}`;
  return 'not attempted';
}

function clubFetchStatus(teamId) {
  const row = clubCrestCache.entries?.[teamId];
  if (row?.status === 'resolved') return 'cached resolved';
  if (row?.status === 'skip') return `cached reject: ${row.reason ?? 'skip'}`;
  return 'not attempted';
}

function hasCachedReject(row) {
  return row.fetchStatus?.startsWith('cached reject:');
}

function buildReport() {
  const learningPathIds = collectLearningPathPlayerIds();
  const worldCupIds = collectWorldCupPrepPlayerIds();
  const playerById = new Map(players.map((player) => [player.id, player]));

  const missingPlayerAssets = players
    .filter((player) => !hasRealPlayerPhoto(player))
    .map((player) => {
      const priority = playerPriority(player, learningPathIds, worldCupIds);
      const spec = curatedPlayerImages.entries?.[player.id];
      return {
        type: 'player',
        priorityCode: priority.code,
        priorityLabel: priority.label,
        id: player.id,
        name: player.name,
        club: getTeamName(player.teamId),
        league: getLeagueName(player.leagueId),
        nationalTeam: player.nationalTeam ?? player.nationality ?? null,
        nationalTeamId: nationalTeamForPlayerId(player.id),
        importanceScore: player.importanceScore ?? 0,
        quizEligible: player.quizEligible === true,
        learningPath: learningPathIds.has(player.id),
        worldCupPrep: worldCupIds.has(player.id),
        sourcePlan: imageSpecKind(spec),
        fetchStatus: playerFetchStatus(player.id),
        curatedCommonsFile: spec?.commonsFile ?? null,
        curatedSearchName: spec?.searchName ?? null,
        directSpecDenylisted: directSpecIsDenylisted(spec),
        rankScore: playerPriorityScore(player, learningPathIds, worldCupIds),
      };
    });

  const missingClubAssets = teams
    .filter((team) => !hasRealClubCrest(team))
    .map((team) => {
      const priority = MAJOR_LEAGUE_IDS.has(team.leagueId)
        ? PRIORITY.majorClub
        : PRIORITY.remainingClub;
      const spec = curatedClubCrests.entries?.[team.id];
      return {
        type: 'club',
        priorityCode: priority.code,
        priorityLabel: priority.label,
        id: team.id,
        name: team.name,
        league: getLeagueName(team.leagueId),
        leagueId: team.leagueId,
        country: team.country,
        sourcePlan: imageSpecKind(spec),
        fetchStatus: clubFetchStatus(team.id),
        curatedCommonsFile: spec?.commonsFile ?? null,
        curatedSearchTerm: spec?.searchTerm ?? null,
        rankScore: crestPriorityScore(team),
      };
    });

  const allMissing = [...missingPlayerAssets, ...missingClubAssets].sort(
    (a, b) =>
      PRIORITY_ORDER[a.priorityCode] - PRIORITY_ORDER[b.priorityCode] ||
      b.rankScore - a.rankScore ||
      a.name.localeCompare(b.name),
  );

  const missingQuizReadyPlayers = missingPlayerAssets
    .filter((row) => row.quizEligible)
    .sort((a, b) => b.rankScore - a.rankScore || a.name.localeCompare(b.name));

  const missingLearningPathPlayers = missingPlayerAssets
    .filter((row) => row.learningPath)
    .sort((a, b) => b.rankScore - a.rankScore || a.name.localeCompare(b.name));

  const missingWorldCupPlayers = missingPlayerAssets
    .filter((row) => row.worldCupPrep)
    .sort((a, b) => b.rankScore - a.rankScore || a.name.localeCompare(b.name));

  const missingMajorClubs = missingClubAssets
    .filter((row) => row.priorityCode === 'D')
    .sort((a, b) => b.rankScore - a.rankScore || a.name.localeCompare(b.name));

  const missingRemainingClubs = missingClubAssets
    .filter((row) => row.priorityCode === 'E')
    .sort((a, b) => b.rankScore - a.rankScore || a.name.localeCompare(b.name));

  const achievable = estimateAchievable(missingQuizReadyPlayers, missingMajorClubs, missingWorldCupPlayers);

  return {
    generatedAt: new Date().toISOString(),
    note:
      'World Cup player coverage means World Cup prep collections and qualified/live national-team pools, not official 2026 rosters.',
    totals: {
      players: players.length,
      playerPhotosReal: players.filter(hasRealPlayerPhoto).length,
      playerPhotosMissing: missingPlayerAssets.length,
      quizReadyPlayers: players.filter((player) => player.quizEligible === true).length,
      quizReadyPlayersMissingPhotos: missingQuizReadyPlayers.length,
      learningPathPlayersMissingPhotos: missingLearningPathPlayers.length,
      worldCupPrepPlayersMissingPhotos: missingWorldCupPlayers.length,
      clubs: teams.length,
      clubCrestsReal: teams.filter(hasRealClubCrest).length,
      clubCrestsMissing: missingClubAssets.length,
      majorLeagueClubsMissingCrests: missingMajorClubs.length,
    },
    priorityOrder: Object.values(PRIORITY).map(({ code, label }) => ({ code, label })),
    achievable,
    missingMajorClubs,
    missingQuizReadyPlayers,
    missingLearningPathPlayers,
    missingWorldCupPlayers,
    missingRemainingClubs,
    top100MissingAssets: allMissing.slice(0, 100),
  };
}

const PRIORITY_ORDER = Object.fromEntries(
  Object.values(PRIORITY).map((priority) => [priority.code, priority.order]),
);

function estimateAchievable(missingQuizReadyPlayers, missingMajorClubs, missingWorldCupPlayers) {
  const directQuizWithoutCachedReject = missingQuizReadyPlayers.filter(
    (row) => row.curatedCommonsFile && !row.directSpecDenylisted && !hasCachedReject(row),
  );
  const curatedQuiz = missingQuizReadyPlayers.filter((row) => row.sourcePlan !== 'no curated spec yet');
  const curatedWorldCup = missingWorldCupPlayers.filter((row) => row.sourcePlan !== 'no curated spec yet');
  const unattemptedCuratedQuiz = curatedQuiz.filter((row) => row.fetchStatus === 'not attempted');
  const cachedRejectedQuiz = curatedQuiz.filter(hasCachedReject);
  const cachedRejectedWorldCup = curatedWorldCup.filter(hasCachedReject);
  const directQuizNeedingManualReview = missingQuizReadyPlayers.filter(
    (row) => row.curatedCommonsFile && hasCachedReject(row),
  );
  const curatedMajorClubs = missingMajorClubs.filter((row) => row.sourcePlan !== 'no curated spec yet');
  const directMajorClubs = missingMajorClubs.filter((row) => row.curatedCommonsFile);
  const directMajorClubsWithoutCachedReject = directMajorClubs.filter((row) => !hasCachedReject(row));
  const directMajorClubsWithCachedReject = directMajorClubs.filter(hasCachedReject);
  const realisticNearTerm = unattemptedCuratedQuiz.length
    ? `A careful targeted pass should first try the ${unattemptedCuratedQuiz.length} unattempted curated quiz-ready player leads, then manually review cached rejects before approving anything.`
    : 'The existing curated quiz-ready player leads have already been attempted; more real photos likely require manual Commons review, new curated files, or relaxing quality gates only with visual inspection.';
  const realisticClubNearTerm = directMajorClubsWithoutCachedReject.length
    ? `Start with the ${directMajorClubsWithoutCachedReject.length} direct major-club crest file targets that do not have a cached rejection, then manually refresh stale Commons filenames.`
    : 'Current major-club crest leads are cached no-match/stale; improving real crest coverage needs updated licensed/Commons files or manual verification, not another blind fetch.';

  return {
    nearTermPlayerTargets: realisticNearTerm,
    nearTermClubTargets: realisticClubNearTerm,
    directQuizReadyWithoutCachedReject: directQuizWithoutCachedReject.slice(0, 30).map(summaryName),
    directQuizReadyNeedingManualReview: directQuizNeedingManualReview.slice(0, 30).map(summaryName),
    quizReadyWithAnyCuratedSpec: curatedQuiz.length,
    quizReadyCuratedUnattempted: unattemptedCuratedQuiz.length,
    quizReadyCuratedCachedRejected: cachedRejectedQuiz.length,
    worldCupPrepWithAnyCuratedSpec: curatedWorldCup.length,
    worldCupPrepCuratedCachedRejected: cachedRejectedWorldCup.length,
    majorClubsWithAnyCuratedSpec: curatedMajorClubs.length,
    majorClubsWithDirectCommonsFile: directMajorClubs.map((row) => row.name),
    majorClubsDirectWithoutCachedReject: directMajorClubsWithoutCachedReject.map((row) => row.name),
    majorClubsDirectWithCachedReject: directMajorClubsWithCachedReject.map((row) => summaryName(row)),
  };
}

function summaryName(row) {
  return `${row.name} (${row.id})`;
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const divider = `| ${columns.map(() => '---').join(' |')} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => escapeCell(column.value(row))).join(' |')} |`,
  );
  return [header, divider, ...body].join('\n');
}

function escapeCell(value) {
  return String(value ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function renderMarkdown(report) {
  const topColumns = [
    { label: '#', value: (row) => report.top100MissingAssets.indexOf(row) + 1 },
    { label: 'Priority', value: (row) => `${row.priorityCode} ${row.priorityLabel}` },
    { label: 'Name', value: (row) => row.name },
    { label: 'Entity', value: (row) => row.type },
    { label: 'Club / League', value: (row) => row.type === 'player' ? `${row.club} / ${row.league}` : row.league },
    { label: 'Score', value: (row) => row.importanceScore ?? Math.round(row.rankScore) },
    { label: 'Source plan', value: (row) => row.sourcePlan },
    { label: 'Fetch status', value: (row) => row.fetchStatus ?? '—' },
  ];

  return [
    '# Priority Visual Coverage Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    report.note,
    '',
    '## Real Asset Gaps',
    '',
    `- Player photos: ${report.totals.playerPhotosReal} real, ${report.totals.playerPhotosMissing} missing real photos.`,
    `- Quiz-ready players: ${report.totals.quizReadyPlayers} total, ${report.totals.quizReadyPlayersMissingPhotos} missing real photos.`,
    `- Learning-path players missing real photos: ${report.totals.learningPathPlayersMissingPhotos}.`,
    `- World Cup prep players missing real photos: ${report.totals.worldCupPrepPlayersMissingPhotos}.`,
    `- Club crests: ${report.totals.clubCrestsReal} real, ${report.totals.clubCrestsMissing} missing real crests.`,
    `- Major-league clubs missing real crests: ${report.totals.majorLeagueClubsMissingCrests}.`,
    '',
    '## Priority Order',
    '',
    ...report.priorityOrder.map((row) => `- ${row.code}) ${row.label}`),
    '',
    '## Missing Major Clubs With No Crest',
    '',
    markdownTable(report.missingMajorClubs, [
      { label: 'Club', value: (row) => row.name },
      { label: 'League', value: (row) => row.league },
      { label: 'Source plan', value: (row) => row.sourcePlan },
      { label: 'Fetch status', value: (row) => row.fetchStatus },
      { label: 'Curated file/search', value: (row) => row.curatedCommonsFile ?? row.curatedSearchTerm },
    ]),
    '',
    '## Missing Quiz-Ready Players With No Photo (Top 75)',
    '',
    markdownTable(report.missingQuizReadyPlayers.slice(0, 75), [
      { label: 'Player', value: (row) => row.name },
      { label: 'Club', value: (row) => row.club },
      { label: 'League', value: (row) => row.league },
      { label: 'Score', value: (row) => row.importanceScore },
      { label: 'Source plan', value: (row) => row.sourcePlan },
      { label: 'Fetch status', value: (row) => row.fetchStatus },
    ]),
    '',
    '## Missing World Cup Prep Players With No Photo (Top 75)',
    '',
    markdownTable(report.missingWorldCupPlayers.slice(0, 75), [
      { label: 'Player', value: (row) => row.name },
      { label: 'National team', value: (row) => row.nationalTeam },
      { label: 'Club', value: (row) => row.club },
      { label: 'Score', value: (row) => row.importanceScore },
      { label: 'Source plan', value: (row) => row.sourcePlan },
      { label: 'Fetch status', value: (row) => row.fetchStatus },
    ]),
    '',
    '## Top 100 Most Important Missing Assets',
    '',
    markdownTable(report.top100MissingAssets, topColumns),
    '',
    '## Estimated Achievable Real Coverage After Targeted Work',
    '',
    `- ${report.achievable.nearTermPlayerTargets}`,
    `- ${report.achievable.nearTermClubTargets}`,
    `- Quiz-ready missing players with any curated spec: ${report.achievable.quizReadyWithAnyCuratedSpec}.`,
    `- Quiz-ready curated leads not yet attempted: ${report.achievable.quizReadyCuratedUnattempted}.`,
    `- Quiz-ready curated leads with cached safety rejections: ${report.achievable.quizReadyCuratedCachedRejected}.`,
    `- World Cup prep missing players with any curated spec: ${report.achievable.worldCupPrepWithAnyCuratedSpec}.`,
    `- World Cup prep curated leads with cached safety rejections: ${report.achievable.worldCupPrepCuratedCachedRejected}.`,
    `- Major missing clubs with any curated crest spec: ${report.achievable.majorClubsWithAnyCuratedSpec}.`,
    `- Major missing clubs with direct Commons file targets: ${report.achievable.majorClubsWithDirectCommonsFile.join(', ') || 'none'}.`,
    `- Direct major-club crest targets without cached rejection: ${report.achievable.majorClubsDirectWithoutCachedReject.join(', ') || 'none'}.`,
    `- Direct major-club crest targets with cached no-match/stale results: ${report.achievable.majorClubsDirectWithCachedReject.join(', ') || 'none'}.`,
    '',
    'Direct Commons quiz-ready targets without cached rejection:',
    ...report.achievable.directQuizReadyWithoutCachedReject
      .slice(0, 20)
      .map((name) => `- ${name}`),
    '',
    'Direct Commons quiz-ready targets needing manual review:',
    ...report.achievable.directQuizReadyNeedingManualReview
      .slice(0, 20)
      .map((name) => `- ${name}`),
    '',
  ].join('\n');
}

const report = buildReport();
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(MD_PATH, renderMarkdown(report), 'utf8');

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${MD_PATH}`);
console.log(
  JSON.stringify(
    {
      playerPhotosReal: report.totals.playerPhotosReal,
      quizReadyPlayersMissingPhotos: report.totals.quizReadyPlayersMissingPhotos,
      worldCupPrepPlayersMissingPhotos: report.totals.worldCupPrepPlayersMissingPhotos,
      majorLeagueClubsMissingCrests: report.totals.majorLeagueClubsMissingCrests,
      top100: report.top100MissingAssets.length,
    },
    null,
    2,
  ),
);
