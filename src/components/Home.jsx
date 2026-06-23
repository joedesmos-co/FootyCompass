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
          <p className="hero__eyebrow">Premier League · La Liga · MLS · World Cup 2026</p>
          <h1 className="hero__title hero__title--seo">
            Know the game. Quiz yourself.
          </h1>
          <p className="hero__brand-line">
            <span className="hero__brand-name">{SITE_NAME}</span>
            <span className="hero__brand-tagline">Players, clubs, and football quizzes</span>
          </p>
          <p className="hero__subcopy hero__subcopy--lead">
            Study squads, test yourself on names and club knowledge, and follow the road to World Cup
            2026 — free, no account.
          </p>

          <div className="hero__actions hero__actions--stack">
            <Link to="/quiz" className="btn btn--primary btn--large hero__cta-primary">
              Play player quiz
            </Link>
            <Link to="/browse" className="btn btn--secondary hero__cta-secondary">
              Browse players &amp; clubs
            </Link>
            <RandomFootballJourney variant="inline" className="hero__journey-cta" />
          </div>

          <dl className="hero__stats" aria-label="FootyCompass at a glance">
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

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual__pitch">
            <span className="hero-visual__line hero-visual__line--half" />
            <span className="hero-visual__line hero-visual__line--box" />
            <article className="floating-card floating-card--primary">
              <span className="floating-card__label">Player quiz</span>
              <strong>Guess from hints</strong>
              <span>Club · nation · role</span>
            </article>
            <article className="floating-card floating-card--club">
              <span className="floating-card__label">Club quiz</span>
              <strong>Stadiums &amp; rivals</strong>
              <span>League · history</span>
            </article>
            <article className="floating-card floating-card--quiz">
              <span className="floating-card__label">Daily</span>
              <strong>5 questions</strong>
              <span>Streak · XP</span>
            </article>
            <div className="squad-tile squad-tile--one" />
            <div className="squad-tile squad-tile--two" />
            <div className="squad-tile squad-tile--three" />
          </div>
        </div>
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
