# Animation Recipes

Starting points for the cases that come up most. Each one still goes through
the gate and the numbered options in [SKILL.md](SKILL.md); the values shown are
the recommended option, taken from
[motion-standards](../emil-design-eng/references/motion-standards.md).

Curves are the `--ease-enter`, `--ease-move` and `--ease-linear` tokens defined
in SKILL.md. The sheet/drawer curve is defined locally in the drawer recipe.

---

## Button press

Any pressable element. Instant feedback that the interface heard the input.

```css
.button {
  transition: transform 160ms var(--ease-enter);
}

.button:active {
  transform: scale(0.97);
}
```

`scale()` scales children too; the label and icons come along, which is what
makes it read as a physical press. `:active` is a real press on touch, so it
needs no hover gating; gate any `:hover` styling separately.

---

## Dropdown, popover, menu, select

Scales out of its trigger, not out of thin air. `var(--transform-origin)` is
supplied by Base UI; with another library, use the origin it computes for the
anchor.

```css
.popover {
  transform-origin: var(--transform-origin);
  transition:
    opacity 200ms var(--ease-enter),
    transform 200ms var(--ease-enter);
}

.popover[data-starting-style],
.popover[data-ending-style] {
  opacity: 0;
  transform: scale(0.95);
}
```

---

## Tooltip

Same shape as a popover, faster. The `data-instant` rule is the detail most
implementations miss: once one tooltip is open, neighbours open instantly.

```css
.tooltip {
  transform-origin: var(--transform-origin);
  transition:
    transform 125ms var(--ease-enter),
    opacity 125ms var(--ease-enter);
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

The initial delay prevents accidental activation. After that, skipping both
the delay and the animation makes the whole toolbar feel faster.

---

## Modal

The one popover that stays centered, because it is not anchored to a trigger.

```css
.modal {
  transform-origin: center;
  transition:
    opacity 250ms var(--ease-enter),
    transform 250ms var(--ease-enter);
}

.modal[data-starting-style],
.modal[data-ending-style] {
  opacity: 0;
  transform: scale(0.95);
}

.backdrop {
  transition: opacity 250ms var(--ease-enter);
}
```

Animate the backdrop's opacity alongside it so they read as one surface.

---

## Drawer / sheet

Not gesture-driven, so it uses the sheet/drawer curve from Ionic and stays in
the 200–300ms band.

```css
.drawer {
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  transform: translateY(0);
  transition: transform 300ms var(--ease-drawer);
}

.drawer[data-closed] {
  transform: translateY(100%);
}
```

Add drag and it becomes a gesture problem; see **Drag to dismiss** below.

---

## Toast

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 250ms ease,
    transform 250ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

- `ease` instead of `--ease-enter` is a choice of personality: a softer
  arrival for something the user did not ask for. Offer both as options.
- Without `@starting-style`, set a `data-mounted` attribute after mount and
  key the entered state on it:

```jsx
useEffect(() => {
  setMounted(true);
}, []);

return <div className="toast" data-mounted={mounted} />;
```

When toasts stack and the list reflows, the opacity change has to work against
the height change. There is no formula for that pair; adjust until it feels
right, then check it again the next day.

---

## Accordion / collapse

```css
.content {
  overflow: hidden;
  transition:
    height 200ms var(--ease-enter),
    opacity 200ms var(--ease-enter);
}
```

Keep it short: this is one of the few animations that costs layout every
frame. Measure the content height in JS (or use a headless primitive that
supplies it) instead of animating to `auto`.

---

## Stagger a group entrance

For a list or grid the user sees occasionally, not one they scroll past all
day.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 300ms var(--ease-enter) forwards;
}

.item:nth-child(2) { animation-delay: 50ms; }
.item:nth-child(3) { animation-delay: 100ms; }
.item:nth-child(4) { animation-delay: 150ms; }

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Stagger is decorative; it never blocks interaction while it plays.

---

## Hold to confirm

For destructive actions where a plain click is too easy to fire by accident.
The press fills slowly and linearly for the hold time; the release snaps back
within the press budget.

```css
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms var(--ease-enter);
}

.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s var(--ease-linear);
}

.button:active {
  transform: scale(0.97);
}
```

`linear` is correct here: the fill is a progress indicator, and progress does
not ease.

---

## Tab indicator with a color transition

Timing individual color transitions across a tab list never quite lands. Clip
instead. Duplicate the tab list, style the copy as the active state, and clip
the copy so only the active tab shows. The `inset()` values are computed from
the active tab's position.

```css
.tabs-active-copy {
  clip-path: inset(0 60% 0 20%);
  transition: clip-path 250ms var(--ease-move);
}
```

The text and background change together because they are one element being
revealed, not two colors being interpolated.

---

## Scroll reveal

Marketing surfaces only; never functional UI a user visits daily. Marketing
motion may run longer than the UI budget.

```css
.reveal {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 600ms var(--ease-move);
}

.reveal[data-visible] {
  clip-path: inset(0 0 0 0);
}
```

Trigger with `IntersectionObserver`, or Motion's `useInView` with
`{ once: true, margin: "-100px" }`. Fire it once.

---

## Drag to dismiss

The gesture recipe. Springs, not durations, because the user can reverse
mid-motion. Dismiss on a flick, not only on distance: measure velocity from
the drag start and accept either.

```js
const timeTaken = Date.now() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;

if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
  dismiss();
}
```

Set the transform on the dragged element directly; driving it through a CSS
variable on the parent recalculates styles for every child.

```js
element.style.transform = `translateY(${distance}px)`;
```

Four details that separate a good drag from a bad one:

- **Pointer capture** once the drag starts, so it continues when the pointer
  leaves the element.
- **Multi-touch protection**: ignore new touch points while dragging, or
  switching fingers mid-drag makes the element jump.
- **Damping past boundaries**: beyond a natural edge the element moves less
  the further it goes.
- **Friction, not a wall**: allow the over-drag with rising resistance
  instead of refusing it.

Settle with a spring so an interrupted drag keeps its velocity. The flick
carried momentum, so a small bounce is an option; bounce 0 is the default:

```js
{ type: "spring", visualDuration: 0.3, bounce: 0.2, velocity }
```

---

## Masking a crossfade that will not settle

When two states overlap visibly and no easing or duration fixes it, a slight
blur on the seam blends them into one perceived change. Keep the blur small
(2px here, never above 20px; heavy blur is expensive, especially in Safari),
and drop it under reduced motion, where blur transitions are excluded.

```css
.content {
  transition:
    filter 200ms ease,
    opacity 200ms ease;
}

.content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .content.transitioning {
    filter: none;
  }
}
```

---

## Programmatic, without a library

When the motion needs JS control but not a dependency, WAAPI gives CSS-grade
performance and can be interrupted with `animation.cancel()` or by reversing
it. This reveal is marketing-length; UI motion stays within the duration
table.

```js
element.animate(
  [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }],
  { duration: 1000, fill: "forwards", easing: "cubic-bezier(0.77, 0, 0.175, 1)" }
);
```
