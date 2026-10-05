#!/usr/bin/env python3
"""Fit a damped spring to each segment of a measured curve.

Reads a CSV with a header (first column t in seconds). --value is an expression
over the column names, e.g. "bottom-top" for height or "right" for an edge.
Each SEGMENT is name:start:end in seconds and should span one change from rest
to rest.

Prints, per segment: start time, SwiftUI-style response (2*pi/omega) and
dampingFraction, normalised initial velocity v0 (distance-fractions per second),
10-90% rise time, and the fit's RMS error in the curve's units.
"""
from __future__ import annotations

import argparse
import csv
import sys

import numpy as np
from scipy.optimize import least_squares


def load(path: str):
    with open(path, newline='') as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        raise SystemExit(f'error: {path} has no rows')
    return {k: np.array([float(r[k]) for r in rows]) for k in rows[0]}


def value(cols: dict, expr: str) -> np.ndarray:
    return eval(expr, {'__builtins__': {}}, dict(cols))  # expression over column names only


def spring_step(t, t0, w, z, v0):
    """Normalised step response (0 -> 1) of a unit-mass spring released at t0 with initial velocity v0."""
    tt = np.clip(np.asarray(t, dtype=float) - t0, 0, None)
    x0 = -1.0
    if z < 1 - 1e-6:  # underdamped
        wd = w * np.sqrt(1 - z * z)
        x = np.exp(-z * w * tt) * (x0 * np.cos(wd * tt) + (v0 + z * w * x0) / wd * np.sin(wd * tt))
    elif z > 1 + 1e-6:  # overdamped: two real decay rates
        r1, r2 = -w * (z - np.sqrt(z * z - 1)), -w * (z + np.sqrt(z * z - 1))
        c1 = (v0 - r2 * x0) / (r1 - r2)
        x = c1 * np.exp(r1 * tt) + (x0 - c1) * np.exp(r2 * tt)
    else:  # critically damped
        x = np.exp(-w * tt) * (x0 + (v0 + w * x0) * tt)
    return 1 + x


def fit_segment(t, y, a: float, b: float) -> dict:
    m = (t >= a) & (t <= b)
    tt, yy = t[m], y[m]
    y0, y1 = float(np.median(yy[:2])), float(np.median(yy[-5:]))
    if abs(y1 - y0) < 1e-9:
        raise ValueError('segment does not change')
    p = (yy - y0) / (y1 - y0)
    best = None
    for z0 in (0.7, 0.9, 1.0):
        r = least_squares(lambda q: spring_step(tt, *q) - p, [tt[0], 20, z0, 0],
                          bounds=([a - 0.2, 2, 0.3, 0], [b, 80, 1.5, 400]), loss='soft_l1', f_scale=0.05)
        if best is None or r.cost < best.cost:
            best = r
    t0, w, z, v0 = best.x
    i10, i90 = tt[np.argmax(p >= 0.1)], tt[np.argmax(p >= 0.9)]
    return dict(start=float(t0), response=float(2 * np.pi / w), damping=float(z), v0=float(v0),
                rise_ms=float(1000 * (i90 - i10)), rms=float(np.sqrt(np.mean(best.fun ** 2)) * abs(y1 - y0)),
                from_=y0, to=y1)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('csv')
    p.add_argument('--value', required=True, help='expression over CSV columns, e.g. "bottom-top"')
    p.add_argument('segments', nargs='+', metavar='SEGMENT', help='name:start:end (seconds)')
    a = p.parse_args(argv)
    cols = load(a.csv)
    t, y = cols['t'], value(cols, a.value)
    for seg in a.segments:
        name, s0, s1 = seg.split(':')
        r = fit_segment(t, y, float(s0), float(s1))
        print(f"{name:12s} {r['from_']:7.1f}->{r['to']:<7.1f} start={r['start']:.3f}s response={r['response']:.3f}s "
              f"damping={r['damping']:.2f} v0={r['v0']:5.1f}/s rise10-90={r['rise_ms']:4.0f}ms rms={r['rms']:.1f}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
