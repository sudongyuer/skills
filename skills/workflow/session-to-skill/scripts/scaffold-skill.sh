#!/usr/bin/env bash
# Scaffold a new skill in the skills repository:
#   - skills/<domain>/<name>/SKILL.md (from templates/SKILL.template.md when
#     present, else an inline stub), with the name filled in;
#   - a README row inserted alphabetically into the table under `### <Domain>`;
#   - `git add` of both. Does NOT commit or push.
#
# Usage: scaffold-skill.sh <domain> <skill-name> "<one-line purpose>"
#   domain ∈ workflow | quality | mobile | design | research | infrastructure
# Portable across macOS (bash 3.2, BSD tools) and Linux.
set -euo pipefail

DOMAINS="workflow quality mobile design research infrastructure"

if [ $# -ne 3 ]; then
  echo "usage: $(basename "$0") <domain> <skill-name> \"<one-line purpose>\"" >&2
  exit 2
fi

DOMAIN="$1"
NAME="$2"
PURPOSE="$3"

case " $DOMAINS " in
  *" $DOMAIN "*) ;;
  *) echo "error: invalid domain '$DOMAIN' (expected one of: ${DOMAINS// /|})" >&2; exit 2 ;;
esac

if ! printf '%s' "$NAME" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  echo "error: invalid skill name '$NAME' (expected lowercase kebab-case, e.g. split-traffic-safely)" >&2
  exit 2
fi

if [ -z "$PURPOSE" ] || printf '%s' "$PURPOSE" | grep -q '[|]'; then
  echo "error: purpose must be non-empty and must not contain '|'" >&2
  exit 2
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(bash "$HERE/resolve-skill-repo.sh")"
TARGET="$REPO/skills/$DOMAIN/$NAME"
README="$REPO/README.md"
TEMPLATE="$REPO/templates/SKILL.template.md"

if [ -e "$TARGET" ]; then
  echo "error: $TARGET already exists" >&2
  exit 1
fi
[ -f "$README" ] || { echo "error: $README not found" >&2; exit 1; }
if grep -Fq "[\`$NAME\`](" "$README"; then
  echo "error: README already lists '$NAME'" >&2
  exit 1
fi

# Capitalize the first letter without bash 4 features.
HEADING="### $(printf '%s' "${DOMAIN:0:1}" | tr '[:lower:]' '[:upper:]')${DOMAIN:1}"
ROW="| [\`$NAME\`](skills/$DOMAIN/$NAME/SKILL.md) | $PURPOSE |"

TMP_README="$(mktemp "${TMPDIR:-/tmp}/scaffold-readme.XXXXXX")"
trap 'rm -f "$TMP_README"' EXIT

# Insert ROW alphabetically among the data rows of the first table under
# HEADING. Values pass through ENVIRON so awk does not reinterpret escapes.
HEADING="$HEADING" ROW="$ROW" NAME="$NAME" awk '
  function emit() { print ENVIRON["ROW"]; inserted = 1 }
  BEGIN { insec = 0; intable = 0; inserted = 0; found = 0 }
  {
    line = $0
    if (!inserted && insec) {
      if (substr(line, 1, 1) == "|") {
        intable = 1
        if (index(line, "| [`") == 1) {
          rest = substr(line, 5)
          cur = substr(rest, 1, index(rest, "`") - 1)
          if (cur > ENVIRON["NAME"]) emit()
        }
      } else if (intable || substr(line, 1, 1) == "#") {
        if (intable) emit()
        else insec = 0
      }
    }
    if (line == ENVIRON["HEADING"]) { insec = 1; found = 1 }
    print line
  }
  END {
    if (!inserted && insec && intable) emit()
    if (!found) exit 3
    if (!inserted) exit 4
  }
' "$README" > "$TMP_README" || {
  rc=$?
  case "$rc" in
    3) echo "error: heading '$HEADING' not found in $README" >&2 ;;
    4) echo "error: no table found under '$HEADING' in $README" >&2 ;;
    *) echo "error: failed to update $README (awk exit $rc)" >&2 ;;
  esac
  exit 1
}

mkdir -p "$TARGET"
if [ -f "$TEMPLATE" ]; then
  sed -e "s/^name: .*/name: $NAME/" -e "s/^# Skill Title\$/# $NAME/" "$TEMPLATE" > "$TARGET/SKILL.md"
else
  cat > "$TARGET/SKILL.md" <<EOF
---
name: $NAME
description: >
  <State the capability and every concrete trigger condition. Remove this
  placeholder before committing.>
---

# $NAME

## Capability contract

- **Outcome:** <state the externally meaningful result>
- **Preconditions:** <state required access, inputs, and environment>
- **Boundaries:** <state exclusions and stopping conditions>

## Operational core

<Give the shortest sufficient procedure or decision path. Use imperative
instructions.>

## Verification

- [ ] <state an externally observable success criterion>
EOF
fi

cat "$TMP_README" > "$README"

cd "$REPO"
git add "skills/$DOMAIN/$NAME" "README.md"

cat <<EOF
scaffolded: $TARGET
next steps:
  1. replace every placeholder in $TARGET/SKILL.md
  2. add scripts/, references/, or assets/ only when they improve reuse
  3. validate the skill and remove empty conditional sections
  4. cd "$REPO" && git add "skills/$DOMAIN/$NAME" README.md && git commit -m "feat: add $NAME skill"
EOF
