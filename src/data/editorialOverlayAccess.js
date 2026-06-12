/**
 * Browser runtime: lazy-load editorial overlays from public/data/editorial/*.json.
 * Rich copy is not bundled into sampleData.js — see write-editorial-overlays.js.
 */

import {
  applyPlayerOverlay,
  applyTeamOverlay,
} from './editorialOverlayMerge.js';

const PLAYER_OVERLAY_URL = '/data/editorial/player-overlays.json';
const TEAM_OVERLAY_URL = '/data/editorial/team-overlays.json';

let playerOverlays = null;
let teamOverlays = null;
let loadPromise = null;

export async function ensureEditorialOverlays() {
  if (playerOverlays && teamOverlays) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [playerRes, teamRes] = await Promise.all([
      fetch(PLAYER_OVERLAY_URL),
      fetch(TEAM_OVERLAY_URL),
    ]);
    if (!playerRes.ok) {
      throw new Error(`Failed to load player editorial overlays (${playerRes.status})`);
    }
    if (!teamRes.ok) {
      throw new Error(`Failed to load team editorial overlays (${teamRes.status})`);
    }
    const playerData = await playerRes.json();
    const teamData = await teamRes.json();
    playerOverlays = playerData?.overlays ?? {};
    teamOverlays = teamData?.overlays ?? {};
  })();

  try {
    await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

export function mergePlayerOverlay(player) {
  return applyPlayerOverlay(player, playerOverlays ?? {});
}

export function mergeTeamOverlay(team) {
  return applyTeamOverlay(team, teamOverlays ?? {});
}

export function hasPlayerOverlay(playerId) {
  return Boolean(playerOverlays?.[playerId]);
}

export function hasTeamOverlay(teamId) {
  return Boolean(teamOverlays?.[teamId]);
}

export function areEditorialOverlaysLoaded() {
  return Boolean(playerOverlays && teamOverlays);
}
