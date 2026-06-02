/**
 * Squad shirt number — player field or fact-locked phrases in existing editorial copy.
 * Does not invent numbers; skips "number 10" playing-role references.
 */

const ROLE_NUMBER_RE =
  /\b(as a|plays as a?|classic|complete|elegant|orchestrates|who plays|playing as a?)\s+number\s+(9|10)\b/i;

function parseShirtFromText(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  if (ROLE_NUMBER_RE.test(t) && !/wears number|number \d{1,2}\s+shirt/i.test(t)) return null;

  const wears = t.match(/\bwears number (\d{1,2})\b/i);
  if (wears) return Number(wears[1]);

  const often = t.match(/\boften wears number (\d{1,2})\b/i);
  if (often) return Number(often[1]);

  const currentClub = t.match(/starring in [^.;]+number (\d{1,2})\s+shirt/i);
  if (currentClub) return Number(currentClub[1]);

  const possessive = t.match(/'s number (\d{1,2})\b/i);
  if (possessive) return Number(possessive[1]);

  const shirt = t.match(/\bnumber (\d{1,2})\s+shirt\b/i);
  if (shirt) return Number(shirt[1]);

  const inClub = t.match(/\bnumber (\d{1,2})\b/i);
  if (
    inClub &&
    /(?:wears|wore|shirt|in white|in red|in blue|in yellow|in sky|in claret|at |for |leads|Bernabéu|Anfield|Arsenal|Liverpool|City|Madrid|white at)/i.test(t) &&
    !/\bbefore starring\b/i.test(t)
  ) {
    return Number(inClub[1]);
  }

  return null;
}

/**
 * @param {object | null | undefined} player
 * @returns {number | null}
 */
export function getPlayerShirtNumber(player) {
  if (!player) return null;

  for (const key of ['shirtNumber', 'jerseyNumber', 'squadNumber', 'kitNumber']) {
    const raw = player[key];
    if (raw == null || raw === '') continue;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= 99) return n;
  }

  const sources = [
    player.quickFact,
    ...(Array.isArray(player.knownFor) ? player.knownFor : []),
    ...(Array.isArray(player.quizHints) ? player.quizHints : []),
    player.playStyleSummary,
  ];

  for (const source of sources) {
    const n = parseShirtFromText(source);
    if (n != null) return n;
  }

  return null;
}

/**
 * @param {number | null | undefined} n
 */
export function formatPlayerShirtNumber(n) {
  if (n == null || !Number.isFinite(n)) return null;
  const num = Math.round(n);
  if (num < 1 || num > 99) return null;
  return String(num);
}
