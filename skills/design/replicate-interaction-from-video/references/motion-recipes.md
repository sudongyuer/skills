# Motion recipes

Load this at step 4 (turn fits into parameters) and step 5 (build the replica).
The numbers in the worked example are what one reference measured, not
defaults; always use your own fits.

## Springs

SwiftUI-style `spring(response: R, dampingFraction: ζ)` for unit mass:

```js
function springK(response, damping) { const w = 2 * Math.PI / response; return [w * w, 2 * damping * w]; }
// semi-implicit Euler at <= 1/240 s substeps, driven by the page's virtual clock
s.v += (k * (s.target - s.x) - c * s.v) * h; s.x += s.v * h;
```

- **Initial velocity.** A curve that moves on the very first frame and decays
  exponentially was released with velocity. `fit_spring.py` reports it as
  `v0` in distance-fractions per second; apply it as `s.v += v0 * (newTarget - oldTarget)`
  when the target changes. A spring from rest looks "half a beat late".
- **No chained springs.** If a container's height depends on a child that is
  itself springing (a map expanding inside a card), set the container's target
  from the child's *final* value (`content - child.x + child.target`) so both
  move together.
- **Minimum heights are layout, not springs.** A card that is 110 pt empty
  and then grows only when content exceeds it uses `max(minHeight, content)`.
- In SwiftUI the same parameters go to `.animation(.spring(response:dampingFraction:), value:)`;
  `.smooth` is response 0.5, ζ 1.0.

## Text streaming

Wrap every character in its own `inline-block` span; the line stays an inline
container so wrapping still happens between glyphs.

```css
.g { display: inline-block; white-space: pre;
     animation: gIn 240ms cubic-bezier(.34,1.3,.64,1) both; }
@keyframes gIn { from { opacity: .2; filter: blur(.13em); transform: translateY(.42em) scale(.55); } }
```

- Tokens arrive in **chunks**; stagger glyphs inside a chunk by one frame
  (`animation-delay: n * 16ms`). Schedule chunk times from `glyph_fit.py`
  onsets, not from a fixed per-character rate.
- A glyph **takes its layout slot when inserted**, long before it is visibly
  readable. Schedule insertion by when neighbours start moving
  (`track_template.py`), not by when the glyph becomes legible.
- **Reflow** (text after the change point shifts): FLIP every following glyph.
  Record `getBoundingClientRect()` before the mutation, measure after, set a
  per-glyph offset spring to the difference, and render it with the
  `translate` property so it composes with the entry `transform` animation.
- **Raw value, then formatted value.** A model may stream `2026-0…` before the
  UI formats it as `9/18 08:00`. Show raw glyphs soft (opacity ≈ .55, slight
  blur); on replacement keep their slots and collapse them in place
  (`width → 0`, fade, blur; ~12 ms apart, ~80 ms each) while the formatted
  glyphs are inserted in front. Do not set `overflow: hidden` on the collapsing
  glyph (it clips blurred shapes into fragments). Make the leaving rule more
  specific than any entry variant (`.g.raw.out`), or the entry animation wins
  the cascade and nothing collapses.

## Reveals and confirmations

- **Left-to-right wipe** (a button revealed with a soft edge):
  `mask-image: linear-gradient(90deg, #000 var(--wipe), transparent calc(var(--wipe) + 35%))`
  with `@property --wipe` animated from -40% to 100%. Not a `scaleX` stretch.
- **Checkmarks that only fade**: opacity over ~120 ms, ~33 ms apart, no scale.
  Verify by frame strip whether size changes before adding a bounce.
- **"Thinking" border**: a conic-gradient ring masked to the border, animated
  with `@property --a`; note where the bright arc sits at a known frame and set
  the keyframe start angle so the phase matches.

## Worked example (one streaming "card drafts" recording)

| Transition | Measured |
| ---------- | -------- |
| Card width on appear | 49% → 100%, response ≈ .38, ζ ≈ 1.07, v0 ≈ 7.5/s, 10–90% in 200 ms, visible on frame 0 |
| Row insert height | 10–90% in 150–170 ms, starts immediately; per-row fits scatter (response .16–.44) because content keeps streaming during the change, so match the rise time |
| Map expand | response .32, ζ 1.0, from rest; tiles fade in ~120 ms later |
| Glyph entry | scale .55 → 1, dy ≈ .42 em → 0, σ ≈ 2 pt → 0, alpha .2 → 1, 150–250 ms |
| Name chunks | 1 char, +83 ms 1 char, +67 ms 1 char, +50 ms the rest |
| Reflow slide | 10–90% ≈ 160 ms, no overshoot |
| Checkmarks | fade 120 ms, 33 ms apart; button wipe 200 ms |

Result after fitting: card height median error 2 pt, p90 5 pt over 443 frames;
glyph onsets within one frame; reflow curve mean error 2% of travel. The
largest remaining gap was the font (no SF Pro on the capture machine).
