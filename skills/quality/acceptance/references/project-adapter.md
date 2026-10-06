# Project layer (`.agents/acceptance/`)

This skill is project-agnostic. Everything specific to the project under test — how
to start and stop it, which ports and services it needs, how auth works, which
surfaces it has, and how to jump straight into app state — lives in a per-project
adapter at `.agents/acceptance/PROJECT.md`. The skill reads it; it never guesses the
project's commands.

A repository that verifies itself often has more than commands to share: an
approval gate before touching the environment, a teardown discipline, where
evidence is hosted for PRs, a round directory convention. Those live beside the
adapter in `.agents/acceptance/PROCESS.md`. **When that file exists it owns the
run process, and this skill supplies the acceptance contract** — cases, evidence,
report, round. Read both before executing; where they disagree about _how to
run_, the project layer wins, and where they disagree about _what a valid round
is_, this skill wins.

## Where the adapter lives

```text
<repo>/.agents/acceptance/        # committed — the adapter and project logs are team assets
├── PROJECT.md                    # the adapter: commands, ports, services, auth, surfaces
├── PROCESS.md                    # optional: the project's run process (gate, teardown, evidence host)
├── FEATURES.md                   # feature map: feature → surface → entry → files → how to verify
├── common-mistakes.md            # PROJECT-layer living log (writable)
├── probe-mock-patterns.md        # PROJECT-layer living log (writable)
├── references/                   # optional: project-owned how-tos
└── scripts/                      # optional: project env / probe / capture scripts
```

`.agents/acceptance/` is **committed** (the adapter and the project living logs are
shared, versioned team assets). The round output directory `.acceptance/` is
**git-ignored** by its own `.gitignore` — rounds are per-run artifacts, attached
to PRs, never committed to the product branch.

## Fixed section skeleton

`PROJECT.md` always has these six sections, in this order. The skill refers to
sections by number (`PROJECT.md §2`, `§3`, …), so keep the numbering. The
copy-pasteable skeleton is [../templates/PROJECT.md](../templates/PROJECT.md).

1. **Project summary** — what the product is, and the repo layout relevant to
   testing (which package holds the server, the web app, the desktop shell, the
   CLI, the mobile app).
2. **Environment** — how to start and stop the dev environment; the required
   services (database, cache, queue, object store) and how to start each; how to
   detect "already running" so a run does not clobber a user's server; how env and
   ports are resolved (the project's own env-resolver command, if any) so the skill
   never hard-codes a port table.
3. **Auth** — test accounts, seeding commands, and a per-surface status check (one
   command per surface that answers "am I signed in on this surface?").
4. **Surfaces** — which of CLI / Web / Electron / Native / iOS Simulator apply,
   and for each that applies: launch command, base URL / port, agent-browser
   session name (web/electron), bundle or app identifier (native/iOS), and which
   probe scripts drive it.
5. **Project probes & quick navigation** — the fast paths into app state: an auth
   probe, a current-route probe, a running-operations probe, and a `goto <route>`
   quick-navigation, plus the routes worth jumping to. These are the project's
   equivalent of a state-introspection helper; the skill uses them instead of
   hand-rolling store-eval snippets.
6. **Known constraints** — anything the generic rules must know before running:
   services that are hard prerequisites for a code path (e.g. "background jobs
   require the queue service up"), standalone sub-packages that need their own
   install, surfaces that only work on macOS, where PR evidence may be hosted, or
   any repo-specific gotcha a run must respect.

`PROJECT.md` may reference project scripts under `.agents/acceptance/scripts/` or
anywhere in the repo.

## Feature map

`FEATURES.md` answers "where is this feature, how do I reach it, and which files
own it", so a run knows what to verify for a diff without rediscovering the
product. One row per user-visible feature, five fixed columns; the skeleton is
[../templates/FEATURES.md](../templates/FEATURES.md).

```bash
node <skill-dir>/scripts/check-feature-map.mjs touched --base origin/main
node <skill-dir>/scripts/check-feature-map.mjs check
```

- `touched` lists the features whose files the current branch changed, with their
  entry and verification path, plus changed files no row lists. Author cases for
  every touched feature; for an unlisted user-visible file, add or extend a row in
  the same change.
- `check` fails when a listed path no longer exists. Run it in the project's CI so
  the map cannot drift silently.

Bootstrap it with `PROJECT.md`: draft rows from routes, screens, CLI commands and
their owning directories, mark guesses, and confirm with the user.

## First-run bootstrap

When `.agents/acceptance/PROJECT.md` is absent, build it before doing anything else:

1. **Explore the repo.** Read the signals that reveal how the project runs:
   `package.json` scripts, `README`, CI workflows (`.github/workflows/**`),
   `Makefile` / `Justfile`, `docker-compose*.yml` / `compose.yaml`, `.env.example`,
   Xcode schemes, and any existing test/dev docs. Note the dev-server command, the
   services it needs, the ports, the auth story, and which surfaces exist.
2. **Draft `PROJECT.md`** from [the template](../templates/PROJECT.md), filling
   every section from what you found. Where a value is uncertain, mark it
   explicitly as a guess rather than inventing a command.
3. **Present it for confirmation.** Show the draft to the user and ask them to
   confirm or correct it — especially the start/stop commands, the required
   services, and the auth path. Do not run a dev server or write test steps against
   an unconfirmed adapter.
4. **Write it only after approval**, to `.agents/acceptance/PROJECT.md`. Create
   `.agents/acceptance/` if it does not exist.

Installing the skill places only the skill files; it does no repo exploration.
The adapter draft needs a model, so the first verification run is what bootstraps
`PROJECT.md`.

## Drift rule

Treat the adapter like a living log: when observed reality diverges from it during a
run (a port moved, a start command changed, a service is now required), **fix
`PROJECT.md` in place during the run** rather than working around it silently. The
next run should not rediscover the same divergence.

## Two living-log layers

The skill's `references/common-mistakes.md` and `references/probe-mock-patterns.md`
are the **generic layer** — product-independent, and read-only in a consumer repo:
an installed copy is replaced on the next skill update, so an edit there is lost.
Change it upstream in the skill source. The project's own
`.agents/acceptance/common-mistakes.md` and `.agents/acceptance/probe-mock-patterns.md` are
the **project layer** — writable, and the only place a run records project-specific
learnings. At runtime the agent reads both layers and writes only the project layer.
When a project-layer entry turns out to be product-independent, genericize it (drop
every project-specific noun) and propose it to the generic layer upstream.

**Confidentiality runs one way.** Anything naming a project's packages, routes,
schemas, env vars, service names, or business logic stays in the project layer;
only a rule that reads correctly with every project noun removed may be promoted.
