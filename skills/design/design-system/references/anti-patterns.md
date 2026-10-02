# Anti-Patterns · What Not to Do

`scripts/check.mjs` blocks the mechanical ones (raw colors, raw font sizes,
hardcoded font families, configured `forbid` patterns). This list is the
reasoning behind those checks plus everything a script cannot catch.

## Color

### Raw colors outside the token files

```css
/* Wrong */
.card { background: #f1f3f5; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }

/* Right */
.card { background: var(--color-neutral-2); box-shadow: var(--shadow-whisper); }
```

```tsx
// Wrong
<View style={{ backgroundColor: '#f1f3f5' }} />
// Right
<View style={{ backgroundColor: palette['--color-neutral-2'] }} />
```

A hex, `rgb()` or `hsl()` literal belongs only in the token files. If no token
fits, that is a design question, not a reason to inline a value.

### Framework default palettes

Tailwind's `neutral-50…950`, `gray-*`, `slate-*` and similar palettes bypass
the contract. Ban them through the config's `forbid` list (see
`design-system.config.example.json`).

### Text on the wrong tier

Tier 1 (`neutral-1…4`) never carries text; `neutral-5` is a border, never
text. Secondary text starts at `neutral-7`; `neutral-6` only at meta size.

### Accent doing more than its job

The accent expresses only what the cheatsheet allows (EXAMPLE: interactive and
in progress). Audit any view with:

- more than one accent primary action per view;
- accent borders on several cards in a list;
- accent text in body copy or headings;
- accent used as a status other than in-progress, or as decoration.

### Status by color alone

A red dot and a green dot are the same dot to many users. Every state pairs a
color with a shape; render it through the single status primitive.

### Semantic colors as decoration

`info / success / warning / danger` mark states. Decoration uses neutrals.

## Typography

### Ad-hoc font sizes

```css
/* Wrong */
.caption { font-size: 12px; line-height: 1.3; }
/* Right: use the role */
.caption { font-size: var(--text-meta); line-height: var(--text-meta--line-height); }
```

Includes `text-[13px]`, `fontSize: 13`, and framework default ramps. Every
text node picks a semantic role.

### Synthetic bold on CJK text

```html
<!-- Wrong -->
<strong style="font-weight: 700">重要内容</strong>
<!-- Right -->
<strong style="font-weight: var(--font-weight-medium)">重要内容</strong>
```

CJK fonts rarely ship a true bold; the renderer strokes glyphs and the result
is blurry and uneven. Medium (500) is the cap.

### Hardcoded font families

A literal `font-family` / `fontFamily` usually drops the CJK fallback chain
and renders tofu or the wrong face. Always use the font-role tokens.

### Tiny text

Nothing below the smallest role. Meta-size text needs a high-contrast color
(`neutral-7` or stronger).

## Layout

### Hard drop shadows

Depth is a hairline border or `--shadow-whisper`. `0 8px 24px rgba(0,0,0,.2)`
makes every surface look like a generic template card.

### Borderless on borderless

Two surfaces from the same tier need a border or whisper shadow between them.

### Radius beyond the cap

Radii above the cheatsheet's cap read as decorative. Controls rarely exceed
`--radius-md`.

### Invented layers and durations

`z-index: 9999`, `transition: 0.37s`: use `--z-*` and `--duration-*`. A new
layer or motion intent is a token change.

### Touch targets under the minimum

Any tappable element below `--touch-min` of hit area on mobile.

## Components

### Reinventing existing primitives

Check `references/components.md` and `componentsDir` before writing a new
dropdown, modal, toast, list state or status indicator.

### Mixing modal and sheet

Sheets are for phones; modals / dialogs for wide layouts. Pick one per
breakpoint.

### Inline style objects carrying tokens by value

```tsx
// Wrong
<div style={{ color: '#212529', fontSize: 14 }}>…</div>
// Right
<Text role="secondary">…</Text>
```

Inline literals bypass the contract and hide from audits. The check script
catches the literal forms; reviewers catch the rest.

### Custom views pretending to be native chrome (mobile)

Hand-drawn navigation-bar buttons, fake segmented controls or emulated
materials lose system sizing, grouping and accessibility. Use the native
component when the platform has one.

## Process

### Skipping the cheatsheet

If you reach for a value, font or spacing step that is not in `CHEATSHEET.md`,
stop: either you missed an existing token (re-read), or the need is genuinely
new (raise it before adding it). Additions are deliberate, not side effects.

### Editing tokens to "make it work"

The token files are the contract. Changing a value touches every consumer and
needs a design decision, not a one-off change inside a feature.

### Silencing the checker

`ds-allow` is for genuine exceptions (a renderer that cannot read variables, a
third-party color that must match exactly). Say why on the same line.

## Project-specific anti-patterns

<!-- TODO(adopt): add patterns from your own reviews, e.g. banned utility
     classes, legacy components, runtime overrides that must not be copied
     into static code. Mechanical ones also go into `forbid` in the config. -->
