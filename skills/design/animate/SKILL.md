---
name: animate
description: Build a web animation from scratch, deciding in the order that determines whether it feels right — should it animate at all, what purpose, which tool (CSS, WAAPI, Motion), which properties, which curve, duration or spring, how it interrupts, how it exits — then offering numbered motion options and implementing the one the user picks. Use when asked to animate something on the web, add motion, make a component feel alive, or build a transition ("加个动画", "做个过渡", "网页动效"). For React Native and Expo use `animate-expo`; for critiquing existing motion use `review-animations`; for a whole-codebase motion audit use `improve-animations`; for finding places that could animate use `find-animation-opportunities`; for general motion and polish judgment use `emil-design-eng`.
---

# Building Animations

A construction skill for the web. It turns a request for motion into an
implementation that survives a strict review. It does not audit a codebase
(`improve-animations`), critique a diff (`review-animations`), hunt for places
that could animate (`find-animation-opportunities`), or build for React Native
(`animate-expo`).

All motion values (frequency gate, purposes, curves, durations, springs, entry
scale, origin, reduced motion) come from
[motion-standards](../emil-design-eng/references/motion-standards.md). This
file holds the web API facts and the build order.

## Operating posture

Build the animation so it passes `review-animations` the first time. The user
chooses the feel: run the gate, offer numbered options, implement the pick.
Technical defects are not options; they are fixed.

Two failure modes, and the first is worse:

1. **Animating something that should not animate.** The gate exists to produce
   zero lines of code sometimes. That is a result, not a dodge.
2. **Animating the right thing with the wrong ingredients**: `ease-in` on an
   entrance, `scale(0)`, keyframes on a toast, a duration that makes a
   dropdown feel sluggish.

## Gate

Stop with no animation, and say so, when:

- The motion is keyboard-initiated or seen 100+ times a day, per the
  [frequency gate](../emil-design-eng/references/motion-standards.md#frequency-gate).
  Offer the non-motion alternative (an instant state change, a static
  affordance).
- No purpose from the
  [purpose list](../emil-design-eng/references/motion-standards.md#purpose)
  applies. "It looks cool" on a frequently seen element is a reason to stop.
- The motion would move data the user is reading or acting on purely for
  style.

## Hard rules

1. Run the sequence in order; steps 1 and 2 gate everything.
2. Every curve, duration and spring comes from motion-standards. Never invent
   `cubic-bezier(0.4, 0, 0.2, 1)` because it looks familiar.
3. Extend the codebase's tokens, do not fork them. If motion tokens already
   exist, use them; adding a parallel set is a defect.
4. Reduced motion and hover gating ship with the animation.
5. Cheapest tool that works; do not add a motion library for a fade.
6. Motion choices are numbered options with one recommendation; technical
   defects (`transition: all`, layout properties, `scale(0)`, `ease-in` on UI,
   missing reduced motion, a non-interruptible rapid trigger) are fixed, not
   offered.

## The build sequence

### 1. Should this animate at all?

Apply the
[frequency gate](../emil-design-eng/references/motion-standards.md#frequency-gate).
Keyboard-initiated actions are a disqualifier, not a judgment call: a command
palette opened hundreds of times a day has no open or close animation.

**Completion criterion:** a frequency tier is named, or the run stops.

### 2. What is the purpose?

Name one purpose from the
[purpose list](../emil-design-eng/references/motion-standards.md#purpose).

**Completion criterion:** one purpose word is written down.

### 3. Pick the tool: cheapest that works

| Need | Tool |
| --- | --- |
| Hover, press, color, a state toggle controlled by a class or attribute | CSS transition |
| Entry animation on mount, no JS state | CSS `@starting-style` |
| Predetermined motion that must stay smooth while the page is busy | CSS animation |
| Programmatic control with CSS performance, no library | WAAPI (`element.animate()`) |
| Springs, layout animations, exit animations, gesture-driven values | Motion (`motion.dev`) |

CSS animations and WAAPI can run off the main thread for `transform` and
`opacity`, while `requestAnimationFrame`-based animation drops frames while
the browser loads, scripts or paints. Use CSS for predetermined motion and JS
for dynamic, interruptible motion.

If the task needs a component rather than an animation (a toast, a drawer, a
command menu, a dropdown), prefer an established, maintained library already
in the project or a platform component; ask before adding a dependency.
Hand-rolling those ends in a `<div>` dropdown with no focus management.

**Completion criterion:** the tool is named.

### 4. Pick the properties

- `transform` and `opacity`, per
  [performance](../emil-design-eng/references/motion-standards.md#performance).
  `clip-path` is the sanctioned third for reveals (see RECIPES.md); `height`
  is tolerated only for accordions, where no transform equivalent exists.
- Never `scale(0)`; entry scale per
  [entry scale](../emil-design-eng/references/motion-standards.md#entry-scale).
- Origin per
  [origin](../emil-design-eng/references/motion-standards.md#origin):
  anchored surfaces scale from the trigger (`var(--transform-origin)` in Base
  UI); modals stay centered.
- Percentages in `translate()` are relative to the element's own size;
  `translateY(100%)` moves by its own height whatever the content.
- In Motion, animate the full transform string under load. The `x`, `y` and
  `scale` shorthands are not hardware-accelerated and drop frames while the
  main thread is busy:

```jsx
<motion.div animate={{ transform: "translateX(100px)" }} />
```

- Set `transform` on the moving element directly, never through a CSS
  variable on the parent that every child inherits.

**Completion criterion:** every animated property is `transform`, `opacity`
or `clip-path`, or the accordion exception is named.

### 5. Curve and duration, or a spring, and the options

Curves come from the
[easing table](../emil-design-eng/references/motion-standards.md#easing) as
tokens that match `design-system`:

```css
:root {
  --ease-enter: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-move: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-linear: linear;
}
```

The sheet/drawer curve from Ionic, `cubic-bezier(0.32, 0.72, 0, 1)`, has no
default token; a recipe that needs it defines `--ease-drawer` locally. A
project with its own motion tokens maps these curves onto its names instead.

Durations come from the
[duration table](../emil-design-eng/references/motion-standards.md#duration);
UI stays under 300ms.

Springs suit drag with momentum, gestures the user can interrupt or reverse,
and decorative pointer tracking. Values come from the
[spring table](../emil-design-eng/references/motion-standards.md#springs). In
Motion, `duration` with `bounce` is the total settle time; the perceptual
duration is `visualDuration`:

```js
{ type: "spring", visualDuration: 0.3, bounce: 0 }
```

Then offer 2–4 numbered options, for example for a dropdown:

1. **(Recommended)** `transform` + `opacity`, 180ms, `var(--ease-enter)`:
   responsive and inside the dropdown budget.
2. Same properties, 220ms, CSS `ease`: calmer, suits a slower product
   personality.
3. Motion spring `{ visualDuration: 0.25, bounce: 0 }`: retargets smoothly if
   the menu is toggled rapidly.

Mark one recommendation with a one-line reason and wait for the pick.

**Completion criterion:** the user has picked an option, or said to use the
recommendation.

### 6. Interruption and exit

Per
[interruptibility](../emil-design-eng/references/motion-standards.md#interruptibility):

- Transitions, not keyframes, for anything triggered rapidly (toasts,
  toggles). CSS transitions retarget from the current value; keyframes restart
  from zero.
- Springs for gestures, because they carry velocity through an interruption.
- Exit the way it entered; the exit is no longer than the enter.
- Hold-to-confirm is the separate slow case: the fill runs for the hold time,
  linear; release snaps back within the press budget.

### 7. Reduced motion and pointer gating

Ships with the animation, every time. Reduced motion follows
[motion-standards](../emil-design-eng/references/motion-standards.md#reduced-motion):
fewer and gentler, not none.

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    transform: none;
    transition: opacity 150ms ease;
  }
}

@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

The first block keeps the opacity change and drops the movement. The second
gates hover motion, because touch devices fire hover on tap. In Motion, read
`useReducedMotion()`:

```jsx
const reduce = useReducedMotion();
const closedX = reduce ? 0 : "-100%";
```

**Completion criterion:** the reduced-motion and hover-gated paths are in the
code.

## Recipes

Load [RECIPES.md](RECIPES.md) when the request matches a common component:
button press, dropdown, tooltip, modal, drawer, toast, accordion, stagger,
hold-to-confirm, tab indicator, scroll reveal, drag to dismiss, crossfade,
WAAPI. Start from the recipe, then run the options step.

## Required output format

Before code:

- **Gate result**: frequency tier and purpose, or the reason it stops.
- **Motion options**: 2–4 numbered options (tool, properties, curve, duration
  or spring), one marked recommended with a one-line reason.

Stop and wait for the pick. After implementing:

- **Ingredients**: tool, properties, curve, duration or spring, one line each.
- **What to feel-check**: anything code cannot settle (a crossfade, a
  spring's bounce, the opacity and height balance in a reflowing list). Play
  it at 2–5× duration or in the DevTools animation inspector, step it frame by
  frame, test gestures on a real device, and look again the next day.

## Invocation variants

| Input | Result |
| --- | --- |
| `1`, `pick 2` | Implement that option |
| `go` | Implement the recommendation |
| `none` | Leave it unanimated |
| `tune <n>` | Offer variants of option n only |

## Never ship

Each of these blocks a `review-animations` pass:

| Never | Instead |
| --- | --- |
| `transition: all` | Name the exact properties |
| `transform: scale(0)` entrance | `scale(0.95)` + `opacity: 0` |
| `ease-in` on a UI element | `var(--ease-enter)` |
| Built-in `ease-out` on a deliberate animation | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Animation on a keyboard shortcut or 100+/day action | No animation |
| UI duration over 300ms with no reason | A value from the duration table |
| `transform-origin: center` on a trigger-anchored popover | `var(--transform-origin)` (modals exempt) |
| Keyframes on toasts, toggles, rapidly triggered elements | CSS transitions |
| Animating `width` / `height` / `margin` / `padding` / `top` / `left` | `transform` / `opacity` |
| Motion `x` / `y` / `scale` props under load | Full `transform` string |
| Motion spring `duration` read as perceived time | `visualDuration` |
| Ungated `:hover` motion | `@media (hover: hover) and (pointer: fine)` |
| Missing `prefers-reduced-motion` | Gentler variant, not zero |
| Everything entering at once | 30–80ms stagger |
