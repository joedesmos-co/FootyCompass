/**
 * Node/scripts: synchronous editorial overlay load from src/data JSON.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  applyPlayerOverlay,
  applyTeamOverlay,
} from './editorialOverlayMerge.js';

const require = createRequire(fileURLToPath(import.meta.url));

const playerOverlayData = require('./playerEditorialOverlays.json');
const teamOverlayData = require('./teamEditorialOverlays.json');

const playerOverlays = playerOverlayData?.overlays ?? {};
const teamOverlays = teamOverlayData?.overlays ?? {};

export function mergePlayerOverlay(player) {
  return applyPlayerOverlay(player, playerOverlays);
}

export function mergeTeamOverlay(team) {
  return applyTeamOverlay(team, teamOverlays);
}

export function hasPlayerOverlay(playerId) {
  return Boolean(playerOverlays[playerId]);
}

export function hasTeamOverlay(teamId) {
  return Boolean(teamOverlays[teamId]);
}

export function getPlayerOverlays() {
  return playerOverlays;
}

export function getTeamOverlays() {
  return teamOverlays;
}
