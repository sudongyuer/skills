# Correction layers

The single source for where a correction lands. `AGENTS.md`, `session-to-skill`,
the project templates and the global `CLAUDE.md` link here instead of copying it.

Two questions, asked in this order:

1. **What enforces it?** Walk the five layers top-down and stop at the first one
   that catches every future instance at an acceptable cost.
2. **Where does the text live?** Only when the answer to (1) is a rule or a skill,
   pick its scope.

## 1. Enforcement layers

| # | Layer | Holds because | Examples | Passes when |
|---|---|---|---|---|
| 1 | Code structure | The wrong thing cannot be written | A type that rejects the bad value; one module owns the concern and the old path is deleted; a wrapper is the only exported entry point; a generated file is produced, never edited | Writing the mistake again fails to compile, or there is no API left to misuse |
| 2 | Static check, CI or hook | A machine catches it every time | Lint rule, type-check flag, a script in CI, a git hook, an agent hook (`PreToolUse` blocks a command, `Stop` runs checks before the agent may finish), a permission rule in `settings.json` | A fixture or command containing the mistake makes the check fail |
| 3 | Rule | The agent reads it every session | One line in project `AGENTS.md` or global `CLAUDE.md` | The rule names a testable behaviour, not an attitude |
| 4 | Skill | The agent loads it when the trigger fires | A multi-step procedure with a trigger and an observable outcome | It passes the seven gates in `session-to-skill` |
| 5 | Human review | Someone notices | A PR template checklist line, a reviewer note | Last resort: nothing above can see the mistake |

Choosing:

- Prefer the higher layer whenever it can catch every instance. A rule that a lint
  rule could enforce is a defect in the rule set.
- A taste call that varies case by case (naming, layout, wording) stays at 3–5;
  do not build a lint rule for a one-off preference.
- An existing bad example in the codebase that made the mistake look right is part
  of the defect: remove or fix it in the same change, or the agent copies it again.
- After moving a guarantee down to layer 1 or 2, shorten the rule that described it
  to a pointer ("enforced by …") or delete it.

## 2. Scope, for rules and skills

| Scope | Use when |
|---|---|
| Project `AGENTS.md` | True for one repository: its commands, layout, platform, invariants. Default. |
| Global `~/.claude/CLAUDE.md` | A short behavioural rule that has held in at least two projects, or is obviously universal. |
| Skill in the skills repository | A repeatable, triggerable procedure useful across projects (route through `session-to-skill`). |

Escalate scope only with evidence that the narrower one is insufficient, and keep
one copy: when a rule moves, remove or shorten the old one.

## Worked examples

| Correction | Layer chosen | Why not higher |
|---|---|---|
| "Never pass `CODE_SIGNING_ALLOWED=NO`" | 2: a `PreToolUse` hook that blocks the command | A build flag cannot be removed from the toolchain (1) |
| "Do not read `.env`" | 2: an `ask` permission rule | Same |
| Body-level "When to use" sections in skills | 2: a check in the repository validator | Markdown has no type system (1) |
| "Use the native toolbar item, not a custom view" | 1: export only the wrapper; delete the custom view | — |
| "Ask before choosing a motion curve" | 3: global rule | Not machine-detectable (1–2) |
| "How to capture a single-frame flicker on device" | 4: skill | A procedure, not a constraint |
