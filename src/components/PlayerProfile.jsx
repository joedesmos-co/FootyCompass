import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getManifestLeague } from '../data/contentManifest';
import { loadPlayerById } from '../data/playerStore';
import { peekTeamName } from '../data/teamStore';
import { useFavorites } from '../hooks/useFavorites';
import { useSearchIndex } from '../hooks/useSearchIndex';
import { isBrowseOnlyPlayer } from '../utils/playerEditorial';
import {
  buildPlayerProfileEditorial,
  PLAYER_PLACEHOLDER_FACT_RE,
} from '../utils/playerProfileEditorial';
import { getRoleSummary } from '../utils/playerImportance';
import { isQuizEligiblePlayer } from '../utils/quizPlayerRules';
import { useRecordRecentView } from '../hooks/useRecordRecentView';
import {
  getRelatedPlayers,
  getSimilarRolePlayers,
  getYouMayAlsoLikePlayers,
} from '../utils/relatedPlayers';
import {
  formatPosition,
  getFootballAccentStyle,
  getLeagueDisplayName,
  isExternalClubStubTeam,
  isExternalLeagueId,
} from '../utils/footballDisplay';
import { isOtherClubTeamPageLinkSafe } from '../utils/externalClubBrowse';
import { formatPlayerShirtNumber, getPlayerShirtNumber } from '../utils/playerShirtNumber';
import CountryFlag from './CountryFlag';
import DataTrustNotice from './DataTrustNotice';
import ExternalStubNotice from './ExternalStubNotice';
import FavoriteButton from './FavoriteButton';
import PageFallback, { PageLoadingInline } from './PageFallback';
import PlayerVisual from './PlayerVisual';
import ProfileStatStrip from './ProfileStatStrip';
import PositionLabel from './PositionLabel';
import RelatedPlayersSection from './RelatedPlayersSection';
import ShareButton from './ShareButton';
import EntityRelatedNav from './EntityRelatedNav';
import ProfileKeepExploring from './ProfileKeepExploring';
import { buildPlayerInternalLinks } from '../utils/internalLinking.js';
import { getCanonicalUrl, upsertJsonLdScript } from '../utils/jsonLd';
import {
  applyEntityNotFoundSeo,
  applyPageSeo,
  buildPlayerSeoDescription,
  buildPlayerSeoTitle,
} from '../utils/seoCtr.js';
import { canonicalUrlForPath } from '../utils/brand.js';
import BreadcrumbNav from './BreadcrumbNav';
import CollectionStudyReturnBar from './CollectionStudyReturnBar';
import {
  BADGE_QUIZ_READY,
  CRUMB_BROWSE,
  CRUMB_HOME,
  CTA_BACK_TO_BROWSE,
  FIELD_CLUB,
  FIELD_LEAGUE,
  FIELD_NATIONALITY,
  FIELD_NATIONAL_TEAM,
  FIELD_POSITION,
  LINK_CLUB_QUIZ_GUIDE,
  NAME_CLUB_QUIZ,
  linkNationalityPlayers,
} from '../utils/entityCopy.js';

function parseDateOfBirth(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOfBirth(value) {
  const date = parseDateOfBirth(value);
  if (!date) return '';

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function calculateAgeFromDate(value) {
  const birthDate = parseDateOfBirth(value);
  if (!birthDate) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

  if (beforeBirthday) age -= 1;
  return age;
}

function normalizeLabel(value) {
  const text = String(value ?? '').trim();
  return text;
}

function pickFirstPresent(...values) {
  for (const v of values) {
    const t = normalizeLabel(v);
    if (t) return t;
  }
  return '';
}

function toTagList(value, max = 8) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/[·•,;|/]/g)
    .map((p) => p.trim())
    .filter(Boolean);
  const uniq = [];
  const seen = new Set();
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(p);
    if (uniq.length >= max) break;
  }
  return uniq;
}

function toStringList(value, max = 12) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean).slice(0, max);
  }
  return toTagList(value, max);
}

/** Citizenship / NT label when there is no live `/national-team` page. */
function getNationalTeamPlainLabel(player) {
  return String(player?.nationalTeam || player?.nationality || '').trim();
}

function nationalityMatchesLiveTeam(citizenship, liveNationalTeam) {
  const c = citizenship.trim().toLowerCase();
  const display = liveNationalTeam.displayName.trim().toLowerCase();
  if (c === display) return true;
  if (liveNationalTeam.id === 'united-states') {
    return ['usa', 'us', 'u.s.', 'u.s.a.', 'united states'].includes(c);
  }
  return false;
}

function shouldShowNationalityRow(player, liveNationalTeam) {
  const citizenship = String(player?.nationality ?? '').trim();
  if (!citizenship) return false;
  if (!liveNationalTeam) return true;
  return !nationalityMatchesLiveTeam(citizenship, liveNationalTeam);
}

function PlayerSectionHead({ icon = '', title, id, editorial = false }) {
  if (editorial) {
    return (
      <h2 id={id} className="profile-editorial__heading">
        {title}
      </h2>
    );
  }
  return (
    <div className="player-section__head">
      <span className="player-section__icon" aria-hidden="true">
        {icon}
      </span>
      <h2 id={id}>{title}</h2>
    </div>
  );
}

function PlayerEmptyState({ children }) {
  return (
    <p className="player-empty" role="status">
      {children}
    </p>
  );
}

export default function PlayerProfile() {
  const { playerId } = useParams();
  const [playerState, setPlayerState] = useState(() => ({
    playerId: null,
    status: 'loading',
    player: null,
  }));

  useEffect(() => {
    let cancelled = false;
    loadPlayerById(playerId)
      .then((p) => {
        if (cancelled) return;
        setPlayerState({ playerId, status: p ? 'ready' : 'not-found', player: p ?? null });
      })
      .catch(() => {
        if (cancelled) return;
        setPlayerState({ playerId, status: 'error', player: null });
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const player = playerState.playerId === playerId ? playerState.player : null;
  const playerStatus = playerState.playerId === playerId ? playerState.status : 'loading';

  const accentStyle = player ? getFootballAccentStyle(player) : undefined;
  const { isPlayerSaved, togglePlayer } = useFavorites();
  useRecordRecentView('player', player?.id);
  const [ntModuleState, setNtModuleState] = useState(() => ({
    playerId: null,
    mod: null,
  }));
  const [teamBundle, setTeamBundle] = useState(() => ({
    teamId: null,
    team: null,
    pool: [],
    leagueTeams: [],
  }));

  useEffect(() => {
    if (!player?.teamId) return undefined;

    let cancelled = false;
    const teamId = player.teamId;
    import('../data/sampleData.js').then((mod) => {
      if (cancelled) return;
      const team = mod.getTeamById(teamId) ?? null;
      setTeamBundle({
        teamId,
        team,
        pool: mod.getPlayersForTeam(teamId) ?? [],
        leagueTeams: team?.leagueId
          ? mod.teams.filter((t) => t.leagueId === team.leagueId)
          : [],
      });
    });

    return () => {
      cancelled = true;
    };
  }, [player?.teamId]);

  const teamContext = teamBundle.teamId === player?.teamId ? teamBundle.team : null;
  const teamMatePool = teamBundle.teamId === player?.teamId ? teamBundle.pool : [];
  const leagueTeamsForExplore =
    teamBundle.teamId === player?.teamId ? teamBundle.leagueTeams : [];
  const clubPageSafe = teamContext
    ? isOtherClubTeamPageLinkSafe(teamContext, teamMatePool.length)
    : Boolean(player?.teamId) &&
      !isExternalClubStubTeam({ id: player.teamId, leagueId: player.leagueId });
  const leaguePageSafe = Boolean(player?.leagueId) && !isExternalLeagueId(player.leagueId);

  // Only load nationalTeamData when the player has a relevant label.
  // This keeps the nationalTeamData chunk off routes that never need it.
  useEffect(() => {
    if (!player) return undefined;
    const label = getNationalTeamPlainLabel(player);
    if (!label) return undefined;

    let cancelled = false;
    import('../data/nationalTeamData.js')
      .then((mod) => {
        if (cancelled) return;
        setNtModuleState({ playerId: player.id, mod });
      })
      .catch(() => {
        // fall back to plain label only
      });

    return () => {
      cancelled = true;
    };
  }, [player]);

  const { index: searchIndex, status: searchIndexStatus } = useSearchIndex();
  const relatedPool = useMemo(() => {
    if (searchIndexStatus === 'ready' && searchIndex?.players?.length) {
      return searchIndex.players;
    }
    return teamMatePool;
  }, [searchIndexStatus, searchIndex, teamMatePool]);
  const relatedLoading = Boolean(player && searchIndexStatus === 'loading');

  const relatedPlayers = useMemo(
    () => (player ? getRelatedPlayers(player, { pool: relatedPool }) : []),
    [player, relatedPool],
  );
  const similarRolePlayers = useMemo(
    () => (player ? getSimilarRolePlayers(player, { pool: relatedPool }) : []),
    [player, relatedPool],
  );
  const alsoLikePlayers = useMemo(
    () => (player ? getYouMayAlsoLikePlayers(player, { pool: relatedPool }) : []),
    [player, relatedPool],
  );

  useLayoutEffect(() => {
    if (!player) return undefined;
    const canonical = getCanonicalUrl();
    if (!canonical) return undefined;

    const homeUrl = canonical.replace(/\/player\/[^/]+$/, '/');
    const browseUrl = `${homeUrl.replace(/\/$/, '')}/browse`;
    const teamUrl = `${homeUrl.replace(/\/$/, '')}/team/${player.teamId}`;
    const resolvedTeamName = player?._teamName ?? peekTeamName(player.teamId) ?? 'Unknown';

    const leagueNameForSeo = getLeagueDisplayName({
      id: player.leagueId,
      name: getManifestLeague(player.leagueId)?.name ?? 'Unknown',
    });
    const seoCtx = {
      teamName: resolvedTeamName,
      leagueName: leagueNameForSeo,
      team: teamContext,
      quizReady: !isBrowseOnlyPlayer(player),
    };
    const title = buildPlayerSeoTitle(player, { teamName: resolvedTeamName });
    const description = buildPlayerSeoDescription(player, seoCtx);
    const browseOnly = isBrowseOnlyPlayer(player);

    applyPageSeo({
      title,
      description,
      canonicalUrl: canonical,
      ogType: 'profile',
      // Prevent indexing large volumes of generated placeholder pages while we enrich quiz/editorial.
      // Keep follow so Google can still discover deeper pages via links.
      robots: browseOnly ? 'noindex,follow' : 'index,follow',
      breadcrumbs: [
        { name: 'Home', item: homeUrl },
        { name: 'Browse', item: browseUrl },
        resolvedTeamName && resolvedTeamName !== 'Unknown'
          ? { name: resolvedTeamName, item: teamUrl }
          : null,
        { name: player.name, item: canonical },
      ].filter(Boolean),
    });

    const birthDate =
      typeof player.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(player.dateOfBirth)
        ? player.dateOfBirth
        : undefined;

    upsertJsonLdScript('jsonld-person', {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: player.name,
      url: canonical,
      nationality: player.nationality || undefined,
      birthDate,
      memberOf: {
        '@type': 'SportsTeam',
        name: resolvedTeamName,
        url: teamUrl,
      },
    });

    return () => {
      upsertJsonLdScript('jsonld-breadcrumb', null);
      upsertJsonLdScript('jsonld-person', null);
    };
  }, [player, teamContext]);

  useLayoutEffect(() => {
    if (playerStatus !== 'not-found' && playerStatus !== 'error') return undefined;
    applyEntityNotFoundSeo({
      label: 'Player',
      canonicalUrl: canonicalUrlForPath(`/player/${playerId}`),
    });
    return undefined;
  }, [playerStatus, playerId]);

  if (playerStatus === 'loading') {
    return <PageFallback label="Loading player…" />;
  }

  if (!player || playerStatus === 'not-found' || playerStatus === 'error') {
    return (
      <div className="page player-profile">
        <BreadcrumbNav
          items={[
            { label: 'Home', to: '/' },
            { label: 'Browse', to: '/browse' },
            { label: 'Player not found' },
          ]}
        />
        <header className="page-header">
          <h1>Player not found</h1>
          <p className="empty-state">
            We could not find that player in FootyCompass. Try browse or search for another name.
          </p>
        </header>
        <Link to="/browse" className="btn btn--secondary">
          {CTA_BACK_TO_BROWSE}
        </Link>
      </div>
    );
  }

  const saved = isPlayerSaved(player.id);
  const teamName = player?._teamName ?? peekTeamName(player.teamId);
  const leagueName = getLeagueDisplayName({
    id: player.leagueId,
    name: getManifestLeague(player.leagueId)?.name ?? 'Unknown',
  });
  const nationalTeamPlainLabel = getNationalTeamPlainLabel(player);
  const liveNationalTeam =
    ntModuleState.mod && ntModuleState.playerId === player.id
      ? ntModuleState.mod.getLiveNationalTeamForPlayer(player)
      : null;
  const profileEditorial = buildPlayerProfileEditorial(player, {
    teamName,
    leagueName,
    team: teamContext,
  });
  const roleSummary = getRoleSummary(player);
  const careerSummary = profileEditorial.careerSummary;
  const browseOnly = isBrowseOnlyPlayer(player);
  const quizReady = isQuizEligiblePlayer(player);
  const quizHints = Array.isArray(player.quizHints) ? player.quizHints.filter(Boolean) : [];
  const careerHistory = Array.isArray(player.careerHistory) ? player.careerHistory : [];
  const hasQuizClues = quizReady && quizHints.length > 0;
  const hasCareerStops = careerHistory.length > 0;
  const dateOfBirth = formatDateOfBirth(player.dateOfBirth);
  const resolvedAge = player.age ?? calculateAgeFromDate(player.dateOfBirth);
  const ageDisplay =
    resolvedAge !== '' && resolvedAge != null ? String(resolvedAge) : null;

  const preferredFoot = pickFirstPresent(player.preferredFoot, player.foot, player.strongFoot);
  const height = pickFirstPresent(player.height, player.heightCm, player.heightCM);
  const shirtNumber = formatPlayerShirtNumber(getPlayerShirtNumber(player));

  const playStyleTags = toTagList(player.playingStyle, 7);
  const playStyleSummary = pickFirstPresent(player.playStyleSummary, player.styleSummary);

  const strengths = toStringList(
    player.strengths ?? player.keyStrengths ?? player.signatureStrengths,
    10,
  );

  const honors = toStringList(player.honors ?? player.honours ?? player.trophies, 12);
  const showHonors = honors.length > 0;
  const hasPlayStyleSection = playStyleTags.length > 0 || Boolean(playStyleSummary);
  const hasStrengthsSection = strengths.length > 0;
  const showKnownForSection =
    profileEditorial.showKnownFor &&
    (profileEditorial.isThin || (!hasPlayStyleSection && !hasStrengthsSection));

  const funFact = normalizeLabel(player.quickFact || '');
  const showFunFact =
    Boolean(funFact) &&
    !PLAYER_PLACEHOLDER_FACT_RE.test(funFact) &&
    funFact !== profileEditorial.about;

  const playerInfoItems = [
    {
      label: FIELD_CLUB,
      value: clubPageSafe ? (
        <Link to={`/team/${player.teamId}`} className="player-profile__info-link">
          {teamName}
        </Link>
      ) : (
        <span>{teamName || '—'}</span>
      ),
    },
    {
      label: FIELD_LEAGUE,
      value: leaguePageSafe ? (
        <Link to={`/league/${player.leagueId}`} className="player-profile__info-link">
          {leagueName}
        </Link>
      ) : (
        <span>{leagueName}</span>
      ),
    },
    (liveNationalTeam || nationalTeamPlainLabel) && {
      label: FIELD_NATIONAL_TEAM,
      value: liveNationalTeam ? (
        <Link to={`/national-team/${liveNationalTeam.id}`} className="player-profile__info-link football-meta-line">
          <CountryFlag label={liveNationalTeam.displayName} />
          {liveNationalTeam.displayName}
        </Link>
      ) : (
        <span className="football-meta-line">
          <CountryFlag label={nationalTeamPlainLabel} />
          {nationalTeamPlainLabel}
        </span>
      ),
    },
    shouldShowNationalityRow(player, liveNationalTeam) && {
      label: FIELD_NATIONALITY,
      value: (
        <span className="football-meta-line">
          <CountryFlag label={player.nationality} />
          {player.nationality || '—'}
        </span>
      ),
    },
    { label: FIELD_POSITION, value: formatPosition(player.position) },
    ageDisplay && { label: 'Age', value: ageDisplay },
    dateOfBirth && { label: 'Date of birth', value: dateOfBirth },
    preferredFoot && { label: 'Preferred foot', value: preferredFoot },
    height && { label: 'Height', value: String(height) },
  ].filter(Boolean);

  return (
    <div
      className={`page profile player-profile${profileEditorial.topTier ? ' profile--premium' : ''}${profileEditorial.enrichThin || (Array.isArray(player.knownFor) && player.knownFor.length) ? ' player-profile--enriched' : ''}`}
    >
      <BreadcrumbNav
        items={[
          { label: CRUMB_HOME, to: '/' },
          { label: CRUMB_BROWSE, to: '/browse' },
          teamName && teamName !== 'Unknown' && clubPageSafe
            ? { label: teamName, to: `/team/${player.teamId}` }
            : null,
          { label: player.name },
        ]}
      />
      <CollectionStudyReturnBar />

      <header
        className="profile__hero profile__hero--player player-profile__hero player-profile__hero--sports football-accent-surface"
        style={accentStyle}
      >
        <div className="player-profile__hero-visual">
          <PlayerVisual
            player={player}
            size="profile"
            priority
            showCredit
            shirtNumber={shirtNumber}
          />
        </div>

        <div className="player-profile__hero-body">
          <div className="player-profile__hero-head">
            {shirtNumber ? (
              <span className="player-profile__shirt-badge" aria-label={`Shirt number ${shirtNumber}`}>
                {shirtNumber}
              </span>
            ) : null}
            <h1>{player.name}</h1>
          </div>

          <div className="player-profile__hero-identity-row">
            <PositionLabel
              position={player.position}
              className="player-profile__position player-profile__position--hero"
            />
            {roleSummary && roleSummary !== formatPosition(player.position) ? (
              <span className="player-profile__role-chip">{roleSummary}</span>
            ) : null}
            {quizReady ? (
              <span className="player-profile__quiz-chip">{BADGE_QUIZ_READY}</span>
            ) : null}
          </div>

          {profileEditorial.heroLede ? (
            <p className="player-profile__hero-lede">{profileEditorial.heroLede}</p>
          ) : null}

          <ProfileStatStrip items={playerInfoItems} compact />

          <nav
            className={`player-profile__hero-links${profileEditorial.topTier ? ' player-profile__hero-links--curated' : ''}`}
            aria-label="Quick actions"
          >
            {quizReady && clubPageSafe ? (
              <Link to={`/quiz?team=${player.teamId}`} className="btn btn--primary btn--small">
                {NAME_CLUB_QUIZ}
              </Link>
            ) : null}
            {quizReady ? (
              <Link to="/quiz" className="btn btn--secondary btn--small">
                Player quiz
              </Link>
            ) : null}
            {clubPageSafe ? (
              <Link to={`/hubs/quizzes/team/${player.teamId}`}>{LINK_CLUB_QUIZ_GUIDE}</Link>
            ) : null}
            {!profileEditorial.topTier && player.nationality ? (
              <Link
                to={`/hubs/players/nationality/${encodeURIComponent(String(player.nationality).trim())}`}
              >
                {linkNationalityPlayers(player.nationality)}
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="player-profile__hero-toolbar">
          <FavoriteButton
            itemName={player.name}
            saved={saved}
            onToggle={() => togglePlayer(player.id)}
          />
          <ShareButton
            title={`${player.name} · FootyCompass`}
            text={`Check out ${player.name} on FootyCompass.`}
            url={typeof window !== 'undefined' ? window.location.href : undefined}
            copiedLabel="Copied player link"
            sharedLabel="Shared"
          >
            Share
          </ShareButton>
        </div>
      </header>

      {browseOnly && (
        <p className="player-study__note" role="status">
          Study profile ready to read — quiz hints for this player are still being added.
        </p>
      )}

      {isExternalClubStubTeam({ id: player.teamId, leagueId: player.leagueId }) ? (
        <ExternalStubNotice compact />
      ) : null}

      <div className="profile-editorial-stack player-profile__editorial">
        {profileEditorial.showAbout ? (
          <section className="profile-editorial__block player-section player-section--about" aria-labelledby="player-about-title">
            <PlayerSectionHead editorial title="About" id="player-about-title" />
            <p className="player-profile__about">{profileEditorial.about}</p>
          </section>
        ) : null}

        {showKnownForSection ? (
          <section className="profile-editorial__block player-section player-section--known-for" aria-labelledby="player-known-for-title">
            <PlayerSectionHead editorial title="Known for" id="player-known-for-title" />
            <ul className="tag-list tag-list--tight player-tag-list" aria-label="Known for">
              {profileEditorial.knownFor.map((item) => (
                <li key={item} className="tag tag--solid">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {profileEditorial.showPlayStyleBlurb ? (
          <section className="profile-editorial__block player-section player-section--playstyle-blurb" aria-labelledby="player-playstyle-blurb-title">
            <PlayerSectionHead editorial title="How they play" id="player-playstyle-blurb-title" />
            <p className="player-profile__about">{profileEditorial.playStyleBlurb}</p>
          </section>
        ) : null}

        <div className="player-profile__editorial-grid">
        {(playStyleTags.length > 0 || playStyleSummary) &&
        !(profileEditorial.topTier && profileEditorial.showPlayStyleBlurb) ? (
          <article className="profile-editorial__block player-section player-section--playstyle">
            <PlayerSectionHead editorial title="Play style" />
            {playStyleTags.length > 0 && (
              <ul className="tag-list player-tag-list" aria-label="Play style tags">
                {playStyleTags.map((tag) => (
                  <li key={tag} className="tag tag--playstyle">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            {playStyleSummary ? (
              <p className="card-note">{playStyleSummary}</p>
            ) : null}
          </article>
        ) : null}

        {strengths.length > 0 && (
          <article className="profile-editorial__block player-section player-section--strengths">
            <PlayerSectionHead editorial title="Strengths" />
            <ul className="tag-list tag-list--tight player-tag-list" aria-label="Strengths">
              {strengths.map((s) => (
                <li key={s} className="tag tag--solid">
                  {s}
                </li>
              ))}
            </ul>
          </article>
        )}

        <article className="profile-editorial__block player-section player-section--career">
          <PlayerSectionHead editorial title="Career" />
          {hasCareerStops ? (
            <ol className="career-timeline career-timeline--compact">
              {careerHistory.map((entry) => (
                <li key={`${entry.club}-${entry.years}`} className="career-timeline__item">
                  <span className="career-timeline__club">{entry.club}</span>
                  <span className="career-timeline__years">{entry.years}</span>
                </li>
              ))}
            </ol>
          ) : (
            <PlayerEmptyState>Career milestones are on the way for this player.</PlayerEmptyState>
          )}
          {hasCareerStops && (
            <details className="player-profile__details">
              <summary>Career notes</summary>
              <p>{careerSummary}</p>
            </details>
          )}
        </article>

        <article
          className={`profile-editorial__block player-section player-section--honors${showHonors ? '' : ' player-section--muted'}`}
        >
          <PlayerSectionHead editorial title="Honors" />
          {showHonors ? (
            <ul className="bullet-list player-honors-list" aria-label="Honors and trophies">
              {honors.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : (
            <PlayerEmptyState>Major honors haven&apos;t been added for this player yet.</PlayerEmptyState>
          )}
        </article>

        {showFunFact ? (
          <article className="profile-editorial__block player-section player-section--facts">
            <PlayerSectionHead editorial title="Quick fact" />
            <ul className="bullet-list" aria-label="Fun facts">
              <li>{funFact}</li>
            </ul>
          </article>
        ) : null}

        {hasQuizClues && (
          <article className="profile-editorial__block player-study player-section player-section--quiz">
            <PlayerSectionHead editorial title="Quiz clues" />
            <p className="player-study__note">Short hints for recall — not full answers.</p>
            <ul className="tag-list tag-list--stack player-tag-list" aria-label="Quiz clues">
              {quizHints.map((hint, index) => (
                <li key={index} className="tag tag--hint">
                  {hint}
                </li>
              ))}
            </ul>
          </article>
        )}

        </div>
      </div>

      <DataTrustNotice compact />

      {profileEditorial.topTier ||
      profileEditorial.isThin ||
      isBrowseOnlyPlayer(player) ? (
        <ProfileKeepExploring
          variant="player"
          premium={profileEditorial.topTier}
          entityId={player.id}
          player={player}
          teamId={player.teamId}
          leagueId={player.leagueId}
          teamName={teamName}
          leagueName={leagueName}
          quizReady={quizReady}
          team={teamContext}
          leagueTeams={leagueTeamsForExplore}
          nationalTeamId={liveNationalTeam?.id}
        />
      ) : (
        <EntityRelatedNav
          links={buildPlayerInternalLinks({
            player,
            teamId: player.teamId,
            leagueId: player.leagueId,
            teamName,
            leagueName,
            quizReady,
            nationalTeamId: liveNationalTeam?.id,
            nationality: player.nationality,
          })}
        />
      )}

      {relatedLoading ? <PageLoadingInline label="Loading related players…" /> : null}
      <RelatedPlayersSection suggestions={relatedPlayers} />
      <RelatedPlayersSection
        title="Similar role"
        headingId="player-similar-role-title"
        suggestions={similarRolePlayers}
      />
      <RelatedPlayersSection
        title="You may also like"
        headingId="player-also-like-title"
        suggestions={alsoLikePlayers}
      />
    </div>
  );
}
