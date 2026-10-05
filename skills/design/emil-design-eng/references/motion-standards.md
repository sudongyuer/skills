# Motion standards

The single source for motion values used by `emil-design-eng`,
`review-animations`, `improve-animations`, `find-animation-opportunities`,
`animate` and `design-system`. Other skills link here instead of copying these
tables. Values are written for the web (CSS, Motion); the principles hold on
every platform. React Native and native iOS API specifics (Reanimated configs,
SwiftUI animations, haptics) live in [`animate-expo`](../../animate-expo/SKILL.md)
and [`apple-design`](../../apple-design/SKILL.md).

Copy a value from here; never approximate one from memory.

## Frequency gate

How often a person sees the motion decides whether it exists at all.

| Frequency | Decision |
| --- | --- |
| 100+ times a day (keyboard shortcuts, command palette toggle, core navigation) | No animation |
| Tens of times a day (hover, list navigation, frequent toggles) | Remove, or keep only near-imperceptible motion (fast, small) |
| Occasional (modals, drawers, sheets, toasts, settings) | Standard animation |
| Rare or first-time (onboarding, empty states, success, celebration) | Room for delight |

Keyboard-initiated actions never animate. They repeat hundreds of times a day,
and motion makes them feel delayed and disconnected from the key press.

## Purpose

Every animation names one of these purposes. If none applies, it does not
animate.

- **Feedback**: the interface heard the input (press scale, hold-to-confirm fill).
- **Spatial consistency**: where something came from or went (a toast exits
  the edge it entered from; a popover grows from its trigger).
- **State indication**: a state change becomes legible (a morphing button, an
  expanding section).
- **Preventing a jarring change**: content that would otherwise teleport,
  appear or vanish.
- **Explanation**: motion that shows how a feature works (marketing and
  onboarding only).
- **Delight**: allowed only at the rare or first-time frequency tier.

"It looks good" is not a purpose for anything seen often.

## Easing

| Motion | Easing | Curve | Token |
| --- | --- | --- | --- |
| Entering, exiting, any response to input | Strong ease-out | `cubic-bezier(0.23, 1, 0.32, 1)` | `--ease-enter` |
| Already on screen, moving or morphing from A to B | Strong ease-in-out | `cubic-bezier(0.77, 0, 0.175, 1)` | `--ease-move` |
| Constant motion (marquee, spinner, progress, hold-to-confirm fill) | Linear | `linear` | `--ease-linear` |
| Sheet or drawer that is not gesture-driven | Sheet/drawer curve (from the Ionic framework) | `cubic-bezier(0.32, 0.72, 0, 1)` | none by default; add `--ease-drawer` only when a project needs it |
| Hover and color changes | CSS `ease`, or the ease-out curve | `ease` | none |

- Never `ease-in` on UI. It starts slow, which delays the moment the person is
  watching most closely; an ease-out at 200ms feels faster than an ease-in at
  the same 200ms.
- The built-in `ease-out` and `ease-in-out` keywords are weak. Prefer the
  stronger curves above for deliberate motion.
- Token names match the [`design-system`](../../design-system/references/tokens.md#motion)
  token set. A project with its own tokens keeps its names and maps these
  curves onto them instead of adding a parallel set.

## Duration

UI animations stay under 300ms.

| Element | Duration |
| --- | --- |
| Press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers, sheets (not gesture-driven) | 200–300ms |
| Gesture-driven sheets, drawers, cards | A spring (see Springs); no fixed duration |
| Exit | Equal to or shorter than the matching enter |
| Stagger between items in a group | 30–80ms per item |
| Marketing and explanatory motion | May be longer |

- **Hold-to-confirm is a separate case**, not an enter or exit. The fill runs
  for the hold time itself (for example 1–2s, linear) because the person is
  deciding; on release it snaps back within the press budget with the ease-out
  curve. Slow where the person decides, fast where the system responds.
- A tooltip waits before its first appearance; once one is open, neighbouring
  tooltips open instantly with no animation.
- Stagger is decorative: it never blocks interaction while it plays.

## Springs

Springs suit motion that a gesture starts, that can be interrupted, or that
should feel alive. They have no fixed duration; they settle from their
parameters.

Think in Apple's two designer parameters rather than mass, stiffness and
damping (WWDC23, "Animate with springs"):

- **Damping ratio / bounce**: overshoot. A damping ratio of 1 (bounce 0) is
  critically damped: no overshoot, a smooth settle. Lower damping means more
  bounce.
- **Response / perceptual duration**: how quickly the value appears to arrive,
  in seconds. It is not the time until the spring fully stops.

| Use | Bounce (damping ratio) | Perceptual duration |
| --- | --- | --- |
| Default for UI | `0` (1.0) | 0.2–0.4s |
| Release after a flick, throw or drag that carried momentum | `0.1–0.3` (0.9–0.7) | 0.3–0.4s |
| Decorative pointer tracking | Underdamped is acceptable | Tuned by feel |

- Bounce 0 is the default. Add a small bounce only when the gesture itself
  carried momentum; overshoot on a menu that just appeared feels wrong,
  overshoot on a card that was flicked feels right.
- Gesture-driven springs start from the gesture's release velocity.
- Motion (motion.dev): with `bounce`, `duration` is the total time until the
  spring settles. The equivalent of Apple's response is `visualDuration`
  (motion.dev/docs/spring), so the default UI spring is
  `{ type: "spring", visualDuration: 0.3, bounce: 0 }`.
- The physics form `{ stiffness, damping, mass }` gives more control. Its
  damping ratio is `damping / (2 * sqrt(stiffness * mass))`; for example
  `{ mass: 1, stiffness: 100, damping: 10 }` has a ratio of 0.5, which is
  visibly bouncy and suits decorative motion only.

## Entry scale

- Elements never animate from `scale(0)`. Nothing in the world appears from
  nothing.
- Enter from `scale(0.95)` with `opacity: 0`. Anything from 0.9 to 0.97 is
  acceptable; pick one value per product.
- Press feedback scales to `0.97` (0.95–0.98 acceptable) on any pressable
  element.

## Origin

- Anchored surfaces (popovers, dropdowns, menus, tooltips) scale from their
  trigger, not from their own center. Use the transform-origin your component
  library computes for the anchor (Base UI exposes it as `var(--transform-origin)`),
  or derive it from the trigger's position.
- Modals are the exception: they are not anchored to a trigger and stay at
  `transform-origin: center`.
- Surfaces that leave the way they came (toasts, sheets) exit along the same
  path they entered.

## Interruptibility

- Anything triggered rapidly or reversible mid-motion (toasts, toggles,
  expand/collapse, drags) retargets from its current state instead of
  restarting.
- On the web, CSS transitions retarget; CSS keyframes restart from zero, so
  keyframes are for predetermined, one-shot motion only.
- Springs keep their velocity when retargeted, which makes them the default for
  gesture-driven motion.
- A gesture can grab an element mid-animation; the animation never has to
  finish before input is accepted.

## Performance

- Animate `transform` and `opacity`. They skip layout and paint and can run on
  the compositor. `width`, `height`, `margin`, `padding`, `top` and `left`
  trigger layout every frame.
- Name the animated properties. `transition: all` animates properties nobody
  chose, often off the compositor.
- Drive a moving element directly, not through a variable on its parent that
  every child inherits; that recalculates styles for the whole subtree.
- Library and thread specifics (Motion shorthands, WAAPI, Reanimated worklets
  and the UI thread) live in [`animate`](../../animate/SKILL.md) and
  [`animate-expo`](../../animate-expo/SKILL.md).

## Reduced motion

Reduced motion means fewer and gentler animations, not none.

- Remove translation, scale, parallax, overshoot and autoplaying loops.
- Replace movement with an opacity cross-fade within the fade budget
  (125–200ms), so the state change is still explained.
- Keep opacity and color changes that explain a state change.
- No blur transitions under reduced motion.
- With duration tokens: movement durations go to 0 and the fade duration stays.
- Web: `@media (prefers-reduced-motion: reduce)`, or `useReducedMotion()` in
  Motion. React Native and native iOS read the system setting through the
  platform API (see `animate-expo`, `apple-design`).

## Hover

Hover motion on the web is gated behind `@media (hover: hover) and (pointer: fine)`;
touch devices fire hover on tap.

## Haptics

Not covered here. Haptics are platform behaviour and are owned by
`apple-design` and `animate-expo`.

## Findings table

`review-animations` and `improve-animations` report defects in one table:

| # | Severity | Category | Location | Finding | Fix |
| --- | --- | --- | --- | --- | --- |

- **Location** is `file:line`, confirmed by reading the code.
- **Severity**: **HIGH** feels broken (`ease-in` on UI, motion on a keyboard or
  100+/day action, `scale(0)`, dropped frames from layout properties);
  **MEDIUM** noticeably off (wrong origin, non-interruptible dynamic UI,
  missing reduced motion, `transition: all`); **LOW** polish (stagger, token
  consolidation).
- **Category** is one of: purpose and frequency, easing and duration,
  physicality and origin, interruptibility, performance, accessibility,
  cohesion and tokens.
- **Fix** carries the exact value from this file.

Choices of taste (which curve, how long, which spring) are not defects; they
go in a separate "Motion choices" part as numbered options with one
recommendation.
