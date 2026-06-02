/**
 * Homepage lanes — short, sports-first picks from existing routes only.
 */

import { DATASET_META } from './datasetMeta.js';

const FAN_FAVOURITE_LINKS = [
  { to: '/team/barcelona', label: 'Barcelona', hint: 'La Liga' },
  { to: '/team/real-madrid', label: 'Real Madrid', hint: 'La Liga' },
  { to: '/team/arsenal', label: 'Arsenal', hint: 'Premier League' },
  { to: '/team/liverpool', label: 'Liverpool', hint: 'Premier League' },
  { to: '/national-team/argentina', label: 'Argentina', hint: 'World Cup winners' },
  { to: '/national-team/brazil', label: 'Brazil', hint: 'Seleção' },
  { to: '/national-team/england', label: 'England', hint: 'Three Lions' },
  { to: '/world-cup', label: 'World Cup 2026', hint: 'Prep hub' },
];

/**
 * @returns {Array<{ id: string, title: string, subtitle?: string, items: Array<{ to: string, label: string, hint?: string }> }>}
 */
export function getHomePopularSections() {
  const quizReady = DATASET_META.quizEligibleCount ?? 518;

  return [
    {
      id: 'play-now',
      title: 'Jump in',
      subtitle: 'Quizzes and daily football — pick one and go',
      items: [
        {
          to: '/quiz',
          label: 'Player name quiz',
          hint: `${quizReady.toLocaleString()} players with clues`,
        },
        { to: '/club-quiz', label: 'Club knowledge quiz', hint: 'Stadiums, leagues, rivalries' },
        { to: '/daily', label: 'Daily challenge', hint: '5 questions · build a streak' },
        { to: '/quiz?theme=world-cup', label: 'World Cup quiz', hint: 'International prep' },
        { to: '/browse', label: 'Browse players & clubs', hint: 'Profiles before you quiz' },
      ],
    },
    {
      id: 'fan-favourites',
      title: 'Fan favourites',
      subtitle: 'Big clubs and nations fans open most',
      items: FAN_FAVOURITE_LINKS,
    },
  ];
}
