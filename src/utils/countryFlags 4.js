/**
 * Resolve cached national flag assets (local SVG/PNG under /images/flags/).
 */

import manifest from '../data/countryFlagManifest.json' with { type: 'json' };
import { getCountryFlag } from './footballDisplay.js';

const entriesByCountry = new Map(
  Object.entries(manifest.entries ?? {}).map(([country, entry]) => [country, entry]),
);

const entriesBySlug = new Map(
  Object.values(manifest.entries ?? {})
    .filter((entry) => entry?.slug)
    .map((entry) => [entry.slug, entry]),
);

function buildAssetFromEntry(entry, label) {
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
 * @param {string} [country]
 */
export function getCountryFlagAsset(country) {
  const label = String(country ?? '').trim();
  if (!label) return null;
  const entry = entriesByCountry.get(label);
  return buildAssetFromEntry(entry, label);
}

/**
 * @param {string} [slug]
 */
export function getCountryFlagAssetBySlug(slug) {
  const key = String(slug ?? '').trim().toLowerCase();
  if (!key) return null;
  const entry = entriesBySlug.get(key);
  if (!entry) return null;
  return buildAssetFromEntry(entry, entry.country ?? key);
}

/**
 * @param {{ id?: string, country?: string, displayName?: string } | null | undefined} nationalTeam
 */
export function resolveNationalTeamFlag(nationalTeam) {
  const country = nationalTeam?.country ?? nationalTeam?.displayName ?? '';
  const asset =
    getCountryFlagAsset(country) ??
    getCountryFlagAssetBySlug(nationalTeam?.id) ??
    getCountryFlagAssetBySlug(country);

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
