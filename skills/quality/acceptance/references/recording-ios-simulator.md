# iOS Simulator framebuffer recording

Use this reference only for an iOS Simulator criterion that requires temporal
evidence. Record device pixels directly with `simctl`; this excludes Simulator
window chrome and is stronger evidence than a host-screen crop. Use an explicit
UDID when more than one device is booted.

## Record and finalize

```bash
# Start in a persistent terminal/session and wait until stderr says
# "Recording started" before driving the scenario.
xcrun simctl io "$UDID" recordVideo --codec=h264 $DIR/assets/ios-flow.mp4 \
  2> $DIR/assets/ios-recording.log

# Drive the scenario with AXe or the repository's existing native CLI/UI tests in
# parallel. Stop the recorder with SIGINT (Ctrl-C), then wait for finalization.
```

Do not use SIGKILL: `simctl` must flush in-flight frames and finalize the movie.
An interrupted recorder command may return a non-zero shell status after a
successful SIGINT finalization; judge the artifact with `ffprobe`, not that status
alone.

AXe also exposes `record-video --fps <1-30> --quality <1-100>`, but terminal
wrappers can intercept SIGINT before AXe writes MP4 metadata. Use it only after a
short probe file passes `ffprobe`; otherwise retain AXe for input/Accessibility
and use `simctl` for recording.

## Verify the movie

```bash
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames \
  -of json $DIR/assets/ios-flow.mp4
```

Simulator recordings can be variable-frame-rate. Treat a requested rate as a
target, not a guarantee; use `avg_frame_rate` and `nb_frames` as the observed
values.

## Extract every encoded frame

Use this path for one-frame flashes, flicker, or exact transition continuity:

```bash
FRAME_DIR=$(mktemp -d)
ffmpeg -i $DIR/assets/ios-flow.mp4 -map 0:v:0 -fps_mode passthrough \
  "$FRAME_DIR/frame_%06d.png"
```

Count the generated PNGs and compare the total with `ffprobe`'s `nb_frames`.
Variable timestamps can produce non-monotonic-DTS warnings from the image muxer;
the count check determines whether every decoded frame was retained.

## Sample frames and contact sheets

For ordinary UI review, sample at a declared rate and retain the raw video:

```bash
ffmpeg -i $DIR/assets/ios-flow.mp4 -vf "fps=10" \
  $DIR/assets/review-frame_%06d.png

ffmpeg -i $DIR/assets/ios-flow.mp4 \
  -vf "fps=2,scale=360:-1,tile=4x4:padding=8:margin=8" \
  $DIR/assets/contact_%03d.png
```

Inspect start, action, transient, and settled states. A contact sheet is a review
index, not proof of gesture delivery; pair it with the driver action and fresh
Accessibility/postcondition evidence from
[the iOS Simulator surface](../surfaces/ios-simulator.md).

Tag the direct recording with provenance `cli` and deterministic frame/contact-sheet
transforms with `program`. Cite them using the shared contract in
[evidence.md](./evidence.md).

## Timestamped frame strips for timing claims

An observation that names times ("the list appears at 2.37s, 140ms after the sheet
settles") needs frames that carry those times. Label each frame with its
presentation time from the stream: recordings are variable frame rate, so frame
index × 1/fps is wrong, and an unlabeled strip cannot back the claim.

```bash
# List frame indices with their times, pick the ones around the transition.
ffprobe -v error -select_streams v -show_entries frame=pts_time -of csv=p=0 \
  $DIR/assets/ios-flow.mp4 | tr -d ',' | awk '{print NR-1, $1}'

# Lay them out left to right, each labeled with its time (macOS; compiles once).
<skill-dir>/scripts/timestamped-strip.sh $DIR/assets/ios-flow.mp4 \
  $DIR/assets/flow-frames.png 200 5 9 14 21 32
```

Cover the whole claimed interval, including one frame before the change starts
and one after it settles; a strip that opens on the end state proves nothing about
order. Quote the labeled times in `observation`, and crop to the region that
changes when the full screen makes the change unreadable.

## Measure motion along one scanline

Use this to prove that an element did or did not move (a shake, a jump, a
re-layout) when no image library is installed. Pick a row that crosses the
element's edge against a contrasting background, decode only that row as
grayscale, and print the edge position per frame:

```bash
# Scale to points so coordinates match the accessibility tree (402x874 on an
# iPhone 17 Pro), then keep a single 1-pixel row at y=600.
ffmpeg -v error -ss "$START" -i $DIR/assets/ios-flow.mp4 \
  -vf "fps=30,scale=402:874,crop=402:1:0:600,format=gray" -f rawvideo $DIR/row.raw

python3 - "$DIR/row.raw" "$START" > $DIR/assets/edge-trace.txt <<'PY'
import sys
data, start, width = open(sys.argv[1], 'rb').read(), float(sys.argv[2]), 402
for i in range(len(data) // width):
    row = data[i * width:(i + 1) * width]
    edge = next((x for x in range(2, 80) if row[x] >= 253), None)  # first white-card pixel
    print(f"t={start + i / 30:.2f}s edge={edge}")
PY
```

A stable element prints one constant `edge` after it appears; a shake shows the
edge stepping by its amplitude for a few frames. Attach the trace as `text`
evidence alongside a frame. Tune the row, the scanned range, and the threshold
to the element; confirm on one frame first that the threshold separates the
element from its background.
