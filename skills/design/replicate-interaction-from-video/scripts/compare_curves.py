#!/usr/bin/env python3
"""Compare the same measured value between a reference and a replica, frame by frame.

Both CSVs come from the same measuring script at the same frame rate and scale
(rows are paired by index). --value is an expression over the column names.
--normalize maps each curve to its own first->last value (0..1) first, for
quantities whose absolute size legitimately differs (for example text widths
under a different font).

Prints median / p90 / p95 / max absolute error and every frame over --tol.
--plot writes a PNG of both curves and their difference (needs matplotlib).
"""
from __future__ import annotations

import argparse
import sys

import numpy as np

from fit_spring import load, value


def errors(ref: np.ndarray, rep: np.ndarray, normalize: bool = False) -> np.ndarray:
    n = min(len(ref), len(rep))
    ref, rep = ref[:n].astype(float), rep[:n].astype(float)
    if normalize:
        ref = (ref - ref[0]) / (ref[-1] - ref[0])
        rep = (rep - rep[0]) / (rep[-1] - rep[0])
    return rep - ref


def summary(diff: np.ndarray) -> dict:
    e = np.abs(diff)
    q = lambda p: float(np.sort(e)[min(len(e) - 1, int(len(e) * p))])
    return dict(median=float(np.median(e)), p90=q(0.9), p95=q(0.95), max=float(e.max()), mean=float(e.mean()))


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('reference')
    p.add_argument('replica')
    p.add_argument('--value', required=True)
    p.add_argument('--normalize', action='store_true')
    p.add_argument('--tol', type=float, default=8)
    p.add_argument('--plot')
    a = p.parse_args(argv)
    A, B = load(a.reference), load(a.replica)
    ra, rb = value(A, a.value), value(B, a.value)
    d = errors(ra, rb, a.normalize)
    s = summary(d)
    print(' '.join(f'{k}={v:.3f}' for k, v in s.items()))
    t = A['t'][:len(d)]
    over = [(float(t[i]), float(d[i])) for i in range(len(d)) if abs(d[i]) > a.tol]
    print(f'{len(over)} frame(s) over tol={a.tol}: ' + ' '.join(f'{ti:.3f}s:{di:+.1f}' for ti, di in over[:40]))
    if a.plot:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(2, 1, figsize=(11, 6), gridspec_kw={'height_ratios': [3, 1]}, sharex=True)
        ax[0].plot(t, ra[:len(d)], label='reference', lw=2)
        ax[0].plot(t, rb[:len(d)], label='replica', lw=1.2, ls='--')
        ax[0].legend(); ax[0].grid(alpha=.3); ax[0].set_ylabel(a.value)
        ax[1].plot(t, d); ax[1].axhline(0, color='#aaa', lw=.8); ax[1].grid(alpha=.3)
        ax[1].set_ylabel('replica - reference'); ax[1].set_xlabel('time (s)')
        plt.tight_layout(); plt.savefig(a.plot, dpi=110)
    return 0


if __name__ == '__main__':
    sys.exit(main())
