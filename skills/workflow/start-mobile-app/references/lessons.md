# Why the flow looks like this

Lessons from projects built quickly with coding agents, and which step of
this skill each one shaped. Load when the user asks why a step exists or wants
to skip one.

## Observed in practice

- **Ask the feasibility question first.** One question ("is building this as
  an iOS-only app on top of the existing code feasible?") plus a research and
  prototype pass decided the architecture: the finding that the official SDK
  would not bundle produced the design every later choice depended on.
  → Phase 1.
- **The kickoff states constraints, not features.** Architecture, module
  boundary, what is out, and the escape hatch; features were inferred from the
  product noun. The first commit arrived hours later with a working MVP.
  → Phase 2, `kickoff-prompts.md`.
- **Constraints come from the environment the agent reads.** The first
  `AGENTS.md` copied the conventions of the repository that was researched
  (a `CLAUDE.md` pointing at `AGENTS.md`, terse "do not" rules) and rules from
  the developer's earlier app (iOS only; never disable signing), and it turned
  research findings into rules with their reasons. That happened implicitly.
  This skill makes it explicit: read the references, cite each adopted rule,
  and let the user approve the draft. → Phase 1 step 2, Gate 2.
- **Short messages, numbered options.** On day one most user messages were a
  few words: point at a problem, the agent judges, the user decides. Long
  messages appeared only for exact interaction rules with boundary conditions.
  → Interview format, all gates, `prompting-playbook`.
- **Point at a working implementation instead of writing requirements.**
  "Follow the component design in <path>" was more precise than a long spec,
  at the cost of the agent reading that project first. → Interview round 2.
- **Align with the system first, signature later.** Faked native controls
  were rejected on screenshots; the platform's real component was required.
  → Phase 3.
- **Discuss before implementing.** An approach abandoned after half a day of
  discussion left no trace on the main branch because no code had landed.
  → Gates, Rules.
- **Ship and verify from the first days.** CI and TestFlight on day one;
  offline UI verification on day two; acceptance evidence per feature. Fast
  generation without automated verification shifts the cost to manual testing.
  → Phases 4–6.
- **Rules grow from incidents.** The project rule file grew from about 40 lines
  to over 11 KB, each addition tied to a concrete failure; rules true in more
  than one project moved to the global configuration. → Rules section.
- **Specs drift.** In one project only 2 of 21 specs ever recorded what was
  actually built. → Phase 6 uses `spec-lifecycle`.

## Cautions

- The speed is real and so is the fatigue: many parallel sessions, constant
  context switching, less deep understanding of one's own code. Keep the gates
  meaningful rather than rubber-stamped, and keep some work hands-on.
- Pre-AI engineering judgment is what steers the agent; without it, fast
  output accumulates code nobody can maintain.
