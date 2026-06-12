/**
 * Core sampleData row shape — editorial text lives in overlay JSON, not inline.
 */

const PLAYER_IMAGE_FIELDS = [
  'imageUrl',
  'imageAlt',
  'imageCredit',
  'imageSource',
  'imageLicense',
  'imageSourceUrl',
  'imageSrcSet',
  'imageAttributionRequired',
];

const PLAYER_EDITORIAL_FIELDS = [
  'quickFact',
  'playStyleSummary',
  'playingStyle',
  'strengths',
  'keyStrengths',
  'knownFor',
  'quizHints',
  'roleSummary',
  'careerContext',
  'careerHistory',
  'visualTheme',
];

/**
 * @param {object} player
 * @returns {object}
 */
export function slimPlayerRecord(player) {
  const approved = player.dataStatus === 'generated-editorial-approved' || player.quizEligible === true;

  const core = {
    id: player.id,
    name: player.name,
    dateOfBirth: player.dateOfBirth ?? null,
    age: player.age ?? null,
    position: player.position ?? 'Player',
    teamId: player.teamId,
    leagueId: player.leagueId,
    nationalTeam: player.nationalTeam ?? player.nationality ?? '—',
    nationality: player.nationality ?? '—',
    importanceScore: player.importanceScore ?? 0,
  };

  if (approved) {
    core.quizEligible = true;
    core.rosterTier = player.rosterTier === 'squad' ? 'featured' : (player.rosterTier ?? 'featured');
    core.dataStatus = 'generated-editorial-approved';
  }

  if (player.sourceId != null) core.sourceId = player.sourceId;

  for (const key of PLAYER_IMAGE_FIELDS) {
    const value = player[key];
    if (value == null || value === '') continue;
    core[key] = value;
  }

  return core;
}

/**
 * Strip editorial fields before merge re-serialization (MVP rows).
 * @param {object} player
 */
export function stripPlayerEditorialFields(player) {
  const next = { ...player };
  for (const key of PLAYER_EDITORIAL_FIELDS) {
    delete next[key];
  }
  if (!next.quizEligible) delete next.quizEligible;
  if (next.rosterTier === 'squad') delete next.rosterTier;
  if (next.dataStatus === 'generated-needs-editorial') delete next.dataStatus;
  return slimPlayerRecord(next);
}

/**
 * @param {object} team
 * @returns {object}
 */
export function slimTeamRecord(team) {
  const core = {
    id: team.id,
    name: team.name,
    leagueId: team.leagueId,
    country: team.country ?? '—',
    stadium: team.stadium ?? '—',
    founded: team.founded ?? null,
    rivals: Array.isArray(team.rivals) ? team.rivals : [],
    legends: Array.isArray(team.legends) ? team.legends : [],
    currentKeyPlayers: Array.isArray(team.currentKeyPlayers) ? team.currentKeyPlayers : [],
    manager: team.manager ?? null,
    identityTags: Array.isArray(team.identityTags) ? team.identityTags : [],
  };

  const history = String(team.shortHistory ?? '').trim();
  const guide = String(team.fanGuide ?? '').trim();
  if (history) core.shortHistory = history;
  if (guide) core.fanGuide = guide;

  return core;
}
