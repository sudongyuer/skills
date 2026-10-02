# PROJECT-DESIGN — Visual Design System

> This document is the **visual design contract** for `[PROJECT]`. It sits alongside `[PROJECT].md` (the product brief) and `[PROJECT]-DEV.md` (the engineering spec).
>
> **Boundaries.** `[PROJECT].md` answers *what the product is*. `[PROJECT]-DEV.md` answers *how the product is built*. This document answers *what the product looks like, and why it refuses to look like anything else*. When the three documents disagree, `[PROJECT].md` is the intent, `[PROJECT]-DEV.md` is the implementation-in-progress, and this document is the visual contract. Intent changes first; the visual contract follows; the implementation follows last.
>
> Chapter numbers here are independent. Cross-document references use `产品文档 §X.Y` for `[PROJECT].md`, `开发文档 §X.Y` for `[PROJECT]-DEV.md`, and `DESIGN §X.Y` for this file.
>
> **Language note.** This document is written in English on purpose. It is short, declarative, and meant to be quoted verbatim into code comments and PR reviews. The Chinese product brief carries tone; this file carries rules.

---

## 1. The one thesis

`[PROJECT]`'s design system is not a kit for making pages look good. It is a set of constraints whose only job is to make it **physically difficult to build something that betrays the product's voice**.

Every rule in this document should be read through one filter: *does this constraint remove a bad option, or does it add a good one?* Only the first kind belongs here. If a token exists, it will eventually be used — keep the vocabulary small enough that there is no wrong turn to take.

One metaphor holds the whole system together: `[e.g., "paper and ink" / "deep-night radio" / "archive cabinet" / "a mark already dry"]`

`[Expand in 2–3 sentences. The metaphor should make the palette, typography, and motion rules feel inevitable rather than arbitrary. E.g., "The surface is paper, not a screen. The foreground is ink, not a font. Everything that cannot be explained with 'it's a mark on paper' should not be in the system."]`

---

## 2. Color

### 2.1 Palette philosophy

`[Describe the material logic, not RGB values. E.g., "The color space is ink-on-paper: how much paper shows through, how much ink covers it. There is no primary color. There is no accent. There is no semantic red for errors, green for success, or blue for links. Those concepts do not belong here."]`

### 2.2 Day face

```
--paper           #[HEX]   page background; [explain why this specific value, e.g., warm off-white — never pure #FFFFFF]
--paper-raised    #[HEX]   slight lift for elevated surfaces (result cards, input wells)
--ink-100         #[HEX]   the darkest mark; reserved for [e.g., type names and key glyphs]
--ink-80          #[HEX]   body text; [e.g., prompts, options, monologues]
--ink-60          #[HEX]   secondary text; [e.g., meta, timestamps, progress]
--ink-40          #[HEX]   decorative marks only; never carries information
--ink-20          #[HEX]   hairlines, inactive rails
```

Two things about these values that are not negotiable:

`[State two non-negotiable material facts. E.g., "Paper is not white. #F5F2EC reads as rice paper, not a screen. Ink is not black. #1A1714 has a warm bias that keeps it on the ink side of the ink/toner divide."]`

### 2.3 Night face

`[Either define the night face token set below (token names are identical — only values change), or explicitly state: "There is no night face. This product has a single face."]`

```
--paper           #[HEX]   [e.g., the page at night; warm near-black, never pure #000000]
--paper-raised    #[HEX]
--ink-100         #[HEX]
--ink-80          #[HEX]
--ink-60          #[HEX]
--ink-40          #[HEX]
--ink-20          #[HEX]
```

The token shape is mirror-symmetric so that no code path is conditional on which face is active.

### 2.4 Forbidden color tokens

The following tokens **do not exist and must not be added**:

```
--color-primary, --color-accent, --color-brand
--color-success, --color-error, --color-warning
--color-[anything semantic]
```

---

## 3. Typography

### 3.1 Font families

```
--font-body     [stack]   [describe the emotional register, e.g., "print-like, slightly formal, not screen-native"]
--font-display  [stack]   [if same as body, state so explicitly]
```

### 3.2 Type scale

```
--text-xs       [px]   [use]
--text-sm       [px]   [use]
--text-base     [px]   [default reading size]
--text-lg       [px]   [use]
--text-2xl      [px]   [use]
--text-3xl      [px]   [maximum — no larger sizes exist]
```

Intentionally missing: `[e.g., --text-xl; no sizes above 3xl]`

### 3.3 Line height and weight

```
--lh-tight    [ratio]   [use, e.g., short labels, headings]
--lh-normal   [ratio]   [use, e.g., UI text]
--lh-prose    [ratio]   [long-form reading; monologues, prompts]

--fw-regular  400       default for all body text
--fw-medium   500       restricted to: [e.g., type names and display headings only]
```

---

## 4. Space

### 4.1 Space scale

```
--space-1    [px]
--space-2    [px]
--space-3    [px]
--space-4    [px]
--space-6    [px]
--space-8    [px]
```

Intentionally missing: `[e.g., --space-5, --space-7, --space-10 and above]`

### 4.2 Page margins and max-width

```
--page-padding-x   [value]   horizontal padding on all routes
--measure-prose    [value]   maximum reading line length
--page-max         [value]   outer page max-width
```

---

## 5. Layout

### 5.1 Layout principle

`[One sentence. E.g., "Single-column product. No sidebar, no sticky navigation, no fixed chrome of any kind."]`

### 5.2 Forbidden layout elements

- 🚫 `[e.g., sticky or fixed header navigation]`
- 🚫 `[e.g., multi-column grid]`
- 🚫 `[e.g., bottom tab bar]`
- 🚫 `[e.g., floating action button]`

---

## 6. Components

### 6.1 Existing component inventory

The following components exist in the system with strictly bounded APIs and visual behavior:

- **`[ComponentA]`** — `[one-sentence description of what it does and what it cannot do]`
- **`[ComponentB]`** — `[one-sentence description]`

### 6.2 Forbidden component types

The following component types **do not exist in this product** and must not be introduced:

```
Button · Card · Dialog · Toast · Snackbar · Tooltip
Alert · Banner · Badge · Chip · Tag · Pill · Avatar
Tabs · Accordion · Stepper · ProgressBar
Sidebar · Drawer · Popover · Dropdown · Select
```

`[Remove from the list any types that are genuinely allowed in your product. The default list covers the most commonly misimported components from UI libraries.]`

---

## 7. Motion

### 7.1 Motion principle

`[State the two-tier rule explicitly. E.g., "Content entry may use spring animation. Interaction state transitions must snap. These two tiers do not mix. No exceptions."]`

### 7.2 Spring parameters (if applicable)

```
--spring-enter    stiffness: [n], damping: [n], mass: [n]   [use]
--spring-bounce   stiffness: [n], damping: [n], mass: [n]   [use]
```

### 7.3 Forbidden motion

- 🚫 `[e.g., hover scale or translate transforms]`
- 🚫 `[e.g., page transition animations]`
- 🚫 `[e.g., loading spinner rotation]`
- 🚫 `[e.g., any transition on layout properties (width, height, padding)]`

---

## 8. Accessibility

### 8.1 Minimum guarantees

- All foreground/background contrast meets WCAG AA (4.5:1 minimum)
- Keyboard focus state is visible and does not conflict with selected or active state
- Tap/click targets are at least 44×44pt

### 8.2 `prefers-reduced-motion`

`[Describe how the system responds to the reduced-motion media query. E.g., "All spring animations collapse to instant transitions. The two-tier motion principle still applies — it just runs at duration 0ms. No content is hidden or deferred under reduced motion."]`

---

## 9. Enforcement

### 9.1 How constraints are enforced

A design rule that is not enforced is a suggestion. This system's constraints are enforced through:

1. `[e.g., TypeScript — no literal hex values or raw px numbers allowed in component files]`
2. `[e.g., Custom lint rule — flags any CSS property not referencing a design token]`
3. `[e.g., PR review checklist below — required step before merge]`

### 9.2 PR review checklist

When reviewing any PR that touches visual code, ask these five questions:

1. Does this introduce a new color literal (any `#`, `rgb()`, or `hsl()` value not in a token file)?
2. Does this add a `transition` to any property other than `opacity`?
3. Does this use `box-shadow`, `border-radius` above 2px, or any gradient background?
4. Does this use a font not declared in DESIGN §3.1?
5. Does this import or instantiate a component type from the forbidden list in DESIGN §6.2?
