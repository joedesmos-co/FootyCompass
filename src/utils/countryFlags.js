/**
 * Resolve cached national flag assets (local SVG/PNG under /images/flags/).
 */

import manifest from '../data/countryFlagManifest.json' with { type: 'json' };
import { getCountryFlag } from './footballDisplay';

const entriesByCountry = new Map(
  Object.entries(manifest.entries ?? {}).map(([country, entry]) => [country, entry]),
);

/**
 * @param {string} [country]
 */
export function getCountryFlagAsset(country) {
  const label = String(country ?? '').trim();
  if (!label) return null;
  const entry = entriesByCountry.get(label);
  if (!entry?.path) return null;
  return {
    url: entry.path,
    alt: `${label} flag`,
    emoji: getCountryFlag(label),
    country: label,
    imageSource: entry.imageSource ?? 'FootyCompass flag manifest',
    imageSourceUrl: entry.imageSourceUrl ?? null,
  };
}

/**
 * @param {{ country?: string, displayName?: string } | null | undefined} nationalTeam
 */
export function resolveNationalTeamFlag(nationalTeam) {
  const country = nationalTeam?.country ?? nationalTeam?.displayName ?? '';
  const asset = getCountryFlagAsset(country);
  if (asset) return { ...asset, tier: 'flagAsset' };

  const emoji = getCountryFlag(country);
  if (emoji) return { tier: 'flagEmoji', emoji, country, url: null };

  return { tier: 'initials', country, url: null, emoji: null };
}

export function getCountryFlagManifestMeta() {
  return {
    schemaVersion: manifest.schemaVersion,
    updatedAt: manifest.updatedAt,
    entryCount: manifest.entryCount ?? entriesByCountry.size,
  };
}
