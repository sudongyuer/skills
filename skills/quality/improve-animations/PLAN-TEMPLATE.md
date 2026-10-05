# Plan template

Every plan written by `improve-animations` follows this structure. The executor
may be a less capable model with no context and no taste of its own, so the
plan contains everything, exactly. No references to "the audit above" or "the
easing we discussed".

Save it where the project's `AGENTS.md` says plans go; otherwise
`docs/plans/YYYY-MM-DD-<topic>.md`.

````markdown
# <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` when this plan was written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n files, rough size>

## Problem

What is wrong, where, and why it matters to how the product feels. Cite every
location as `path/to/file.tsx:123` and include the current code verbatim.
Current code at `src/components/dropdown.css:14`:

```css
.dropdown {
  transition: all 400ms ease-in;
}
```

## Target

The exact end state, every value spelled out: curves, durations, spring
configs, media queries. Never "use a nicer easing".

```css
.dropdown {
  transition:
    transform 200ms var(--ease-enter),
    opacity 200ms var(--ease-enter);
  transform-origin: var(--transform-origin);
}
```

If the user chose between motion options, record the chosen option here. If
the choice is still open, list the numbered options with the recommendation
and mark the plan blocked on that decision.

## Repo conventions to follow

How this codebase already does it, with one exemplar to imitate (token names,
file placement, prop patterns):

- Easing tokens live in `src/styles/tokens.css`; add new curves there, for
  example `--ease-enter: cubic-bezier(0.23, 1, 0.32, 1);`
- <exemplar file:line that already does this correctly>

## Steps

1. <One concrete edit per step: file, what changes, resulting code.>
2. …

## Boundaries

- Do not touch <files or components out of scope>.
- Change motion properties only, not markup or structure, unless a step says
  otherwise.
- Do not add dependencies.
- If a step does not match the code you find (drift since the commit stamp),
  stop and report instead of improvising.

## Verification

- **Mechanical**: <exact commands (typecheck, lint, build) with expected outcome>.
- **Feel check**: run the UI, trigger <interaction>, and confirm:
  - <observable check, for example "the dropdown scales from its trigger, not from its center">
  - <for example "spamming the toggle never restarts the animation from zero">
  - At 10% playback in the DevTools Animations panel, <detail>.
  - With reduced motion enabled, movement is replaced by a fade and opacity
    feedback remains.
- **Done when**: <machine- or eye-checkable completion criteria>.
````

## Notes for the plan author

- One plan per finding. Findings that share every file and the same fix
  pattern (the same easing token swap across components) may share a plan.
- Take every value from
  [motion-standards](../../design/emil-design-eng/references/motion-standards.md)
  or from the repo's existing tokens; never approximate from memory.
- Code samples in a plan carry no comments; put explanations in the prose
  around them.
- The feel check is required. Motion can be mechanically correct and still
  feel wrong; give the executor, or the person reviewing the executor's diff,
  concrete things to watch for in slow motion.
