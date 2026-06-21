/** Text-free SVG shapes for generated player, club, league, and national-team fallbacks. */

export function PlayerSilhouette({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 120" aria-hidden="true" focusable="false">
      <ellipse cx="50" cy="22" rx="15" ry="16" />
      <path d="M50 36c-19 0-33 9-33 21v53c0 3.5 2.8 6.5 6.5 6.5h53c3.7 0 6.5-3 6.5-6.5V57c0-12-14-21-33-21z" />
    </svg>
  );
}

export function ClubShieldEmblem({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 36" aria-hidden="true" focusable="false">
      <path d="M16 3 27 8v11c0 7.5-4.8 14.2-11 16.5C9.8 33.2 5 26.5 5 19V8l11-5z" fill="currentColor" opacity="0.22" />
      <path d="M16 9 22 12.5V19c0 4.2-2.6 7.9-6 9.3-3.4-1.4-6-5.1-6-9.3v-6.5L16 9z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function LeagueEmblem({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
      <path
        d="M16 7.5 18.8 13h6.2l-5 3.6 1.9 5.9L16 19.8l-5.9 2.7 1.9-5.9-5-3.6h6.2L16 7.5z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

export function FlagPlaceholderShape({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 32" aria-hidden="true" focusable="false">
      <path
        d="M4 2h36c1.1 0 2 .9 2 2v24c0 1.1-.9 2-2 2H4V2z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M4 2v28M8 4h30c.6 0 1 .4 1 1v22c0 .6-.4 1-1 1H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
    </svg>
  );
}
