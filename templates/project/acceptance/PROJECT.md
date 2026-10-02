# PROJECT.md — acceptance adapter for <project name>

<!--
Copy to <repo>/.agents/acceptance/PROJECT.md and fill every section.
Keep the six sections and their numbers: the acceptance skill cites them as §1–§6.
Mark anything you could not confirm as "GUESS:" instead of inventing a command.
Delete surfaces that do not apply; never leave a placeholder the run would execute.
-->

## 1. Project summary

<!-- One paragraph: what the product is and who uses it.
Then the repo layout that matters for testing: which directory/package is the
server, the web app, the desktop shell, the CLI, the mobile app. -->

- Product: <one sentence>
- Layout: `<path>` — <role>; `<path>` — <role>

## 2. Environment

<!-- How a run brings the product up and down without clobbering the user's own
instances. Ports come from the project's resolver, never a hand-kept table. -->

- **Start dev environment:** `<command>` (base URL: `<url>`)
- **Stop:** `<command>` — stops only what this run started
- **Required services:** <database / cache / queue / object store, each with its start command — or "none">
- **Already-running detection:** `<health-check command>` — how to tell it is up before starting another
- **Env / port resolution:** `<command or file>` — the source of truth for ports and URLs

## 3. Auth

<!-- How each surface gets a signed-in state by direct injection or seeding —
never an interactive login in the user's browser. Never paste secrets here;
name where they come from. -->

- **Test account(s):** <how to obtain — seeded, fixture, env var name>
- **Seeding command:** `<command>` (or "n/a")
- **Per-surface status check:**
  - CLI: `<command>` — signed in when <…>
  - Web: `<command>` — signed in when <…>
  - Electron: `<command>` — signed in when <…>
  - iOS Simulator: `<command>` — signed in when <…>

## 4. Surfaces

<!-- One subsection per surface that applies; delete the rest. -->

### CLI

- Invocation: `<from source or built binary>`
- Standalone install: `<command>` or "covered by root install"

### Web

- Launch: `<dev server command>` (from §2)
- Base URL: `<url>`
- agent-browser session: `<session name — unique per run/worktree>`

### Electron

- Launch: `<start command>` — CDP port `<port>`
- Stop: `<command>` (kills helper processes too)
- Login persistence: <how login survives across runs>

### Native macOS

- App name / bundle id: `<name>` / `<bundle id>`
- Build and launch: `<command>`

### iOS Simulator

- Build: `<canonical build command>` → app path `<path>`
- Bundle id: `<bundle id>`; preferred device/runtime: `<model, runtime>`
- Driver: <AXe / project UI-test runner> — `<command>`

## 5. Project probes & quick navigation

<!-- Fast paths into app state so a run never hand-rolls store-eval snippets. -->

- Auth probe: `<command>` → `{ isSignedIn, userId }`
- Route probe: `<command>` → current route
- Operations probe: `<command>` → running background operations
- Quick navigation: `<command> goto <route>`
- Capture helpers: `<e.g. raw-CDP screenshot script>`
- Routes worth jumping to: <list>

## 6. Known constraints

<!-- Anything a run must respect before starting: hard service prerequisites,
standalone packages, OS-only surfaces, where PR evidence may be hosted
(default: an unmerged evidence branch — see the skill's report.md), shared
resources parallel runs must not collide on. -->

- <e.g. "background jobs require the queue service (§2) up, or the flow dies before any real work">
- <e.g. "the desktop package is standalone — install inside it">
- <e.g. "PR evidence: push to the `acceptance-evidence` branch; never to the product branch">
