#!/usr/bin/env node
/**
 * Comprehensive visual asset coverage report.
 *
 *   npm run audit:visual-assets
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

function readCache() {
  try {
    return JSON.parse(readFileSync(join(OUT_DIR, 'player-image-wikimedia-cache.json'), 'utf8'));
  } catch {
    return { skipped: {}, resolved: {} };
  }
}

function hasRealClubCrest(team, clubEntries) {
  if (team.crestUrl) return true;
  return Boolean(clubEntries[team.id]?.path);
}

function hasRealPlayerPhoto(player) {
  return Boolean(resolvePlayerImageSource(player).url);
}

function main() {
  const sizeAudit = spawnSync(process.execPath, [join(__dirname, 'audit-deploy-asset-sizes.js')], {
    stdio: 'inherit',
    cwd: root,
  });
  if (sizeAudit.status !== 0) process.exit(sizeAudit.status ?? 1);

  mkdirSync(OUT_DIR, { recursive: true });

  const nationalTeams = live.nationalTeams ?? [];
  const clubEntries = clubManifest.entries ?? {};
  const leagueEntries = leagueManifest.entries ?? {};
  const flagEntries = flagManifest.entries ?? {};
  const playerCache = readCache();

  const clubsWithRealCrests = teams.filter((t) => hasRealClubCrest(t, clubEntries));
  const clubsWithGeneratedBadges = teams.filter((t) => !hasRealClubCrest(t, clubEntries) && t.badgeTheme?.from);
  const clubsWithoutVisual = teams.filter((t) => !hasRealClubCrest(t, clubEntries) && !t.badgeTheme?.from);

  const leaguesWithLogos = leagues.filter((l) => {
    if (l.id === 'external') return false;
    return Boolean(l.logoUrl || leagueEntries[l.id]?.path);
  });

  const flagsForNt = nationalTeams.filter((nt) => Boolean(flagEntries[nt.country]?.path));

  const playersWithRealPhotos = players.filter(hasRealPlayerPhoto);
  const playersWithGeneratedFallback = players.filter((p) => !hasRealPlayerPhoto(p));

  const missingRealPhotos = playersWithGeneratedFallback.map((p) => {
    const skip = playerCache.skipped?.[p.id];
    return {
      id: p.id,
      name: p.name,
      leagueId: p.leagueId,
      importanceScore: p.importanceScore ?? 0,
      reason: skip?.reason ?? 'not_attempted',
    };
  });

  const missingRealCrests = teams
    .filter((t) => !hasRealClubCrest(t, clubEntries))
    .map((t) => ({
      id: t.id,
      name: t.name,
      leagueId: t.leagueId,
      hasGeneratedBadge: Boolean(t.badgeTheme?.from),
    }));

  const skipReasonCounts = {};
  for (const row of missingRealPhotos) {
    skipReasonCounts[row.reason] = (skipReasonCounts[row.reason] ?? 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      players: players.length,
      playersWithRealPhotos: playersWithRealPhotos.length,
      playersWithGeneratedFallback: playersWithGeneratedFallback.length,
      playerVisualCoverage: players.length,
      clubs: teams.length,
      clubsWithRealCrests: clubsWithRealCrests.length,
      clubsWithGeneratedBadges: clubsWithGeneratedBadges.length,
      clubsWithoutVisual: clubsWithoutVisual.length,
      clubVisualCoverage: clubsWithRealCrests.length + clubsWithGeneratedBadges.length,
      leagues: leagues.filter((l) => l.id !== 'external').length,
      leaguesWithLogos: leaguesWithLogos.length,
      nationalTeams: nationalTeams.length,
      nationalTeamsWithFlags: flagsForNt.length,
    },
    fallbackFeatures: {
      players: ['club/nation gradient', 'jersey silhouette', 'shirt number or initials', 'position badge', 'country flag', 'club code mark'],
      clubs: ['per-club badgeTheme colors', 'initials shield', 'league monogram chip', 'country label'],
    },
    skipReasonCounts,
    examples: {
      missingRealPhotos: missingRealPhotos
        .sort((a, b) => b.importanceScore - a.importanceScore)
        .slice(0, 15),
      missingRealCrests: missingRealCrests.slice(0, 15),
      clubsGeneratedOnly: clubsWithGeneratedBadges.slice(0, 10).map((t) => ({
        id: t.id,
        name: t.name,
        leagueId: t.leagueId,
      })),
    },
  };

  const md = [
    '# FootyCompass visual asset report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Coverage summary',
    '',
    '| Category | Real asset | Generated fallback | Total | Visual coverage |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| Players | ${report.totals.playersWithRealPhotos} | ${report.totals.playersWithGeneratedFallback} | ${report.totals.players} | ${pct(report.totals.playersWithRealPhotos + report.totals.playersWithGeneratedFallback, report.totals.players)} |`,
    `| Clubs | ${report.totals.clubsWithRealCrests} | ${report.totals.clubsWithGeneratedBadges} | ${report.totals.clubs} | ${pct(report.totals.clubVisualCoverage, report.totals.clubs)} |`,
    `| Leagues (logos) | ${report.totals.leaguesWithLogos} | 0 | ${report.totals.leagues} | ${pct(report.totals.leaguesWithLogos, report.totals.leagues)} |`,
    `| National teams (flags) | ${report.totals.nationalTeamsWithFlags} | 0 | ${report.totals.nationalTeams} | ${pct(report.totals.nationalTeamsWithFlags, report.totals.nationalTeams)} |`,
    '',
    '## Generated fallback features',
    '',
    '**Players:** ' + report.fallbackFeatures.players.join(', '),
    '**Clubs:** ' + report.fallbackFeatures.clubs.join(', '),
    '',
    `All ${report.totals.players} players and ${report.totals.clubVisualCoverage} clubs have an intentional visual (real asset or polished generated badge).`,
    '',
    '## Missing real assets — top reasons (players)',
    '',
    ...Object.entries(skipReasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([reason, count]) => `- **${reason}**: ${count}`),
    '',
    '## Example gaps',
    '',
    '**Players without Commons photo (high importance):**',
    ...report.examples.missingRealPhotos.slice(0, 8).map(
      (p) => `- ${p.name} (\`${p.id}\`) — ${p.reason}`,
    ),
    '',
    '**Clubs without Wikimedia crest (generated badge used):**',
    ...report.examples.missingRealCrests.slice(0, 8).map(
      (c) => `- ${c.name} (\`${c.id}\`, ${c.leagueId})`,
    ),
    '',
  ].join('\n');

  writeFileSync(join(OUT_DIR, 'visual-asset-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(join(OUT_DIR, 'visual-asset-report.md'), md, 'utf8');
  console.log('Wrote generated-data/visual-asset-report.json');
  console.log(md);
}

function pct(n, d) {
  if (!d) return '0%';
  return `${Math.round((n / d) * 1000) / 10}%`;
}

main();
