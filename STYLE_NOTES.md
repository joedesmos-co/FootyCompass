# FootyCompass — Style Notes

How the FootyCompass interface is meant to look and feel, and why the visual
choices read as a real football product rather than a generic AI dashboard.

## Design direction

FootyCompass should read like a **premium football scouting / learning
platform** — a clean editorial sports site with a "football magazine + scouting
report" sensibility. The priority is **UI quality**: strong typography,
professional spacing, and clear hierarchy. Football identity is present but
**subtle and supporting**, never the main event.

Guiding principles:

- **Hierarchy and typography first.** A confident type scale, generous spacing
  rhythm, and quiet section markers carry the layout. Decoration never competes
  with content (players, clubs, quizzes).
- **Restraint over ornament.** One emerald accent used sparingly; gold reserved
  for the FootyBrain rating. No stacked gradients, glows, fake floating graphics,
  ticket notches, or pitch-texture fills.
- **Real content over fake props.** Where the old hero used decorative "floating
  quiz cards", the space now holds a real, clickable "Ways to train" module.
- **Consistency.** Shared button sizing, card treatment, hairline rules, and a
  single divider style so every page feels like the same product.
- **Performance.** All styling is CSS — no new images, fonts, JS animation, or
  libraries. The data architecture and features are untouched.

## Key visual choices

### Design system
- **Spacing scale** (`--space-2xs … --space-3xl`) for a consistent rhythm.
- **Hairline tokens** (`--fc-rule`, `--fc-rule-strong`, `--fc-ink`) and two
  restrained shadows (`--fc-shadow-card`, `--fc-shadow-lift`) replace the old
  heavy gradient/glow tokens. They adapt for the `matchday-light` theme.
- **Section headers** get a thin **accent kicker** (a 3px solid bar) — an
  editorial lower-third marker, not a glowing gradient.
- **Divider** (`.fc-pitch-divider`): a single hairline rule with a small accent
  tick at the left, used between homepage sections.
- **Buttons.** Primary uses the app's solid accent fill; secondary uses a
  defined border. `--btn--large` is normalised so CTAs share one height and
  align cleanly across pages.

### Cards (players, clubs, leagues, nations)
- Clean bordered cards with a soft shadow — **no top gradient band, no
  pitch-stripe texture**. A slim accent edge appears only on hover/focus.
- The importance score is a flat **"FB" rating cap** (small `FB` label over a
  gold number, no glow) tied to the FootyBrain importance rating.
- Position pills are quiet uppercase badges; meta tiles use tabular numerals on
  a subtle ink fill so they read like a stat sheet. Image proportions are kept
  consistent so card heights stay even.

### Homepage hero
- A balanced two-column editorial layout: headline, lead, and CTAs on the left;
  a real **"Ways to train"** module (Player quiz / Club quiz / Daily challenge,
  each a link) on the right — replacing the old fake floating-card graphic.
- **CTA row**: primary + secondary buttons at intentional auto widths that align
  and wrap cleanly; the Random Journey is a quiet **tertiary text link**, not a
  third oversized button. On mobile the two CTAs become a clean full-width stack.
- **Stats** render as a compact **scoreboard row** — large tabular numerals split
  by hairline dividers — instead of cramped boxed tiles.
- Backdrop is a calm dark gradient with one faint accent wash; no stadium glow,
  chalk arcs, or gradient wordmark.

### Random Football Journey
- A **compact discovery module**: a single card with a left accent rule, tight
  padding, and the existing CTA — not a full-width striped banner with ticket
  notches. It reads as a premium feature without dominating the page.

### Quiz
- The scoreboard is a clean row of subtle tiles with tabular numerals (no accent
  top-bars or text glow).
- The category picker is an obvious grid of labelled cards; the selected category
  gets a calm accent border + inset ring and a " · selected" cue.
- Club crests are locked to `object-fit: contain` so they **never stretch**, and
  the Club Quiz renders real crests in prompts.

### Profile pages
- Hero sections keep the crest/photo, a clear title, and a single **stat strip**
  with muted labels and tabular values — fewer boxed panels, stronger hierarchy.

## Why it's custom to FootyCompass

The identity now comes from restraint and real content: the FootyBrain rating
cap, scoreboard-style stats, real "ways to train" navigation, and a single
emerald accent applied consistently. The result reads as a focused football
product — an editorial scouting/learning site — rather than a decorated admin
dashboard, and it ships as a targeted, additive CSS layer that leaves the app
architecture, data, and features untouched.
