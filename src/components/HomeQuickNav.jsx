import { Link } from 'react-router-dom';

const QUICK_LINKS = [
  { to: '/quiz', label: 'Quiz', hint: 'Player & club' },
  { to: '/browse', label: 'Browse', hint: 'Players & clubs' },
  { to: '/collections', label: 'Collections', hint: 'Themed lists' },
  { to: '/hubs', label: 'Explore', hint: 'Topics & guides' },
  { to: '/profile', label: 'Profile', hint: 'Progress & saves' },
];

export default function HomeQuickNav() {
  return (
    <nav className="home-quick-nav" aria-label="Main actions">
      <ul className="home-quick-nav__grid">
        {QUICK_LINKS.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="home-quick-nav__link">
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
