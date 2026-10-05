#!/usr/bin/env python3
"""Measure an element's top, bottom and right edge in every frame of a directory.

The element is found against a flat page background: starting at --y0 the scan
walks down one column (--col) to the first non-background pixel (top), keeps
going until --run consecutive background pixels (bottom), then walks one row
(top + --row-offset) to the right edge.

Output CSV header: t,top,bottom,right   (t in seconds, from --fps)

Choose --col inside the element's flat interior: not inside a rounded corner,
not across an icon or chip whose colour is within --tol of the background.
"""
from __future__ import annotations

import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image


def is_bg(pixels: np.ndarray, bg: np.ndarray, tol: int) -> np.ndarray:
    return np.abs(pixels.astype(int) - bg).max(axis=-1) <= tol


def measure(img: np.ndarray, bg, col: int, y0: int, tol: int = 3, run: int = 12, row_offset: int = 15, x_start: int | None = None):
    """Return (top, bottom_exclusive, right_exclusive) or None when no element is found below y0."""
    bg = np.asarray(bg)
    column = is_bg(img[:, col], bg, tol)
    top = next((y for y in range(y0, img.shape[0]) if not column[y]), None)
    if top is None:
        return None
    y, streak = top, 0
    while y < img.shape[0]:
        streak = streak + 1 if column[y] else 0
        if streak >= run:
            break
        y += 1
    bottom = y - streak + 1
    ry = min(top + row_offset, img.shape[0] - 1)
    row = is_bg(img[ry], bg, tol)
    w = img.shape[1]
    right = next((x for x in range(col if x_start is None else x_start, w) if row[x] and row[min(x + 4, w - 1)]), w)
    return top, bottom, right


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('frames', help='directory of PNG frames, sorted by name')
    p.add_argument('--fps', type=float, required=True)
    p.add_argument('--bg', required=True, help='background colour r,g,b')
    p.add_argument('--col', type=int, required=True, help='x of the scan column')
    p.add_argument('--y0', type=int, default=0, help='start scanning below this y')
    p.add_argument('--x-start', type=int, default=None, help='start of the right-edge scan (default: --col)')
    p.add_argument('--tol', type=int, default=3)
    p.add_argument('--run', type=int, default=12, help='background pixels that end the element')
    p.add_argument('--row-offset', type=int, default=15)
    a = p.parse_args(argv)
    bg = [int(v) for v in a.bg.split(',')]
    files = sorted(glob.glob(os.path.join(a.frames, '*.png')))
    if not files:
        print(f'error: no PNG frames in {a.frames}', file=sys.stderr)
        return 1
    print('t,top,bottom,right')
    for i, f in enumerate(files):
        m = measure(np.asarray(Image.open(f).convert('RGB')), bg, a.col, a.y0, a.tol, a.run, a.row_offset, a.x_start)
        if m:
            print(f'{i / a.fps:.4f},{m[0]},{m[1]},{m[2]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
