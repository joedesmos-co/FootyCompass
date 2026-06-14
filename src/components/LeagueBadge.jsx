import { useState } from 'react';
import { resolveLeagueLogo } from '../utils/leagueLogoManifest';

export default function LeagueBadge({ league, size = 'card' }) {
  const resolved = resolveLeagueLogo(league);
  const theme = resolved.badgeTheme ?? league?.badgeTheme ?? {
    from: '#22c55e',
    to: '#134e4a',
    accent: '#dcfce7',
  };
  const style = {
    '--league-from': theme.from,
    '--league-to': theme.to,
    '--league-accent': theme.accent,
  };
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = resolved.logoUrl;
  const showLogo = logoUrl && !imgFailed;

  if (showLogo) {
    return (
      <div
        className={`league-badge league-badge--${size} league-badge--logo`}
        style={style}
      >
        <img
          src={logoUrl}
          alt={`${league.name} logo`}
          className="league-badge__logo-img"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`entity-crest-badge league-badge league-badge--${size} league-badge--generated`}
      style={style}
      role="img"
      aria-label={`${league.name} league badge`}
    >
      <span className="entity-crest-badge__shield" aria-hidden="true" />
      <span className="league-badge__ring" aria-hidden="true" />
    </div>
  );
}
