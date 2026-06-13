import { memo, useState } from 'react';
import { getManifestLeague } from '../data/contentManifest';
import { formatCountryLabel, getLeagueDisplayName } from '../utils/footballDisplay';
import { resolveClubCrest } from '../utils/clubCrestManifest';
import { getClubIdentityStyle, getClubShortCode, getLeagueMonogram } from '../utils/identityVisual';

function TeamIdentityBadgeComponent({
  team,
  size = 'card',
  leagueName: leagueNameProp,
  showLeagueChip = false,
}) {
  const style = getClubIdentityStyle(team);
  const shortCode = getClubShortCode(team?.name);
  const country = formatCountryLabel(team?.country);
  const leagueLabel =
    leagueNameProp ??
    (team?.leagueId ? getLeagueDisplayName(getManifestLeague(team.leagueId)) : '');
  const leagueMonogram = getLeagueMonogram(team?.leagueId);
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
        {country && country !== '—' && size !== 'thumb' ? (
          <span className="team-identity-badge__country team-badge__country">{country}</span>
        ) : null}
        {showLeagueChip && leagueLabel ? (
          <span className="team-identity-badge__league" title={leagueLabel}>
            {leagueLabel}
          </span>
        ) : null}
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
      <span className="team-identity-badge__code team-badge__initials entity-crest-badge__code">
        {shortCode}
      </span>
      {leagueMonogram ? (
        <span className="team-identity-badge__league-mark" title={leagueLabel || leagueMonogram}>
          {leagueMonogram}
        </span>
      ) : null}
      {country && country !== '—' && size !== 'thumb' ? (
        <span className="team-identity-badge__country team-badge__country">{country}</span>
      ) : null}
      {showLeagueChip && leagueLabel ? (
        <span className="team-identity-badge__league" title={leagueLabel}>
          {leagueLabel}
        </span>
      ) : null}
      <span className="team-identity-badge__rim team-badge__rim" aria-hidden="true" />
    </div>
  );
}

export default memo(TeamIdentityBadgeComponent);
