# Rounds: `result.json`, reviews, rendering, PR handoff

A round is a self-contained local directory: the structured record
(`result.json`), the evidence it cites (`assets/`), and a `report.md` rendered
from the record. The reviewer reads `report.md` — locally or, far more often,
as a pull-request comment — with every case paired to its evidence inline:
**images render as figures, before/after pairs render side by side**. A
chat-only summary or a free-form markdown report never gets that shape; the
structured round does.

## Contents

- [Directory layout](#directory-layout)
- [Workflow](#workflow)
- [result.json schema](#resultjson-schema)
- [Validation rules](#validation-rules)
- [reviews.json](#reviewsjson)
- [Rendering report.md](#rendering-reportmd)
- [Attaching to a pull request](#attaching-to-a-pull-request)
- [Rules](#rules)

## Directory layout

```text
.acceptance/
├── .gitignore               # `*` — ignores the whole tree, including itself
└── <slug>/                  # ONE delivery; kebab-case; the same slug for every round
    ├── reviews.json         # accept/reject decisions per case id (absent until a review exists)
    └── round-<n>/           # ONE round — never write into an existing one
        ├── result.json      # THE record — report.md renders from this
        ├── assets/          # evidence referenced from cases[].evidence
        ├── interaction-trace.jsonl   # optional, see interaction-cost.md
        ├── report.md        # rendered at seal time — never hand-edited
        └── .sealed.json     # sha256 of every file at seal time
```

Three things the shape buys, none of them cosmetic:

- **The slug names the delivery**, so a directory listing answers what a reviewer
  asks first: which delivery is this, and how many rounds has it had. Pick a slug
  from the requirement (`note-export`), or the PR/branch when one exists
  (`pr-142-note-export`). Keep it for every later round.
- **A round is immutable**, so `round-<n>` is written once and sealed.
  Re-verification after a fix creates the NEXT directory; reusing one silently
  destroys the evidence a reviewer already decided against.
- **The tree is git-invisible.** `.acceptance/.gitignore` contains `*`, so
  evidence binaries never land as untracked noise and the project's own
  `.gitignore` is never rewritten. `validate-round.mjs new` seeds that file.

Writing rounds somewhere else is allowed when `PROJECT.md` says so — then keeping
them out of git is on you.

## Workflow

1. **Allocate the round** — `node <skill-dir>/scripts/validate-round.mjs new <slug>`
   prints `.acceptance/<slug>/round-<n>` (next free index). Without Node, create
   the next `round-<n>/assets/` yourself and never reuse an existing one.
2. **Write `cases[]` BEFORE you run anything.** Each case starts as
   `{ id, title, category, surface, verifier, method, expected, requiredEvidence,
   supersedes? }` with `status: "blocked"` and `observation: "not executed"`;
   a planned case you never run stays visible as blocked rather than vanishing —
   cut coverage in the open. Every case is an outcome the reader can judge — never
   a programmatic gate ([what is not an acceptance check](#what-is-not-an-acceptance-check)).
   **Copy the shapes in this file rather than reconstructing them**: a
   plausible-but-wrong nested shape parses as JSON and fails validation or, worse,
   renders with its evidence silently missing.
3. **Collect evidence into `assets/` as you test.** Screenshots must be
   **visually verified with the Read tool before being cited** — never cite an
   image you haven't looked at. For metrics, comparisons, distributions, and
   tables, use a [structured table](#structured-data) and keep the raw data as
   evidence.
4. **Fill each case as you go** — `status`, `observation`, `evidence[]`.
   `status`: `pass` / `fail` / `blocked` (couldn't run — a blocked case is not a
   pass) / `uncertain` (ran, but a required artifact is missing or inconclusive).
5. **Set `title`, `summary.verdict`** (`pass` / `fail` / `partial`) and a
   one-paragraph `summary.conclusion`.
6. **Write `notes`** — the narrative tail only: a **Verification** line for the
   programmatic gates you ran, follow-ups, coverage you cut and why, side effects.
   Do NOT repeat a case table; the renderer builds it. Write in the language the
   user is conversing in.
7. **Check, then seal.** `check <dir>` until it has no errors (treat every warning
   as a defect to resolve or explain in `notes`); `seal <dir>` renders
   `report.md` and freezes the round.

## result.json schema

```json
{
  "schema": "acceptance-round@1",
  "requirement": "Users can export all their notes as one archive.",
  "round": 1,
  "title": "Verify note export",
  "createdAt": "2026-06-11T15:30:00+08:00",
  "subject": {
    "branch": "feat/note-export",
    "commit": "3f2a9c1e7b04",
    "dirty": false,
    "pullRequest": "https://github.com/<owner>/<repo>/pull/142"
  },
  "surfaces": ["cli", "web"],
  "entry": "<cli> export --out notes.zip",
  "cases": [
    {
      "id": "export-archive",
      "title": "Export produces an archive containing every note",
      "category": "Export",
      "surface": "cli",
      "verifier": "program",
      "method": "<cli> export --out notes.zip against a 3-note fixture, then list the archive",
      "expected": "archive lists exactly 3 note files",
      "requiredEvidence": ["text"],
      "status": "pass",
      "observation": "archive listed 3 note files; exit 0",
      "evidence": [
        {
          "type": "text",
          "path": "assets/export-reasoning.txt",
          "caption": "claim, fixture, pass criteria, limits",
          "provenance": "program"
        },
        {
          "type": "text",
          "path": "assets/export-run.txt",
          "caption": "exact command, archive listing, exit status",
          "provenance": "cli"
        }
      ],
      "supersedes": []
    },
    {
      "id": "export-button",
      "title": "Export button shows progress then a download link",
      "category": "Export",
      "surface": "web",
      "verifier": "human",
      "method": "click Export on the notes page with 3 notes",
      "expected": "spinner, then 'Download notes.zip' link",
      "requiredEvidence": ["gif", "screenshot"],
      "status": "pass",
      "observation": "spinner for ~1s, then the link; clicking it downloaded a 3-file zip",
      "evidence": [
        {
          "type": "gif",
          "path": "assets/export-flow.gif",
          "caption": "click → spinner → download link",
          "provenance": "program"
        },
        {
          "type": "screenshot",
          "path": "assets/export-done.png",
          "caption": "settled state with the download link",
          "provenance": "agent-browser"
        }
      ]
    }
  ],
  "summary": {
    "verdict": "pass",
    "conclusion": "Export works end to end on CLI and web for the 3-note fixture."
  },
  "notes": "**Verification:** unit tests, type-check, and lint pass locally.\n\nFollow-up: large archives (>1k notes) were not tested."
}
```

Required: `schema`, `requirement`, `round`, `title`, `cases[]`, `summary`.
Per case required: `id`, `title`, `verifier`, `status`, `observation`,
`evidence[]` (may be empty only for `blocked`/`uncertain`). Per evidence item
required: `type`, `path` (relative to the round directory, inside it), `caption`,
`provenance`. Optional: `createdAt`, `subject`, `surfaces`, `entry`, `notes`,
`interactionCost`, per-case `category` / `surface` / `method` / `expected` /
`requiredEvidence` / `supersedes` / `table`, per-evidence `comparison`.

Counts (`pass`/`fail`/…) are derived by the renderer; do not store them.

### Closed vocabularies — the rules act on these, they are not labels

| field                       | values                                                                                                | what it does                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `verifier`                  | `human` \| `program`                                                                                  | How the verdict is reached. A command-asserted check is `program`; one judged by looking at evidence is `human`. |
| `status`                    | `pass` \| `fail` \| `blocked` \| `uncertain`                                                          | `uncertain` = required evidence missing or inconclusive; it holds the delivery like a fail.                      |
| `requiredEvidence` / `type` | `screenshot` \| `gif` \| `video` \| `audio` \| `text` \| `markdown` \| `dom_snapshot` \| `transcript` | The artifact this case **must** produce. A `pass`/`fail` whose required medium is missing is invalid.             |
| `surfaces` / `surface`      | `web` \| `desktop` \| `cli` \| `mobile` \| `native` \| `bot` (Electron → `desktop`)                   | The product surface a case ran **on**. A test kind (`unit`, `backend`) or runtime mode is not a surface.         |
| `provenance`                | `agent-browser` \| `cdp` \| `cli` \| `program`                                                        | Who produced the artifact — see [evidence.md](./evidence.md#provenance).                                         |
| `summary.verdict`           | `pass` \| `fail` \| `partial`                                                                         | `pass` only when every case passes.                                                                              |

`category` names the user-facing requirement area (e.g. `Export`,
`Rate-limit recovery`) — never a technical surface. `method` / `expected` stay
free prose; they render under the case next to the outcome. Case `id`s are
stable across rounds (`[A-Za-z0-9._-]+`): reviews and `supersedes` join on them.

### Structured data

Metrics, benchmark comparisons, distributions, and matrices are reviewed as a
table, not a picture. Put a review-sized summary on the case and keep the raw
CSV/JSON, benchmark output, trace, or profile as `evidence`:

```json
"table": {
  "columns": ["metric", "baseline", "candidate"],
  "rows": [["p95 export time (s)", 4.2, 1.9], ["archive size (MB)", 12.0, 11.8]]
}
```

The renderer emits it as a Markdown table under the case. Generate a static chart
only when a table cannot faithfully carry the result (a long time series, a
scatter), keep the data it was drawn from, and say in `observation` why a chart
was needed.

### Before/after comparison pairs

A pair is the same view in two states. Both halves carry the same
`comparison.id`, one `role: "before"` and one `role: "after"`, and a `label`
stating the measured delta:

```json
"evidence": [
  { "type": "screenshot", "path": "assets/before.png", "caption": "row before", "provenance": "agent-browser",
    "comparison": { "id": "list-row", "role": "before", "layout": "horizontal", "label": "before: 11px" } },
  { "type": "screenshot", "path": "assets/after.png", "caption": "row after", "provenance": "agent-browser",
    "comparison": { "id": "list-row", "role": "after", "layout": "horizontal", "label": "after: 12px" } }
]
```

Choose the layout by comparison intent, not by the source image dimensions:

- `horizontal` (default) — before on the left, after on the right. Use it when
  the reader should compare the same region across two versions at a glance; the
  normal choice for full-page or full-window screenshots.
- `vertical` — before on top, after below. Use it when preserving each image's
  full width matters more than simultaneous scanning, such as a very wide,
  shallow toolbar or timeline strip.

Sequential steps of a flow are ordinary ordered evidence with captions, not a
pair.

### What is not an acceptance check

The repo's own gates — tests, coverage, `type-check`, lint, format, a clean
build, "CI passes" — are never `cases[]` items, under any phrasing; they are one
line in `notes` under **Verification**. Full rule: SKILL.md.

## Validation rules

`validate-round.mjs check` enforces these; without Node, apply every one by hand
before sealing — they are the round's contract, not the script's.

1. **Shape** — required fields and closed vocabularies above; `round` equals the
   directory index; case ids unique.
2. **Requirement is immutable** — every round's `requirement` equals round 1's
   exactly.
3. **No evidence, no claim** — a `pass`/`fail` case cites at least one artifact.
4. **Coverage** — every type in a case's `requiredEvidence` is present at least
   once, each pointing at an existing, non-empty file inside the round. A missing
   type on a `pass`/`fail` is an error: capture it, or set the case `uncertain`.
5. **Programmatic gates are removed** — a case whose `title`, `category`, or
   `method` reads as a test/lint/type-check/format/build/CI gate is an error; a
   round of only such cases has no acceptance checks and is rejected.
6. **Verdict honesty** — `summary.verdict: "pass"` requires every case `pass`.
7. **Immutability** — a sealed round whose files changed since sealing is an
   error; `new` never reuses a directory.
8. **Review continuity** (warnings) — a case whose latest review is `accept`
   reappears; a non-stale reject is neither re-verified under its id nor named in
   a successor's `supersedes`.

Keyword matching is a floor, not the rule. A product-sounding check that is really
a gate ("export module is sound", method "run the suite") is still a gate —
judge it by the question in SKILL.md.

## reviews.json

The user's decisions, one file per delivery, appended in order. Write an entry
whenever the user accepts or rejects a case — in chat, in a PR review, or in a
PR comment — before starting the next round:

```json
{
  "reviews": [
    { "round": 1, "caseId": "export-archive", "action": "accept", "at": "2026-06-12T09:10:00Z" },
    {
      "round": 1,
      "caseId": "export-button",
      "action": "reject",
      "note": "download link is cut off at narrow widths",
      "source": "https://github.com/<owner>/<repo>/pull/142#discussion_r123"
    }
  ]
}
```

- The **latest** entry per `caseId` wins.
- A repair round **omits** latest-`accept` cases and **re-verifies** latest-`reject`
  cases under their exact id — or under a successor id whose `supersedes` names
  the old one, repeating the full lineage in every later round that reuses it.
- A reject is **stale** when a later round already re-verified that case id; the
  next review decides it.
- `reviews.json` records decisions the user made; never write a decision on the
  user's behalf.

## Rendering report.md

`seal` renders `report.md` from `result.json`; `pr-body --asset-base <url>`
renders the same document with every `assets/…` link rewritten to
`<url>/assets/…`. The shape, in order:

1. `# <title>`, the **Requirement**, and a provenance line (round, verdict, date,
   branch, commit + dirty flag, PR, surfaces).
2. Counts and `summary.conclusion`, then a case index table (id, title, verifier,
   status).
3. One `## <id> — <title> · STATUS` section per case: category / surface /
   verifier / required evidence / supersedes, method, expected, observation, the
   case `table`, comparison pairs (two-column table, or stacked for `vertical`),
   then remaining evidence — `screenshot`/`gif` as inline images with caption,
   everything else as a captioned link.
4. A collapsed **Interaction cost** section when a trace was priced.
5. `## Notes` from `notes`.

Without Node, write `report.md` in this shape yourself and never let it disagree
with `result.json`.

## Attaching to a pull request

When a PR exists, the round goes on it. Nothing in the PR may point at a local
path; every image or video must resolve to an uploaded URL the reviewer can open.
**Pushing evidence is a remote write — ask the user before the first push**, and
follow `PROJECT.md` if it names an evidence store.

Choose the upload method by the installed `gh` (check with `gh --version`, or
`gh pr comment --help | grep -- --attach`):

| `gh` version | Method | Result |
| --- | --- | --- |
| 2.99.0 or newer | **A. `--attach`** (default) | Files are uploaded to GitHub's attachment storage; images render inline and videos render as a player; nothing is pushed to the repository |
| older, or `--attach` unavailable (CI images, other hosts) | **B. Evidence branch** | Files live on a never-merged branch and are linked by commit SHA |

### A. Upload with `gh --attach`

Run from the round directory so the body's `assets/…` references match the
attached paths; `gh` rewrites each matched reference to the uploaded URL and
appends any attached file the body does not reference. Up to 50 files per
command; split larger rounds across a comment plus follow-up comments.

```bash
ROUND=.acceptance/<slug>/round-<n>
node <skill-dir>/scripts/validate-round.mjs pr-body "$ROUND" > "$SCRATCH/pr-body.md"
args=()
while IFS= read -r f; do args+=(--attach "$f"); done < <(node <skill-dir>/scripts/validate-round.mjs pr-assets "$ROUND")
(cd "$ROUND" && gh pr comment <pr> --body-file "$SCRATCH/pr-body.md" "${args[@]}")
```

`pr-assets` prints uploadable media (png, jpg, gif, webp, mp4, mov, webm) on
stdout and names every other evidence file on stderr. Text-like evidence
(logs, DOM snapshots, transcripts) cannot be attached: inline a short excerpt in
the case's observation and host the full file with method B, or ask the user.
If some uploads fail, `gh` still posts the comment and exits non-zero — treat
that as a failed landing and fix it in a follow-up comment.

### B. Evidence branch

A dedicated branch that is never merged, holding only round assets, linked by
commit SHA so later pushes never change what a reviewer saw. Built with a
throwaway index so your working tree and staging area are not touched:

```bash
ROUND=.acceptance/<slug>/round-<n>
EVID=acceptance-evidence
git fetch origin "$EVID" 2>/dev/null || true
IDX="$(mktemp -u)"
GIT_INDEX_FILE="$IDX" git add -f "$ROUND/assets"
TREE=$(GIT_INDEX_FILE="$IDX" git write-tree); rm -f "$IDX"
PARENT=$(git rev-parse -q --verify "refs/remotes/origin/$EVID" || true)
COMMIT=$(git commit-tree "$TREE" ${PARENT:+-p "$PARENT"} -m "evidence: <slug> round <n>")
git push origin "$COMMIT:refs/heads/$EVID"

BASE="https://github.com/<owner>/<repo>/raw/$COMMIT/$ROUND"
node <skill-dir>/scripts/validate-round.mjs pr-body "$ROUND" --asset-base "$BASE" > "$SCRATCH/pr-body.md"
gh pr comment <pr> --body-file "$SCRATCH/pr-body.md"
```

- **One comment per round.** A repair round is a new comment, never an edit of
  the previous one — the PR thread then shows the progression the way the round
  directories do. Use `gh pr edit --body-file` only when the project asks for the
  latest round in the PR description; keep earlier rounds as comments.
- **Videos**: method A renders an attached video as a player. With method B a
  repository file link plays only after a click; prefer a GIF for short flows
  and say in the caption that the MP4 is a link.
- **Verify the landing** — open the posted comment (or `gh api` its body) and
  confirm every image loads; a wrong SHA, a private-repo host the reviewer cannot
  read, or a comment over GitHub's size limit all "succeed" silently.
- **Scrub before pushing** — the same [artifact safety](./evidence.md#artifact-safety)
  rules apply to the evidence branch as to the report.

No PR: the round directory is the deliverable; the handoff names its path and
the coverage line.

## Rules

- **No evidence, no claim** — every `pass`/`fail` case links at least one asset.
- **Non-visual behavioral claims need dual text evidence** — attach a concise
  reviewer-facing reasoning document and a separate audit-facing execution
  artifact containing the exact command/request and observed values. Neither
  unsupported prose nor an unexplained log dump is sufficient.
- **Report failures faithfully** — a failing case with clear evidence is a good
  report; a vague green one is not.
- If coverage was cut, say so in `notes` — silent truncation reads as "covered
  everything".
