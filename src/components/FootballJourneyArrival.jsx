import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { JOURNEY_ENTITY_LABELS } from '../utils/randomFootballJourney';
import RandomFootballJourney from './RandomFootballJourney';

export default function FootballJourneyArrival() {
  const location = useLocation();
  const navigate = useNavigate();
  const journey = location.state?.footballJourney;
  const [dismissedKey, setDismissedKey] = useState(null);

  if (!journey || dismissedKey === location.key) return null;

  const dismiss = () => {
    setDismissedKey(location.key);
    navigate(location.pathname + location.search, { replace: true, state: null });
  };

  return (
    <aside className="football-journey-arrival" role="status" aria-live="polite">
      <div className="football-journey-arrival__copy">
        <p className="football-journey-arrival__eyebrow">Football journey</p>
        <p className="football-journey-arrival__title">
          You arrived at <strong>{journey.label}</strong>
        </p>
        <p className="football-journey-arrival__hint">
          {journey.hint ?? JOURNEY_ENTITY_LABELS[journey.type] ?? 'Explore this profile'}
        </p>
      </div>
      <div className="football-journey-arrival__actions">
        <RandomFootballJourney variant="inline" />
        <button type="button" className="btn btn--small btn--secondary" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}
