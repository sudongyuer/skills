---
name: measure-iphone-interaction-hangs
description: >
  Measure how long the main thread stalls during one interaction (opening a
  drawer, expanding a list group, switching a screen, sending a message) in a
  Release build on a physical iPhone, using Instruments attached to the running
  app, and compare before vs after a fix with the same scripted interaction.
  Use when a user says an interaction "卡", "卡顿", "不跟手", "掉帧", "展开很慢",
  "点了停一下才动" on a real device, or when a performance claim in a PR needs
  device numbers. Not for single-frame visual glitches (use
  catch-single-frame-flicker-on-iphone), for finding which React component
  re-renders (use react-rerender-audit), or for Simulator measurements.
---

# measure-iphone-interaction-hangs

Outcome: per-interaction main-thread hang durations (ms) for a baseline build
and a candidate build, measured with the same driver script on the same device,
plus the count and total over several repetitions.

Prerequisites: Xcode command line tools; the iPhone connected, unlocked,
trusted and in Developer Mode; two Release builds that differ only in the
change under test; a way to drive the interaction without touching the main
thread more than a user would (agent-device taps, a deep link, or a debug
trigger).

Out of scope: Debug builds, JS-only profiling, battery or memory measurement.

## Hard rules

1. Measure Release builds. For apps with over-the-air updates (Expo
   `expo-updates`), disable updates in the build under test (for example
   `EXUpdatesEnabled = NO` in `Expo.plist`) so the embedded bundle you built is
   the one that runs, and restore the setting afterwards.
2. Baseline and candidate use the same device, the same data, the same driver
   script and the same number of repetitions (at least 3 per interaction).
3. Report hangs per interaction, not only totals, and name what the remaining
   cost is if it is still noticeable.

## Workflow

### Phase 1: Prepare

1. Get both device identifiers: the CoreDevice id from
   `xcrun devicectl list devices` and the hardware UDID (`0000xxxx-…`) from
   `xcrun xctrace list devices`.
2. Install the build with `xcrun devicectl device install app --device <id> <App.app>`
   and launch it; confirm the running binary path matches the build you
   installed (`devicectl device info processes`).
3. Bring the app to the exact starting state (screen, list expanded or not).

**Completion criterion:** the intended build is running and parked in the
starting state.

### Phase 2: Record

Run the recorder with the driver as a trailing command:

```bash
bash scripts/record-hangs.sh <coredevice-id> <udid> <ProcessName> before.trace 22 -- \
  ./drive.sh   # e.g. 3 rounds of tap-to-collapse / tap-to-expand, 2s apart
```

The script attaches Animation Hitches to the running process, waits 5s, runs
the driver, then waits for xctrace to finish post-processing. Give the time
limit enough room for the whole driver run.

**Completion criterion:** `xcrun xctrace export --input before.trace --toc`
succeeds.

### Phase 3: Read

```bash
python3 scripts/potential-hangs.py before.trace
```

Map each hang to the interaction that caused it by its start time (driver
steps are evenly spaced). Repeat Phases 1–3 for the candidate build.

**Completion criterion:** a table of per-interaction hang time for both
builds, plus count / total / max.

## Pitfalls

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `hitches` table has no rows although the UI clearly stutters | React Native stalls show up as main-thread busy time, not as late frames | Read `potential-hangs`; the bundled script does |
| Export fails with "Document Missing Template Error" | xctrace was killed (timeout wrapper, Ctrl-C) before finalizing | Let `xctrace record` exit on its own `--time-limit`; allow minutes for the export |
| Empty `pid=` | `devicectl` process lines end with trailing spaces | Match `\.app/<Name> *$`, as the script does |
| Numbers do not move after a JS fix | OTA update replaced the embedded bundle | Disable updates in the build under test and confirm the binary path |
| Numbers vary wildly between runs | First-open mounting, network refetch, or thermal state differ | Wait for idle premount, fix the data, repeat 3+ rounds and compare medians |

## Verification

- Two traces (baseline, candidate) recorded with the same driver and device.
- Per-interaction hang durations and totals for both, with device model,
  OS version and build identifiers.
- When a hang remains, the next likely cost named (for example mounting the
  visible rows) and not hidden behind the improvement.
