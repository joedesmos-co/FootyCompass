import { memo, useEffect, useState } from 'react';
import { peekTeamById } from '../data/teamStore';
import { formatPosition } from '../utils/footballDisplay';
import {
  getClubShortCode,
  getPlayerAvatarStyle,
  getPlayerInitials,
  getPositionBadgeLabel,
  resolvePlayerAvatarTheme,
} from '../utils/identityVisual';
import { formatPlayerShirtNumber, getPlayerShirtNumber } from '../utils/playerShirtNumber';
import {
  getPlayerImageAttribution,
  getPlayerImageAttributes,
  resolvePlayerImageSource,
  warnMissingImageAttribution,
} from '../utils/playerImage';
import PlayerImageCredit from './PlayerImageCredit';

function PlayerAvatarPlaceholder({
  player,
  team,
  size,
  compact,
  style,
  teamName,
  shirtNumber,
}) {
  const theme = resolvePlayerAvatarTheme(player, team);
  const initials = getPlayerInitials(player?.name);
  const positionBadge = getPositionBadgeLabel(player?.position);
  const isThumb = size === 'thumb';
  const isCard = size === 'card';
  const isCircle = isThumb || size === 'profile';
  const shirtLabel = shirtNumber ? String(shirtNumber) : null;
  const clubCode = theme.clubCode || getClubShortCode(team?.name);

  if (isCard) {
    return (
      <div
        className={`player-avatar player-avatar--card player-avatar--placeholder player-visual player-visual--card player-visual--placeholder player-visual--generated${compact ? ' player-visual--compact' : ''}`}
        style={style}
        role="img"
        aria-label={`${player?.name ?? 'Player'} avatar`}
      >
        <span className="player-visual__shine" aria-hidden="true" />
        <span className="player-visual__pitch-line" aria-hidden="true" />
        {shirtLabel ? (
          <span className="player-visual__jersey player-visual__jersey--card" aria-hidden="true">
            <span className="player-visual__jersey-num">{shirtLabel}</span>
          </span>
        ) : (
          <span className="player-visual__jersey player-visual__jersey--card player-visual__jersey--initials" aria-hidden="true">
            <span className="player-visual__jersey-num">{initials}</span>
          </span>
        )}
        {theme.flag ? (
          <span className="player-avatar__flag player-avatar__flag--card" aria-hidden="true">
            {theme.flag}
          </span>
        ) : null}
        {positionBadge ? (
          <span className="player-avatar__position player-avatar__position--card">{positionBadge}</span>
        ) : null}
        {clubCode && clubCode !== '—' ? (
          <span className="player-avatar__club-mark" aria-hidden="true">{clubCode}</span>
        ) : null}
        {!compact ? (
          <span className="player-avatar__meta player-visual__meta">
            <span>{formatPosition(player?.position)}</span>
            {teamName && teamName !== 'Unknown' ? <strong>{teamName}</strong> : null}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`player-avatar player-avatar--${size} player-avatar--placeholder player-visual player-visual--${size} player-visual--placeholder player-visual--generated${compact ? ' player-visual--compact' : ''}`}
      style={style}
      role="img"
      aria-label={`${player?.name ?? 'Player'} avatar`}
    >
      <span className={`player-avatar__disc${isCircle ? ' player-avatar__disc--circle' : ''}`}>
        <span className="player-avatar__silhouette" aria-hidden="true" />
        <span className="player-avatar__ring" aria-hidden="true" />
        {shirtLabel && size === 'profile' ? (
          <span className="player-visual__jersey" aria-hidden="true">
            <span className="player-visual__jersey-num">{shirtLabel}</span>
          </span>
        ) : null}
        {theme.flag ? (
          <span className="player-avatar__flag" aria-hidden="true">
            {theme.flag}
          </span>
        ) : null}
        <span className="player-avatar__initials player-visual__initials">{initials}</span>
      </span>
      {positionBadge ? (
        <span className="player-avatar__position">{positionBadge}</span>
      ) : null}
      {!compact && !isThumb ? (
        <span className="player-avatar__meta player-visual__meta">
          <span>{formatPosition(player?.position)}</span>
          {teamName && teamName !== 'Unknown' ? <strong>{teamName}</strong> : null}
        </span>
      ) : null}
    </div>
  );
}

function PlayerAvatarComponent({
  player,
  team: teamProp,
  size = 'card',
  priority = false,
  compact = false,
  teamName: teamNameProp,
  preferPhoto = true,
  showCredit = false,
  shirtNumber: shirtNumberProp,
}) {
  const team = teamProp ?? peekTeamById(player?.teamId);
  const source = resolvePlayerImageSource(player);
  const imageAttrs = preferPhoto ? getPlayerImageAttributes(player, { size, priority }) : null;
  const [failedPlayerId, setFailedPlayerId] = useState(null);
  const style = getPlayerAvatarStyle(player, team);
  const teamName = teamNameProp ?? player?._teamName ?? team?.name ?? 'Unknown';
  const attribution = getPlayerImageAttribution(player, source);
  const shouldShowCredit = showCredit && Boolean(attribution);
  const shirtNumber =
    shirtNumberProp ?? formatPlayerShirtNumber(getPlayerShirtNumber(player));

  useEffect(() => {
    warnMissingImageAttribution(player);
  }, [player]);

  const showPhoto =
    preferPhoto &&
    Boolean(imageAttrs) &&
    source.tier !== 'gradientInitials' &&
    failedPlayerId !== player?.id;

  if (showPhoto && imageAttrs) {
    return (
      <figure
        className={`player-avatar-figure player-avatar-figure--${size}${shouldShowCredit ? ' player-avatar-figure--with-credit' : ''}`}
      >
        <div
          className={`player-avatar player-avatar--${size} player-avatar--photo player-visual player-visual--${size} player-visual--photo${compact ? ' player-visual--compact' : ''}`}
          style={style}
        >
          <img {...imageAttrs} onError={() => setFailedPlayerId(player?.id ?? '')} />
          {shirtNumber ? (
            <span className="player-avatar__shirt player-avatar__shirt--photo" aria-hidden="true">
              {shirtNumber}
            </span>
          ) : getPositionBadgeLabel(player?.position) ? (
            <span className="player-avatar__position player-avatar__position--photo">
              {getPositionBadgeLabel(player.position)}
            </span>
          ) : null}
        </div>
        {shouldShowCredit ? <PlayerImageCredit player={player} compact={size !== 'profile'} /> : null}
      </figure>
    );
  }

  return (
    <PlayerAvatarPlaceholder
      player={player}
      team={team}
      size={size}
      compact={compact}
      style={style}
      teamName={teamName}
      shirtNumber={shirtNumber}
    />
  );
}

export default memo(PlayerAvatarComponent);
