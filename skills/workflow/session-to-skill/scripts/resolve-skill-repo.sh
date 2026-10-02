#!/usr/bin/env bash
# Print the absolute path to the skills repository.
#
# Resolution order:
#   1. $SKILLS_REPO
#   2. `skill_repo_dir` in ${XDG_CONFIG_HOME:-~/.config}/skills/config.json
#   3. error (there is no built-in default path)
#
# A leading ~ is expanded to $HOME. Portable across macOS and Linux.
set -euo pipefail

CFG="${XDG_CONFIG_HOME:-$HOME/.config}/skills/config.json"

read_config_key() {
  local file="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -r '.skill_repo_dir // empty' "$file" 2>/dev/null || true
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys
try:
    v = json.load(open(sys.argv[1])).get("skill_repo_dir") or ""
except Exception:
    v = ""
print(v)' "$file" 2>/dev/null || true
  elif command -v node >/dev/null 2>&1; then
    node -e 'try { const v = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).skill_repo_dir; console.log(v || "") } catch { console.log("") }' "$file" 2>/dev/null || true
  else
    echo "error: need jq, python3, or node to read $file" >&2
    return 1
  fi
}

DIR="${SKILLS_REPO:-}"
SOURCE="SKILLS_REPO"
if [ -z "$DIR" ] && [ -f "$CFG" ]; then
  DIR="$(read_config_key "$CFG")"
  SOURCE="$CFG (skill_repo_dir)"
fi

if [ -z "$DIR" ]; then
  cat >&2 <<EOF
error: skills repository is not configured.
set one of:
  export SKILLS_REPO=/absolute/path/to/skills-repo
  or create $CFG containing:
    { "skill_repo_dir": "~/path/to/skills-repo" }
EOF
  exit 1
fi

case "$DIR" in
  "~") DIR="$HOME" ;;
  "~/"*) DIR="$HOME/${DIR#\~/}" ;;
esac

if [ ! -d "$DIR" ]; then
  echo "error: skills repository from $SOURCE does not exist: $DIR" >&2
  exit 1
fi

(cd "$DIR" && pwd)
