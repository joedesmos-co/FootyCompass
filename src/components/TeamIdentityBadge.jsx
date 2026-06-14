import { memo, useState } from 'react';
import { getClubIdentityStyle } from '../utils/identityVisual';
import { resolveClubCrest } from '../utils/clubCrestManifest';

function TeamIdentityBadgeComponent({
  team,
  size = 'card',
}) {
  const style = getClubIdentityStyle(team);
  const crest = resolveClubCrest(team);
  const [imgFailed, setImgFailed] = useState(false);
  const showCrest = crest.crestUrl && !imgFailed;

  if (showCrest) {
    return (
      <div
        className={`team-identity-badge team-identity-badge--${size} team-badge team-badge--${size} team-identity-badge--crest`}
        style={style}
      >
        <img
          src={crest.crestUrl}
          alt={`${team?.name ?? 'Club'} crest`}
          className="team-identity-badge__crest-img"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`entity-crest-badge team-identity-badge team-identity-badge--generated team-identity-badge--${size} team-badge team-badge--${size}`}
      style={style}
      role="img"
      aria-label={`${team?.name ?? 'Club'} identity badge`}
    >
      <span className="entity-crest-badge__shield" aria-hidden="true" />
      <span className="team-identity-badge__pattern" aria-hidden="true" />
      <span className="team-identity-badge__stripe" aria-hidden="true" />
      <span className="team-identity-badge__rim team-badge__rim" aria-hidden="true" />
    </div>
  );
}

export default memo(TeamIdentityBadgeComponent);
