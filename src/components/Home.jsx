import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { DATASET_META } from '../data/datasetMeta';
import { SITE_NAME } from '../utils/brand';
import PageFallback from './PageFallback';
import HomeQuickNav from './HomeQuickNav';
import HomeTrustStrip from './HomeTrustStrip';
import RandomFootballJourney from './RandomFootballJourney';

const HomePopularNow = lazy(() => import('./HomePopularNow'));
const HomeSpotlight = lazy(() => import('./HomeSpotlight'));

export default function Home() {
  const playerCount = DATASET_META.playerCount.toLocaleString();

  return (
    <div className="home home--premium home--sports">
      <section className="hero hero--home hero--redesign hero--polished hero--sports">
        <div className="hero__content">
          <p className="hero__eyebrow">{SITE_NAME} · football learning</p>
          <h1 className="hero__title hero__title--seo">
            Know the game. Quiz yourself.
          </h1>
          <p className="hero__subcopy hero__subcopy--lead">
            Study squads, test yourself on names and club knowledge, and follow the road to World Cup
            2026 — free, no account.
          </p>

          <div className="hero__actions hero__actions--inline">
            <Link to="/quiz" className="btn btn--primary btn--large">
              Play player quiz
            </Link>
            <Link to="/browse" className="btn btn--secondary btn--large">
              Browse players &amp; clubs
            </Link>
          </div>
          <RandomFootballJourney variant="inline" className="hero__journey-cta" />

          <dl className="hero__stats hero__scoreboard" aria-label="FootyCompass at a glance">
            <div>
              <dt>{playerCount}</dt>
              <dd>Players</dd>
            </div>
            <div>
              <dt>{DATASET_META.teamCount}</dt>
              <dd>Clubs</dd>
            </div>
            <div>
              <dt>{DATASET_META.leagueCount}</dt>
              <dd>Leagues</dd>
            </div>
          </dl>
        </div>

        <aside className="hero-preview" aria-label="Ways to train">
          <p className="hero-preview__label">Ways to train</p>
          <Link to="/quiz" className="hero-preview__item">
            <span className="hero-preview__mode">Player quiz</span>
            <span className="hero-preview__desc">Guess players from club, nation &amp; role hints</span>
          </Link>
          <Link to="/club-quiz" className="hero-preview__item">
            <span className="hero-preview__mode">Club quiz</span>
            <span className="hero-preview__desc">Stadiums, rivalries, history &amp; kits</span>
          </Link>
          <Link to="/daily" className="hero-preview__item">
            <span className="hero-preview__mode">Daily challenge</span>
            <span className="hero-preview__desc">Five quick questions, build a streak</span>
          </Link>
        </aside>
      </section>

      <HomeQuickNav />

      <RandomFootballJourney variant="banner" />

      <Suspense fallback={<PageFallback label="Loading picks…" />}>
        <HomePopularNow />
      </Suspense>

      <Suspense fallback={<PageFallback label="Loading featured pick…" />}>
        <HomeSpotlight />
      </Suspense>

      <footer className="home-footer-trust">
        <HomeTrustStrip />
      </footer>
    </div>
  );
}
