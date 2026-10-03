---
name: start-mobile-app
description: >
  Start a new iOS app project with the user, from an interview to the first
  feature on TestFlight: interview → feasibility study → constraint-only
  initialization (AGENTS.md drafted from reference repos and research) →
  design language → CI and TestFlight → offline UI verification → first feature
  through spec, acceptance and PR. Supports pure Swift/SwiftUI and React
  Native/Expo with a Swift kit module. Executes each phase and stops at four
  gates for the user's decision; tracks progress in docs/KICKOFF.md so a new
  session can resume. Use when the user wants to start a new mobile / iOS app
  ("开一个新的 iOS App", "新建手机项目", "做一个原生 App", "start a new mobile
  app", "new iOS project"), or to resume one ("继续开局", "continue the kickoff").
---

# start-mobile-app

Drive a new iOS project from idea to the first feature on TestFlight. You do
the work of every phase; the user decides at the gates. Talk to the user in
**Chinese**. Keep their messages short: offer numbered options, accept terse
answers (`A`, `C2`, `A+C`), restate each decision in one line.

**Outcome:** a repository whose `AGENTS.md` states the project's constraints
with their sources, CI that ships TestFlight builds, an offline UI check, and
one feature delivered through spec → implementation → acceptance → PR, with
every decision recorded in `docs/KICKOFF.md`.

**Out of scope:** Android; App Store submission (`app-store-listing`); feature
work after the first feature (`prompting-playbook`, `spec-lifecycle`,
`acceptance`).

## Locate the templates

Templates live in the skills repository this skill is installed from:

```bash
SKILL_DIR="$(cd "$(dirname "$(readlink -f ~/.claude/skills/start-mobile-app/SKILL.md 2>/dev/null || echo ~/.agents/skills/start-mobile-app/SKILL.md)")" && pwd)"
TEMPLATES="$SKILL_DIR/../../../templates/project"
[ -f "$TEMPLATES/AGENTS.md" ] || TEMPLATES="${SKILLS_REPO:-$HOME/work/skills}/templates/project"
```

If `$TEMPLATES/AGENTS.md` still does not exist, ask the user where the skills
repository is. Never invent template content when the files are missing.

## Start or resume

1. If `docs/KICKOFF.md` exists in the working directory (or the user says
   "继续开局"), read it, report the current phase and the next step in two
   lines, and continue from there. Decisions recorded there are final unless
   the user reopens them.
2. Otherwise create `docs/KICKOFF.md` from [templates/KICKOFF.md](templates/KICKOFF.md)
   once the project directory exists (phase 2), and keep the interview notes in
   the conversation until then.
3. Update `docs/KICKOFF.md` at the end of every phase and at every gate:
   status, the user's decision quoted verbatim with the date, and the next step.

## Fast path

If the user's first message already contains a feasibility question or a
constraint list (the shape of a kickoff prompt), do not run the full
interview. Map what they gave onto the interview topics, ask **one** round for
what is missing, then go to Gate 1. Details: [references/interview.md](references/interview.md).

## Phases and gates

| # | Phase | You do | Gate |
| --- | --- | --- | --- |
| 0 | Interview | Rounds of ≤4 multiple-choice questions; open questions asked alone | **Gate 1** — one-page summary |
| 1 | Feasibility | Research + throwaway prototype per risk; `docs/research/<date>-feasibility.md`; recommend a form | **Gate 2** — stack and `AGENTS.md` draft |
| 2 | Initialize | Copy templates, write approved `AGENTS.md`, first commit with constraints only | Gate 4 before creating a remote or pushing |
| 3 | Design language | "Align with the system first, signature later"; numbered directions; `docs/design-language.md`; tokens via `design-system` | **Gate 3** — design direction |
| 4 | CI and delivery | CI (lint, typecheck, tests, build); main pushes produce TestFlight builds | Gate 4 before certificates, signing, App Store Connect |
| 5 | Offline UI verification | `ios-ui-verify`: verify mode, Debug scene, first check in light/dark; rule in `AGENTS.md` | — |
| 6 | First feature | Brainstorm → spec (user approves) → implement → `acceptance` → `spec-lifecycle` → PR from template | Gate 4 before pushing and opening the PR |

Gate rules:

- **Stop at every gate.** Present the decision, numbered options with a
  recommendation, and what happens next. Use the structured question tool when
  available. Do not start the next phase until the user answers.
- **Gate 4 covers every outward action**: creating a GitHub repository,
  pushing, opening a PR, configuring Apple certificates, provisioning
  profiles, App Store Connect, TestFlight, or any paid service. Ask each time;
  approval for one action does not cover the next.
- A gate answer that changes an earlier decision updates `docs/KICKOFF.md` and,
  if it affects constraints, `AGENTS.md` in the same step.

## Phase 0 — Interview

Cover four topics: product (one sentence, users, the core interaction, what it
refuses to be), technical risks, reference projects, scale and pace. Question
bank and option sets: [references/interview.md](references/interview.md).

Gate 1: present a one-page summary (product, risks to study, references to
read, scale → MVP or long-term track, proposed form). The user confirms or
corrects.

## Phase 1 — Feasibility

1. For each risk that could invalidate the architecture, research and build the
   smallest prototype that answers it. No production code.
2. **Read the reference projects' agent files** (`AGENTS.md`, `CLAUDE.md`, and
   scoped ones) and list which conventions and rules you propose to adopt and
   which you drop, with the source of each.
3. Write `docs/research/<date>-feasibility.md`: question, method, result,
   evidence, and the constraints it implies.
4. Recommend the form — pure Swift/SwiftUI or RN/Expo + one Swift kit module —
   using [references/stack-options.md](references/stack-options.md).
5. Draft `AGENTS.md` from `$TEMPLATES/AGENTS.md`: constraints only. Every rule
   that comes from research or a reference project carries its reason, e.g.
   "Do not import X: the feasibility study found Y cannot bundle."

Gate 2: the user approves the form and the `AGENTS.md` draft rule by rule.

## Phase 2 — Initialize

1. Write a constraint-only kickoff for yourself from the approved draft (shape:
   [references/kickoff-prompts.md](references/kickoff-prompts.md)); features are
   inferred from the product noun, not listed.
2. Create the project (Xcode project or Expo app per the form) and copy from
   `$TEMPLATES`: `AGENTS.md` (approved draft), `CLAUDE.md` (`@AGENTS.md`),
   `docs/specs/README.md`, `spec.template.md` → `docs/specs/_template.md`,
   `plan.template.md` → `docs/plans/_template.md`,
   `PULL_REQUEST_TEMPLATE.md` → `.github/`, `acceptance/PROJECT.md` →
   `.agents/acceptance/PROJECT.md`, and
   `$SKILL_DIR/../../quality/spec-lifecycle/scripts/check-specs.mjs` →
   `scripts/check-specs.mjs`.
3. Large MVP vs small: if Gate 1 chose the small-MVP track, also copy
   `$TEMPLATES/doc-driven-mvp/` and use it in phases 3 and 6 instead of specs.
4. Make the first commit: constraints and scaffold only. Create
   `docs/KICKOFF.md`. Ask (Gate 4) before creating the remote or pushing.

Done when you can explain every boundary from `AGENTS.md` alone.

## Phase 3 — Design language

- Start with "我们来讨论一下这个 App 的设计语言" and propose 2–4 numbered
  directions. Order: align with system UI first; the app's signature later.
- Never imitate a native control with custom views when the platform provides
  it; use the real one.
- After Gate 3, write `docs/design-language.md` from `$TEMPLATES/design-language.md`
  and turn tokens into code with the `design-system` skill.

## Phase 4 — CI and delivery

- CI on every PR: lint, typecheck, tests, production build/bundle.
- Every push to main produces an installable TestFlight build. With Expo, use
  OTA only when the native fingerprint is unchanged.
- Signing stays enabled everywhere, including Simulator builds.
- Ask the user (Gate 4) before touching certificates, profiles, or App Store
  Connect, and tell them exactly which credentials or secrets they must add
  themselves. Never ask them to paste secrets into the chat.

## Phase 5 — Offline UI verification

Use `ios-ui-verify`: verify mode with fixtures at the service boundary, a
Debug scene, the first check (home screen) in light and dark with screenshots
and video. Add to `AGENTS.md`: "UI changes add or update a UI check."

## Phase 6 — First feature

Run the full loop once so the project's habits are established:
brainstorm with numbered options → spec in `docs/specs/` (`status: proposed`)
→ user approves → implement (ask which execution mode if a plan exists) →
`acceptance` round → `spec-lifecycle` Implementation Record → PR from the
template with evidence (Gate 4 before pushing).

When the PR is up, mark the kickoff complete in `docs/KICKOFF.md` and tell the
user which skills take over from here.

## Rules

- Facts (SDK versions, API names, Apple requirements, prices) come from
  primary sources found in this session, cited in the research doc.
- Discuss before implementing: no code for an approach that has not been
  agreed; abandoned approaches never reach the main branch.
- When a phase hits an incident, fix it and add the lesson to `AGENTS.md`
  "Rules from incidents" with its reason, in the same commit.
- Background and the reasoning behind this flow: [references/lessons.md](references/lessons.md).

## Verification

- [ ] `docs/KICKOFF.md` shows every phase complete with dated gate decisions.
- [ ] Every `AGENTS.md` rule from research or a reference project names its reason.
- [ ] The first commit contains constraints and scaffold, no feature code.
- [ ] CI is green on main and a TestFlight build exists.
- [ ] The UI check runs offline in light and dark with screenshots and video.
- [ ] The first feature's spec is `implemented`, `check-specs.mjs` passes, and
      its PR carries acceptance evidence.
- [ ] No outward action happened without a Gate 4 answer.
