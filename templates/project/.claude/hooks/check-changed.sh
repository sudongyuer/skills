#!/usr/bin/env bash
set -uo pipefail

CHECKS=(
)

input="$(cat)"
case "$input" in
  *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;;
esac

[ "${#CHECKS[@]}" -eq 0 ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

files=()
while IFS= read -r f; do
  [ -f "$f" ] && files+=("$f")
done < <({ git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard; } | sort -u)
[ "${#files[@]}" -eq 0 ] && exit 0

matching() {
  local globs="$1" f g
  IFS=',' read -ra pats <<<"$globs"
  for f in "${files[@]}"; do
    for g in "${pats[@]}"; do
      if [[ "$f" == $g ]]; then printf '%s\n' "$f"; break; fi
    done
  done
}

failed=0
for entry in "${CHECKS[@]}"; do
  if [[ "$entry" == *"|"* ]]; then
    globs="${entry%%|*}"
    check="${entry#*|}"
  else
    globs="-"
    check="$entry"
  fi
  targets=()
  if [ "$globs" != "-" ]; then
    while IFS= read -r f; do targets+=("$f"); done < <(matching "$globs")
    [ "${#targets[@]}" -eq 0 ] && continue
  fi
  out="$(bash -c "$check \"\$@\"" check "${targets[@]+"${targets[@]}"}" 2>&1)"
  status=$?
  if [ "$status" -ne 0 ]; then
    failed=1
    printf 'Check failed (exit %s): %s\n%s\n\n' "$status" "$check" "$(printf '%s\n' "$out" | tail -n 40)" >&2
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "Fix these before finishing, or report why a check cannot pass." >&2
  exit 2
fi
exit 0
