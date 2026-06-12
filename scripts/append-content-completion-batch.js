#!/usr/bin/env node
/**
 * Content-completion pass — quiz depth for recognizable in-league players only.
 */

import { DATA_PATHS } from './lib/data-pipeline-paths.js';
import { upsertDraftPlayers } from './lib/upsert-draft-players.js';

const CONTENT_COMPLETION_BATCH = [
  {
    id: 'tm-255755',
    sourceId: '255755',
    displayName: 'Alex Telles',
    quickFact:
      'Brazil left-back who won the Champions League with Porto and Manchester United before returning to Brazilian club football at Botafogo.',
    quizHints: [
      'Brazil left-back in black-and-white Botafogo kit with Porto and United pedigree.',
      'Overlapping full-back — not Marcelo the legendary Seleção left-back.',
      'Alex who attacks the flank from left-back in the Brasileirão.',
    ],
    playingStyle:
      'Attacking left-back who overlaps, delivers crosses, and strikes from distance with his left foot.',
    importanceScore: 78,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-170527',
    sourceId: '170527',
    displayName: 'Timo Werner',
    quickFact:
      'Germany centre-forward who starred at RB Leipzig and Chelsea before moving to MLS with the San Jose Earthquakes.',
    quizHints: [
      'Germany striker in white kit with Leipzig and Chelsea pedigree.',
      'San Jose Earthquakes forward — not Havertz the playmaking forward.',
      'Timo who runs in behind and finishes with pace in MLS.',
    ],
    playingStyle:
      'Mobile centre-forward who attacks space behind the line and finishes with pace and composure.',
    importanceScore: 76,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-227081',
    sourceId: '227081',
    displayName: 'Joaquín Correa',
    quickFact:
      'Argentina forward who won the Copa América with the Albiceleste and starred for Inter Milan before joining Botafogo.',
    quizHints: [
      'Argentina forward in Botafogo stripes with Inter Milan pedigree.',
      'Second striker — not Lautaro the main centre-forward for Argentina.',
      'Joaquín who links play between the lines in the Brasileirão.',
    ],
    playingStyle:
      'Skillful second striker who drops deep, combines in tight spaces, and arrives late in the box.',
    importanceScore: 78,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-10471',
    sourceId: '10471',
    displayName: 'Luiz Gustavo',
    quickFact:
      'Brazil defensive midfielder who played at the 2014 World Cup and won Bundesliga titles with Bayern Munich and Wolfsburg.',
    quizHints: [
      'Brazil defensive midfielder in yellow with Bayern Munich pedigree.',
      'Athletico Paranaense anchor — not Casemiro the Seleção holding midfielder.',
      'Luiz who shields the defence and breaks up play in the Brasileirão.',
    ],
    playingStyle:
      'Physical defensive midfielder who screens the back line, wins duels, and distributes simply.',
    importanceScore: 76,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-355816',
    sourceId: '355816',
    displayName: 'Ko Itakura',
    quickFact:
      'Japan centre-back who starred at Manchester City on loan and became a regular for the Samurai Blue in the Eredivisie at Ajax.',
    quizHints: [
      'Japan centre-back in orange with Manchester City and Ajax pedigree.',
      'Ajax defender — not Tomiyasu the full-back for Japan.',
      'Ko who reads danger early and distributes calmly in the Eredivisie.',
    ],
    playingStyle:
      'Composed centre-back who steps into midfield, wins aerial duels, and builds play from deep.',
    importanceScore: 76,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-122155',
    sourceId: '122155',
    displayName: 'Willian José',
    quickFact:
      'Brazil striker who scored freely in La Liga and the Brasileirão before leading the line for Bahia and the Seleção pool.',
    quizHints: [
      'Brazil centre-forward in Bahia blue-red with Real Sociedad pedigree.',
      'Target striker — not Richarlison the mobile forward for Brazil.',
      'Willian who holds up play and finishes with power in the Brasileirão.',
    ],
    playingStyle:
      'Physical centre-forward who links play, wins headers, and finishes with power in the box.',
    importanceScore: 74,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-627207',
    sourceId: '627207',
    displayName: 'Ricardo Pepi',
    quickFact:
      'United States striker who broke through at FC Dallas and moved to the Eredivisie with PSV as a USMNT goal threat.',
    quizHints: [
      'USA centre-forward in stars-and-stripes kit with PSV Eindhoven ties.',
      'Young striker — not Pulisic the winger for the USMNT.',
      'Ricardo who runs in behind and finishes in the Eredivisie.',
    ],
    playingStyle:
      'Mobile centre-forward who attacks space behind the line and finishes with composure.',
    importanceScore: 74,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
];

const result = upsertDraftPlayers({
  draftPath: DATA_PATHS.draftOverlay,
  batch: CONTENT_COMPLETION_BATCH,
  description:
    'Content-completion pass — recognizable Brasileirão/Eredivisie/MLS quiz depth (2026-05-29).',
});

console.log(
  `Upserted ${result.upserted} players (${result.created} new, ${result.updated} updated) into draft overlay.`,
);
