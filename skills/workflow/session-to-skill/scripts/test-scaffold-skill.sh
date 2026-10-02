#!/usr/bin/env bash
# Behavioral tests for scaffold-skill.sh and resolve-skill-repo.sh against a
# throwaway fake skills repository. Run: bash scripts/test-scaffold-skill.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/scaffold-test.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0
ok()   { PASS=$((PASS + 1)); echo "ok   - $1"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL - $1" >&2; }
check() { if eval "$2"; then ok "$1"; else fail "$1"; fi; }

make_repo() {
  local repo="$1"
  mkdir -p "$repo"
  cat > "$repo/README.md" <<'EOF'
# Skills

## Skills

### Workflow

> Session and delivery workflows.

| Skill | Purpose |
| ----- | ------- |
| [`alpha-flow`](skills/workflow/alpha-flow/SKILL.md) | Alpha |
| [`zeta-flow`](skills/workflow/zeta-flow/SKILL.md) | Zeta |

### Quality

| Skill | Purpose |
| ----- | ------- |
| [`mid-check`](skills/quality/mid-check/SKILL.md) | Mid |

### Mobile

| Skill | Purpose |
| ----- | ------- |

### Design

| Skill | Purpose |
| ----- | ------- |

### Research

| Skill | Purpose |
| ----- | ------- |

### Infrastructure

| Skill | Purpose |
| ----- | ------- |
| [`base-infra`](skills/infrastructure/base-infra/SKILL.md) | Base |
EOF
  git -C "$repo" init -q
}

# Line number of the first line containing a fixed string.
lineno() { grep -nF "$2" "$1" | head -n 1 | cut -d: -f1; }

run() { SKILLS_REPO="$REPO" bash "$HERE/scaffold-skill.sh" "$@"; }

# --- happy path with template -------------------------------------------------
REPO="$WORK/repo"
make_repo "$REPO"
mkdir -p "$REPO/templates"
printf -- '---\nname: skill-name\ndescription: x\n---\n\n# Skill Title\n\nBody.\n' > "$REPO/templates/SKILL.template.md"

run workflow middle-flow "Middle purpose" >/dev/null
R="$REPO/README.md"
SK="$REPO/skills/workflow/middle-flow/SKILL.md"
check "SKILL.md created" '[ -f "$SK" ]'
check "template name filled" 'grep -qx "name: middle-flow" "$SK"'
check "template title filled" 'grep -qx "# middle-flow" "$SK"'
check "row inserted" 'grep -qF "| [\`middle-flow\`](skills/workflow/middle-flow/SKILL.md) | Middle purpose |" "$R"'
check "row sorted between alpha and zeta" \
  '[ "$(lineno "$R" alpha-flow)" -lt "$(lineno "$R" middle-flow)" ] && [ "$(lineno "$R" middle-flow)" -lt "$(lineno "$R" zeta-flow)" ]'
check "row stays in Workflow section" '[ "$(lineno "$R" middle-flow)" -lt "$(lineno "$R" "### Quality")" ]'
check "files staged in git" \
  'git -C "$REPO" diff --cached --name-only | grep -qx "skills/workflow/middle-flow/SKILL.md" && git -C "$REPO" diff --cached --name-only | grep -qx "README.md"'

# Append after last row, and into an empty table, and into the last section.
run workflow zz-last "Last" >/dev/null
check "row appended after last row" '[ "$(lineno "$R" zeta-flow)" -lt "$(lineno "$R" zz-last)" ] && [ "$(lineno "$R" zz-last)" -lt "$(lineno "$R" "### Quality")" ]'
run design first-design "Design one" >/dev/null
check "row inserted into empty table" \
  '[ "$(lineno "$R" "### Design")" -lt "$(lineno "$R" first-design)" ] && [ "$(lineno "$R" first-design)" -lt "$(lineno "$R" "### Research")" ]'
run infrastructure zed-infra "Infra z" >/dev/null
check "row appended at end of file" '[ "$(tail -n 1 "$R")" = "| [\`zed-infra\`](skills/infrastructure/zed-infra/SKILL.md) | Infra z |" ]'
run quality aa-first "First" >/dev/null
check "row inserted before first row" \
  '[ "$(lineno "$R" "### Quality")" -lt "$(lineno "$R" aa-first)" ] && [ "$(lineno "$R" aa-first)" -lt "$(lineno "$R" mid-check)" ]'

# --- refusals -----------------------------------------------------------------
before="$(cat "$R")"
check "rejects invalid domain" '! run automation some-skill "x" 2>/dev/null'
check "rejects non-kebab name" '! run workflow Bad_Name "x" 2>/dev/null'
check "rejects trailing hyphen" '! run workflow bad- "x" 2>/dev/null'
check "rejects existing skill" '! run workflow middle-flow "again" 2>/dev/null'
check "rejects pipe in purpose" '! run workflow pipe-skill "a | b" 2>/dev/null'
check "refusals leave README unchanged" '[ "$(cat "$R")" = "$before" ]'
check "refusals create no directory" '[ ! -e "$REPO/skills/workflow/pipe-skill" ] && [ ! -e "$REPO/skills/automation" ]'

# --- inline stub when template is absent ---------------------------------------
REPO2="$WORK/repo2"
make_repo "$REPO2"
REPO="$REPO2" run mobile stub-skill "Stub" >/dev/null
check "inline stub has name" 'grep -qx "name: stub-skill" "$REPO2/skills/mobile/stub-skill/SKILL.md"'
check "inline stub has verification section" 'grep -qx "## Verification" "$REPO2/skills/mobile/stub-skill/SKILL.md"'

# --- resolve-skill-repo.sh ----------------------------------------------------
FAKE_HOME="$WORK/home"
mkdir -p "$FAKE_HOME"
check "resolve errors without env or config" \
  '! env -u SKILLS_REPO -u XDG_CONFIG_HOME HOME="$FAKE_HOME" bash "$HERE/resolve-skill-repo.sh" 2>/dev/null'
msg="$(env -u SKILLS_REPO -u XDG_CONFIG_HOME HOME="$FAKE_HOME" bash "$HERE/resolve-skill-repo.sh" 2>&1 || true)"
check "resolve error names SKILLS_REPO" 'printf "%s" "$msg" | grep -q SKILLS_REPO'
mkdir -p "$FAKE_HOME/.config/skills" "$FAKE_HOME/my-skills"
printf '{ "skill_repo_dir": "~/my-skills" }\n' > "$FAKE_HOME/.config/skills/config.json"
got="$(env -u SKILLS_REPO -u XDG_CONFIG_HOME HOME="$FAKE_HOME" bash "$HERE/resolve-skill-repo.sh")"
check "resolve reads config and expands ~" '[ "$got" = "$(cd "$FAKE_HOME/my-skills" && pwd)" ]'
got="$(SKILLS_REPO="$REPO2" HOME="$FAKE_HOME" bash "$HERE/resolve-skill-repo.sh")"
check "SKILLS_REPO overrides config" '[ "$got" = "$(cd "$REPO2" && pwd)" ]'
check "resolve errors on missing directory" '! SKILLS_REPO="$WORK/nope" bash "$HERE/resolve-skill-repo.sh" 2>/dev/null'

echo "passed: $PASS, failed: $FAIL"
[ "$FAIL" -eq 0 ]
