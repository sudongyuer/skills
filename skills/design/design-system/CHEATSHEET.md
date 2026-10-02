# Design System Cheatsheet

One-page quick reference. Scan it before filling a mockup or restyling a
component. Rationale and edge cases live in `references/`.

> **This is a skeleton.** Every value below is an **EXAMPLE** (neutral
> placeholders) until your project replaces it. Search for `TODO(adopt)` and
> resolve each one. Keep the token tables machine-readable: `scripts/check.mjs`
> compares every row of the form `` | `--token` | `light` | `dark` | `` with your
> tokens CSS/TS files and fails on drift.
>
> Table rules the checker relies on: a cell that is exactly `` `--name` `` names
> a token; the next cells that are exactly one backtick span are its light and
> (optional) dark value; a token row with no value cell is presence-only.

## Principles

TODO(adopt): replace these with your own 5-10 invariants. Keep each one
checkable ("never X", "only Y"), not aspirational.

1. **One accent.** It may express only: _interactive_ (primary action, link,
   selected tab, focus ring) and _in progress_ (running, loading). It never
   decorates, never marks status other than "in progress", and covers at most
   ~5% of any screen. TODO(adopt): confirm or narrow this list.
2. **Neutrals come in three tiers** (surface, border/secondary, text). Tier 1
   never carries text; `--color-neutral-5` is never text.
3. **Status is color + shape.** A state is never carried by color alone.
4. **Type is semantic.** Every text node uses a role from the type scale. No
   ad-hoc font sizes, no synthetic bold on CJK text.
5. **Only tokens.** No raw hex / rgb / px font sizes outside the token files.
6. **Reuse before you invent.** New primitives are a deliberate, reviewed
   addition, not a side effect of a feature.
7. **Depth is quiet.** A 1px border or `--shadow-whisper`; no hard drop shadows.
8. **Motion is named by intent**, not by duration.

## Color

### Neutral tiers (EXAMPLE)

| Token                | Light     | Dark      | Tier | Use                                   |
| -------------------- | --------- | --------- | ---- | ------------------------------------- |
| `--color-neutral-1`  | `#f8f9fa` | `#111214` | 1    | Lightest fill, grouped background     |
| `--color-neutral-2`  | `#f1f3f5` | `#1a1b1e` | 1    | Card / control fill                   |
| `--color-neutral-3`  | `#e9ecef` | `#25262b` | 1    | Hover fill, subtle fill               |
| `--color-neutral-4`  | `#dee2e6` | `#2c2e33` | 1    | Strong fill, grabber, track           |
| `--color-neutral-5`  | `#adb5bd` | `#5c5f66` | 2    | Border on solid surfaces. Never text. |
| `--color-neutral-6`  | `#868e96` | `#909296` | 2    | Icon, meta-size text only             |
| `--color-neutral-7`  | `#495057` | `#a6a7ab` | 2    | Secondary text                        |
| `--color-neutral-8`  | `#343a40` | `#c1c2c5` | 3    | Strong secondary / alt body           |
| `--color-neutral-9`  | `#212529` | `#e9ecef` | 3    | **Default body text**                 |
| `--color-neutral-10` | `#0b0c0e` | `#f8f9fa` | 3    | Headings, max emphasis                |

TODO(adopt): if your platform supplies semantic system colors (for example
iOS `label` / `secondaryLabel` / `separator`), map the tiers onto them here and
keep only the values you hand-write.

### Surfaces (EXAMPLE)

| Token             | Light       | Dark        | Use                                |
| ----------------- | ----------- | ----------- | ---------------------------------- |
| `--color-bg`      | `#ffffff`   | `#0e0f11`   | Page / screen background           |
| `--color-surface` | `#ffffff`   | `#1a1b1e`   | Raised card, sheet, modal body     |
| `--color-border`  | `#0000001a` | `#ffffff1a` | Default hairline border / divider  |
| `--color-scrim`   | `#0b0c0e66` | `#00000099` | Overlay behind modals and sheets   |

### Accent (EXAMPLE)

| Token               | Light     | Dark      | Use                                    |
| ------------------- | --------- | --------- | -------------------------------------- |
| `--color-accent`    | `#3b5bdb` | `#748ffc` | Interactive + in-progress only. ≤ 5%.  |
| `--color-on-accent` | `#ffffff` | `#0b0c0e` | Text / icon on an accent fill          |

Both accent values must reach **≥ 4.5:1** against `--color-bg` of the same
theme, and `--color-on-accent` ≥ 4.5:1 on the accent. Write this as a test
(`contrastRatio` in `tokens/tokens.example.ts`).

### Status = color + shape (EXAMPLE)

| Token             | Light     | Dark      |
| ----------------- | --------- | --------- |
| `--color-info`    | `#1c7ed6` | `#4dabf7` |
| `--color-success` | `#2f9e44` | `#51cf66` |
| `--color-warning` | `#e67700` | `#ffa94d` |
| `--color-danger`  | `#e03131` | `#ff6b6b` |

Every state has exactly one color **and** one shape. Render states through a
single primitive (e.g. `StatusDot`) so lists, detail screens and settings agree.

| State          | Color token          | Shape (EXAMPLE; web icon / SF Symbol)   |
| -------------- | -------------------- | --------------------------------------- |
| In progress    | accent               | filled circle + pulse                   |
| Needs you      | warning              | circle with exclamation mark            |
| Failed / error | danger               | octagon with cross                      |
| Idle / pending | neutral-7            | hollow circle                           |
| Done           | neutral-7            | check mark                              |
| Archived       | neutral-6            | archive box                             |

TODO(adopt): replace with your product's states. Verify they stay
distinguishable in grayscale and color-blind simulation.

## Typography

### Font roles

| Token                    | Value                               | Use                          |
| ------------------------ | ----------------------------------- | ---------------------------- |
| `--font-sans`            | platform UI stack + CJK fallback    | All UI and body text         |
| `--font-mono`            | platform mono stack + CJK fallback  | Paths, IDs, code, numbers    |
| `--font-weight-regular`  | `400`                               | Body                         |
| `--font-weight-medium`   | `500`                               | Headings; max weight for CJK |
| `--font-weight-semibold` | `600`                               | Short Latin emphasis only    |

Font stacks are platform-specific, so they are documented without a value and
only their presence is checked. CJK fallback is mandatory wherever Chinese or
Japanese can render. TODO(adopt): add a serif role only if you need one.

### Type scale: role → size / line-height (EXAMPLE)

| Role      | Size token         | Size   | Line-height token               | Line-height | Use                               |
| --------- | ------------------ | ------ | ------------------------------- | ----------- | --------------------------------- |
| display   | `--text-display`   | `32px` | `--text-display--line-height`   | `40px`      | Hero, empty-state headline        |
| title     | `--text-title`     | `20px` | `--text-title--line-height`     | `28px`      | Page / section / sheet title      |
| body      | `--text-body`      | `16px` | `--text-body--line-height`      | `24px`      | **Default.** Paragraphs, rows     |
| secondary | `--text-secondary` | `14px` | `--text-secondary--line-height` | `20px`      | Row subtitle, helper text         |
| meta      | `--text-meta`      | `12px` | `--text-meta--line-height`      | `16px`      | Time, status, footer, chip        |
| eyebrow   | `--text-eyebrow`   | `11px` | `--text-eyebrow--line-height`   | `14px`      | Uppercase label, group header     |
| mono      | `--text-mono`      | `13px` | `--text-mono--line-height`      | `20px`      | Paths, branches, IDs, code        |

| Token                            | Value    | Use                         |
| -------------------------------- | -------- | --------------------------- |
| `--text-eyebrow--letter-spacing` | `0.08em` | Tracking for eyebrow only   |

Weight is applied separately from size. TODO(adopt): on iOS, align these with
the system text styles if half your UI is native list cells, so the two never
sit one step apart side by side.

## Spacing (EXAMPLE)

| Token       | Value  | Typical use                        |
| ----------- | ------ | ---------------------------------- |
| `--space-1` | `4px`  | Icon ↔ label                       |
| `--space-2` | `8px`  | Tight stack, chip padding          |
| `--space-3` | `12px` | Card content gap                   |
| `--space-4` | `16px` | Screen gutter, section content     |
| `--space-5` | `24px` | Between cards / groups             |
| `--space-6` | `32px` | Major section break                |

## Radius (EXAMPLE)

| Token           | Value   | Use                              |
| --------------- | ------- | -------------------------------- |
| `--radius-sm`   | `4px`   | Chip, tag, inline code           |
| `--radius-md`   | `8px`   | Button, input, list card         |
| `--radius-lg`   | `12px`  | Modal, popover                   |
| `--radius-xl`   | `16px`  | Sheet top corners; the cap       |
| `--radius-pill` | `999px` | Pill buttons, avatars, toggles   |

## Depth (EXAMPLE)

| Token              | Value                  | Use                                |
| ------------------ | ---------------------- | ---------------------------------- |
| `--shadow-whisper` | `0 4px 24px #0000000d` | The only shadow: floating surfaces |
| `--blur-overlay`   | `24px`                 | Backdrop blur behind overlays      |

## Motion: durations named by intent (EXAMPLE)

| Token               | Value                       | Intent                                   |
| ------------------- | --------------------------- | ---------------------------------------- |
| `--duration-press`  | `100ms`                     | Press feedback (scale/sink, not flicker) |
| `--duration-fade`   | `150ms`                     | Content appearing after load             |
| `--duration-settle` | `200ms`                     | Small state change settling in place     |
| `--duration-glide`  | `320ms`                     | Sheets, drawers, page transitions        |
| `--ease-standard`   | `cubic-bezier(0.2, 0, 0, 1)` | Default easing for all of the above     |

Respect reduced-motion: durations collapse to 0 (see the example CSS).

## Z-index layers (EXAMPLE)

| Token          | Value | Layer                          |
| -------------- | ----- | ------------------------------ |
| `--z-base`     | `0`   | Normal flow                    |
| `--z-sticky`   | `100` | Sticky headers, toolbars       |
| `--z-dropdown` | `200` | Menus, popovers, autocomplete  |
| `--z-overlay`  | `300` | Scrim                          |
| `--z-modal`    | `400` | Modal, sheet                   |
| `--z-toast`    | `500` | Toasts (above everything)      |

Never write a raw z-index; if a new layer is needed, add a token here first.

## Touch targets

| Token         | Value  | Use                                              |
| ------------- | ------ | ------------------------------------------------ |
| `--touch-min` | `44px` | Minimum hit area (44pt iOS; use ≥ 48dp on Android) |

The visible control may be smaller; extend the hit area (padding, `hitSlop`).

## Quick decisions (EXAMPLE)

| Need               | Use                                                                |
| ------------------ | ------------------------------------------------------------------ |
| Body paragraph     | body role + neutral-9                                              |
| Secondary text     | secondary role + neutral-7                                         |
| Timestamp / status | meta role + neutral-7                                              |
| Page heading       | title role + medium weight + neutral-10 (never bold on CJK)        |
| Card               | surface fill + 1px border + radius-md + space-4 padding            |
| Primary action     | accent fill + on-accent text + radius-md; one per view             |
| Secondary action   | neutral-2 fill + border + neutral-9 text                           |
| Destructive action | danger fill + on-accent text, behind a confirm                     |
| Code / path        | mono role + neutral-1 fill + border                                |
| Divider            | 1px border color                                                   |

TODO(adopt): add rows for your most frequent decisions.

## Verification

```bash
node <skill-dir>/scripts/check.mjs
```

Checks that every token row above matches the configured tokens CSS/TS
(light and dark), that those files declare nothing undocumented, and that
scanned sources contain no raw colors, raw font sizes or hardcoded font
families.
