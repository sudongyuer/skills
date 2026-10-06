#!/usr/bin/env python3
"""Find single-frame glitches in a screen recording.

A glitch frame differs strongly from both neighbours while the neighbours are
close to each other (A -> B -> A). That is the signature of a one-frame flash
or a stale value briefly re-applied; ordinary motion changes monotonically and
does not match.

Usage: find-glitch-frames.py <video> [--min-diff 0.8] [--crop-top 0.08] [--crop-bottom 0.92]
Requires ffmpeg and ffprobe on PATH. Prints one line per glitch and a summary.
"""
import argparse
import subprocess
import sys

WIDTH = 118


def frames(video):
    pts = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
         "frame=pts_time", "-of", "csv=p=0", video],
        capture_output=True, text=True, check=True).stdout
    times = [float(x.strip(", ")) for x in pts.split() if x.strip(", ")]
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", video, "-fps_mode", "passthrough",
         "-vf", f"scale={WIDTH}:-2,format=gray", "-f", "rawvideo", "-"],
        capture_output=True, check=True).stdout
    height = len(raw) // len(times) // WIDTH
    size = WIDTH * height
    return times, [raw[i * size:(i + 1) * size] for i in range(len(times))], height


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--min-diff", type=float, default=0.8,
                    help="mean abs gray diff a glitch must exceed on both sides")
    ap.add_argument("--crop-top", type=float, default=0.08,
                    help="ignore the status bar (fraction of height)")
    ap.add_argument("--crop-bottom", type=float, default=0.92,
                    help="ignore the home indicator (fraction of height)")
    a = ap.parse_args()

    times, imgs, height = frames(a.video)
    lo, hi = int(height * a.crop_top) * WIDTH, int(height * a.crop_bottom) * WIDTH
    idx = range(lo, hi, 3)

    def diff(x, y):
        return sum(abs(x[i] - y[i]) for i in idx) / len(idx)

    hits = 0
    for i in range(1, len(imgs) - 1):
        before, after = diff(imgs[i - 1], imgs[i]), diff(imgs[i], imgs[i + 1])
        across = diff(imgs[i - 1], imgs[i + 1])
        if before > a.min_diff and after > a.min_diff and across < 0.5 * min(before, after):
            hits += 1
            print(f"glitch frame={i + 1} t={times[i]:.3f}s "
                  f"prev={before:.1f} next={after:.1f} prev-vs-next={across:.1f}")
    print(f"frames {len(imgs)} glitches {hits}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
