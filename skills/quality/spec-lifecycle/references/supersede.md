# Superseding a spec

Write a successor instead of rewriting history when an approved or implemented
design is abandoned: a revert, a rewrite onto a different architecture, or a
decision that the old behavior was wrong.

## New spec

Frontmatter:

```yaml
---
title: Share extension v2
status: proposed
created: 2026-09-26
supersedes: 2026-09-17-share-extension-design.md
---
```

First section, before the problem statement:

```markdown
> Supersedes [2026-09-17-share-extension-design.md](2026-09-17-share-extension-design.md).

## Background and lessons

- **What the old design assumed:** <assumption, quoted from the old spec>
- **What broke it:** <evidence — reverted PR/commit, bug, measurement, user decision with date>
- **What changes now:** <the decisions that differ, one line each>
- **What stays:** <decisions carried over unchanged, so reviewers do not re-litigate them>
```

Then the normal spec sections.

## Old spec

1. Frontmatter: `status: superseded`, `superseded-by: <new file>`.
2. One line under the frontmatter: `> Superseded by [<new file>](<new file>).`
3. Leave the body and any Implementation Record untouched. If the reason it
   was abandoned is not yet written anywhere, it goes into the new spec's
   Background and lessons, not into the old spec.

## Index

Update both rows; the Relation column reads `supersedes <date>` on the new row
and `→ <date>` on the old row. Run the checker: it verifies the two-way link.

## When not to supersede

- A deviation found during implementation that the human accepted → record it
  in the Implementation Record's Deviations table; the spec stays the same file.
- A spec that is still `proposed` → edit it in place; nothing shipped yet.
