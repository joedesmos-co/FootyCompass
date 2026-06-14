/**
 * Multi-tier player image resolution.
 *
 * Order:
 *   1. Owner-licensed local/stock assets (scripts/data/player-image-licensed.mjs)
 *   2. Wikimedia Commons (curated + search via wikimediaPlayerImage.mjs)
 *
 * FootyRenders and similar render sites are intentionally excluded: their FAQ
 * restricts use to non-commercial graphics and prohibits automated extraction.
 * See PLAYER_IMAGE_POLICY.md — only add render URLs here after explicit legal review.
 */

import licensed from '../data/player-image-licensed.mjs';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isApprovedAssetUrl, isDisallowedImageUrl } from '../../src/utils/playerImageUrlPolicy.js';
import { resolvePlayerCommonsImage, buildApprovedEntry } from './wikimediaPlayerImage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

function readLocalFileMeta(spec) {
  const rel = spec.imageUrl?.trim();
  if (!rel?.startsWith('/images/')) return null;
  const abs = join(root, 'public', rel.replace(/^\//, ''));
  if (!existsSync(abs)) return null;
  return { abs, rel };
}

function buildLicensedEntry(player, spec) {
  const local = readLocalFileMeta(spec);
  if (!local) return { skip: true, reason: 'licensed_file_missing' };

  const url = spec.imageUrl.trim();
  if (isDisallowedImageUrl(url) || !isApprovedAssetUrl(url)) {
    return { skip: true, reason: 'licensed_url_not_approved' };
  }

  if (!String(spec.imageCredit ?? '').trim() || !String(spec.imageLicense ?? '').trim()) {
    return { skip: true, reason: 'licensed_missing_attribution' };
  }

  if (!String(spec.identityNote ?? '').trim()) {
    return { skip: true, reason: 'licensed_missing_identity_note' };
  }

  return {
    tier: 'licensed',
    entry: {
      imageUrl: url,
      imageAlt: spec.imageAlt ?? `${player.name}, ${player.position ?? 'footballer'} — licensed photo`,
      imageCredit: spec.imageCredit,
      imageLicense: spec.imageLicense,
      imageSource: spec.imageSource ?? 'Licensed stock asset',
      imageSourceUrl: spec.imageSourceUrl ?? null,
      imageAttributionRequired: spec.imageAttributionRequired !== false,
      imageSrcSet: null,
      status: 'approved',
      identityNote: spec.identityNote,
      imageTier: 'licensed',
    },
    meta: {
      sourceUrl: spec.imageSourceUrl,
      licenseShort: spec.imageLicense,
      identityNote: spec.identityNote,
    },
  };
}

/**
 * Resolve a player image from approved tiers.
 * @param {object} player
 * @param {object} wikimediaSpec
 * @param {{ force?: boolean, existingEntry?: object | null }} [options]
 */
export async function resolvePlayerImageSources(player, wikimediaSpec, options = {}) {
  const licensedSpec = licensed.entries?.[player.id];
  if (licensedSpec) {
    const licensedResult = buildLicensedEntry(player, licensedSpec);
    if (!licensedResult.skip) {
      return licensedResult;
    }
  }

  const commons = await resolvePlayerCommonsImage(wikimediaSpec, player);
  if (commons.skip) {
    return { skip: true, reason: commons.reason, tier: 'wikimedia' };
  }

  const { meta, quality } = commons;
  const entry = buildApprovedEntry(player, meta, meta.thumbUrl, quality, {
    identityNote: `Wikimedia identity verified: ${wikimediaSpec.verifyName ?? player.name}; context: ${(wikimediaSpec.contextTerms ?? []).filter(Boolean).join(', ') || 'football'}`,
    imageTier: 'wikimedia',
  });

  if (options.existingEntry?.imageUrl && !options.force) {
    const existingScore = options.existingEntry.qualityScore ?? 0;
    const newScore = quality?.score ?? entry.qualityScore ?? 0;
    if (newScore <= existingScore + 5) {
      return { skip: true, reason: 'existing_image_not_clearly_better', tier: 'wikimedia' };
    }
  }

  return { tier: 'wikimedia', entry, meta, quality };
}

export function categorizeSkipReason(reason) {
  if (!reason) return 'rejected';
  if (reason === 'no_safe_match') return 'no_safe_match';
  if (reason === 'identity_mismatch') return 'wrong_player_blocked';
  if (/identity|wrong|mismatch|different person|not clearly/i.test(reason)) {
    return 'wrong_player_blocked';
  }
  return 'rejected';
}
