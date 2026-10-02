# Skills repository rules

Rules for agents adding or changing skills in this repository.

## Layout

- Skills live only under `skills/<domain>/<skill-name>/`. Domains are stable
  buckets: `workflow`, `quality`, `mobile`, `design`, `research`,
  `infrastructure`. Do not create a domain for a single project.
- One skill per directory. Required: `SKILL.md`. Optional: `references/`,
  `scripts/`, `assets/`. Never create empty resource directories.
- `templates/` holds skeletons, not active skills. `templates/project/` holds
  files copied into new projects.
- Every skill has a row in `README.md` under its domain heading. Use
  `skills/workflow/session-to-skill/scripts/scaffold-skill.sh` to add one.

## Writing a skill

- Frontmatter contains only `name` (kebab-case, equal to the directory name),
  `description`, and optionally `argument-hint` for skills invoked as slash
  commands. The description states what the skill does and every
  trigger condition, including Chinese phrases the user is likely to type. No
  body-level "When to use" section, no author or version metadata.
- Skill bodies are written in English. README entries are written in Chinese.
- Three layers, to keep the default context small:
  - `SKILL.md`: decisions and the operational core only — outcome, scope,
    ordered steps, stop conditions, verification. Under 500 lines.
  - `references/`: detail loaded on demand — schemas, templates, long
    examples, volatile facts. `SKILL.md` says when to load each file.
  - `scripts/`: deterministic or fragile operations, so the model does not
    re-derive them. Scripts come with a test when they have logic.
- State exclusions and stopping conditions. A skill without a verifiable
  outcome is reference material, not a skill.
- Name skills verb-led and concrete (`split-traffic-safely`, not `traefik-notes`).
- Never include credentials, tokens, personal paths (`/Users/<name>`,
  `/home/<name>`), account names, hostnames, or machine-specific details.
  Use placeholders and environment variables.

## Where a lesson goes

Rules move up only when they have proven general:

1. **Project `AGENTS.md`** — a constraint or incident rule that holds for one
   repository. Default destination.
2. **Global `~/.claude/CLAUDE.md`** (the `claude` config repository) — a short
   behavioral rule that has held in at least two projects, or is obviously
   true for every project (e.g. "never disable code signing").
3. **A skill here** — a repeatable procedure with a trigger, a non-obvious
   method, and an observable outcome (the seven gates in `session-to-skill`).

When a rule moves up, remove or shorten the lower copy so it is not
maintained twice.

## Checks

- `node scripts/validate.mjs` must pass (frontmatter, names, README rows,
  relative links).
- `node --test 'scripts/*.test.mjs' 'skills/**/*.test.mjs'` for script tests.
- Before a public push, scan for personal data: `node scripts/validate.mjs --privacy`.
  Extra terms to block (names, hostnames) go in a local, uncommitted file:
  `~/.config/skills/privacy-denylist` or `$PRIVACY_DENYLIST`, one per line. A line
  that must keep a sample value (test fixtures) carries a `privacy-allow` marker.
