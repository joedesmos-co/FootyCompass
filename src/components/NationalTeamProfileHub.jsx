import { Link } from 'react-router-dom';
import { buildStructuredNationalProfile } from '../utils/nationalProfileEditorial';

/**
 * @param {{
 *   nationalTeam: object,
 *   squad: object[],
 *   linkedCount: number,
 *   quizReadyCount: number,
 *   compact?: boolean,
 * }} props
 */
export default function NationalTeamProfileHub({
  nationalTeam,
  squad,
  linkedCount,
  quizReadyCount,
  compact = false,
}) {
  const profile = buildStructuredNationalProfile({
    nationalTeam,
    squad,
    linkedCount,
    quizReadyCount,
  });

  const showHistory = profile.hasAuthoritativeHistory && !compact;
  const showSquadIdentity = Boolean(profile.squadIdentity) && !compact;
  const showCulture = Boolean(profile.footballCulture) && !nationalTeam.fanGuide;
  const showCultureDetails = Boolean(nationalTeam.fanGuide);
  const showRivalry = Boolean(profile.rivalry) && !compact;
  const showTournament = Boolean(profile.tournament);

  if (
    !showHistory &&
    !showSquadIdentity &&
    !showCulture &&
    !showCultureDetails &&
    !showRivalry &&
    !showTournament
  ) {
    return null;
  }

  return (
    <div className="national-team-hub profile-editorial-stack">
      {showHistory ? (
        <section className="profile-editorial__block profile__section" aria-labelledby="nt-history-title">
          <h2 id="nt-history-title" className="profile-editorial__heading">
            Overview
          </h2>
          <p className="national-team-hub__prose">{profile.history}</p>
        </section>
      ) : null}

      {showTournament ? (
        <section className="profile-editorial__block profile__section" aria-labelledby="nt-tournament-title">
          <h2 id="nt-tournament-title" className="profile-editorial__heading">
            Tournament
          </h2>
          <p className="national-team-hub__prose">{profile.tournament}</p>
          {profile.isWorldCupFeatured ? (
            <p className="national-team-hub__meta">
              <Link to="/world-cup">World Cup 2026 prep</Link>
              {' · '}
              <Link to="/quiz?theme=world-cup">World Cup quiz</Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {showCultureDetails ? (
        <details className="profile-editorial__block profile__section national-team-profile__fan-guide" open>
          <summary className="profile-editorial__heading">Fan culture</summary>
          <p className="national-team-hub__prose">{nationalTeam.fanGuide}</p>
        </details>
      ) : null}

      {showSquadIdentity ? (
        <section className="profile-editorial__block profile__section" aria-labelledby="nt-squad-id-title">
          <h2 id="nt-squad-id-title" className="profile-editorial__heading">
            Squad
          </h2>
          <p className="national-team-hub__prose">{profile.squadIdentity}</p>
        </section>
      ) : null}

      {showCulture ? (
        <section className="profile-editorial__block profile__section" aria-labelledby="nt-culture-title">
          <h2 id="nt-culture-title" className="profile-editorial__heading">
            Identity
          </h2>
          <p className="national-team-hub__prose">{profile.footballCulture}</p>
        </section>
      ) : null}

      {showRivalry ? (
        <section className="profile-editorial__block profile__section" aria-labelledby="nt-rivalry-title">
          <h2 id="nt-rivalry-title" className="profile-editorial__heading">
            Rivalries
          </h2>
          <p className="national-team-hub__prose">{profile.rivalry}</p>
        </section>
      ) : null}
    </div>
  );
}
