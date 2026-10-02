---
name: spec-lifecycle
description: >
  Keep design specs truthful across their whole life: status frontmatter
  (proposed / approved / implemented / superseded), an evidence-based
  Implementation Record appended after a feature is built and before its PR,
  supersede-don't-delete when a design is overturned, and a one-line-per-spec
  index checked by a script. Use when a feature that has a spec is finished
  ("done", "ready for PR", "open a PR", "wrap up", "收尾", "提 PR"), when a spec
  is approved, when an approach is abandoned or replaced ("推翻", "换方案",
  "supersede"), when creating a new spec, or when asked to check or repair
  docs/specs.
---

# spec-lifecycle

A spec states intent before code exists. After the code exists, the spec must
also say what actually shipped, where it differs, and what broke on the way.
This skill owns that transition. It never rewrites the original design text
to match the implementation.

**Outcome:** every spec has a valid status; every `implemented` spec ends with
an Implementation Record backed by evidence; every overturned spec points to
its successor; `docs/specs/README.md` lists every spec; `check-specs.mjs`
passes.

**Out of scope:** writing the design itself (use a brainstorming / design
skill), writing plans, reviewing code quality.

## Locations

Default layout (a project `AGENTS.md` may override it; follow the override):

```text
docs/specs/README.md                     index, one row per spec
docs/specs/YYYY-MM-DD-<topic>-design.md  specs
docs/plans/YYYY-MM-DD-<topic>.md         implementation plans
```

Resolve the checker once per session:

```bash
CHECK=""
for cand in \
  "$HOME/.claude/skills/spec-lifecycle/scripts/check-specs.mjs" \
  "$HOME/.agents/skills/spec-lifecycle/scripts/check-specs.mjs" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/scripts/check-specs.mjs"
do [ -f "$cand" ] && { CHECK="$cand"; break; }; done
[ -n "$CHECK" ] || { echo "check-specs.mjs not found" >&2; exit 1; }
node "$CHECK" --dir docs/specs
```

## Status model

| Status | Meaning | Who moves it here |
| --- | --- | --- |
| `proposed` | Written, not yet agreed | Author when the spec is created |
| `approved` | The human agreed to build this design | Only after explicit human approval in the conversation or PR |
| `implemented` | Built; Implementation Record appended | This skill, after the record passes the evidence rules |
| `superseded` | Replaced by another spec; kept for history | This skill, when a successor spec exists |

Frontmatter contract and transition rules: [references/frontmatter.md](references/frontmatter.md).
Never mark `approved` on your own judgment. Never delete a spec.

## Workflow A — feature finished, before the PR

Run this when implementation of a spec'd feature is complete, before opening
or updating its PR. If the project `AGENTS.md` names this step, it is
mandatory, not a suggestion.

1. **Find the spec.** From the plan's `Spec:` link, the branch's changed files,
   or the index. No spec → say so in the PR description and stop.
2. **Collect evidence first, write second.** Gather, from this session and the
   repository:
   - `git log --oneline <base>..HEAD` and `git diff --stat <base>..HEAD`;
   - test / check commands actually run and their results;
   - verification artifacts (screenshots, recordings, acceptance reports);
   - bugs fixed during the work (symptom → root cause → fix, with commit);
   - if executed with a plan-execution skill that keeps a decision ledger
     (for example superpowers `executing-plans` / `subagent-driven-development`),
     copy its `Ruling:` lines and deferred findings **before its workspace is
     deleted**; the final report's "Rulings I made" / "Deferred minors" lists
     are the fallback source.
3. **Compare against the design.** For each decision in the spec, classify:
   as designed / changed / dropped / added.
4. **Stop and ask** before writing anything if a deviation changes design
   intent: a user-visible behavior, a guarantee, a data contract, a scope
   item in "do" or "don't do", or a security / privacy property. Present the
   deviation, the evidence, and the options (accept and record / revert to the
   design / write a superseding spec). Wait for the answer.
5. **Append the Implementation Record** at the end of the spec, using
   [references/implementation-record.md](references/implementation-record.md).
   Every bullet cites evidence (commit, file:line, test name, artifact path, PR
   link). A claim without evidence is written as `Unverified:` or left out.
6. **Update status** to `implemented`, set `implemented: <date>`, and add the
   PR link when known.
7. **Update the index row** in `docs/specs/README.md`.
8. **Run the checker** and fix every finding. Commit the spec change together
   with the feature (same PR).

## Workflow B — a design is overturned

When an approach is abandoned after it was approved or implemented (a revert,
a rewrite, a "this was wrong" decision):

1. Write a **new** spec; never edit the old one into the new design.
2. The new spec starts with `supersedes: <old file>` in frontmatter and a
   **Background and lessons** section: what the old design assumed, what
   evidence broke it (commits, reverts, bugs), what the new design changes.
   Details: [references/supersede.md](references/supersede.md).
3. Set the old spec to `status: superseded` and `superseded-by: <new file>`;
   add one line at its top pointing to the successor. Keep its body intact.
4. Update both index rows; run the checker.

## Workflow C — new spec or repair

- **New spec:** create from the project's spec template with
  `status: proposed`, add the index row, run the checker.
- **Approval:** when the human approves, set `status: approved` and
  `approved: <date>`; note where approval was given.
- **Repair / audit** ("check the specs"): run the checker, fix mechanical
  findings (index rows, broken links); for `implemented` specs missing a
  record, collect evidence from git history and follow Workflow A steps 2–7;
  report anything that needs a human decision.

## Rules

- The design body is history. Corrections go into the record, not into the
  design text. Typos and broken links may be fixed in place.
- One record per implementation pass. A later pass appends a new dated
  `## Implementation Record (YYYY-MM-DD)` section; earlier records stay.
- Evidence beats memory. Do not reconstruct numbers, versions, or test results
  from recollection; re-run or cite.
- Keep the record short: facts, links, and limits. Narrative belongs in a PR
  description or a blog post.

## Verification

- [ ] `node check-specs.mjs --dir docs/specs` exits 0.
- [ ] The record's every bullet has an evidence reference or an explicit
      `Unverified:` marker.
- [ ] Intent-changing deviations were confirmed by the human, and the record
      says so.
- [ ] Superseded specs still exist and point to a successor that points back.
