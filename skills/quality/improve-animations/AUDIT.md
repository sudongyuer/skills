# Animation audit playbook

The audit categories and what to hunt for in each. Every target value (curves,
durations, springs, entry scale, reduced motion) lives in
[motion-standards](../../design/emil-design-eng/references/motion-standards.md);
cite it from there and never approximate.

## 1. Purpose and frequency

Every animation names a
[purpose](../../design/emil-design-eng/references/motion-standards.md#purpose)
and passes the
[frequency gate](../../design/emil-design-eng/references/motion-standards.md#frequency-gate).

Hunt for: animations on keyboard-initiated actions, command palettes with
open/close transitions, decorative motion on list items or hover states hit
constantly. The strongest fix is often deleting the animation.

## 2. Easing and duration

Targets: the
[easing](../../design/emil-design-eng/references/motion-standards.md#easing) and
[duration](../../design/emil-design-eng/references/motion-standards.md#duration)
tables. `ease-in` on UI is always a finding. Where the project lacks easing
tokens, plans introduce them following the repo's conventions.

Hunt for: `ease-in` anywhere, weak built-in easing on deliberate entrances,
UI durations over budget, tooltip delay and animation repeated on every
tooltip in a toolbar, exits slower than their enters.

## 3. Physicality and origin

Targets:
[entry scale](../../design/emil-design-eng/references/motion-standards.md#entry-scale)
and [origin](../../design/emil-design-eng/references/motion-standards.md#origin).
`transform-origin: center` on a modal is correct; do not report it.

Hunt for: `scale(0)`, entrances with no initial transform where one belongs,
`transform-origin: center` (or none) on trigger-anchored surfaces, pressable
elements with no press feedback.

## 4. Interruptibility

Targets:
[interruptibility](../../design/emil-design-eng/references/motion-standards.md#interruptibility)
and [springs](../../design/emil-design-eng/references/motion-standards.md#springs).
Symmetric timing on a hold or press interaction is a finding.

Hunt for: `@keyframes` on toasts, toggles or rapidly triggered UI; gesture
handlers that tween with fixed-duration keyframes; drags that dismiss on
distance alone with no velocity check; hard stops at drag boundaries instead of
rising resistance.

## 5. Performance

Targets:
[performance](../../design/emil-design-eng/references/motion-standards.md#performance);
library specifics in [`animate`](../../design/animate/SKILL.md) and
[`animate-expo`](../../design/animate-expo/SKILL.md).

Hunt for: `transition: all`, animated layout properties, Motion shorthand
props on busy pages, `setProperty('--x', …)` driving child transforms,
`requestAnimationFrame` loops doing what CSS could, heavy `filter: blur()` in
transitions, and in React Native animation work on the JS thread.

## 6. Accessibility

Targets:
[reduced motion](../../design/emil-design-eng/references/motion-standards.md#reduced-motion)
and [hover](../../design/emil-design-eng/references/motion-standards.md#hover).

Hunt for: movement with no reduced-motion handling, ungated `:hover` motion,
reduced-motion implementations that remove all feedback instead of swapping
movement for fades, blur transitions that still run under reduced motion.

## 7. Cohesion and tokens

Motion matches the product's personality; curves and durations live as shared
tokens.

Hunt for: near-identical hand-typed curves and durations that should be one
token, one bouncy component in a crisp app, group entrances with no stagger,
crossfades that visibly double-expose.

## 8. Missed opportunities

Out of scope for this audit. Places that do not animate but should are found
with [`find-animation-opportunities`](../find-animation-opportunities/SKILL.md),
which carries its own gate and rejected-candidate list. Mention in one line if
the audit surfaced obvious seams.
