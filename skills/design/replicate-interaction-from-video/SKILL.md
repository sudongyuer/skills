---
name: replicate-interaction-from-video
description: >
  Reproduce a UI interaction or animation from a screen recording by measuring
  it frame by frame instead of eyeballing it: decode every frame, write a state
  table, drive the replica from a deterministic fake data stream, capture the
  replica frame-stepped at the reference's frame rate and pixel scale, turn
  both into numeric curves (element bounds, spring fits, per-glyph opacity /
  blur / scale / offset, tracked reflow positions) and iterate until the curves
  agree within stated tolerances. Use when the user shares a video or GIF of an
  interaction and wants it rebuilt, asks how an animation was made, or says a
  replica "looks close but the details are off"; also for "这个动画是怎么做的",
  "照着这个视频做", "复刻这个动效", "参考这个交互做出来", "逐帧分析",
  "动画没对齐", "细节还是不一致", "文字动画对不上".
---

# Replicate an interaction from a video

Outcome: a replica whose motion matches the reference **by measurement** — the
same states in the same order, entering at the same frames, with fitted
spring and easing parameters — plus a short report of the remaining
differences and their causes.

Eyeballing sampled frames gets "roughly the same" and stops there. Every
detail that made the reference feel right in practice (a card that starts
moving on frame 0, glyphs that rise from below at half size, a raw value
replaced by a formatted one, a button that wipes in instead of scaling) was
invisible at 4 fps and only found by dense frames or by numbers.

## Scope

- **Prerequisites:** `ffmpeg`; `python3` with `numpy scipy opencv-python-headless pillow`
  (`matplotlib` for plots); for web replicas `node` and `playwright` (Chromium).
- **Replica targets:** a web page (frame-steppable, best), or a native app
  recorded on a simulator (time-aligned, ±1 frame).
- **Not covered:** inventing motion with no reference; sound and haptics;
  gesture-driven physics whose input you cannot see; matching a font that is
  not installed (report it as a residual instead).
- **Stop** when every checkpoint in Verification passes, or when the remaining
  gaps are attributable to something you cannot change (font, map tiles,
  platform rendering) and are reported as such. Ask before spending more
  rounds on single-glyph or single-frame differences.

## Workflow

```text
[1] Decode the reference          every frame, point grid + 3x for text; overview sheet
[2] Look densely, write states    10-20 fps crops per transition -> state table
[3] Measure the reference         bounds, glyphs, tracked positions -> CSV/JSON
[4] Fit parameters                springs (response, damping, v0), timings, entry states
[5] Build on a fake stream        absolute timestamps from [3]; one virtual clock
[6] Capture the replica           frame-stepped, same fps and pixel scale
[7] Compare, fix the largest gap, repeat [6]-[7]
[8] Report numbers and residuals
```

Scripts live in `scripts/` (run from the skill directory or give full paths):

| Script | Use |
| ------ | --- |
| `measure_bounds.py` | element top/bottom/right per frame → CSV |
| `fit_spring.py` | spring response, damping, initial velocity, rise per segment |
| `compare_curves.py` | reference vs replica error stats, frames over tolerance, plot |
| `glyph_fit.py` | per-glyph opacity, blur, scale, offset, timings |
| `track_template.py` | sub-pixel position of a stable word/icon (reflow) |
| `frame_strip.py` | matching crops side by side, one row per frame |
| `step_capture.mjs` | frame-stepped Playwright capture of a web replica |
| `test-scripts.sh` | tests that pin every instrument to known answers |

### 1. Decode the reference

Follow [references/capture.md](references/capture.md): frames at the point grid
(1 px = 1 pt) for geometry, native 3x crops for text, a 4 fps contact sheet to
see the phases, and a duplicate-frame count to learn the app's real render
rate.

### 2. Look densely and write the state table

For each phase seen on the overview, extract 10–20 fps crops of just that
region and read them in order. Write the state table before any code:

| t (s) | State | What changes | Property: from → to | Timing |
| ----- | ----- | ------------ | ------------------- | ------ |

Every row must name what triggers it (a data field arriving, a threshold such
as "two locations resolved", generation finishing). Look specifically for:
elements visible on frame 0; minimum sizes; values shown raw then formatted;
neighbours that slide when text grows; wipes vs scales; fades vs pops; things
that appear only near the end. Use `frame_strip.py` whenever you are unsure
what you are looking at.

### 3. Measure the reference

Pick a metric per row of the state table and run it over every frame —
[references/measurement.md](references/measurement.md) maps motions to scripts
and shows the commands. **Validate each instrument on a frame where you know
the answer before trusting it**; the failure table in that file lists the
ways measurement lied in practice.

### 4. Fit parameters

- Containers: `fit_spring.py` per change-from-rest segment → response,
  dampingFraction, initial velocity, start time.
- Text: `glyph_fit.py --summary` → chunk arrival times, in-chunk stagger,
  entry state (scale, dy, blur, alpha), duration, overshoot.
- Reflow: `track_template.py` on the word after the change → slide timing and
  shape; it also reveals when glyphs take their slots.

Translate them with [references/motion-recipes.md](references/motion-recipes.md)
(spring math, initial velocity, chained springs, per-glyph entry, FLIP,
raw→formatted swap, wipes).

### 5. Build the replica on a deterministic fake stream

- Drive everything from a script of `[timeMs, action]` events with **absolute
  times taken from step 3**, not from a guessed per-character rate.
- One virtual clock advances events, JS springs and CSS animations together;
  no `setTimeout`. Expose `window.__capture()` and `window.__step(ms)`
  ([references/capture.md](references/capture.md)).
- One spring family from the fits; never chain one spring behind another.
- Match the reference's point grid: derive CSS sizes as pt × (replica content
  width ÷ reference point width).

### 6. Capture the replica frame-stepped

`step_capture.mjs` with `--ref-width` equal to the reference's point width,
`--scale 3` for text regions. Never compare against a real-time recording of
the replica.

### 7. Compare and iterate

1. `compare_curves.py` on each metric; read steady-state checkpoints before
   transitions (a constant offset is one wrong dimension; a timing offset is a
   wrong schedule; a shape difference is a wrong spring or easing).
2. Fix the largest error, re-capture, re-measure. Batch only fixes that touch
   different metrics.
3. When a number cannot explain a difference you can see, build a
   `frame_strip.py` of the same frames from both sides and look again; new
   *behaviours* (not parameters) are found this way, then measured.
4. When the replica changes, re-run every earlier comparison; text changes
   can move card heights.

### 8. Report

Give the user: the state table, the fitted parameters, each metric's error
(median / p90 / max), the frame-aligned comparison (video or strip), and every
remaining gap with its cause. Name residuals honestly ("font not installed",
"single-glyph overshoot not modelled", "only row 1 measured").

## Verification

- [ ] Reference and replica decoded/captured at the same fps and pixel scale; replica frame-stepped (or time-aligned with stated jitter for native).
- [ ] Each measuring instrument checked on a known frame; `scripts/test-scripts.sh` passes.
- [ ] State table written, every row with a trigger, before the replica was built.
- [ ] Container geometry: median error ≤ 2 pt, p90 ≤ 5 pt over the whole recording, outliers explained.
- [ ] Text: glyph onsets and 50% times within 1 frame for measured glyphs; reflow curve mean error ≤ 3% of travel (normalised if fonts differ).
- [ ] A side-by-side frame strip of every text and reveal phase reviewed after the last change.
- [ ] Report lists residual differences with causes; nothing described as matching that was not measured.
