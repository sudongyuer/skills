#!/usr/bin/env python3
"""Per-glyph animation analysis: opacity, blur, scale and offset of every glyph in every frame.

Each glyph cell is compared with the same cell in a settled frame (the last one
by default). A frame is modelled as

    ink_t ~= alpha * gaussian_blur_sigma( scale_s(ink_final about its centroid) ) shifted to ink_t's centroid

sigma and s are grid-searched, alpha is solved in closed form. dy/dx are the
centroid offsets from the settled glyph (positive dy = below). "fit" is the
fraction of the frame's ink energy the model explains; ignore rows under ~0.5.

Glyph cells: --cells "x0-x1,x0-x1,..." in absolute x, or --split N to cut the
box into N equal cells (works for CJK and other fixed-advance text).
Use frames at 3x the point grid; small text is unmeasurable at 1x.

--summary prints per glyph: onset (ink>5%), 50%, 95%, duration, and the first
well-fitted frame's scale, dy, sigma, alpha, plus the most negative dy after
the glyph is half in (overshoot).
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import sys

import cv2
import numpy as np


def ink(gray: np.ndarray, bg: float) -> np.ndarray:
    return np.clip((bg - gray.astype(np.float32)) / bg, 0, 1)


def centroid(m: np.ndarray):
    s = float(m.sum())
    if s < 1e-3:
        return None
    ys, xs = np.indices(m.shape)
    return float((ys * m).sum() / s), float((xs * m).sum() / s)


def render(final, cf, sigma, s, cy, cx, shape):
    M = np.float32([[s, 0, cx - s * cf[1]], [0, s, cy - s * cf[0]]])
    out = cv2.warpAffine(final, M, (shape[1], shape[0]), flags=cv2.INTER_LINEAR)
    if sigma > 0.05:
        out = cv2.GaussianBlur(out, (0, 0), sigma)
    return out


def fit_frame(I: np.ndarray, F: np.ndarray, cf, sigmas=np.arange(0, 9.01, 0.5), scales=np.arange(0.4, 1.151, 0.05)):
    cc = centroid(I)
    best = None
    for sigma in sigmas:
        for s in scales:
            R = render(F, cf, sigma, s, cc[0], cc[1], I.shape)
            rr = float((R * R).sum())
            if rr < 1e-6:
                continue
            a = float((R * I).sum() / rr)
            err = float(((a * R - I) ** 2).sum())
            if best is None or err < best[0]:
                best = (err, float(sigma), float(s), a)
    err, sigma, s, a = best
    return dict(alpha=round(a, 3), sigma=sigma, scale=round(s, 2), dy=round(cc[0] - cf[0], 1), dx=round(cc[1] - cf[1], 1),
                fit=round(1 - err / max(float((I * I).sum()), 1e-6), 3))


def analyse(grays, box, cells, final_idx=-1, pad=14):
    x0, y0, x1, y1 = box
    crops = [g[y0 - pad:y1 + pad, x0 - pad:x1 + pad] for g in grays]
    bg = float(np.median(crops[final_idx][:4, :]))
    out = []
    for gx0, gx1 in cells:
        sl = slice(gx0 - x0, gx1 - x0 + 2 * pad)
        F = ink(crops[final_idx][:, sl], bg)
        cf, total = centroid(F), float(F.sum())
        rows = []
        for t, c in enumerate(crops):
            I = ink(c[:, sl], bg)
            frac = float(I.sum()) / total
            if frac < 0.02 or centroid(I) is None:
                rows.append(dict(t=t, ink=frac, alpha=0.0, sigma=None, scale=None, dy=None, dx=None, fit=0.0))
            else:
                rows.append(dict(t=t, ink=frac, **fit_frame(I, F, cf)))
        out.append(rows)
    return out


def summarize(result, fps: float, first_frame: int, labels):
    lines = [f"{'glyph':6s} {'onset':>6s} {'50%':>6s} {'95%':>6s} {'dur':>5s} {'s0':>5s} {'dy0':>6s} {'sig0':>5s} {'a0':>5s} {'dyMin':>6s}"]
    T = lambda r: (first_frame + r['t']) / fps if r else float('nan')
    for gi, rows in enumerate(result):
        on = next((r for r in rows if r['ink'] > 0.05), None)
        half = next((r for r in rows if r['ink'] > 0.5), None)
        done = next((r for r in rows if r['ink'] > 0.95), None)
        good = [r for r in rows if r['fit'] > 0.5]
        first = next((r for r in good if on and r['t'] >= on['t']), None)
        after = [r['dy'] for r in good if half and r['t'] >= half['t']]
        label = labels[gi] if gi < len(labels) else str(gi)
        lines.append(f"{label:6s} {T(on):6.3f} {T(half):6.3f} {T(done):6.3f} {1000 * (T(done) - T(on)):5.0f} "
                     f"{(first or {}).get('scale') or 0:5.2f} {(first or {}).get('dy') or 0:6.1f} "
                     f"{(first or {}).get('sigma') or 0:5.1f} {(first or {}).get('alpha') or 0:5.2f} {min(after) if after else 0:6.1f}")
    return '\n'.join(lines)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('frames')
    p.add_argument('--box', required=True, help='x0,y0,x1,y1 of the text line in the settled frame')
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument('--cells', help='x0-x1,x0-x1,... glyph columns')
    g.add_argument('--split', type=int, help='split the box into N equal cells')
    p.add_argument('--fps', type=float, required=True)
    p.add_argument('--first-frame', type=int, default=0, help='frame number of the first file (for timestamps)')
    p.add_argument('--labels', default='', help='one character per cell, for the summary')
    p.add_argument('--json', help='write per-frame rows here')
    p.add_argument('--summary', action='store_true')
    a = p.parse_args(argv)
    box = [int(v) for v in a.box.split(',')]
    if a.cells:
        cells = [tuple(int(v) for v in c.split('-')) for c in a.cells.split(',')]
    else:
        w = (box[2] - box[0]) / a.split
        cells = [(round(box[0] + i * w), round(box[0] + (i + 1) * w)) for i in range(a.split)]
    files = sorted(glob.glob(os.path.join(a.frames, '*.png')))
    if not files:
        print(f'error: no PNG frames in {a.frames}', file=sys.stderr)
        return 1
    grays = [cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY) for f in files]
    result = analyse(grays, box, cells)
    if a.json:
        with open(a.json, 'w') as fh:
            json.dump(result, fh, default=float)
    if a.summary or not a.json:
        print(summarize(result, a.fps, a.first_frame, a.labels))
    return 0


if __name__ == '__main__':
    sys.exit(main())
