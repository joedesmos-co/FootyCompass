# FootyCompass — Style Notes

How the FootyCompass interface is meant to look and feel, and why the visual
choices are specific to football rather than a generic dashboard template.

## Design direction

FootyCompass should read like a **premium football learning app** — part modern
football magazine, part matchday broadcast graphics. The goal is "stadium /
matchday energy" expressed through restrained, performant CSS, not heavy imagery
or animation.

Guiding principles:

- **Football-first identity.** Pitch lines, chalk markings, scoreboard tiles, and
  collectible scouting cards instead of generic glassmorphism panels.
- **Calm, dark, broadcast palette.** Deep pitch-green/teal background with an
  emerald→cyan accent. Gold is reserved for ratings/streaks (the "prize" colour).
- **Hierarchy over decoration.** Strong type scale and section markers carry the
  layout; motifs stay subtle so content (players, clubs, quizzes) leads.
- **Performance.** All new identity is CSS (gradients, pseudo-elements, repeating
  linear-gradients). No new images, fonts, JS animation loops, or libraries.

## Key visual choices

### Design system
- **Spacing scale** extended (`--space-2xs … --space-3xl`) for stronger rhythm.
- **Football identity tokens** (`--fc-chalk`, `--fc-stripe`, `--fc-accent-grad`,
  `--fc-gold-grad`, `--fc-shadow-card`) so the look is centralised and themable.
  These adapt for the `matchday-light` theme.
- **Section headers** get a magazine-style accent **kicker bar** (`::before`)
  before titles — a consistent, football-broadcast lower-third feel.
- **Pitch divider** (`.fc-pitch-divider`): a chalk line with a centre spot,
  used between homepage sections in place of a plain `<hr>`.
- **Button hierarchy.** Primary buttons use the emerald→cyan gradient (clear,
  branded CTA); secondary buttons use a defined border; everything else recedes.

### Scouting cards (players, clubs, leagues, nations)
- A **gradient top stripe** turns each card into a collectible "scouting card"
  header band.
- A faint diagonal **pitch-stripe texture** sits behind player-card content.
- The importance score becomes a gold **"FC cap" badge** (a small `FC` label
  over the number) rather than a generic numeric chip.
- Position pills read as crisp uppercase **badges**; meta tiles use tabular
  numerals and a darker pitch fill so they look like a stat sheet.

### Homepage hero
- Branded gradient backdrop with a **stadium-light glow** and a **chalk baseline +
  centre-circle arc** along the bottom edge.
- The wordmark (`FootyCompass`) uses the accent gradient as text fill.
- Hero stats render as **scoreboard tiles** (accent top line, gradient numerals).

### Random Football Journey — signature feature
- The homepage banner is styled like a premium **matchday ticket**: stronger
  gradient, pitch stripes, **ticket-notch** cut-outs on the edges, and a starred
  "Discover football" ribbon so the feature feels special and intentional.

### Quiz — matchday / training mode
- The scoreboard tiles get an **accent top line** and tabular numerals to read
  like a broadcast scoreboard; the hot-streak value glows gold.
- The category/mode picker label gets a coach's-clipboard accent dash, and the
  selected category reads as a chosen line-up slot ("✓ selected").
- Club crests are locked to `object-fit: contain` so they **never stretch**.

### Profile pages
- Stat strips use accent labels and tabular numerals for a clean stat-sheet row.
- Sports hero sections get a subtle **chalk baseline** to anchor them without
  adding another boxed panel.

## Why it's custom to FootyCompass

Every motif maps to the subject matter: chalk lines and centre circles come from
the pitch, scoreboard tiles from matchday broadcasts, scouting cards from squad
analysis, the "FC cap" from the in-house FootyBrain importance rating, and the
ticket treatment frames discovery as an event. The result is a recognisable
football product identity rather than a reskinned admin dashboard — achieved as a
targeted, additive CSS layer that leaves the app architecture, data, and features
untouched.
