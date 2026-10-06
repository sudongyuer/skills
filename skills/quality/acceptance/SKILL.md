---
name: acceptance
description: >
  End-to-end verification and builder self-evidence for a delivery in any
  repository. Author outcome checks, pick the proving surface (CLI / web /
  Electron desktop / native macOS / iOS Simulator), drive the real product,
  capture visually confirmed evidence, and write an immutable local round
  (result.json + assets + report.md) that can be attached to a pull request.
  Triggers on 'verify the task', 'collect evidence', 'prove it works',
  'acceptance test', 'requiredEvidence', 'local test', 'manual test', 'test
  report', 'test with cli', 'test in electron', 'test desktop', 'test on ios
  simulator', 'attach evidence to the PR', or any local end-to-end
  verification task.
---

# Acceptance (Builder Self-Evidence)

You are the **builder** for a delivery. A separate review step — a person
reading your round, usually on the pull request — judges it against the
**checks you author**. A check that declares `requiredEvidence` **cannot pass on
your text alone**: a missing artifact marks it `uncertain` and holds the
delivery.

```
author the checks  →  pick the surface  →  capture evidence  →  write + seal the round  →  self-check coverage  →  hand off
```

## Read the project layer first

Before touching an environment, check for `.agents/acceptance/`:

| File                     | What it owns                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `PROJECT.md`             | Start/stop commands, ports, services, auth, surfaces, probes |
| `PROCESS.md`             | The run process: approval gate, execution rules, teardown    |
| `FEATURES.md`            | Feature map: entry, owning files, how to verify each feature |
| `common-mistakes.md`     | Project living log — what earlier rounds got wrong here      |
| `probe-mock-patterns.md` | Project living log — how to force state on this product      |

The project layer owns _how this repository is run_; this skill owns _what a
valid round is_ (checks, evidence, report, immutable round, the hard rule). On
running, the project layer wins; on what may be recorded as acceptance, this
skill wins. Never invent a start command, port, or auth flow `PROJECT.md`
answers; fix a divergence in the adapter during the run instead of working
around it. No `.agents/acceptance/` → bootstrap one first from
[templates/PROJECT.md](templates/PROJECT.md):
[project-adapter.md](references/project-adapter.md).

## Living logs — inject each by its own shape

Both layers (this skill's generic copies and the project's own) are loaded once
the target is known, silently:

- **[common-mistakes.md](references/common-mistakes.md)** — read its
  **Checklist** in full, now and again before marking any case `pass`. Pull an
  entry by id only when a checklist line applies to a case.
- **[probe-mock-patterns.md](references/probe-mock-patterns.md)** — read the
  heading index, then pull only the entries this round needs. Pick by meaning,
  not keyword; `rg` over the body is the fallback.

```bash
rg -n '^#{2,4} ' <file>          # the index, with line numbers
sed -n '<start>,<end>p' <file>   # one entry, in full
```

Record new project-specific learnings in the project layer only.

## The round — one authored path, no tools required

Every round is a local directory; nothing is published to a service:

```text
.acceptance/
├── .gitignore            # `*` — the tree stays out of git
└── <slug>/               # one delivery, kebab-case, stable across rounds
    ├── reviews.json      # the user's accept/reject decisions per case id
    ├── round-1/
    │   ├── result.json   # THE record — schema in references/report.md
    │   ├── assets/       # every evidence file cited by result.json
    │   ├── report.md     # rendered from result.json — never hand-edited
    │   └── .sealed.json  # hashes written at seal time; the round is now frozen
    └── round-2/ …
```

- **Write the cases before you run anything** — each is an outcome with
  `method`, `expected`, and `requiredEvidence`; fill `status`, `observation`,
  and `evidence[]` as you test. Schema, rules, and rendering:
  [report.md](references/report.md).
- **`requirement`** is the one-sentence business goal of the whole acceptance,
  written in round 1 and identical in every later round — not this round's
  narrower scope.
- **Validate and seal** with the bundled script (Node, no dependencies):

```bash
V=<skill-dir>/scripts/validate-round.mjs
DIR=$(node "$V" new <slug>)          # allocates .acceptance/<slug>/round-<n>/assets
# … capture evidence into $DIR/assets, write $DIR/result.json …
node "$V" check "$DIR"               # errors → fix; prints the coverage line
node "$V" seal "$DIR"                # renders report.md, freezes the round
```

Without Node, apply the same rules by hand ([report.md](references/report.md#validation-rules))
and render `report.md` in the documented shape. Read every validator warning as
a defect in the round, not noise.

Prerequisites: only the UI driver the selected surface needs is installed —
probe before adding dependencies, and never substitute a private agent plugin.

## HARD RULE — programmatic gates are NEVER acceptance checks

Every check MUST be an outcome a **person decides about the delivery**: what the
user sees, hears, reads, or receives. These MUST NOT appear as a check, under any
phrasing: unit / integration / regression / snapshot tests, coverage,
`type-check` / `tsc`, lint / `eslint`, format, "compiles", "build passes",
"CI is green". Run them, then report them as **one line of narrative** in
`notes` under **Verification**.

Apply this yourself before sealing — the validator enforces it by keyword on
`title`, `category`, AND `method` ("run `pnpm test`" under a product-sounding
title still matches): a matching case is an error to remove, and a round made
only of such checks has no acceptance checks and cannot be sealed. The line is
the _subject_ of the check, not who judged it: a CLI behavior asserted by a
command is a fine check (`verifier: "program"`); "the suite is green" is not.
Before writing any case, ask of it: _would the user click accept/reject on
this?_

## Rounds are immutable — repair means a NEW round

A sealed round is a permanent record. **Never edit a round after changing the
code** — not `result.json`, not an asset, not `report.md`. Allocate the next
`round-<n+1>/` and let the sequence of rounds show the progression. The
validator refuses a sealed round whose files changed and `new` never reuses a
directory.

Before a repair round, read `.acceptance/<slug>/reviews.json` (format in
[report.md](references/report.md#reviewsjson)). Record there any decision the
user gave you in chat or on the PR before you start. Then: omit cases whose
latest review is `accept`; re-verify non-stale rejects under their exact stable
ids; when a case semantically replaces another, declare `supersedes: ['old-id']`
and repeat the full lineage in every later round that reuses the successor id.
Re-attach every artifact the successor needs — never cite an older round's
evidence.

## Rules you will be tempted to skip

Not judgment calls — the moves an agent under pressure makes and must not. Each
excuse below was made in a real round.

| Excuse                                                                                                 | Reality                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Injection is hard; happy-path plus unit tests covers it"                                              | The error state _was_ the goal. Walk the probe ladder ([probe-mock-patterns.md](references/probe-mock-patterns.md) A) before calling it blocked.                                                                                |
| "The branch name says what to verify" / "Loading the living logs first…"                               | The task lives in the user's words. Recover it, or confirm a labeled guess with one structured question — silently; never narrate setup.                                                                                        |
| "The black frame is probably display sleep / a permission"                                             | Measure first: pixel brightness, the permission bit, an A/B with one variable toggled. Record "confirmed by X" or "suspected", never a guess.                                                                                    |
| "Let me ask how they want it run" / "I'll click Sign in and you authorize" / "too small to screenshot" | Environment mechanics are yours: full isolated run, auth by direct injection (never an interactive login — it hijacks the user's browser), a screenshot for every user-facing change. Ask only about the product decision.      |
| "One more config edit and the env will boot" / "I'll mock it" / "I'll drive the rest myself"           | Timebox. Inventory running instances, probe for the real capability before mocking (a mock that records nothing is not in the path), re-delegate a dead subagent's remaining steps, revert experiments and ask.                 |
| "The fix is in and tests pass — verified"                                                              | Reproduce the failure's precondition first, then verify with it held. A run that cannot fail proves nothing; "reproduces sometimes" means an unnamed precondition. When the mocked seam is the suspect, drop the mock.          |

## Pick the surface by what you changed

With a feature map, start from `check-feature-map.mjs touched` (see
[project-adapter.md](references/project-adapter.md#feature-map)): every touched
feature needs a case, and its row names the entry and surface.

Match the change to the cheapest surface that can prove it; escalate only if
needed.

| What your task changed                                      | Surface                                               | Guide                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| Backend / CLI / library / data logic                        | **CLI** — stdout as `text`, zero UI flakiness         | [surfaces/cli.md](surfaces/cli.md)                     |
| Web app frontend / styles / interactions                    | **Web** (agent-browser → running web app)             | [surfaces/web.md](surfaces/web.md)                     |
| New/changed API **plus** the UI consuming it                | **Web**, full-stack (agent-browser + network capture) | [surfaces/web.md](surfaces/web.md#web-full-stack)      |
| Desktop-only behavior (native windows, IPC, packaged shell) | **Electron** (agent-browser `--cdp`)                  | [surfaces/electron.md](surfaces/electron.md)           |
| Native macOS app / OS chrome agent-browser can't reach      | **Native** (osascript + screencapture, local macOS)   | [surfaces/native.md](surfaces/native.md)               |
| Native iOS behavior, gestures, device-size layout           | **iOS Simulator** (AXe/native CLI + `simctl`)         | [surfaces/ios-simulator.md](surfaces/ios-simulator.md) |

- **Don't open a browser for a backend change**; command output as `text` is the
  strongest, cheapest proof. Use **Electron** only when the criterion depends on
  desktop-only code; iOS is driven by a Simulator HID/AX CLI, never host mouse —
  mark the case `blocked` if the CLI cannot express the gesture.
- **Structured data is a table, not a picture** — a review-sized `table` on the
  case, raw CSV/JSON as `evidence` —
  [report.md](references/report.md#structured-data). **A deliverable the user
  hears needs `audio`** — [evidence.md](references/evidence.md#audio-deliverables).
- **Auth is a gate scoped to the surface**: authenticate that surface first or
  every capture lands on the sign-in page. Web:
  [auth-web.md](references/auth-web.md).
- **A UI round may price its interaction cost** by recording KLM operator counts
  into `interaction-trace.jsonl`; optional, never hand-written —
  [interaction-cost.md](references/interaction-cost.md).

Shared rules for every artifact — media types, provenance, captions, safety —
are in [evidence.md](references/evidence.md).

## Final handoff (mandatory)

Before declaring the task done, prove coverage: for each case with
`requiredEvidence`, every declared `type` is present at least once with an
existing file (`check` prints this line). Report it explicitly; a missing type
holds the delivery at `uncertain` no matter how good the work is.

The final chat reply contains the round path (repo-relative), the coverage line,
and — when a PR exists — the link to the PR comment carrying the report. Never
only a prose claim.

```text
Round:    .acceptance/note-export/round-2 (sealed)
Coverage: 3/3 cases with requiredEvidence, all required evidence present
PR:       https://github.com/<owner>/<repo>/pull/<n>#issuecomment-<id>
```

**When a PR exists, the report goes on the PR** — the reviewer decides there,
not in your terminal. Upload the evidence so it renders for them: with
`gh` 2.99.0 or newer, post the round-relative body (`pr-body`) with
`gh pr comment --body-file … --attach <file>` for every file `pr-assets` lists;
otherwise push the assets to the evidence branch and post a body with remote
links (`pr-body --asset-base <url>`).
The PR text and the chat reply carry **no local paths, `file://` links, or
inline images**; every image and video in the PR resolves to an uploaded URL.
Pushing evidence anywhere is a remote write — get the user's go-ahead first.
Steps and hosting options: [report.md](references/report.md#attaching-to-a-pull-request).

## Portability rules

- **Engine-level capture over OS capture.** `agent-browser screenshot` / `dom` /
  `eval` run headless; `screencapture` / osascript are macOS-only. iOS:
  `xcrun simctl io` over host-window capture. Rounds land under `.acceptance/`,
  which its own `.gitignore` keeps out of git.
- **Save as you go.** Evidence written to `assets/` and cited in `result.json`
  mid-run survives a crash near the end.
- **Don't invent evidence.** Capture only the types a case declares.

## Reference map

| Need                                          | Reference                                                                                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The project layer, bootstrapping an adapter   | [project-adapter.md](references/project-adapter.md), [templates/PROJECT.md](templates/PROJECT.md)                                                                                       |
| Feature map and its checker                   | [templates/FEATURES.md](templates/FEATURES.md), [scripts/check-feature-map.mjs](scripts/check-feature-map.mjs)                                                                          |
| Mistakes checklist (read every round)         | [common-mistakes.md](references/common-mistakes.md)                                                                                                                                     |
| Forcing state, error injection, runtime probes | [probe-mock-patterns.md](references/probe-mock-patterns.md)                                                                                                                            |
| `result.json`, reviews, rendering, PR handoff | [report.md](references/report.md)                                                                                                                                                       |
| Evidence media, provenance, safety            | [evidence.md](references/evidence.md)                                                                                                                                                   |
| Interaction cost overlay                      | [interaction-cost.md](references/interaction-cost.md)                                                                                                                                   |
| Web/Electron Chromium CLI commands            | [agent-browser.md](references/agent-browser.md)                                                                                                                                         |
| Authenticated Web session                     | [auth-web.md](references/auth-web.md)                                                                                                                                                   |
| Native macOS / OS-owned step                  | [computer-use.md](references/computer-use.md)                                                                                                                                           |
| Temporal evidence: Web/Electron, iOS, native  | [recording-cdp.md](references/recording-cdp.md), [recording-ios-simulator.md](references/recording-ios-simulator.md), [recording-native-macos.md](references/recording-native-macos.md) |
| Round validator and its tests                 | [scripts/validate-round.mjs](scripts/validate-round.mjs), [scripts/validate-round.test.mjs](scripts/validate-round.test.mjs)                                                            |
