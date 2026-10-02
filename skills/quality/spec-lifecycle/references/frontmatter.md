# Spec frontmatter contract

Every spec file (`docs/specs/*.md`, except `README.md` and files whose name
starts with `_`, such as `_template.md`) starts with YAML frontmatter:

```yaml
---
title: Chat composer redesign
status: proposed          # proposed | approved | implemented | superseded
created: 2026-09-06
approved:                 # date, required for approved / implemented
implemented:              # date, required for implemented
supersedes:               # file name of the spec this one replaces, optional
superseded-by:            # file name of the successor, required for superseded
pr:                       # PR URL(s), optional
---
```

Field rules enforced by `check-specs.mjs`:

| Field | Rule |
| --- | --- |
| `status` | Required; one of the four values. |
| `title` | Required, non-empty. |
| `created` | Required, `YYYY-MM-DD`. |
| `approved` | Required when status is `approved` or `implemented`. |
| `implemented` | Required when status is `implemented`. |
| `superseded-by` | Required when status is `superseded`; must name an existing spec in the same directory whose `supersedes` names this file. |
| `supersedes` | When present, must name an existing spec whose status is `superseded` and whose `superseded-by` names this file. |

Body rules:

- `implemented` specs contain at least one heading
  `## Implementation Record` (optionally followed by ` (YYYY-MM-DD)`), and
  that section contains the five required subsections (see
  implementation-record.md).
- `superseded` specs keep their body. Add one line directly under the
  frontmatter: `> Superseded by [<file>](<file>).`

## Transitions

```text
proposed ──human approves──▶ approved ──record appended──▶ implemented
    │                            │                             │
    └────────── successor spec written ──────────────────────▶ superseded
```

- `proposed → implemented` directly is allowed only for small specs the human
  approved in the same conversation; set `approved` to that date and say so in
  the record.
- `superseded` is terminal. Reviving an old design means writing a new spec
  that supersedes the successor.

## Index (`docs/specs/README.md`)

One table row per spec, in date order, newest first:

```markdown
| Date | Spec | Status | Relation |
| --- | --- | --- | --- |
| 2026-09-26 | [Share extension v2](2026-09-26-share-extension-design.md) | implemented | supersedes 2026-09-17 |
| 2026-09-17 | [Share extension](2026-09-17-share-extension-design.md) | superseded | → 2026-09-26 |
```

The checker requires every spec file to appear exactly once as a link in the
index, every index link to resolve, and the Status column to match the file's
frontmatter.
