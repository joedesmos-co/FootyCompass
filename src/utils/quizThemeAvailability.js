import { getQuizThemeById, QUIZ_THEME_CATALOG } from '../data/quizThemes';
import { buildThemedQuizPool } from './quizThemePools';
import { QUIZ_MIN_SESSION_POOL } from './quizSession';

/**
 * Shared theme viability — use the same rules on the quiz page and themes hub.
 * Display counts use each theme's default difficulty so labels stay stable.
 */

export function getQuizThemePoolCount(players, themeId, { teams = [], difficulty } = {}) {
  const theme = getQuizThemeById(themeId);
  if (!theme || !Array.isArray(players)) return 0;
  const diff = difficulty ?? theme.defaultDifficulty ?? 'medium';
  return buildThemedQuizPool(players, themeId, { teams, difficulty: diff }).length;
}

export function isQuizThemePlayable(players, themeId, options = {}) {
  const minPool = options.minPool ?? QUIZ_MIN_SESSION_POOL;
  return getQuizThemePoolCount(players, themeId, options) >= minPool;
}

/**
 * @returns {{ count: number, playable: boolean, minPool: number }}
 */
export function getQuizThemeAvailability(players, themeId, { teams = [], difficulty, minPool } = {}) {
  const floor = minPool ?? QUIZ_MIN_SESSION_POOL;
  const count = getQuizThemePoolCount(players, themeId, { teams, difficulty });
  return { count, playable: count >= floor, minPool: floor };
}

/** Counts keyed by theme id — default difficulty per theme (for UI labels). */
export function getQuizThemeDisplayCounts(players, { teams = [] } = {}) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const theme of QUIZ_THEME_CATALOG) {
    counts[theme.id] = getQuizThemePoolCount(players, theme.id, {
      teams,
      difficulty: theme.defaultDifficulty ?? 'medium',
    });
  }
  return counts;
}

export function getPlayableQuizThemes(players, { teams = [], minPool } = {}) {
  const floor = minPool ?? QUIZ_MIN_SESSION_POOL;
  const counts = getQuizThemeDisplayCounts(players, { teams });
  return QUIZ_THEME_CATALOG.filter((theme) => (counts[theme.id] ?? 0) >= floor);
}

export function isQuizThemePlayableById(themeId, counts, minPool = QUIZ_MIN_SESSION_POOL) {
  return (counts[themeId] ?? 0) >= minPool;
}
