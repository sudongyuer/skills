# <App name> design language

<!-- Copy to docs/design-language.md. Fill every <...>; delete guidance comments.
Visual mockup: <link>. Keep this file the single source for tokens; code mirrors it
(tokens.ts / tokens.css) and a test or script checks they agree. -->

## Positioning

"<The platform's system UI> + one signature."
The skeleton (navigation, lists, sheets, controls, semantic colors) belongs to the
platform. Our own expression is spent in exactly these places:

1. <e.g. status language>
2. <e.g. the core screen's content presentation>
3. <e.g. one accent color>
4. <e.g. typography and density>

Everything else uses platform defaults. Do not imitate a native control that the
platform provides; use the real one.

## Layers

```text
theme/tokens.ts      pure data, no framework imports, testable directly
theme/*.ts           hooks: palette, motion, font scale
ui/*                 product components that wrap primitives / native views
screens/*            only use ui/*, never raw sizes or colors
```

## Color

- `accent`: `<#hex light>` / `<#hex dark>` — the only hand-written color pair.
  Everything else comes from platform semantic colors.
- The accent expresses exactly two things: **tappable** (buttons, links, selected
  tab) and **in progress**. It is never decoration.
- Both accent values reach ≥ 4.5:1 contrast against the default background.
  This is a test, not a guideline.
- Reserved colors: <e.g. green/red only for diff additions/deletions; never the accent>.

## Status language

A status is always **color + shape**, never color alone. One component renders
it everywhere (`ui/StatusDot` or equivalent).

| Status | Color | Symbol / shape |
| --- | --- | --- |
| In progress | accent | <filled circle + pulse> |
| Needs you | <warning> | <exclamation circle> |
| Error | <danger> | <x octagon> |
| Idle | <secondary label> | <empty circle> |
| Done | <secondary label> | <checkmark> |
| Archived | <tertiary label> | <archive box> |

## Typography

No raw font sizes in screens. All text uses a semantic role whose values match the
platform defaults (native and cross-platform views sit side by side; a one-step
mismatch shows).

| Role | Size / line height | Color | Use |
| --- | --- | --- | --- |
| `title` | <20 / 26> | label | Section and sheet titles |
| `body` | <17 / 25> | label | Content, list primary text, inputs |
| `secondary` | <15 / 21> | secondary label | Row subtitles, descriptions |
| `meta` | <13 / 18> | secondary label | Time, status, footers |
| `eyebrow` | <11 / 14, +0.08em> | secondary label | Group headers, badges |
| `mono` | <13 / 20> | label | Paths, ids, code only |

Font scaling: <follow system / clamp to a range, e.g. 14/17–23/17>. Accessibility
sizes beyond the range are <supported / explicitly out of scope for MVP>.

## Spacing, radius, targets

- Spacing scale: `<4 8 12 16 20 24>` only.
- Radius: <values and where each is used>.
- Touch targets ≥ 44 pt; asserted in UI checks.

## Motion

Durations named by intent, not by number:

| Name | Duration | Use |
| --- | --- | --- |
| `pressIn` | <90 ms> | Press feedback |
| `fade` | <150 ms> | Appear / disappear |
| `settle` | <240 ms> | Layout changes |
| `glide` | <280 ms> | Screen-level transitions |

Every animation respects reduced motion.

## Information architecture

<Primary navigation, the first screen and why, what is deliberately not a top-level
destination.>

## Component inventory

| Component | Replaces |
| --- | --- |
| `<AppText>` | raw font sizes |
| `<StatusDot>` | status strings in subtitles |
| `<ListState>` | ad-hoc empty / error / loading states |

## Verification

- Contrast test for accent pairs.
- UI checks in light and dark; status shapes distinguishable under color-blindness simulation.
- A token-drift check between this file and `theme/tokens.*`.
