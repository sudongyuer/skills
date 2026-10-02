#!/usr/bin/env bash
# Link every skill in this repository into the agent skill directories.
#   ./install.sh [--dry-run] [--force]
# Targets default to ~/.claude/skills and ~/.agents/skills; override with
# SKILLS_TARGETS="dir1:dir2".
set -euo pipefail

DRY_RUN=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --force) FORCE=1 ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
IFS=':' read -r -a TARGETS <<< "${SKILLS_TARGETS:-$HOME/.claude/skills:$HOME/.agents/skills}"

run() {
  if [ "$DRY_RUN" -eq 1 ]; then echo "+ $*"; else "$@"; fi
}

linked=0
skipped=0
for target in "${TARGETS[@]}"; do
  run mkdir -p "$target"

  for link in "$target"/*; do
    [ -L "$link" ] || continue
    dest="$(readlink "$link")"
    case "$dest" in
      "$REPO"/skills/*) [ -e "$dest" ] || { run rm "$link"; echo "removed stale $link"; } ;;
    esac
  done

  for dir in "$REPO"/skills/*/*/; do
    dir="${dir%/}"
    [ -f "$dir/SKILL.md" ] || continue
    name="$(basename "$dir")"
    link="$target/$name"
    if [ -L "$link" ] && [ "$(readlink "$link")" = "$dir" ]; then
      continue
    fi
    if [ -e "$link" ] || [ -L "$link" ]; then
      if [ "$FORCE" -eq 1 ]; then
        run rm -rf "$link"
      else
        echo "skip $link (exists; use --force to replace)" >&2
        skipped=$((skipped + 1))
        continue
      fi
    fi
    run ln -s "$dir" "$link"
    linked=$((linked + 1))
  done
done

echo "linked $linked, skipped $skipped, targets: ${TARGETS[*]}"
