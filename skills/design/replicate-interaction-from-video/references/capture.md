# Capturing frames you can compare

Load this before step 1 (decoding the reference) and step 6 (capturing the
replica).

## Reference video

Decode every frame at the **point grid** (1 px = 1 pt) for geometry, and at
**3x** for text. Find the point width from the device (402 pt for an iPhone 17
Pro, 393 for an iPhone 16; check the recording's pixel width ÷ scale factor).

```bash
REF=reference.mp4
ffprobe -v error -show_entries stream=width,height,r_frame_rate -of compact "$REF"
mkdir -p ref/pt ref/x3
ffmpeg -v error -i "$REF" -vf "scale=402:-1" ref/pt/%04d.png          # geometry
ffmpeg -v error -i "$REF" -vf "select='between(n\,50\,200)',crop=1206:500:0:600" \
  -vsync 0 -start_number 50 ref/x3/%04d.png                             # one text region, native 3x
# overview: 4 fps contact sheet
ffmpeg -v error -i "$REF" -vf "fps=4,scale=300:-1,tile=6x5" -frames:v 1 ref/overview.png
```

Check for **duplicate frames** (identical consecutive PNGs). A 60 fps recording
of an app animating at 30-40 fps shows pairs; do not read a duplicate as a pause.

```bash
md5sum ref/pt/*.png | awk '{print $1}' | uniq -c | awk '$1>1' | wc -l
```

## Web replica: frame-stepped capture

Never compare against a real-time screen recording of the replica. Headless
Chromium records at an irregular rate; in practice the recorded timeline was
stretched ~13% and frames over 250 ms long were silently dropped by a clamped
clock. Step the page clock instead, so frame *i* is exactly *i/60* s.

Expose two hooks in the page. All motion must be driven by one virtual clock
(`vt`) or by CSS animations/transitions; never by `setTimeout`/`setInterval`.

```js
let capture = false;
function advance(ms) {
  vt += ms;
  while (idx < events.length && events[idx][0] <= vt) events[idx++][1](); // fake stream
  stepSprings(ms / 1000);                                                 // JS springs
  for (const an of document.getAnimations()) {                            // CSS animations + transitions
    if (!an.__cap) { an.__cap = true; an.pause(); an.currentTime = 0; }
    else an.currentTime = (an.currentTime || 0) + ms;
  }
}
window.__capture = () => { capture = true; reset(); advance(0); };
window.__step = (ms) => advance(ms);
// in the requestAnimationFrame loop: if (capture) return;
```

An animation created during a step starts at `currentTime = 0` on the next
step, so its `animation-delay` still counts. Staggers expressed as
`animation-delay` work unchanged.

Then:

```bash
node scripts/step_capture.mjs --url "file://$PWD/replica.html" --out rep/pt \
  --frames 443 --selector .phone --inset 10 --ref-width 402
node scripts/step_capture.mjs --url "file://$PWD/replica.html" --out rep/x3 \
  --frames 201 --from 50 --selector .phone --inset 10 --ref-width 402 --scale 3
```

`--ref-width` sets the device scale factor so the captured element is exactly
`scale × ref-width` pixels wide. Measure the element's real content width
first: a `border` outside `box-sizing: border-box` once made a 390 px screen
read as 370 px, which mis-scaled every font size derived from it.

If the page has no doctype (artifact pages are wrapped at publish time), wrap
it locally for capture:

```bash
{ echo '<!doctype html><html><head><meta charset="utf-8"></head><body>'; cat page.html; echo '</body></html>'; } > replica.html
```

## Native iOS replica

The Simulator cannot be frame-stepped. Record it (see the `ios-ui-verify` and
`acceptance` skills for recording and verify-mode setup), decode at the point
grid like the reference, and align time by an event both recordings share
(the first frame where the element appears). Expect ±1 frame of jitter and
compare curves only, never single frames.
