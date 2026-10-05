---
name: skill-name
description: State what the skill does, every trigger condition (including Chinese phrases the user is likely to type), and which neighbouring skill to use instead for adjacent requests.
---

# Skill Title

One paragraph: the outcome this skill produces and what it does not cover.

## Operating posture

The stance in two or three sentences. Then the two failure modes, worst first:

1. <The worse failure.>
2. <The lesser failure.>

## Gate

Questions that can end the run with no output. Saying "this should not be done" is a valid result.

## Hard rules

1. <Testable rule.>
2. <Testable rule.>

## Workflow

### Phase 1 — <name>

<Steps.>

**Completion criterion:** <when this phase is done>.

### Phase 2 — <name>

<Steps.>

**Completion criterion:** <when this phase is done>.

## Required output format

| # | Severity | Location | Finding | Fix |
| --- | --- | --- | --- | --- |
| 1 | <level> | `path:line` | <what is wrong> | <change> |

**Decisions for you:** choices with more than one right answer, as numbered options with a recommendation.

**What held up:** what was checked and passed.

## Invocation variants

| Invocation | Behavior |
| --- | --- |
| `<target>` | Full workflow, then stop |
| `fix all` / `fix 1, 3` | Apply the named findings and re-verify |

## Never ship

| Never | Instead |
| --- | --- |
| <anti-pattern> | <replacement> |

## Verification

- <Read-only or non-destructive checks to run before reporting completion.>
