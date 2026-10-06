---
name: emil-design-eng
description: UI polish and motion judgment for web and React Native while building or refining an interface — whether something should animate, which purpose it serves, easing, duration, springs, press feedback, origin-aware popovers, clip-path, gestures, and the small details that make UI feel right. Owns the shared motion standards (references/motion-standards.md) that the other motion skills link to. Use when building or polishing UI and the question is how it should feel or move ("make this feel better", "should this animate", "这个交互怎么做更顺", "动效怎么调", "界面打磨"). Not for tokens, mockups or component scaffolding (use design-system). For reviewing a motion diff use review-animations; for a whole-repo motion audit use improve-animations; for finding new places to animate use find-animation-opportunities; for naming an effect use animation-vocabulary.
---

# Design Engineering

## Operating posture

Build interfaces where every small detail is correct, because the aggregate of
details people never consciously notice is what makes software feel right. When
a feature behaves exactly as someone assumes it should, they move on without a
second thought; that is the goal.

The worse failure is motion that should not exist: an animation on something
seen a hundred times a day makes the product feel slow no matter how well it is
tuned. The lesser failure is right motion with the wrong feel: a sluggish
curve, the wrong origin, a transition that restarts instead of retargeting.

All values (frequency gate, purposes, easing curves, durations, spring
configs, entry scale, reduced motion) live in
[references/motion-standards.md](references/motion-standards.md). Load it
before choosing a value.

## Taste is trained

Good taste is a trained instinct, not personal preference. When building UI,
study why the best interfaces feel the way they do: reverse engineer
animations, inspect interactions, play them in slow motion. Good defaults and
good motion are real differentiators when every product is functionally good
enough.

## The animation decision

Answer these in order before writing any animation code.

1. **Should this animate at all?** Run the frequency gate in
   [motion-standards](references/motion-standards.md#frequency-gate).
   Keyboard-initiated actions never animate. "This should not animate" is a
   complete answer.
2. **What is the purpose?** Name one purpose from
   [the purpose list](references/motion-standards.md#purpose). If the purpose
   is only that it looks good and the element is seen often, do not animate.
3. **Which motion?** Offer 2–4 numbered options built from the
   [easing](references/motion-standards.md#easing),
   [duration](references/motion-standards.md#duration) and
   [spring](references/motion-standards.md#springs) tables, for example:

   - **A (recommended)**: `transform` + `opacity`, 180ms, `cubic-bezier(0.23, 1, 0.32, 1)`; responsive and well inside the dropdown budget.
   - **B**: same properties, 220ms, CSS `ease`; calmer, suits a slower product personality.
   - **C**: spring, `visualDuration: 0.3`, `bounce: 0`; retargets smoothly if the menu is toggled rapidly.

   Mark one recommendation with a one-line reason and implement only after
   the user picks. Technical defects are not options: wrong properties,
   `transition: all`, `scale(0)`, `ease-in` on UI, missing reduced motion or a
   non-interruptible gesture are fixed directly.

### Perceived performance

Speed in motion changes how fast the whole product feels:

- A faster-spinning spinner makes loading feel faster at the same load time.
- A 180ms select feels more responsive than a 400ms one.
- Tooltips after the first open instantly (no delay, no animation), which makes
  the whole toolbar feel faster.
- Ease-out at 200ms feels faster than ease-in at 200ms because movement starts
  immediately.

## Springs

Springs simulate physics, so they feel natural and keep velocity when
interrupted. Use them for drag with momentum, elements that should feel alive,
gestures that can be reversed mid-motion, and decorative pointer tracking.
Configs and the Apple damping/response framing are in
[motion-standards](references/motion-standards.md#springs); bounce 0 is the
default.

In native iOS targets this section is principle and acceptance criteria only:
implement with platform components and the project's animation kit (see
[`apple-design`](../apple-design/SKILL.md) and
[`animate-expo`](../animate-expo/SKILL.md)), never by porting a web spring.

### Spring-based pointer interactions

Tying a visual directly to pointer position feels artificial because nothing
moves between frames of input. Interpolate the value through a spring instead,
for example Motion's `useSpring`:

```jsx
import { useSpring } from 'motion/react';

const rotation = mouseX * 0.1;

const springRotation = useSpring(mouseX * 0.1, {
  stiffness: 100,
  damping: 10,
});
```

`rotation` jumps with the pointer; `springRotation` follows it with momentum.
This works because the motion is decorative. On a functional chart in a
banking app, no animation is better. Know when decoration helps and when it
hinders.

### Interruptibility

Springs retarget from their current position and velocity; CSS keyframes
restart from zero. When someone opens an item and immediately presses Escape,
a spring reverses smoothly from wherever it is.

## Component building principles

### Pressable elements respond

Scale pressable elements to `0.97` on press so the interface visibly hears the
input.

```css
.button {
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.button:active {
  transform: scale(0.97);
}
```

### Never animate from scale(0)

Elements entering from `scale(0)` look like they come from nowhere. Enter from
`scale(0.95)` with `opacity: 0` (see
[entry scale](references/motion-standards.md#entry-scale)); even a barely
smaller start reads as a physical object arriving. The first rule below is the
mistake, the second is the fix:

```css
.entering-wrong {
  transform: scale(0);
}

.entering {
  transform: scale(0.95);
  opacity: 0;
}
```

### Origin-aware popovers

Popovers scale from their trigger, not from their center. Modals are the
exception and stay centered, because they are not anchored to a trigger. Use
the origin your component library computes; Base UI exposes it as
`--transform-origin`, other libraries name it differently or leave it to you
to derive from the trigger's position.

```css
.popover {
  transform-origin: var(--transform-origin);
}
```

Whether anyone notices the difference once does not matter. In aggregate,
unseen details become visible.

### Tooltips skip the delay on subsequent hovers

Tooltips delay before appearing to prevent accidental activation. Once one is
open, hovering adjacent triggers opens theirs instantly with no animation. The
`data-instant` rule below is that second case.

```css
.tooltip {
  transition:
    transform 125ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 125ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: var(--transform-origin);
}

.tooltip[data-starting-style],
.tooltip[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}

.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

### Transitions over keyframes for interruptible UI

CSS transitions retarget mid-animation; keyframes restart from zero. For
anything triggered rapidly (adding toasts, toggling states), use a transition.
The first rule below retargets; the keyframes after it would restart on every
new toast.

```css
.toast {
  transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes slide-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

### Blur to mask an imperfect crossfade

When a crossfade between two states still feels off after trying easings and
durations, add a subtle `filter: blur(2px)` during the transition. Without it
the eye sees two objects overlapping; blur blends them into one perceived
change. Keep blur under 20px, since heavy blur is expensive, especially in
Safari, and drop blur transitions under reduced motion.

```css
.button-content {
  transition:
    filter 200ms ease,
    opacity 200ms ease;
}

.button-content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

### Enter states with @starting-style

`@starting-style` animates element entry without JavaScript:

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 250ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 250ms cubic-bezier(0.23, 1, 0.32, 1);

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

Where browser support requires it, fall back to setting a `data-mounted`
attribute after the first render:

```jsx
useEffect(() => {
  setMounted(true);
}, []);
```

## CSS techniques

Load [references/css-techniques.md](references/css-techniques.md) when the work
involves `translate` percentages, `scale()` on children, 3D transforms,
`transform-origin`, `clip-path` reveals (tabs, hold-to-delete, scroll reveals,
comparison sliders) or staggered group entrances. Stagger stays 30–80ms between
items and never blocks interaction.

## Gesture and drag interactions

In native iOS targets these are principles and acceptance criteria only; the
implementation uses platform components (sheets, scroll views, system
gestures) and the project's animation kit, never hand-rolled web mechanisms
such as rubber-band functions. See [`apple-design`](../apple-design/SKILL.md)
and [`animate-expo`](../animate-expo/SKILL.md).

### Momentum-based dismissal

Do not require dragging past a distance threshold alone. Compute velocity and
dismiss on a quick flick even if the distance is short. Sonner uses a velocity
of 0.11 px/ms:

```js
const timeTaken = Date.now() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;

if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
  dismiss();
}
```

### Friction at boundaries

When someone drags past a natural boundary (a drawer already fully open),
allow it with increasing resistance instead of a hard stop. Real things slow
down before they stop, and an invisible wall reads as frozen.

### Pointer capture

Once a drag starts, capture the pointer so the drag continues when the pointer
leaves the element.

### Multi-touch protection

Ignore extra touch points once a drag has started; otherwise switching fingers
makes the element jump.

```js
function onPress() {
  if (isDragging) return;
  startDrag();
}
```

## Performance

The rules (animate `transform` and `opacity`, never `transition: all`) are in
[motion-standards](references/motion-standards.md#performance). Web details:

### CSS variables are inherited

Changing a custom property on a parent recalculates styles for every child. In
a drawer with many items, updating `--swipe-amount` on the container is
expensive; set `transform` on the moving element instead.

```js
element.style.transform = `translateY(${distance}px)`;
```

### Motion shorthand properties

Motion's independent transform shorthands (`x`, `y`, `scale`) are driven from
the main thread with `requestAnimationFrame` and can drop frames while the page
is busy loading or scripting. For motion that runs under load, animate the full
`transform` string so it can be hardware accelerated:

```jsx
<motion.div animate={{ transform: 'translateX(100px)' }} />
```

### CSS for predetermined motion

CSS animations and the Web Animations API run off the main thread, so they
stay smooth while JavaScript is busy. Use CSS or WAAPI for predetermined
motion and JavaScript springs for dynamic, interruptible motion.

```js
element.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
  duration: 1000,
  fill: 'forwards',
  easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
});
```

## Accessibility

### Reduced motion

Reduced motion means fewer and gentler animations, not none. Remove movement,
keep the opacity and color changes that explain a state change, and drop blur
transitions; the full rule is in
[motion-standards](references/motion-standards.md#reduced-motion).

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 200ms ease;
  }
}
```

```jsx
const shouldReduceMotion = useReducedMotion();
const closedX = shouldReduceMotion ? 0 : '-100%';
```

### Hover on touch devices

Touch devices fire hover on tap. Gate hover motion:

```css
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

## Building components people like using

1. **Low friction to adopt.** One component inserted once and one function
   called from anywhere beats hooks, providers and setup.
2. **Good defaults beat options.** Most people never customize; the default
   easing, timing and visual design must already be right.
3. **Handle edge cases invisibly.** Pause toast timers while the tab is hidden,
   fill the gaps between stacked toasts so hover is not lost, capture the
   pointer during a drag. Nobody notices these, which is the point.
4. **Transitions, not keyframes, for dynamic UI.** Items added rapidly must
   retarget, not restart.

### Cohesion

Motion matches the personality of the component and the product. A playful
component can sit at the slow end of its budget with a softer `ease`; a
professional dashboard stays crisp and fast. When easing, duration, visual
design and tone agree, the whole thing feels intentional.

### Opacity with height

When items enter and leave a list, the opacity change has to work with the
height change. There is no formula; adjust until it feels right and verify in
slow motion.

### Asymmetric timing

Slow where the person is deciding, fast where the system responds: a hold to
confirm takes its full hold time, the release snaps back. The hold-to-delete sample
in [css-techniques](references/css-techniques.md#clip-path-for-animation)
shows both halves.

## Verifying the feel

Motion can be mechanically correct and still feel wrong, so check it:

- **Slow motion**: raise durations 2–5x or slow playback in the browser's
  animation inspector. Look for colors that show two overlapping states, easing
  that starts or stops abruptly, the wrong transform-origin, and coordinated
  properties drifting out of sync.
- **Frame by frame**: step through in the DevTools Animations panel to see
  timing between coordinated properties.
- **Real devices for touch**: test drawers and swipes on a phone against the
  local dev server with remote devtools; a simulator does not reproduce gesture
  feel.
- **Fresh eyes**: look again the next day; imperfections missed during
  development show up.

For a structured review of a motion change use
[`review-animations`](../../quality/review-animations/SKILL.md); its verdict
does not replace product evidence from
[`acceptance`](../../quality/acceptance/SKILL.md).
