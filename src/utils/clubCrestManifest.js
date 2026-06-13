/**
 * Licensed club crest manifest — local /images/clubs/* paths.
 */

import manifest from '../data/clubCrestManifest.json' with { type: 'json' };
import { isApprovedAssetUrl } from './playerImageUrlPolicy';

const entriesByTeamId = new Map(
  Object.entries(manifest.entries ?? {}).map(([id, entry]) => [id, entry]),
);

/**
 * @param {string} teamId
 */
export function getClubCrestEntry(teamId) {
  return entriesByTeamId.get(teamId) ?? null;
}

/**
 * @param {{ id?: string, name?: string, crestUrl?: string | null } | null | undefined} team
 */
export function resolveClubCrest(team) {
  if (!team?.id) return { crestUrl: null, tier: 'initials' };

  if (team.crestUrl && isApprovedAssetUrl(team.crestUrl)) {
    return { crestUrl: team.crestUrl, tier: 'inline' };
  }

  const entry = getClubCrestEntry(team.id);
  if (entry?.path && isApprovedAssetUrl(entry.path)) {
    return {
      crestUrl: entry.path,
      tier: 'manifest',
      imageSource: entry.imageSource ?? 'FootyCompass club crest manifest',
      imageSourceUrl: entry.imageSourceUrl ?? null,
      imageLicense: entry.imageLicense ?? null,
      commonsFile: entry.commonsFile ?? null,
    };
  }

  return { crestUrl: null, tier: 'initials' };
}

export function getClubCrestManifestMeta() {
  return {
    schemaVersion: manifest.schemaVersion,
    updatedAt: manifest.updatedAt,
    entryCount: manifest.entryCount ?? entriesByTeamId.size,
  };
}
