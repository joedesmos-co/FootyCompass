/**
 * Horizontal stat row — sports-product presentation (NHL-style info strip).
 */

/**
 * @param {{ items: Array<{ label: string, value: import('react').ReactNode } | null | undefined>, className?: string, compact?: boolean }} props
 */
export default function ProfileStatStrip({ items, className = '', compact = false }) {
  const rows = (items ?? []).filter(Boolean);
  if (!rows.length) return null;

  return (
    <dl
      className={`profile-stat-strip${compact ? ' profile-stat-strip--compact' : ''}${className ? ` ${className}` : ''}`}
    >
      {rows.map((item) => (
        <div key={item.label} className="profile-stat-strip__item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
