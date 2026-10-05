---
name: catch-single-frame-flicker-on-iphone
description: >
  Capture a USB-connected physical iPhone's screen at up to 120fps from a Mac,
  find frames that flash for a single frame (an overlay or old value briefly
  re-applied, ghost rows, a dim/bright blink), prove the cause with an A/B
  build, and prove the fix by counting glitch frames before and after over
  many repetitions. Use when a user reports a flash, flicker, blink or ghosting
  that is "only visible frame by frame" on a real device ("闪一下", "闪烁",
  "残影", "逐帧分析", "一闪而过", "关闭时会闪") and ordinary screenshots or
  agent-device recordings (about 10fps) cannot see it. Not for the Simulator
  (use ios-ui-verify), for measuring stutter or hangs (use
  measure-iphone-interaction-hangs), or for judging how motion should feel
  (use emil-design-eng / review-animations).
---

# catch-single-frame-flicker-on-iphone

Outcome: a glitch that lasts one frame is located (frame index and timestamp),
shown in a frame strip, tied to a cause by an A/B comparison, and shown to be
gone after the fix by a glitch count of zero over a sample large enough to have
caught it before.

Prerequisites: macOS with Xcode command line tools and ffmpeg; the iPhone
connected by cable, unlocked and trusted; a way to drive the gesture
repeatedly (agent-device, XCUITest, or the user's hands).

Out of scope: Simulator recordings, Android, jank measured in milliseconds,
and visual design judgement.

## Hard rules

1. Never conclude "fixed" or "not reproducible" from one recording. Use the
   same scripted gesture sequence for before and after, with at least as many
   repetitions as it took to see the glitch the first time (often 30–60).
2. Every claimed glitch is opened and looked at as a frame strip. The detector
   finds candidates; your eyes confirm them.
3. Change one variable per A/B build (a flag, a patch, a component). Name the
   variable in the result.
4. Do not tap through iOS system prompts (headphone/accessory questions,
   passcode for UI automation) on the user's device; ask the user.

## Workflow

### Phase 1: Capture

1. Compile the recorder once:
   `swiftc -O scripts/screencap.swift -o /tmp/screencap`
2. Start the recording, wait for `RECORDING` on stdout, then drive the gesture:
   `/tmp/screencap out.mov <seconds> "<device name substring>" > cap.log &`
   (poll `cap.log` for `RECORDING` before sending the first gesture; it ends
   with `done ok`).
3. Drive the exact user gesture (swipe-to-close is not tap-to-close), in a
   content-rich screen, many times in one recording. Leave ~1.5s between steps
   so each transition settles.

**Completion criterion:** a `.mov` whose frame count shows real motion
(`ffprobe -count_frames`), and a contact sheet
(`ffmpeg -i out.mov -vf "fps=2,scale=90:-2,tile=16x5" -frames:v 1 sheet.png`)
that shows every gesture actually happened.

### Phase 2: Detect and confirm

1. `python3 scripts/find-glitch-frames.py out.mov` lists frames that differ
   from both neighbours while the neighbours match each other. Lower
   `--min-diff` (default 0.8) for faint flashes; adjust `--crop-*` for UI that
   lives in the status-bar band.
2. For each hit, render a strip of the frames around it and look at it:
   `ffmpeg -i out.mov -fps_mode passthrough -vf "select=between(n\,920\,927),scale=200:-2,tile=8x1" -frames:v 1 strip.png`
3. Recordings are variable frame rate: a still screen produces almost no
   frames, so a transition is only a handful of frames. Read timestamps from
   `ffprobe -show_entries frame=pts_time`, not from frame index × 1/120.

**Completion criterion:** each candidate is either a confirmed glitch (what is
on the frame, how long, at which point of the gesture) or dismissed with a
reason.

### Phase 3: Attribute the cause

1. Form one hypothesis about what re-applies the stale state (for example a
   native-driven animated value being overwritten by a later React commit, or
   rows mounting at one offset before layout).
2. Build an A/B pair that differs only in that variable and run the identical
   capture script on both.
3. Read the library source behind the hypothesis when possible; an A/B result
   plus the code path is a cause, an A/B result alone is a correlation.

**Completion criterion:** a sentence of the form "with X the glitch appears N
times in M gestures; without X, 0 in M; X does Y (file:line)".

### Phase 4: Prove the fix

Run the same script on the fixed build with a sample at least as large as the
one that reproduced the glitch. Report glitch frames before and after, the
number of gestures, and the device and build.

## Pitfalls

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `NO_DEVICE` | Device list not populated yet, or cable/trust missing | The recorder already spins the run loop for 15s; check the cable, unlock, and "Trust This Computer" |
| `done Cannot Record` | Recording started right after `startRunning` | Keep the 1s wait in the recorder |
| Gestures did nothing in the recording | An iOS prompt ("Are you connecting headphones?") covers the screen on first capture | Ask the user to answer it, then re-record |
| Glitch seen once, never again | Intermittent race; sample too small, or wrong gesture | Use the user's exact gesture, a content-rich screen, and 30–60 repetitions |
| agent-device / XCTest video shows nothing | Capped near 10fps | Use this recorder |
| Many "glitches" during scrolling | Threshold too low for moving content | Raise `--min-diff` or crop to the region under test |

## Verification

- A frame strip of the glitch before the fix, with frame index and time.
- The A/B result naming the single variable that toggles it.
- Glitch count before vs after on the same script and sample size, with
  device model, iOS version and build identifiers.
