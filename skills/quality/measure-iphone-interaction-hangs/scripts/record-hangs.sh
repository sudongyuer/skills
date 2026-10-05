#!/usr/bin/env bash
# Usage: record-hangs.sh <coredevice-id> <udid> <process-name> <out.trace> <seconds> [-- <driver command...>]
# Attaches Instruments "Animation Hitches" to an already running app on a physical
# iPhone, runs the optional driver command while recording, and waits for the
# trace to be finalized.
#   coredevice-id: from `xcrun devicectl list devices` (UUID form)
#   udid:          hardware UDID from `xcrun xctrace list devices` (0000xxxx-...)
set -euo pipefail
DEV=$1; UDID=$2; NAME=$3; OUT=$4; SECS=$5; shift 5
[[ "${1:-}" == "--" ]] && shift

# Process lines end with trailing spaces; anchor on "<name>.app/<binary>".
PID=$(xcrun devicectl device info processes --device "$DEV" 2>/dev/null \
  | grep -E "\.app/${NAME} *$" | awk '{print $1}' | head -1)
[[ -n "$PID" ]] || { echo "process ${NAME} not running on ${DEV}" >&2; exit 1; }
echo "pid=$PID"

rm -rf "$OUT"
LOG="${OUT%.trace}.xctrace.log"
# Export needs post-processing time after the time limit; killing xctrace early
# leaves a trace that fails with "Document Missing Template Error".
xcrun xctrace record --template "Animation Hitches" --device "$UDID" --attach "$PID" \
  --time-limit "${SECS}s" --output "$OUT" --quiet --no-prompt >"$LOG" 2>&1 &
REC=$!
sleep 5
if [[ $# -gt 0 ]]; then "$@"; fi
wait "$REC"
echo "trace=$OUT"
