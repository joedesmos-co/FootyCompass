#!/usr/bin/env node
/**
 * Bootstrap scripts/data/wikimedia-club-curated.mjs from sampleData teams.
 * Adds known Commons files for major clubs where available.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { teams } from '../src/data/sampleData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'data/wikimedia-club-curated.mjs');

/** Known-good Commons crest/logo files for major clubs (team slug ids). */
const KNOWN_COMMONS = {
  'arsenal': 'Arsenal_FC.svg',
  'chelsea': 'Chelsea_FC.svg',
  'manchester-city': 'Manchester_City_FC.svg',
  'manchester-united': 'Manchester_United_FC.svg',
  'liverpool': 'Liverpool_FC.svg',
  'tottenham': 'Tottenham_Hotspur.svg',
  'bayern-munich': 'FC_Bayern_München_logo_(2017).svg',
  'real-madrid': 'Real_Madrid_CF.svg',
  'barcelona': 'FC_Barcelona.svg',
  'paris-saint-germain': 'Paris_Saint-Germain_F.C..svg',
  'juventus': 'Juventus_FC_-_pictogramma_black.svg',
  'inter-milan': 'Inter_Milan.svg',
  'ac-milan': 'AC_Milan.svg',
  'borussia-dortmund': 'Borussia_Dortmund.svg',
  'ajax': 'AFC_Ajax.svg',
  'benfica': 'SL_Benfica_logo.svg',
  'porto': 'FC_Porto.svg',
  'atletico-madrid': 'Atlético_Madrid.svg',
  'sevilla': 'Sevilla_FC_logo.svg',
  'borussia-monchengladbach': 'Borussia_Mönchengladbach.svg',
  'newcastle': 'Newcastle_United_Logo.svg',
  'everton': 'Everton_FC_logo.svg',
  'aston-villa': 'Aston_Villa_FC_new_crest.svg',
  'crystal-palace': 'Crystal_Palace_FC_logo_(2022).svg',
  'brighton': 'Brighton_&_Hove_Albion_logo.svg',
  'fulham': 'Fulham_FC_(shield).svg',
  'nottingham-forest': 'Nottingham_Forest_F.C._logo.svg',
  'leicester': 'Leicester_City_crest.svg',
  'west-ham': 'West_Ham_United_FC_logo.svg',
  'wolves': 'Wolverhampton_Wanderers.svg',
  'bournemouth': 'AFC_Bournemouth.svg',
  'sheffield-united': 'Sheffield_United_FC_logo.svg',
  'burnley': 'Burnley_FC_Logo.svg',
  'luton': 'Luton_Town_FC_crest.svg',
  'brentford': 'Brentford_FC_crest.svg',
};

function esc(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const lines = [
  '/** Auto-generated club crest search specs — edit commonsFile for manual overrides. */',
  'export default {',
  '  entries: {',
];

for (const team of teams.filter((t) => t.leagueId !== 'external')) {
  const commons = KNOWN_COMMONS[team.id];
  const searchTerm = `${team.name} logo`;
  if (commons) {
    lines.push(
      `    '${team.id}': { searchTerm: '${esc(searchTerm)}', commonsFile: '${esc(commons)}' },`,
    );
  } else {
    lines.push(`    '${team.id}': { searchTerm: '${esc(searchTerm)}' },`);
  }
}

lines.push('  },', '};', '');

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Wrote ${OUT} (${teams.filter((t) => t.leagueId !== 'external').length} clubs)`);
