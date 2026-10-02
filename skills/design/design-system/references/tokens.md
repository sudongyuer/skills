# Tokens · Full Spec

Companion to `CHEATSHEET.md`. The cheatsheet holds the values; this file holds
the rules, rationale and edge cases. Values quoted here are the skeleton's
EXAMPLE set.

## Where tokens live

| Layer                | File (configure in `design-system.config.json`) | Consumer                         |
| -------------------- | ----------------------------------------------- | -------------------------------- |
| Contract             | `CHEATSHEET.md`                                 | Humans and agents                |
| Web                  | `tokensCss` (example: `tokens/tokens.example.css`) | CSS, Tailwind v4, StyleX, mockups |
| Native / JS          | `tokensTs` (example: `tokens/tokens.example.ts`)   | React Native, iOS bridges, tests |

- The cheatsheet is the hub. `scripts/check.mjs` compares every documented
  token with each configured file, light and dark, and flags tokens a file
  declares but the cheatsheet does not document.
- Names are CSS custom-property names on every platform (`--color-accent`), so
  one name means one thing everywhere. The TS file keeps them as quoted keys in
  `vars` / `darkVars` and derives platform-friendly views (`typeStyle()`,
  `space`, `token()`).
- Tailwind v4: put the variables in `@theme` to get utilities; the
  `--text-<role>--line-height` naming bundles line-height into `text-<role>`.
- StyleX: mirror the names in `defineVars()`; point `tokensCss` at a generated
  CSS file or at a hand-kept mirror.
- iOS / Android: where the platform supplies semantic colors (label,
  separator, grouped backgrounds), prefer them and hand-write only the values
  the platform does not provide (the accent, usually). Document the mapping in
  the cheatsheet.

## Neutral tiers

Ten steps in three tiers. Same token names in both themes; the dark block
redefines the values.

| Tier | Steps | Carries                                      | Never                         |
| ---- | ----- | -------------------------------------------- | ----------------------------- |
| 1    | 1-4   | Surfaces, fills, hover, tracks               | Text of any size              |
| 2    | 5-7   | Borders (5), icons + meta text (6), secondary text (7) | Step 5 as text     |
| 3    | 8-10  | Body (9, the default), headings (10)         | Large decorative fills        |

- Step 5 reads as a border on solid surfaces but disappears as text; reach for
  7 (or 6 at meta size only).
- Two surfaces from the same tier need a border or `--shadow-whisper` between
  them, or the card becomes invisible.
- Dark mode is a separate, tuned scale, not a mechanical inversion; check
  contrast of every text step against `--color-bg` and `--color-surface`.

## The one accent

`--color-accent` may express only what the cheatsheet lists (EXAMPLE:
**interactive** and **in progress**).

- Allowed: primary action fill, link, selected tab/segment, focus ring,
  in-progress status, progress bars.
- Not allowed: decoration, headings, body text, borders on ordinary cards, any
  status other than in-progress, large background fills.
- Budget: roughly 5% of a screen; one primary action per view.
- Text on an accent fill uses `--color-on-accent`.
- Contrast: accent ≥ 4.5:1 against `--color-bg` in both themes; on-accent ≥
  4.5:1 against the accent. Encode it as a test with `contrastRatio()`.

## Status colors

`--color-info`, `--color-success`, `--color-warning`, `--color-danger` are
state colors only; they never decorate.

- **Color + shape, always.** Each state pairs one color token with one shape
  (icon, glyph, SF Symbol). Status must survive grayscale and color-blind
  simulation.
- Render through one primitive (e.g. `StatusDot`, `StatusIcon`) so every
  surface uses the same pairs. Do not concatenate status words into subtitles
  when a status slot exists.
- Keep the state list closed. A new state is a cheatsheet change.

## Typography

Summary; full rules in `typography.md`.

- Roles, not sizes: `display`, `title`, `body`, `secondary`, `meta`, `eyebrow`,
  `mono`. Each bundles size and absolute line-height.
- Weight is separate: regular for body, medium for headings, semibold for
  short Latin emphasis only. Never bold on CJK.
- Font roles are platform stacks with mandatory CJK fallback where CJK can
  render; the cheatsheet documents them without a value (presence-checked).

## Spacing, radius, depth

- Spacing: a closed scale (EXAMPLE `4 8 12 16 24 32`). Screen gutter is one
  step (EXAMPLE `--space-4`); align it with the platform's grouped-list inset on
  mobile.
- Radius: closed scale with a cap (EXAMPLE `--radius-xl` for sheets). Larger
  radii read as decorative.
- Depth: a 1px `--color-border` or `--shadow-whisper`. Hard drop shadows are
  forbidden. Overlays use `--color-scrim` and optionally `--blur-overlay`.

## Motion

Durations are named by **intent**, never by number:

| Token               | Intent                                                   |
| ------------------- | -------------------------------------------------------- |
| `--duration-press`  | Press feedback: a physical sink or scale, not an opacity flicker |
| `--duration-fade`   | Content appearing after load; fades are for loading only |
| `--duration-settle` | Small state change settling in place                     |
| `--duration-glide`  | Sheets, drawers, page transitions; at most one gentle overshoot |

- One default easing (`--ease-standard`). Springs belong to the component
  layer (React / React Native animation libraries), configured to settle
  within `--duration-glide`.
- Reduced motion collapses durations to 0.

## Layers

z-index values come only from `--z-*`. A new layer is a new token, added in
order; never `z-index: 9999`.

## Touch targets

Interactive elements expose at least `--touch-min` (44pt on iOS; use ≥ 48dp on
Android) of hit area. The visible control may be smaller if padding or
`hitSlop` makes up the difference.

## Changing tokens

The token files are the contract. Adding or changing a value touches every
consumer, so it is a deliberate design decision (spec, review), never a
side effect of making one component work. Update the cheatsheet and every
token file together, then run the check script.

## Project-specific rules

<!-- TODO(adopt): add rules unique to this project, e.g. runtime-injected
     tokens that do not appear in the static files, per-surface overrides,
     platform color mappings, or brand-mark exceptions. -->
