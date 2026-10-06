#!/usr/bin/env python3
"""Stack matching crops of reference and replica frames side by side, one row per frame.

The visual check that numbers cannot replace: use it to find *what* differs
(a raw value shown before the formatted one, a wipe instead of a scale), then
measure it.

--frames start:end:step selects frame indices (file order). Each side takes
its own crop box so layouts that differ by a few points still line up.
"""
from __future__ import annotations

import argparse
import glob
import os
import sys

from PIL import Image, ImageDraw


def label(i: int, first_frame: int, fps: float) -> str:
    return f'{(first_frame + i) / fps:.3f}s'


def strip(a_files, b_files, a_box, b_box, indices, fps, first_frame=0):
    w = max(a_box[2] - a_box[0], b_box[2] - b_box[0])
    h = max(a_box[3] - a_box[1], b_box[3] - b_box[1])
    out = Image.new('RGB', (2 * w + 10, h * len(indices)), 'black')
    draw = ImageDraw.Draw(out)
    for k, i in enumerate(indices):
        out.paste(Image.open(a_files[i]).convert('RGB').crop(a_box), (0, k * h))
        out.paste(Image.open(b_files[i]).convert('RGB').crop(b_box), (w + 10, k * h))
        draw.text((2 * w + 10 - 70, k * h + 4), label(i, first_frame, fps), fill=(200, 0, 0))
    return out


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--a', required=True, help='reference frame directory')
    p.add_argument('--b', required=True, help='replica frame directory')
    p.add_argument('--a-box', required=True)
    p.add_argument('--b-box', required=True)
    p.add_argument('--frames', required=True, help='start:end:step (file indices)')
    p.add_argument('--fps', type=float, required=True)
    p.add_argument('--first-frame', type=int, default=0, help='frame number of the first file (for timestamps)')
    p.add_argument('--out', required=True)
    a = p.parse_args(argv)
    af = sorted(glob.glob(os.path.join(a.a, '*.png')))
    bf = sorted(glob.glob(os.path.join(a.b, '*.png')))
    s, e, st = (int(v) for v in a.frames.split(':'))
    idx = [i for i in range(s, e, st) if i < len(af) and i < len(bf)]
    if not idx:
        print('error: no frames in range for both directories', file=sys.stderr)
        return 1
    box = lambda v: tuple(int(x) for x in v.split(','))
    strip(af, bf, box(a.a_box), box(a.b_box), idx, a.fps, a.first_frame).save(a.out)
    print(a.out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
