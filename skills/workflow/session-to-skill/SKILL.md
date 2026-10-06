---
name: session-to-skill
description: >
  Turn a finished engineering session into zero or more reusable agent skills
  plus project-local documentation (project AGENTS.md rules, spec
  Implementation Records, docs) and, when warranted, cross-project global
  rules. Classifies session evidence, gates each skill candidate against seven
  semantic tests, scaffolds accepted skills into a skills repository, and
  reports what went where. Use when the user asks to "turn this session into a
  skill", "沉淀成 skill", "沉淀一下这次的折腾", "productize this session", or
  "extract reusable lessons" from completed work.
---

# session-to-skill

Turn session evidence into the durable outputs it actually deserves:

- zero or more **skills** that let a future agent execute a reusable capability;
- **project documentation** for facts and conventions that stay local to one repository;
- **global rules** for short cross-project behavioral corrections.

Do not force a skill. Zero accepted skills is a valid, common result. This
skill does not write blogs, articles, or other narrative write-ups.

## Configuration

The skills repository path resolves from `$SKILLS_REPO`, else from
`skill_repo_dir` in `~/.config/skills/config.json`:

```json
{ "skill_repo_dir": "~/path/to/skills-repo" }
```

There is no default path; `resolve-skill-repo.sh` fails with instructions when
neither is set. The repository is expected to have `skills/<domain>/<name>/`,
an optional `templates/SKILL.template.md`, and a `README.md` with one table per
`### <Domain>` heading. Domains: `workflow`, `quality`, `mobile`, `design`,
`engineering`, `research`, `infrastructure`.

## Scripts

Define `$S` once per session. The first candidate containing
`resolve-skill-repo.sh` wins:

```bash
S=""
for cand in \
  "$HOME/.claude/skills/session-to-skill/scripts" \
  "$HOME/.agents/skills/session-to-skill/scripts" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/skills/workflow/session-to-skill/scripts"
do
  [ -n "$cand" ] && [ -f "$cand/resolve-skill-repo.sh" ] && {
    S="$(cd "$cand" && pwd)"; break
  }
done
[ -n "$S" ] || { echo "error: cannot locate session-to-skill/scripts" >&2; exit 1; }
REPO="$(bash "$S/resolve-skill-repo.sh")"
```

| Script | What it does |
| ------ | ------------ |
| `resolve-skill-repo.sh` | Print the absolute skills-repo path (`$SKILLS_REPO` → config → error). |
| `scaffold-skill.sh <domain> <name> "<purpose>"` | Validate inputs, create `skills/<domain>/<name>/SKILL.md` from the template (or an inline stub), insert the README row alphabetically under `### <Domain>`, `git add`. Never commits. |
| `test-scaffold-skill.sh` | Behavioral test of both scripts against a throwaway repo. |

## Workflow

```text
[0] Intake: is a skill wanted? (required / none / defer)
[1] Inventory and classify session evidence
[2] State and gate each capability thesis
       intake = none ──> skip to [4] (still route docs and rules)
       rejected ──> project docs / global rule / discard
       accepted ──> one coherent skill each
[3] Scaffold, author, validate, commit accepted skills (no push)
[4] Report what went where
```

### [0] Intake

If the triggering message already says whether a skill is wanted, record it
and continue. Otherwise ask exactly one question, using `AskUserQuestion` (or
the runtime's equivalent interactive tool) when available, else in chat, and
wait for the answer:

> Should this session produce a skill?

| Option | Record as | Effect |
| ------ | --------- | ------ |
| Yes | `required` | Run [2]–[3]; a failing gate still yields no skill |
| No | `none` | Skip [2]–[3]; route only docs and rules |
| Decide from the material | `defer` | The gates in [2] decide |

Do not invent further questions.

### [1] Inventory and classify

Collect decision points, failed assumptions, symptom-to-cause evidence,
commands, reusable procedures, safety boundaries, verification results, and
project-local facts. Classify each item by its future function:

| Destination | Include | Exclude |
| ----------- | ------- | ------- |
| Code or check (type, module boundary, lint rule, CI step, hook) in the affected repository | A constraint a machine can enforce, so no rule has to carry it | Taste calls that vary case by case |
| Skill | Repeatable action, decision boundary, non-obvious constraint, and observable proof | Session chronology and personal reflection |
| Project documentation (project `AGENTS.md` rule, spec Implementation Record, or docs) | Repository-specific ownership, commands, architecture, invariants, and persistent local conventions | General reusable workflow |
| Global rule (`~/.claude/CLAUDE.md`) | Short cross-project behavioral rule the agent must always follow, independent of any repository | Procedures, repository facts, anything needing more than a few lines |
| Discard | Session chronology, personal reflection, dead ends with no future signal | — |

Treat code or configuration length only as a resource-planning signal. It is
not evidence that a skill should exist.

### [2] State and gate the capability thesis

Skip if intake recorded `none`.

Write this sentence before scaffolding any candidate:

> This skill helps an agent **[action] [target]** when **[trigger]**, while
> preserving **[constraint]**, and verifies success through **[observable
> outcome]**.

Reject or redirect the candidate unless every gate passes:

| Gate | Pass condition | If it fails |
| ---- | -------------- | ----------- |
| Triggerability | A concrete future user request can activate it. | Redirect to project docs, or a global rule if it is an always-on behavior. |
| Repeatability | The action or decision is likely to recur. | Record it in project docs, or discard. |
| Knowledge delta | It teaches non-obvious procedure, local integration, or a hard-won failure boundary. | Do not create a skill; discard or note in project docs. |
| Coherence | It has one trigger family, one operational target, and one primary outcome. | Split independent capabilities. |
| Verifiability | Success is externally observable. | Treat it as reference material in project docs. |
| Stability | The core method survives routine version changes. | Move volatile facts to references or project docs. |
| Boundary clarity | It states exclusions and stopping conditions. | Narrow the capability. |

**Naming.** Use a concise, verb-led name with a concrete target:
`split-dokploy-traffic-safely` over `traefik-notes`,
`migrate-nextjs-rsc-under-cdn-constraints` over `nextjs-migration`.
Lowercase kebab-case.

Keep one thesis per skill. Split when triggers, targets, or completion
criteria can vary independently.

**Rule escalation.** Before writing any rule, ask whether code structure or a
static check, CI step or hook could enforce it instead; prefer those. For what
remains a rule or a skill, place it at the narrowest scope that covers every
case. Both decisions follow
[correction-layers.md](../escalate-correction/references/correction-layers.md);
for a single correction use `escalate-correction`. Never duplicate one rule
across layers or scopes.

**Resources.** Plan bundled resources by function, not line count:

| Resource | Add when |
| -------- | -------- |
| `scripts/` | An operation is deterministic, fragile, or repeatedly rewritten. |
| `references/` | Schemas, protocols, detailed examples, or volatile facts would obscure the operational core. |
| `assets/` | The skill must copy or transform an output resource. |

Do not create empty resource directories.

### [3] Scaffold, author, validate, commit

```bash
bash "$S/scaffold-skill.sh" <domain> <skill-name> "<one-line purpose>"
```

Run once per accepted capability. Author the skill as an execution interface
for a future agent, not a retelling of the session. Write skills in English.

Every generated skill requires:

| Required element | Standard |
| ---------------- | -------- |
| Frontmatter | `name` and `description`, plus `argument-hint` or `disable-model-invocation: true` where the repository allows them. Put the capability and all trigger conditions in `description`; no body-level "When to use" section. |
| Capability boundary | Outcome, prerequisites, exclusions, and stopping conditions. |
| Operational core | Shortest sufficient procedure or decision path in dependency order, as imperative instructions. |
| Verification | Proof of the externally meaningful outcome, including safety checks where relevant. |

Add these only when they carry real operational information:

| Conditional element | Add when |
| ------------------- | -------- |
| Decision table | Multiple conditions select different actions. |
| Flow or architecture diagram | Ownership, sequence, or data flow is hard to follow linearly. |
| Pitfalls | Observed failures have recognizable symptoms and actionable fixes. |
| Rollback | The procedure changes external or hard-to-recover state. |
| Examples | An example materially clarifies input, output, or a decision boundary. |

No empty sections, no generic technical knowledge, main file under 500 lines;
use progressive disclosure for details.

Validate each folder with the available skill validator (and any repository
hooks), then commit:

```bash
cd "$REPO" && git add "skills/<domain>/<skill-name>" README.md \
  && git commit -m "feat: add <skill-name> skill"
```

Do not push unless the user asks.

Also write the project documentation and global rules classified in [1], in
their owning files, following that repository's contribution rules.

### [4] Report

Tell the user, per destination: code or checks proposed, accepted skills (path, commit), rejected
candidates and the gate each failed, project documentation written (file and
section), global rules added, and what was discarded. State that nothing was
pushed unless they asked.

## Failure boundaries

| Mistake | Fix |
| ------- | --- |
| Skipping intake when the trigger did not answer it | Ask the one intake question before [1]; use the interactive tool when it exists. |
| Authoring a skill after intake `none` | Skip [2]–[3]. |
| Forcing a session to yield exactly one skill | Apply the gates; allow zero, one, or several skills. |
| Deriving skill scope from the session's story | Define a future trigger, action, boundary, and observable outcome. |
| Creating a skill because the session contains long code | Require repeatability and a non-obvious knowledge delta first. |
| Combining independent triggers in one skill | Split by trigger family, target, and completion criterion. |
| Copying session chronology into SKILL.md | Keep only the executable method and decision boundaries. |
| Adding empty workflow, pitfalls, or diagram sections | Include conditional sections only when they improve execution. |
| Repeating trigger rules in a body-level "When to use" section | Put all triggering information in the frontmatter description. |
| Large deterministic procedures inline in SKILL.md | Move them to `scripts/`; move supporting detail to `references/`. |
| Putting a repository-only fact in a skill or global rule | Put it in that repository's `AGENTS.md`, spec, or docs. |
| Escalating a rule to global without cross-project evidence | Keep it in the project `AGENTS.md`. |
| `--no-verify` to bypass a repository hook | Fix the root cause. |
| Hardcoding the skills repo path in shell | `bash "$S/resolve-skill-repo.sh"`. |
| Locating `$S` via one path only | Use the search loop above. |
| Pushing without being asked | Commit only; push on explicit request. |
| Skill written in a language other than English | Write skills in English. |

## Verification

- [ ] `$S` resolved via the search loop; `resolve-skill-repo.sh` printed a real directory before any write.
- [ ] Intake answer recorded (or present in the trigger) before [1].
- [ ] Skill work skipped when intake said `none`; gates applied when `required` or `defer`.
- [ ] Every evidence item classified as code or check, skill, project documentation, global rule, or discard.
- [ ] Every skill has a capability thesis and passes all seven gates.
- [ ] Every skill has one trigger family, one operational target, and one primary observable outcome.
- [ ] Frontmatter holds only the keys the repository allows; the description carries all trigger conditions.
- [ ] The body has capability boundary, operational core, and verification, with no empty conditional sections, under 500 lines.
- [ ] Scripts, references, and assets exist only when they improve deterministic reuse or progressive disclosure.
- [ ] Each guarantee sits at the lowest enforcement layer that holds (structure → check → rule → skill → review), and each rule at the narrowest scope, with no duplicates.
- [ ] Every accepted skill passed validation and repository hooks and is committed; nothing pushed unless requested.
- [ ] The final report lists what went where, including rejected candidates and their failing gate.
