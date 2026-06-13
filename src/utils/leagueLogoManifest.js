/**
 * Licensed league logo manifest — local /images/leagues/* paths.
 */

import manifest from '../data/leagueLogoManifest.json' with { type: 'json' };
import { LEAGUE_DISPLAY_ACCENTS } from './footballDisplay';

const entriesByLeagueId = new Map(
  Object.entries(manifest.entries ?? {}).map(([id, entry]) => [id, entry]),
);

/**
 * @param {string} leagueId
 */
export function getLeagueLogoEntry(leagueId) {
  return entriesByLeagueId.get(leagueId) ?? null;
}

/**
 * @param {{ id?: string, logoUrl?: string | null, badgeTheme?: object } | null | undefined} league
 */
export function resolveLeagueLogo(league) {
  const leagueId = league?.id;
  if (!leagueId) return { logoUrl: null, badgeTheme: null };

  if (league.logoUrl) {
    return { logoUrl: league.logoUrl, badgeTheme: league.badgeTheme ?? null, tier: 'inline' };
  }

  const entry = getLeagueLogoEntry(leagueId);
  if (entry?.path) {
    const accent = LEAGUE_DISPLAY_ACCENTS[leagueId];
    const colors = entry.colors ?? accent ?? league.badgeTheme ?? null;
    return {
      logoUrl: entry.path,
      badgeTheme: colors,
      tier: 'manifest',
      imageSource: entry.imageSource,
      imageSourceUrl: entry.imageSourceUrl,
    };
  }

  const accent = LEAGUE_DISPLAY_ACCENTS[leagueId] ?? league.badgeTheme ?? null;
  return { logoUrl: null, badgeTheme: accent, tier: 'placeholder' };
}

export function getLeagueLogoManifestMeta() {
  return {
    schemaVersion: manifest.schemaVersion,
    updatedAt: manifest.updatedAt,
    entryCount: manifest.entryCount ?? entriesByLeagueId.size,
  };
}
