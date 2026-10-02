# Implementation Record template

Append at the very end of the spec. Keep the five subsections, in this order,
with these exact headings (the checker looks for them). Write `None.` for an
empty subsection instead of deleting it.

```markdown
## Implementation Record (YYYY-MM-DD)

PR: <url or "not opened yet"> · Commits: <base>..<head>

### What was built
- <One bullet per shipped capability, with the owning file or module.>
  Evidence: <commit / file:line>

### Deviations from the design
| Design said | Shipped | Why | Confirmed by |
| --- | --- | --- | --- |
| <quote or section> | <what exists now> | <evidence-backed reason> | <human, date> or "not intent-changing" |

### Bugs fixed during implementation
- **Symptom:** <what was observed>
  **Root cause:** <the actual cause, not the first guess>
  **Fix:** <change> (<commit>)

### Verification
- <command or check> → <result> (<log / artifact / report path or PR attachment>)
- <UI evidence: screenshot or recording reference, light/dark if relevant>

### Known limits
- <What does not work yet, ceilings, unhandled cases, follow-ups with issue links>
```

## Evidence rules

- A bullet without a reference is not a fact. Either add the reference, mark it
  `Unverified:`, or remove it.
- Acceptable references: commit SHA, `path:line`, test name with the command
  that ran it, artifact path committed or attached to the PR, issue/PR URL,
  a quoted user decision with its date.
- Numbers (timings, sizes, counts) come from a run in this session or a cited
  artifact, never from memory.
- A deviation that changes intent needs a named human confirmation in the
  "Confirmed by" column. If you do not have one, stop and ask.
- Plan-execution ledgers (`Ruling: <decision> — <why> — <cost if wrong>`) map
  to the Deviations table: decision → Shipped, why → Why, cost-if-wrong →
  Known limits when it is still open.

## Example (abridged)

```markdown
## Implementation Record (2026-09-16)

PR: https://github.com/acme/app/pull/58 · Commits: 1a2b3c4..9f8e7d6

### What was built
- Steer sequences are grouped by provider turn id; user guidance stays
  outside the process summary. Evidence: `src/features/steer/group.ts:12-88` (9f8e7d6)

### Deviations from the design
| Design said | Shipped | Why | Confirmed by |
| --- | --- | --- | --- |
| Group by time adjacency as a fallback | No fallback; ungroupable history stays split | Adjacency merged unrelated turns in fixture `steer-cancel.json` | user, 2026-09-16 |

### Bugs fixed during implementation
- **Symptom:** a cancelled steer merged into the next normal turn.
  **Root cause:** the queue consumed the cancelled message before the link was written.
  **Fix:** write the steer link before cancelling (4c5d6e7).

### Verification
- `pnpm test tests/steer` → 14 passed (CI run linked in PR)
- UI check `steer-group` light/dark screenshots + run.mp4 attached to PR #58

### Known limits
- Providers without turn ids are never grouped (#61).
```
