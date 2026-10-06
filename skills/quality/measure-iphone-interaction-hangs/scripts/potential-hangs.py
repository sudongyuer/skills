#!/usr/bin/env python3
"""Summarise main-thread Potential Hangs from an Animation Hitches trace.

Usage: potential-hangs.py <trace> [--from S] [--to S]
Prints each hang (start s, duration ms) and count / total / max. The `hitches`
table is often empty for React Native apps; Potential Hangs (main thread busy
past the hang threshold) is the table that captures commit/mount stalls.
"""
import argparse
import subprocess
import xml.etree.ElementTree as ET

XPATH = '/trace-toc/run[@number="1"]/data/table[@schema="potential-hangs"]'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("trace")
    ap.add_argument("--from", dest="lo", type=float, default=0.0)
    ap.add_argument("--to", dest="hi", type=float, default=float("inf"))
    a = ap.parse_args()

    xml = subprocess.run(["xcrun", "xctrace", "export", "--input", a.trace, "--xpath", XPATH],
                         capture_output=True, text=True, check=True).stdout
    root = ET.fromstring(xml)
    by_id = {el.get("id"): el for el in root.iter() if el.get("id")}
    resolve = lambda el: by_id.get(el.get("ref"), el) if el.get("ref") else el
    cols = [c.find("mnemonic").text for c in root.iter("col")]

    hangs = []
    for row in root.iter("row"):
        cells = dict(zip(cols, (resolve(c) for c in row)))
        start = int(cells["start"].text) / 1e9
        dur = int(cells["duration"].text) / 1e6
        if a.lo <= start <= a.hi:
            hangs.append((start, dur))

    for start, dur in hangs:
        print(f"{start:8.3f}s  {dur:6.1f}ms")
    durs = [d for _, d in hangs]
    print(f"count {len(durs)}  total {sum(durs):.1f}ms  max {max(durs, default=0):.1f}ms")


if __name__ == "__main__":
    main()
