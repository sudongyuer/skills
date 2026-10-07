#!/usr/bin/env bash
# Usage: timestamped-strip.sh <video> <out.png> <width> <frame-index>...
# Extracts the given decoded frames, labels each with its presentation time (read
# from the stream, since simulator recordings are variable frame rate), and lays
# them out left to right.
set -euo pipefail
[ $# -ge 4 ] || { echo "usage: $0 <video> <out.png> <width> <frame-index>..." >&2; exit 2; }
video=$1 out=$2 width=$3; shift 3
here=$(cd "$(dirname "$0")" && pwd)
bin="${TMPDIR:-/tmp}/acceptance-label-strip"
[ "$bin" -nt "$here/label-strip.swift" ] || swiftc -O "$here/label-strip.swift" -o "$bin"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
times=$(ffprobe -v error -select_streams v -show_entries frame=pts_time -of csv=p=0 "$video" | tr -d ',')
args=()
for n in "$@"; do
  t=$(printf '%s\n' "$times" | sed -n "$((n + 1))p")
  [ -n "$t" ] || { echo "frame $n is past the end of $video" >&2; exit 1; }
  ffmpeg -v error -y -i "$video" -vf "select=eq(n\,$n),scale=$width:-2" -frames:v 1 -fps_mode passthrough "$work/$n.png"
  args+=("$work/$n.png|$(printf '%.2fs' "$t")")
done
"$bin" "$out" "${args[@]}"
echo "$out"
