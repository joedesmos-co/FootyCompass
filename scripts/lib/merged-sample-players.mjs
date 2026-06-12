/**
 * Node helper: sampleData players with synchronous editorial overlays applied.
 */

import { players } from '../../src/data/sampleData.js';
import { mergePlayerOverlay } from '../../src/data/editorialOverlayAccess.node.js';

let cached = null;

export function getMergedSamplePlayers() {
  if (!cached) {
    cached = players.map((player) => mergePlayerOverlay(player));
  }
  return cached;
}
