# CSS motion techniques

Web techniques referenced from [the skill](../SKILL.md). Values come from
[motion-standards](motion-standards.md).

## CSS transform details

### translate with percentages

Percentages in `translate()` are relative to the element's own size.
`translateY(100%)` moves an element by its own height whatever that height is,
which is how toast and drawer libraries hide content before animating it in.
Prefer percentages over hardcoded pixels.

```css
.drawer-hidden {
  transform: translateY(100%);
}

.toast-enter {
  transform: translateY(-100%);
}
```

### scale() scales children too

Unlike `width` and `height`, `scale()` also scales text, icons and content.
For press feedback that is a feature.

### 3D transforms for depth

`rotateX()` and `rotateY()` with `transform-style: preserve-3d` produce real 3D
effects (orbits, coin flips, depth) without JavaScript.

```css
.wrapper {
  transform-style: preserve-3d;
}

@keyframes orbit {
  from {
    transform: translate(-50%, -50%) rotateY(0deg) translateZ(72px) rotateY(360deg);
  }
  to {
    transform: translate(-50%, -50%) rotateY(360deg) translateZ(72px) rotateY(0deg);
  }
}
```

### transform-origin

Every element transforms around an anchor point, by default its center. Set it
to where the trigger is for origin-aware motion.

## clip-path for animation

`clip-path: inset(top right bottom left)` defines a rectangular clipping
region; each value eats into the element from that side. `inset(0 100% 0 0)`
hides the element from the right, `inset(0 0 0 0)` shows all of it.

```css
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear;
}
```

- **Tabs with clean color transitions**: duplicate the tab list, style the copy
  as active, clip the copy so only the active tab shows, and animate the clip
  on change. Timing individual color transitions never matches this.
- **Hold-to-delete**: the sample above. The colored overlay fills over the hold
  time with linear timing; on release it snaps back fast with ease-out. Add the
  press scale on the button. The hold is a separate case from enter and exit
  (see [duration](motion-standards.md#duration)).
- **Image reveals on scroll**: start at `inset(0 0 100% 0)` and animate to
  `inset(0 0 0 0)` when the element enters the viewport (`IntersectionObserver`,
  or Motion's `useInView` with `{ once: true }`).
- **Comparison sliders**: overlay two images and drive the top one's right
  inset from the drag position. No extra DOM.

## Stagger

When several elements enter together, stagger them 30–80ms apart (see
[duration](motion-standards.md#duration)). Longer delays make the
interface feel slow. Stagger is decorative and never blocks interaction.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fade-in 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.item:nth-child(2) {
  animation-delay: 50ms;
}

.item:nth-child(3) {
  animation-delay: 100ms;
}

.item:nth-child(4) {
  animation-delay: 150ms;
}

@keyframes fade-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
