import { useState } from 'react';
import { getCountryFlag } from '../utils/footballDisplay';
import { resolveNationalTeamFlag } from '../utils/countryFlags';

export default function NationalTeamBadge({ nationalTeam, size = 'card' }) {
  const theme = nationalTeam.badgeTheme ?? {
    from: '#22c55e',
    to: '#134e4a',
    accent: '#dcfce7',
  };
  const style = {
    '--league-from': theme.from,
    '--league-to': theme.to,
    '--league-accent': theme.accent,
  };
  const flag = resolveNationalTeamFlag(nationalTeam);
  const [imgFailed, setImgFailed] = useState(false);

  const emojiFallback =
    flag.emoji ??
    getCountryFlag(nationalTeam?.country ?? nationalTeam?.displayName ?? '');

  const showFlagImage = flag.tier === 'flagAsset' && flag.url && !imgFailed;
  const showFlagEmoji = !showFlagImage && Boolean(emojiFallback);

  if (showFlagImage) {
    return (
      <div
        className={`national-team-badge national-team-badge--${size} national-team-badge--flag`}
        style={style}
      >
        <img
          src={flag.url}
          alt={flag.alt ?? `${nationalTeam.displayName} flag`}
          className="national-team-badge__flag-img"
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  if (showFlagEmoji) {
    return (
      <div
        className={`national-team-badge national-team-badge--${size} national-team-badge--flag-emoji`}
        style={style}
        role="img"
        aria-label={`${nationalTeam.displayName} national team`}
      >
        <span className="national-team-badge__flag-emoji" aria-hidden="true">
          {emojiFallback}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`entity-crest-badge league-badge national-team-badge national-team-badge--${size} national-team-badge--generated`}
      style={style}
      role="img"
      aria-label={`${nationalTeam.displayName} national team`}
    >
      <span className="entity-crest-badge__shield" aria-hidden="true" />
      <span className="league-badge__ring" aria-hidden="true" />
    </div>
  );
}
