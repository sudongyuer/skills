#!/usr/bin/env bash
# Run the measuring scripts' tests. Installs numpy/scipy/opencv/pillow into a
# throwaway virtualenv when the current python3 lacks them (CI runners do).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY=python3
if ! "$PY" -c 'import numpy, scipy, cv2, PIL' 2>/dev/null; then
  VENV="$(mktemp -d "${TMPDIR:-/tmp}/motion-venv.XXXXXX")"
  trap 'rm -rf "$VENV"' EXIT
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet numpy scipy opencv-python-headless pillow
  PY="$VENV/bin/python"
fi
node --check "$HERE/step_capture.mjs"
cd "$HERE" && "$PY" -m unittest -v test_scripts
