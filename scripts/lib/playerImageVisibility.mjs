/**
 * Visibility scoring for player photo gap prioritization.
 * Higher score = more user-facing impact if a real photo is missing.
 */

import { collections } from '../../src/data/collectionsData.js';
import { learningPaths } from '../../src/data/learningPathsData.js';
import { getLeagueName, getTeamName, players, teams } from '../../src/data/sampleData.js';
import live from '../../src/data/nationalTeamLive.json' with { type: 'json' };
import qualifiedManifest from '../../editorial-overlays/world-cup-2026-qualified-teams.json' with { type: 'json' };
import { isQuizEligiblePlayer } from '../../src/utils/quizPlayerRules.js';
import { resolvePlayerImageSource } from '../../src/utils/playerImageManifest.js';

export const MAJOR_LEAGUE_IDS = new Set([
  'premier-league',
  'la-liga',
  'bundesliga',
  'serie-a',
  'ligue-1',
]);

const TIER_WEIGHT = {
  quizReady: 10_000,
  learningPath: 5_000,
  worldCupStar: 3_000,
  homepageFeatured: 2_000,
  majorLeagueStarter: 1_000,
  other: 0,
};

let learningPathIdsCache = null;
let worldCupIdsCache = null;
let featuredPickIdsCache = null;

function collectionById() {
  return new Map(collections.map((collection) => [collection.id, collection]));
}

export function collectLearningPathPlayerIds() {
  if (learningPathIdsCache) return learningPathIdsCache;
  const ids = new Set();
  const collectionIds = new Set();
  const byId = collectionById();

  for (const path of learningPaths) {
    if (path.collectionId) collectionIds.add(path.collectionId);
    for (const step of path.steps ?? []) {
      if (step.entityType === 'player' && step.id) ids.add(step.id);
      if (step.collectionId) collectionIds.add(step.collectionId);
    }
  }

  for (const collectionId of collectionIds) {
    for (const item of byId.get(collectionId)?.items ?? []) {
      if (item.type === 'player' && item.id) ids.add(item.id);
    }
  }

  learningPathIdsCache = ids;
  return ids;
}

export function collectWorldCupPrepPlayerIds() {
  if (worldCupIdsCache) return worldCupIdsCache;
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

  worldCupIdsCache = ids;
  return ids;
}

export function collectHomepageFeaturedPlayerIds() {
  if (featuredPickIdsCache) return featuredPickIdsCache;
  const ids = new Set();
  for (const player of players) {
    if (isQuizEligiblePlayer(player)) {
      ids.add(player.id);
      continue;
    }
    if (player.dataStatus === 'generated-editorial-approved') {
      ids.add(player.id);
    }
  }
  featuredPickIdsCache = ids;
  return featuredPickIdsCache;
}

export function isMajorLeagueStarter(player) {
  const team = teams.find((t) => t.id === player.teamId);
  if (!team || !MAJOR_LEAGUE_IDS.has(team.leagueId)) return false;
  return (player.importanceScore ?? 0) >= 65;
}

export function getVisibilityTiers(player) {
  const learningPathIds = collectLearningPathPlayerIds();
  const worldCupIds = collectWorldCupPrepPlayerIds();
  const featuredIds = collectHomepageFeaturedPlayerIds();
  const tiers = [];

  if (player.quizEligible === true) tiers.push('quizReady');
  if (learningPathIds.has(player.id)) tiers.push('learningPath');
  if (worldCupIds.has(player.id)) tiers.push('worldCupStar');
  if (featuredIds.has(player.id)) tiers.push('homepageFeatured');
  if (isMajorLeagueStarter(player)) tiers.push('majorLeagueStarter');
  if (!tiers.length) tiers.push('other');

  return tiers;
}

export function getPrimaryVisibilityTier(player) {
  const tiers = getVisibilityTiers(player);
  const order = ['quizReady', 'learningPath', 'worldCupStar', 'homepageFeatured', 'majorLeagueStarter', 'other'];
  return order.find((tier) => tiers.includes(tier)) ?? 'other';
}

export function computeVisibilityScore(player) {
  const tiers = getVisibilityTiers(player);
  let score = player.importanceScore ?? 0;

  for (const tier of tiers) {
    score += TIER_WEIGHT[tier] ?? 0;
  }

  return score;
}

export function hasRealPlayerPhoto(player) {
  return Boolean(resolvePlayerImageSource(player).url);
}

export function buildVisibilityGapRow(player, extras = {}) {
  const tiers = getVisibilityTiers(player);
  return {
    id: player.id,
    name: player.name,
    club: getTeamName(player.teamId),
    league: getLeagueName(player.leagueId),
    nationalTeam: player.nationalTeam ?? player.nationality ?? null,
    importanceScore: player.importanceScore ?? 0,
    visibilityScore: computeVisibilityScore(player),
    primaryTier: getPrimaryVisibilityTier(player),
    tiers,
    quizEligible: player.quizEligible === true,
    ...extras,
  };
}

export function listMissingPhotoGaps({ sortByVisibility = true } = {}) {
  return players
    .filter((player) => !hasRealPlayerPhoto(player))
    .map((player) => buildVisibilityGapRow(player))
    .sort((a, b) =>
      sortByVisibility
        ? b.visibilityScore - a.visibilityScore || b.importanceScore - a.importanceScore || a.id.localeCompare(b.id)
        : a.id.localeCompare(b.id),
    );
}
