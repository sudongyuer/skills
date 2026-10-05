#!/usr/bin/env python3
"""Each measuring script must recover known parameters from synthetic frames.

A measuring tool that is wrong produces confident, wrong diffs, so these tests
pin the instruments themselves: exact element bounds, a known spring, a known
blur/scale/opacity on a glyph, and a known sub-pixel shift.
"""
from __future__ import annotations

import os
import sys
import tempfile
import unittest

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import compare_curves  # noqa: E402
import fit_spring  # noqa: E402
import frame_strip  # noqa: E402
import glyph_fit  # noqa: E402
import measure_bounds  # noqa: E402
import track_template  # noqa: E402

BG = (244, 240, 235)


def glyph_image(size=(120, 120)):
    img = np.full(size, 250, np.uint8)
    cv2.putText(img, 'R', (28, 92), cv2.FONT_HERSHEY_SIMPLEX, 2.6, 20, 6, cv2.LINE_AA)
    return img


class MeasureBounds(unittest.TestCase):
    def test_finds_rect_edges(self):
        img = np.zeros((300, 200, 3), np.uint8) + np.array(BG, np.uint8)
        img[50:181, 8:190] = (252, 251, 249)
        self.assertEqual(measure_bounds.measure(img, BG, col=100, y0=10), (50, 181, 190))

    def test_colour_within_tolerance_reads_as_background(self):
        # the pitfall: a chip coloured within tol of the page ends the element early
        img = np.zeros((300, 200, 3), np.uint8) + np.array(BG, np.uint8)
        img[50:181, 8:190] = (252, 251, 249)
        img[90:120, 90:110] = (241, 237, 232)
        top, bottom, _ = measure_bounds.measure(img, BG, col=100, y0=10)
        self.assertEqual((top, bottom), (50, 90))
        self.assertEqual(measure_bounds.measure(img, BG, col=60, y0=10)[:2], (50, 181))


class FitSpring(unittest.TestCase):
    def test_recovers_response_and_damping(self):
        t = np.arange(0, 1.2, 1 / 60)
        w = 2 * np.pi / 0.42
        y = 100 + 50 * fit_spring.spring_step(t, 0.2, w, 1.0, 0.0)
        r = fit_spring.fit_segment(t, y, 0.1, 1.1)
        self.assertAlmostEqual(r['start'], 0.2, delta=0.02)
        self.assertAlmostEqual(r['response'], 0.42, delta=0.04)
        self.assertAlmostEqual(r['damping'], 1.0, delta=0.12)
        self.assertLess(r['rms'], 0.5)

    def test_overdamped_is_identifiable(self):
        t = np.arange(0, 1.5, 1 / 60)
        y = fit_spring.spring_step(t, 0.1, 2 * np.pi / 0.3, 1.4, 0.0)
        r = fit_spring.fit_segment(t, y, 0.0, 1.4)
        self.assertAlmostEqual(r['damping'], 1.4, delta=0.15)

    def test_underdamped_overshoots(self):
        t = np.arange(0, 1.5, 1 / 60)
        y = fit_spring.spring_step(t, 0.0, 2 * np.pi / 0.5, 0.5, 0.0)
        self.assertGreater(y.max(), 1.1)

    def test_value_expression(self):
        cols = {'top': np.array([1.0, 2.0]), 'bottom': np.array([5.0, 9.0])}
        np.testing.assert_array_equal(fit_spring.value(cols, 'bottom-top'), [4.0, 7.0])


class CompareCurves(unittest.TestCase):
    def test_summary(self):
        d = compare_curves.errors(np.array([0, 10, 20, 30.0]), np.array([0, 12, 20, 29.0]))
        s = compare_curves.summary(d)
        self.assertEqual(s['max'], 2.0)
        self.assertAlmostEqual(s['mean'], 0.75)

    def test_normalize_removes_scale(self):
        d = compare_curves.errors(np.array([0, 5, 10.0]), np.array([0, 10, 20.0]), normalize=True)
        np.testing.assert_allclose(d, 0)


class GlyphFit(unittest.TestCase):
    def test_recovers_blur_scale_alpha(self):
        F = glyph_fit.ink(glyph_image(), 250.0)
        cf = glyph_fit.centroid(F)
        target = 0.5 * glyph_fit.render(F, cf, 3.0, 0.7, cf[0] + 6, cf[1], F.shape)
        r = glyph_fit.fit_frame(target, F, cf)
        self.assertAlmostEqual(r['sigma'], 3.0, delta=0.6)
        self.assertAlmostEqual(r['scale'], 0.7, delta=0.06)
        self.assertAlmostEqual(r['alpha'], 0.5, delta=0.08)
        self.assertAlmostEqual(r['dy'], 6.0, delta=0.5)
        self.assertGreater(r['fit'], 0.95)

    def test_analyse_marks_settled_glyph(self):
        g = glyph_image()
        res = glyph_fit.analyse([g, g], box=(20, 20, 100, 100), cells=[(20, 100)])
        self.assertAlmostEqual(res[0][-1]['ink'], 1.0, places=5)
        self.assertEqual(res[0][-1]['scale'], 1.0)


class TrackTemplate(unittest.TestCase):
    def test_subpixel_shift(self):
        rng = np.random.default_rng(1)
        base = cv2.GaussianBlur((rng.random((60, 400)) * 255).astype(np.float32), (0, 0), 2)
        tmpl = base[10:50, 100:200]
        moved = cv2.warpAffine(base, np.float32([[1, 0, 5.5], [0, 1, 0]]), (400, 60))
        x, y, score = track_template.locate(moved, tmpl)
        self.assertAlmostEqual(x, 105.5, delta=0.3)
        self.assertEqual(y, 10)
        self.assertGreater(score, 0.95)


class FrameStrip(unittest.TestCase):
    def test_strip_size(self):
        with tempfile.TemporaryDirectory() as d:
            files = []
            for i in range(3):
                f = os.path.join(d, f'{i:04d}.png')
                Image.new('RGB', (50, 40), 'white').save(f)
                files.append(f)
            out = frame_strip.strip(files, files, (0, 0, 50, 20), (0, 0, 40, 20), [0, 2], 60)
            self.assertEqual(out.size, (2 * 50 + 10, 2 * 20))


if __name__ == '__main__':
    unittest.main()
