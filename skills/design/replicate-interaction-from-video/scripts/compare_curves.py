#!/usr/bin/env python3
"""Compare the same measured value between a reference and a replica, frame by frame.

Both CSVs come from the same measuring script at the same frame rate, scale and
frame range; their t columns must match (rows are paired by frame). Frames
not measured on both sides are listed, not silently dropped. --value is an
expression over the column names.
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


def _normalize(v: np.ndarray, label: str) -> np.ndarray:
    ok = np.flatnonzero(np.isfinite(v))
    if len(ok) < 2:
        raise ValueError(f'{label}: fewer than two measured frames')
    lo, hi = v[ok[0]], v[ok[-1]]
    if abs(hi - lo) < 1e-9:
        raise ValueError(f'{label}: first and last values are equal ({lo:g}); --normalize needs a net change. '
                         'Compare without --normalize, or pick a range where the value moves.')
    return (v - lo) / (hi - lo)


def errors(ref: np.ndarray, rep: np.ndarray, normalize: bool = False) -> np.ndarray:
    """replica - reference per frame; NaN where either side was not measured."""
    if len(ref) != len(rep):
        raise ValueError(f'frame counts differ: reference {len(ref)}, replica {len(rep)}')
    ref, rep = ref.astype(float), rep.astype(float)
    if normalize:
        ref, rep = _normalize(ref, 'reference'), _normalize(rep, 'replica')
    return rep - ref


def check_times(ta: np.ndarray, tb: np.ndarray) -> None:
    if len(ta) != len(tb) or not np.allclose(ta, tb, atol=1e-3):
        raise ValueError('t columns differ: both CSVs must come from the same fps and frame range')


def summary(diff: np.ndarray) -> dict:
    e = np.abs(diff[np.isfinite(diff)])
    if len(e) == 0:
        raise ValueError('no frame was measured on both sides')
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
    try:
        check_times(A['t'], B['t'])
        d = errors(ra, rb, a.normalize)
        s = summary(d)
    except ValueError as e:
        print(f'error: {e}', file=sys.stderr)
        return 2
    print(' '.join(f'{k}={v:.3f}' for k, v in s.items()))
    t = A['t']
    missing = [float(t[i]) for i in range(len(d)) if not np.isfinite(d[i])]
    if missing:
        print(f'{len(missing)} frame(s) not measured on both sides: ' + ' '.join(f'{ti:.3f}s' for ti in missing[:40]))
    over = [(float(t[i]), float(d[i])) for i in range(len(d)) if np.isfinite(d[i]) and abs(d[i]) > a.tol]
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
