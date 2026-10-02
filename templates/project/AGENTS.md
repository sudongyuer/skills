# <Project name>

<!--
Binding rules for agents working in this repository. Keep it under ~8 KiB.
Only constraints and invariants belong here; explanations go to docs/.
Every rule added after an incident names the incident in its commit message.
Delete these comments when the file is filled in.
-->

- <One line: what this project is, which platforms it targets, and which it never targets.>
- Stack: <framework + version>, <language>, <package manager + version>. Read the
  versioned docs for <framework> before writing code; do not rely on memory.

## Boundaries

- <Platform scope, e.g. "iOS only. Do not add Android implementations, stubs, or build scripts.">
- <Module ownership, e.g. "All native code lives in `modules/<kit>`; do not create separate bridge packages.">
- <Escape hatch, e.g. "When the framework cannot meet a UI requirement, implement it natively instead of imitating it.">
- Generated directories (<e.g. `ios/`, `android/`, `dist/`>) are never edited by hand;
  persist changes in config, plugins, or source.
- Credentials live in <Keychain / OS keystore / env at runtime>. Never commit tokens,
  transcripts, or private service configuration.
- Before destructive operations (revert, reset, delete, force-push), inspect the working
  tree and ask for confirmation.

## Layout

- <dir>: <what lives here and what must not import it>
- <dir>: <...>

## Docs and specs

- Specs: `docs/specs/YYYY-MM-DD-<topic>-design.md`, indexed in `docs/specs/README.md`.
  Plans: `docs/plans/YYYY-MM-DD-<topic>.md`. These locations override any tool default
  (for example superpowers' `docs/superpowers/specs`).
- New specs start from `docs/specs/_template.md` with `status: proposed`. Only the human
  moves a spec to `approved`.
- After a feature is implemented and before its PR is opened or updated, run the
  `spec-lifecycle` skill to append the Implementation Record, set `status: implemented`,
  and update the index. `node scripts/check-specs.mjs --dir docs/specs` must pass.
- An overturned design gets a new spec that supersedes the old one; never delete a spec.

## Checks

- Before commit: `<lint/typecheck command>` and `<format command>` on changed files.
- `<test command>` when behavior changes. `<bundle/build command>` when the build can change.
- UI changes add or update a check under `<verification/ui>` and run it in light and
  dark; screenshots for state, video for motion. Missing scenes and timeouts fail.
- Report skipped checks and why.

## Conventions

- Conventional Commits with scope: `feat(<area>): ...`, `fix(<area>): ...`.
- <Code style rules specific to this repo, e.g. "no nested ternaries", "components under 300 lines".>

## Rules from incidents

<!-- Append one bullet per incident-driven rule: the rule, then a short reason.
Project-specific rules stay here; rules that apply to every project move to the
global ~/.claude/CLAUDE.md. -->

- <Rule.> Reason: <what broke>.
