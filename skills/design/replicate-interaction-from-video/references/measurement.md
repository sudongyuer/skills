# Measuring motion

Load this at step 3 (measure the reference) and whenever a diff looks wrong.

## What to measure, with which script

| Motion | Metric | Script |
| ------ | ------ | ------ |
| A container grows, shrinks, expands sideways | top / bottom / right edge per frame | `measure_bounds.py` |
| Any of the above settles | spring response, damping, initial velocity, 10–90% rise | `fit_spring.py` |
| Text streams in | per-glyph opacity, blur σ, scale, dy, onset/50%/95% times | `glyph_fit.py --summary` |
| Something slides because layout changed (reflow) | sub-pixel x of an unchanging word or icon | `track_template.py` |
| Reference vs replica, same metric | median / p90 / p95 / max error, frames over tolerance, plot | `compare_curves.py` |
| Anything you cannot name yet | crops side by side, one row per frame | `frame_strip.py` |
| Small coloured items appear (checks, badges, buttons) | count of pixels in a colour range inside a fixed strip | a 10-line numpy loop |

Measure the reference first, then the replica **with the same script, the same
frame rate and the same pixel scale**. Only then compare.

### Bounds

```bash
python3 scripts/measure_bounds.py ref/pt --fps 60 --bg 245,240,232 --col 200 --y0 176 > ref.csv
python3 scripts/measure_bounds.py rep/pt --fps 60 --bg 244,240,235 --col 200 --y0 170 > rep.csv
python3 scripts/compare_curves.py ref.csv rep.csv --value "bottom-top" --tol 8 --plot height.png
python3 scripts/fit_spring.py ref.csv --value "bottom-top" row1:0.95:1.6 map:4.5:5.15
```

For a width change, the scan column must be inside the element on **every**
frame, including the first, narrowest one (`--col 40` here, not 200; a column
outside the element on frame 0 gives a meaningless fit):

```bash
python3 scripts/measure_bounds.py ref/pt --fps 60 --bg 245,240,232 --col 40 --y0 176 > ref-w.csv
python3 scripts/fit_spring.py ref-w.csv --value right width:0:0.65
```

Sample the background colour from the frame (`python3 -c "from PIL import Image; print(Image.open('ref/pt/0300.png').getpixel((5,150)))"`).
When fits of similar segments scatter (response varying 2x between rows),
the segments are not clean steps (content kept arriving); match the 10–90%
rise time and start time instead of the individual parameters.

Compare steady states at a few checkpoints first (constant offset ⇒ a fixed
layout dimension is wrong; growing offset ⇒ a per-row dimension), then the
transitions.

### Glyphs

```bash
python3 scripts/glyph_fit.py ref/x3 --box 206,95,504,150 --split 6 \
  --fps 60 --first-frame 50 --labels 伏見稲荷大社 --summary
```

Find the box from the settled frame (dark-pixel projection). Fixed-advance
scripts (CJK) can use `--split`; proportional text needs `--cells` and is only
reliable for glyphs that do not move; for text that reflows, track a stable
neighbour with `track_template.py` instead.

Read the summary as: onset / 50% / 95% times give stagger and duration; the
first well-fitted frame gives the entry state (scale, dy, σ, alpha); `dyMin`
below zero is overshoot. Rows whose `fit` is under ~0.5 (a glyph larger than
its cell, a neighbour bleeding in) are not evidence.

### Reflow

```bash
python3 scripts/track_template.py ref/x3 --template-frame ref/x3/0200.png \
  --box 434,160,650,206 --band 150,215 --fps 60 --first-frame 75 > ref-slide.csv
python3 scripts/compare_curves.py ref-slide.csv rep-slide.csv --value x --normalize --tol 0.05
```

Use `--normalize` when the replica's font differs: it compares the *shape*
(timing, overshoot) and ignores the travel distance. It refuses a curve whose
first and last values are equal (a replica that never moved would otherwise
read as a perfect match); compare such ranges without `--normalize`.

### Frame rows

`measure_bounds.py` writes a row for every frame, blank where the element was
not found, and `compare_curves.py` requires matching `t` columns, so a replica
whose element appears a few frames late is reported frame by frame ("not
measured on both sides") instead of shifting every later row.

```bash
python3 scripts/frame_strip.py --a ref/x3 --b rep/x3 --a-box 190,92,810,212 --b-box 178,82,798,202 \
  --frames 34:68:2 --fps 60 --first-frame 50 --out strip.png
```

`--first-frame` keeps the strip's timestamps equal to the other scripts' for
sequences that start mid-recording (the 3x crops above start at frame 50).

## Validate the instrument before trusting a diff

Every one of these produced a confident, wrong diff in practice:

| Symptom | Cause | Fix |
| ------- | ------- | --- |
| Replica drifts later and later behind the reference | real-time recording at an irregular rate; or a per-frame `dt` clamp in the page clock | frame-stepped capture; clamp `dt` only for tab-hidden gaps (≥1 s) |
| Replica text and spacing all ~8% off | replica pixel scale derived from the wrong element width (border not counted) | measure the content box; capture with `--ref-width` |
| Bottom edge ~10 px short on one side only | scan column inside a rounded corner | move `--col` into the flat interior |
| Height collapses to a few hundred px for some frames | scan column crosses an icon/chip within `--tol` of the background, or a cross-fade passes through a background-like colour | move `--col`; pick contrasting placeholder colours |
| A +16 px jump when nothing changed | an adjacent element (typing dots) within `--run` px of the edge | match the real gap, or raise `--run` |
| Spring damping comes out anywhere between 1.0 and 1.5 | fit model that ignores ζ when overdamped | `fit_spring.py` models all three regimes; keep its tests green |
| A width fit with 0 ms rise and a huge RMS | scan column outside the element on early frames | choose a column inside the element from frame 0 |
| `--normalize` comparison passes although the replica is broken | normalising a curve with no net change divides by zero | the script now refuses it; compare that range unnormalised |
| Single-frame spikes on both curves at the same moment | the metric, not the motion | ignore; report as measurement artefact |

Before using a metric, run it on one frame where you know the answer and look
at the crop. When a number surprises you, render that frame before changing
the replica.
