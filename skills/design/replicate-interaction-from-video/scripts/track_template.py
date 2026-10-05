#!/usr/bin/env python3
"""Track one unchanging element (a word, an icon) across frames with normalised cross-correlation.

The template is cut from --template-frame at --box x0,y0,x1,y1 and searched for
inside the horizontal band --band y0,y1 of every frame. x is refined to
sub-pixel precision with a parabola through the correlation peak.

Output CSV header: t,x,y,score   (score < ~0.9 means the element was occluded,
blurred or changed; treat those rows with care)
"""
from __future__ import annotations

import argparse
import glob
import os
import sys

import cv2
import numpy as np


def locate(gray_band: np.ndarray, template: np.ndarray):
    r = cv2.matchTemplate(gray_band.astype(np.float32), template.astype(np.float32), cv2.TM_CCOEFF_NORMED)
    _, score, _, (x, y) = cv2.minMaxLoc(r)
    dx = 0.0
    if 0 < x < r.shape[1] - 1:
        a, b, c = r[y, x - 1], r[y, x], r[y, x + 1]
        den = a - 2 * b + c
        dx = float((a - c) / (2 * den)) if den != 0 else 0.0
    return x + dx, y, float(score)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('frames')
    p.add_argument('--template-frame', required=True)
    p.add_argument('--box', required=True)
    p.add_argument('--band', required=True)
    p.add_argument('--fps', type=float, required=True)
    p.add_argument('--first-frame', type=int, default=0)
    a = p.parse_args(argv)
    x0, y0, x1, y1 = (int(v) for v in a.box.split(','))
    b0, b1 = (int(v) for v in a.band.split(','))
    T = cv2.cvtColor(cv2.imread(a.template_frame), cv2.COLOR_BGR2GRAY)[y0:y1, x0:x1]
    files = sorted(glob.glob(os.path.join(a.frames, '*.png')))
    if not files:
        print(f'error: no PNG frames in {a.frames}', file=sys.stderr)
        return 1
    print('t,x,y,score')
    for i, f in enumerate(files):
        g = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY)[b0:b1]
        x, y, s = locate(g, T)
        print(f'{(a.first_frame + i) / a.fps:.4f},{x:.2f},{y + b0},{s:.3f}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
