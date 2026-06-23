import { leagues, players, teams } from '../data/sampleData.js';
import { getLiveNationalTeams } from '../data/nationalTeamData.js';
import { EXTERNAL_LEAGUE_ID } from './footballDisplay.js';
import { isInQuizEcosystem } from './quizPlayerRules.js';

const ENTITY_WEIGHTS = [
  { type: 'player', weight: 46 },
  { type: 'club', weight: 26 },
  { type: 'league', weight: 12 },
  { type: 'national', weight: 16 },
];

export const JOURNEY_ENTITY_LABELS = {
  player: 'Player profile',
  club: 'Club profile',
  league: 'League guide',
  national: 'National team',
};

export const JOURNEY_SPIN_MESSAGES = [
  'Shuffling through squad sheets…',
  'Tracing a club through the archives…',
  'Following a thread of football history…',
  'Opening a name you may not know yet…',
  'Crossing a league border…',
  'Spinning the globe for a nation…',
  'Digging for a hidden gem…',
];

let cachedPools = null;

function buildPlayerPools() {
  const gems = [];
  const known = [];
  const stars = [];

  for (const player of players) {
    if (!isInQuizEcosystem(player)) continue;
    const score = Number(player.importanceScore) || 0;
    if (score >= 15_000) stars.push(player);
    else if (score >= 4_000) known.push(player);
    else gems.push(player);
  }

  if (!gems.length) gems.push(...known.slice(0, Math.min(known.length, 300)));
  if (!known.length) known.push(...stars, ...gems);
  if (!stars.length) stars.push(...known.slice(0, 80));

  return { gems, known, stars };
}

function getPools() {
  if (cachedPools) return cachedPools;

  const playerPools = buildPlayerPools();
  const clubs = teams.filter((team) => team.leagueId !== EXTERNAL_LEAGUE_ID);
  const hiddenClubs = teams.filter((team) => team.leagueId === EXTERNAL_LEAGUE_ID);
  const leagueList = leagues.filter((league) => league.id !== EXTERNAL_LEAGUE_ID);
  const nations = getLiveNationalTeams();

  cachedPools = {
    ...playerPools,
    clubs,
    hiddenClubs,
    leagues: leagueList,
    nations,
  };
  return cachedPools;
}

function pickWeightedType(rng) {
  const total = ENTITY_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of ENTITY_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return ENTITY_WEIGHTS[0].type;
}

function pickFrom(arr, rng) {
  if (!arr.length) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function playerJourneyHint(player) {
  const score = Number(player.importanceScore) || 0;
  if (score < 4_000) return 'A hidden gem in the roster';
  if (player.quickFact && String(player.quickFact).trim().length >= 20) {
    return 'A story waiting in the archives';
  }
  if (score >= 15_000) return 'A face of the modern game';
  return 'A name worth knowing';
}

function pickPlayer(rng, pools) {
  const tierRoll = rng();
  let pool = pools.known;
  if (tierRoll < 0.5 && pools.gems.length) pool = pools.gems;
  else if (tierRoll >= 0.82 && pools.stars.length) pool = pools.stars;

  const player = pickFrom(pool, rng) ?? pickFrom(pools.known, rng) ?? pickFrom(pools.gems, rng);
  if (!player) {
    return {
      type: 'player',
      path: '/browse',
      label: 'Browse players',
      hint: 'Explore the full database',
    };
  }

  return {
    type: 'player',
    path: `/player/${player.id}`,
    label: player.name,
    hint: playerJourneyHint(player),
  };
}

function pickClub(rng, pools) {
  const useHidden = rng() < 0.24 && pools.hiddenClubs.length > 0;
  const pool = useHidden ? pools.hiddenClubs : pools.clubs;
  const club = pickFrom(pool, rng);
  if (!club) {
    return {
      type: 'club',
      path: '/browse?tab=clubs',
      label: 'Browse clubs',
      hint: 'Explore club profiles',
    };
  }

  return {
    type: 'club',
    path: `/team/${club.id}`,
    label: club.name,
    hint: useHidden ? 'A club off the beaten path' : 'A squad worth studying',
  };
}

/**
 * @param {() => number} [rng] — 0..1; defaults to Math.random
 * @returns {{ type: string, path: string, label: string, hint: string }}
 */
export function rollRandomFootballJourney(rng = Math.random) {
  const pools = getPools();
  const type = pickWeightedType(rng);

  switch (type) {
    case 'club':
      return pickClub(rng, pools);
    case 'league': {
      const league = pickFrom(pools.leagues, rng);
      if (!league) {
        return { type: 'league', path: '/browse?tab=clubs', label: 'Leagues', hint: 'Browse by league' };
      }
      return {
        type: 'league',
        path: `/league/${league.id}`,
        label: league.name,
        hint: 'Dive into a league profile',
      };
    }
    case 'national': {
      const nation = pickFrom(pools.nations, rng);
      if (!nation) {
        return {
          type: 'national',
          path: '/national-teams',
          label: 'National teams',
          hint: 'Browse international football',
        };
      }
      return {
        type: 'national',
        path: `/national-team/${nation.id}`,
        label: nation.name,
        hint: 'International football awaits',
      };
    }
    default:
      return pickPlayer(rng, pools);
  }
}
