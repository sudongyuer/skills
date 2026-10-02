# New project checklist

Work through these in order. Each step names what "done" means.

## 0. Feasibility before architecture

- [ ] List the technical risks that could invalidate the architecture (a
      dependency that may not bundle, a protocol you have not called from this
      platform, a performance ceiling).
- [ ] Ask the agent for a feasibility study plus a throwaway prototype for each.
      One question is enough, e.g. "Is it feasible to build X as a
      <platform>-only app on top of <existing code>?"
- [ ] Record the conclusions in `docs/research/<date>-feasibility.md`. Each
      conclusion that constrains the design becomes a rule in step 1.

Done when every risk has a verified answer or an accepted fallback.

## 1. First commit: constraints, not features

- [ ] Write the kickoff prompt with constraints only (see `prompting-playbook`):
      research it builds on, location and template, architecture boundaries,
      what is out of scope, the escape hatch.

      Example of the shape:

      > Based on the research in `docs/research/2026-09-05-feasibility.md`,
      > initialize the project in `../my-app` using the architecture of
      > `<reference repo>`. All native modules live in a single kit module.
      > Do not consider Android. Anything the framework cannot deliver at the
      > required quality is written natively in Swift.

- [ ] The first commit contains `AGENTS.md` (from `templates/project/AGENTS.md`),
      `CLAUDE.md` (`@AGENTS.md`), `docs/specs/README.md`,
      `docs/specs/_template.md` (from `spec.template.md`),
      `docs/plans/_template.md` (from `plan.template.md`), and
      `scripts/check-specs.mjs` (copied from the `spec-lifecycle` skill).

Done when the agent can explain every boundary from `AGENTS.md` alone.

## 2. Discuss before implementing

- [ ] For every screen or subsystem, start with "Let's discuss the current
      <X>" and let the agent propose numbered options; choose with short
      answers (`A+C`, `B2`).
- [ ] Large features get a spec (`status: proposed`) and your approval before
      code. Point at reference implementations instead of writing long
      requirements.
- [ ] Abandoned approaches never reach the main branch.

## 3. Day one: CI and delivery

- [ ] CI runs lint, typecheck, tests, and a production bundle/build on every PR.
- [ ] Every push to the main branch produces an installable build (TestFlight /
      internal track / preview URL). Use OTA updates only when the native
      fingerprint is unchanged.

Done when someone else can install today's build.

## 4. Day two: offline UI verification

- [ ] Verify mode with fixtures at the service boundary; Debug scenes; first
      UI case running in light and dark with screenshots and video (see
      `ios-ui-verify`).
- [ ] `AGENTS.md` rule: UI changes add or update a UI check.
- [ ] PR template requires the screenshots and recordings.

## 5. Every feature

- [ ] Acceptance evidence for each user-visible change (see `acceptance`).
      Once per project: copy `acceptance/PROJECT.md` to
      `.agents/acceptance/PROJECT.md` and fill in how to run the app.
- [ ] Implementation Record appended to the spec before the PR (see
      `spec-lifecycle`).

## 6. Every incident

- [ ] Fix the bug, then add the rule in the same commit: project-specific →
      `AGENTS.md` "Rules from incidents"; true for every project → global
      `~/.claude/CLAUDE.md`; a repeatable procedure → a skill
      (`session-to-skill`).
