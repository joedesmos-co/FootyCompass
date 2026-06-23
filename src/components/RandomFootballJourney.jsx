import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  JOURNEY_SPIN_MESSAGES,
  rollRandomFootballJourney,
} from '../utils/randomFootballJourney';

function JourneyPitchIcon() {
  return (
    <svg
      className="football-journey__icon"
      viewBox="0 0 48 48"
      width="40"
      height="40"
      aria-hidden="true"
    >
      <rect x="4" y="8" width="40" height="32" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="24" cy="24" r="6" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="4" y="16" width="8" height="16" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <rect x="36" y="16" width="8" height="16" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/**
 * @param {{ variant?: 'banner' | 'card' | 'inline' | 'compact', className?: string }} props
 */
export default function RandomFootballJourney({ variant = 'banner', className = '' }) {
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState(JOURNEY_SPIN_MESSAGES[0]);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      clearInterval(id);
      clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const startJourney = useCallback(() => {
    if (spinning) return;
    setSpinning(true);

    let tick = 0;
    const interval = setInterval(() => {
      setMessage(JOURNEY_SPIN_MESSAGES[tick % JOURNEY_SPIN_MESSAGES.length]);
      tick += 1;
    }, 110);
    timersRef.current.push(interval);

    const delay = 520 + Math.floor(Math.random() * 320);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      const destination = rollRandomFootballJourney();
      navigate(destination.path, {
        state: {
          footballJourney: {
            type: destination.type,
            label: destination.label,
            hint: destination.hint,
          },
        },
      });
      setSpinning(false);
    }, delay);
    timersRef.current.push(timeout);
  }, [navigate, spinning]);

  const rootClass = [
    'football-journey',
    `football-journey--${variant}`,
    spinning ? 'football-journey--spinning' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (variant === 'inline') {
    return (
      <button
        type="button"
        className={rootClass}
        onClick={startJourney}
        disabled={spinning}
        aria-busy={spinning}
      >
        <span className="football-journey__inline-label">
          {spinning ? message : 'Random Football Journey'}
        </span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={rootClass}>
        <button
          type="button"
          className="football-journey__compact-btn"
          onClick={startJourney}
          disabled={spinning}
          aria-busy={spinning}
          aria-label="Random Football Journey — discover a player, club, league, or national team"
        >
          <svg
            className="football-journey__compact-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.25" />
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1" />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="football-journey__compact-label">
            {spinning ? message : 'Random Football Journey'}
          </span>
          <span className="football-journey__compact-hint" aria-hidden="true">
            {spinning ? '' : 'Player · club · league · nation'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <section className={rootClass} aria-label="Random Football Journey">
      <div className="football-journey__pitch-mark" aria-hidden="true" />
      <div className="football-journey__body">
        <JourneyPitchIcon />
        <div className="football-journey__copy">
          <p className="football-journey__eyebrow">Discover football</p>
          <h2 className="football-journey__title">Random Football Journey</h2>
          <p className="football-journey__lede">
            {spinning
              ? message
              : 'Land on a random player, club, league, or national team — from household names to hidden gems in the archives.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary football-journey__cta"
          onClick={startJourney}
          disabled={spinning}
          aria-busy={spinning}
        >
          {spinning ? 'Finding your stop…' : 'Start the journey'}
        </button>
      </div>
    </section>
  );
}
