/**
 * Pure overlay field merge — shared by browser loader and Node sync loader.
 */

export const PLAYER_OVERLAY_FIELDS = [
  'quickFact',
  'playStyleSummary',
  'playingStyle',
  'strengths',
  'keyStrengths',
  'knownFor',
  'quizHints',
  'roleSummary',
  'careerContext',
  'shirtNumber',
  'jerseyNumber',
  'squadNumber',
];

export const TEAM_OVERLAY_FIELDS = [
  'shortHistory',
  'fanGuide',
  'metaDescription',
  'tacticalIdentity',
  'stadiumContext',
  'leagueContext',
  'rivalsSummary',
  'legendsSummary',
  'playersToKnowIntro',
  'quizDiscoveryLead',
];

function pickOverlay(base, overlay, fields) {
  if (!overlay) return base;
  const next = { ...base };
  for (const key of fields) {
    const value = overlay[key];
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    next[key] = value;
  }
  return next;
}

export function applyPlayerOverlay(player, playerOverlays) {
  if (!player?.id) return player;
  return pickOverlay(player, playerOverlays?.[player.id], PLAYER_OVERLAY_FIELDS);
}

export function applyTeamOverlay(team, teamOverlays) {
  if (!team?.id) return team;
  return pickOverlay(team, teamOverlays?.[team.id], TEAM_OVERLAY_FIELDS);
}
