import { memo, useEffect, useState } from 'react';
import { peekTeamById } from '../data/teamStore';
import { getPlayerAvatarStyle } from '../utils/identityVisual';
import {
  getPlayerImageAttribution,
  getPlayerImageAttributes,
  resolvePlayerImageSource,
  warnMissingImageAttribution,
} from '../utils/playerImage';
import { PlayerSilhouette } from './FallbackShapes';
import PlayerImageCredit from './PlayerImageCredit';

function PlayerAvatarPlaceholder({ player, size, compact, style }) {
  return (
    <div
      className={`player-avatar player-avatar--${size} player-avatar--placeholder player-visual player-visual--${size} player-visual--placeholder player-visual--generated${compact ? ' player-visual--compact' : ''}`}
      style={style}
      role="img"
      aria-label={`${player?.name ?? 'Player'} avatar`}
    >
      <span className="player-avatar__glow" aria-hidden="true" />
      <PlayerSilhouette className="player-avatar__figure" />
    </div>
  );
}

function PlayerAvatarComponent({
  player,
  team: teamProp,
  size = 'card',
  priority = false,
  compact = false,
  preferPhoto = true,
  showCredit = false,
}) {
  const team = teamProp ?? peekTeamById(player?.teamId);
  const source = resolvePlayerImageSource(player);
  const imageAttrs = preferPhoto ? getPlayerImageAttributes(player, { size, priority }) : null;
  const [failedPlayerId, setFailedPlayerId] = useState(null);
  const style = getPlayerAvatarStyle(player, team);
  const attribution = getPlayerImageAttribution(player, source);
  const shouldShowCredit = showCredit && Boolean(attribution);

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
        </div>
        {shouldShowCredit ? <PlayerImageCredit player={player} compact={size !== 'profile'} /> : null}
      </figure>
    );
  }

  return (
    <PlayerAvatarPlaceholder
      player={player}
      size={size}
      compact={compact}
      style={style}
    />
  );
}

export default memo(PlayerAvatarComponent);
