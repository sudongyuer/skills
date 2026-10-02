---
name: prompting-playbook
description: >
  Collaboration protocol for driving a coding agent through a new project or a
  large feature with short human messages: constraint-only kickoff prompts,
  numbered options for every decision, discuss-before-implement, reference
  implementations instead of long requirements, one-issue-per-message review
  feedback, and an agent self-check loop before each human review. Use when
  starting a new project or feature with the user, when brainstorming or
  choosing between approaches ("脑暴", "讨论一下", "给我几个方案", "brainstorm",
  "what are the options"), when the user sends terse review feedback on a
  build ("有点丑", "不对", "this looks off"), or when asked how to prompt an
  agent effectively ("怎么写 prompt", "kickoff prompt").
---

# prompting-playbook

The human sets constraints, picks options, and judges results. The agent
proposes, implements, and verifies. Messages from the human are expected to be
short; this skill makes short messages sufficient.

**Outcome:** decisions are made from numbered options, code starts only after
the approach is agreed, and every result shown to the human has already passed
the agent's own check.

**Out of scope:** writing specs (use a design / brainstorming skill), keeping
specs current (spec-lifecycle), evidence for acceptance (acceptance).

## 1. Kickoff: constraints, not features

When the user starts a project, turn their request into a constraint-only
kickoff. If they wrote features, extract constraints and confirm them.

A kickoff states only:

| Constraint | Example |
| --- | --- |
| Research it builds on | "Based on the feasibility study in `docs/research/…`" |
| Where and from what | "Initialize in `<path>` using `<template or reference repo>`" |
| Architecture boundaries | "All native code lives in one module" |
| What is out | "iOS only; no Android code, stubs, or build scripts" |
| Escape hatch | "When the framework cannot meet a UI requirement, write it natively" |

Features are inferred from the product noun ("an iOS client for X"). Write the
confirmed constraints into the project `AGENTS.md` in the first commit.

If a technical risk could invalidate the architecture, propose a feasibility
study or throwaway prototype **before** the kickoff and record its conclusion.

## 2. Decisions: numbered options

Whenever there is a choice the human owns (UX, scope, architecture, naming):

- Present 2–4 options, labelled `A`, `B`, `C`…; sub-choices as `A1`, `A2`.
- One line each: what it is, the main trade-off, and your recommendation marked
  `(recommended)`.
- Accept compact answers: `A`, `C2`, `A+C`, `A+C > B, D` (take A and C; B and D
  are lower priority), `not B`. Restate the decision in one line before acting.
- Use the harness's structured question tool when it exists.

## 3. Discuss before implementing

- Do not write code for an approach that has not been agreed. Explore, measure,
  or prototype outside the main branch if needed.
- When a concern appears mid-implementation (performance, platform limits),
  stop and bring it back as options; do not silently switch approaches.
- An abandoned approach is fine; an abandoned approach merged into the main
  branch is not.

## 4. Reading the human's messages

| The human writes | Interpret as | Do |
| --- | --- | --- |
| A path or repo: "参考 `<path>` 的做法" | Reference implementation | Read it first; mirror its structure; say what you adopted and what you did not |
| A correction without reasons: "you must use the native toolbar item" | Required approach | Apply it everywhere it applies; do not argue unless it breaks a stated constraint |
| A feeling: "too plain", "the purple is harsh", "no particle trails" | Aesthetic direction | Choose concrete parameters yourself; show the result; offer 2 variants if unsure |
| A long message with exact rules | Boundary conditions | Implement literally; restate edge cases back as a checklist |
| An order: "align with the system first, custom design later" | Sequencing | Keep later-phase work out of the current change |

## 5. Review feedback loop

Two loops, in this order:

1. **Inner loop (agent, before showing anything):** run the cheapest check that
   can show the problem — sampled frames or screenshots instead of a full
   render, the specific test instead of the whole suite. Fix what you find.
   Only then present.
2. **Outer loop (human):** present the result with the evidence (screenshots,
   frames, output) and at most one question.

When the human reviews, expect and encourage this shape; ask for it if missing:

- one issue per message;
- located precisely (screenshot, timestamp, screen name, file:line);
- a proposed solution when they have one — implement it as given;
- factual corrections come with the fact ("the first message was intercepted,
  not cancelled").

## 6. Facts

Values the model might "remember" (versions, API names, numbers, domain facts)
are looked up in primary sources before use, and the source is cited in the
change or spec.

## Verification

- [ ] Kickoff constraints are in `AGENTS.md`.
- [ ] Every human-owned choice in this session was offered as numbered options.
- [ ] No code landed for an approach before it was agreed.
- [ ] Every result shown to the human passed an inner-loop check first.
