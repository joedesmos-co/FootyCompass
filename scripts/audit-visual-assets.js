#!/usr/bin/env node
/**
 * Visual asset coverage report → generated-data/visual-asset-report.json + .md
 *
 *   npm run audit:visual-assets
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { teams, leagues, players } from '../src/data/sampleData.js';
import live from '../src/data/nationalTeamLive.json' with { type: 'json' };
import clubManifest from '../src/data/clubCrestManifest.json' with { type: 'json' };
import leagueManifest from '../src/data/leagueLogoManifest.json' with { type: 'json' };
import flagManifest from '../src/data/countryFlagManifest.json' with { type: 'json' };
import approved from '../src/data/playerImageApproved.json' with { type: 'json' };
import { resolvePlayerImageSource } from '../src/utils/playerImageManifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const OUT_DIR = join(root, 'generated-data');

function hasPlayerPhoto(player) {
  const src = resolvePlayerImageSource(player);
  return Boolean(src?.url);
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const nationalTeams = live.nationalTeams ?? [];
  const clubEntries = clubManifest.entries ?? {};
  const leagueEntries = leagueManifest.entries ?? {};
  const flagEntries = flagManifest.entries ?? {};
  const approvedEntries = approved.entries ?? approved;

  const clubsWithLogos = teams.filter((t) => {
    if (t.crestUrl) return true;
    const entry = clubEntries[t.id];
    return Boolean(entry?.path);
  });

  const leaguesWithLogos = leagues.filter((l) => {
    if (l.logoUrl) return true;
    if (l.id === 'external') return false;
    return Boolean(leagueEntries[l.id]?.path);
  });

  const flagsForNt = nationalTeams.filter((nt) => Boolean(flagEntries[nt.country]?.path));

  const quizEligible = players.filter((p) => p.quizEligible === true);
  const playersWithPhotos = players.filter(hasPlayerPhoto);
  const quizWithPhotos = quizEligible.filter(hasPlayerPhoto);

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      clubs: teams.length,
      clubsWithLogos: clubsWithLogos.length,
      leagues: leagues.filter((l) => l.id !== 'external').length,
      leaguesWithLogos: leaguesWithLogos.length,
      nationalTeams: nationalTeams.length,
      nationalTeamsWithFlags: flagsForNt.length,
      players: players.length,
      playersWithPhotos: playersWithPhotos.length,
      quizEligiblePlayers: quizEligible.length,
      quizEligibleWithPhotos: quizWithPhotos.length,
      approvedOverlayCount: Object.keys(approvedEntries).length,
    },
    missing: {
      clubsWithoutLogos: teams
        .filter((t) => !clubsWithLogos.some((c) => c.id === t.id))
        .map((t) => ({ id: t.id, name: t.name, leagueId: t.leagueId })),
      leaguesWithoutLogos: leagues
        .filter((l) => l.id !== 'external' && !leaguesWithLogos.some((x) => x.id === l.id))
        .map((l) => ({ id: l.id, name: l.name })),
      nationalTeamsWithoutFlags: nationalTeams
        .filter((nt) => !flagEntries[nt.country]?.path)
        .map((nt) => ({ id: nt.id, country: nt.country })),
      quizEligibleWithoutPhotos: quizEligible
        .filter((p) => !hasPlayerPhoto(p))
        .map((p) => ({ id: p.id, name: p.name })),
    },
  };

  const md = [
    '# FootyCompass visual asset report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Coverage',
    '',
    `| Asset | With visual | Total | % |`,
    `| --- | ---: | ---: | ---: |`,
    `| Clubs (logos) | ${report.totals.clubsWithLogos} | ${report.totals.clubs} | ${pct(report.totals.clubsWithLogos, report.totals.clubs)} |`,
    `| Leagues (logos) | ${report.totals.leaguesWithLogos} | ${report.totals.leagues} | ${pct(report.totals.leaguesWithLogos, report.totals.leagues)} |`,
    `| National teams (flags) | ${report.totals.nationalTeamsWithFlags} | ${report.totals.nationalTeams} | ${pct(report.totals.nationalTeamsWithFlags, report.totals.nationalTeams)} |`,
    `| Players (photos) | ${report.totals.playersWithPhotos} | ${report.totals.players} | ${pct(report.totals.playersWithPhotos, report.totals.players)} |`,
    `| Quiz-eligible (photos) | ${report.totals.quizEligibleWithPhotos} | ${report.totals.quizEligiblePlayers} | ${pct(report.totals.quizEligibleWithPhotos, report.totals.quizEligiblePlayers)} |`,
    '',
    '## Remaining gaps',
    '',
    `- Clubs missing logos: **${report.missing.clubsWithoutLogos.length}**`,
    `- Leagues missing logos: **${report.missing.leaguesWithoutLogos.length}**`,
    `- National teams missing flags: **${report.missing.nationalTeamsWithoutFlags.length}**`,
    `- Quiz-eligible players missing photos: **${report.missing.quizEligibleWithoutPhotos.length}**`,
    '',
  ].join('\n');

  writeFileSync(join(OUT_DIR, 'visual-asset-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(join(OUT_DIR, 'visual-asset-report.md'), md, 'utf8');
  console.log('Wrote generated-data/visual-asset-report.json');
  console.log(md);
}

function pct(n, d) {
  if (!d) return '0';
  return `${Math.round((n / d) * 1000) / 10}%`;
}

main();
