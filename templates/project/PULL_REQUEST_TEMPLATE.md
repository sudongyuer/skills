<!--
AGENT-INSTRUCTIONS — follow these. Keep them commented out. Do not copy them into the
visible description. Delete them after you comply.

You are the agent preparing this pull request. Decide who wrote the change, then edit
this body.

- A person wrote the code (no agent produced the diff): fill "Summary", "UI evidence",
  "Test" and "Related"; delete the "AI" section.
- An agent produced the diff: fill every section, including "AI".
  - The repository owner may remove the "AI" section for their own PRs.
  - For any other author the "AI" section is mandatory.

When the "AI" section stays, fill all fields:
1. User prompts — every user message of the session that produced this PR, in order,
   including corrections, one fenced block per turn. Before writing them, review the
   session for secrets and private data (tokens, keys, passwords, signing material,
   Keychain items, private URLs, personal data, transcripts of third parties) and
   replace each sensitive span with `[redacted]`. Show the author the exact text and
   wait for confirmation; a public PR cannot be taken back.
2. Harness — product and version.
3. Model — the model id the session called.
4. Thinking level — the configured level, or `n/a`.

UI evidence is required for anything a person sees or touches (layout, motion,
navigation, sheets, lists, inputs, icons, color, layout-changing copy):
- Add or update a UI check, run it in light and dark with video.
- Every screenshot and video must resolve to a URL the reviewer can open. Upload
  them the way the `acceptance` skill describes ("Attaching to a pull request"):
  push the files to the never-merged `acceptance-evidence` branch with a throwaway
  index, then link them by commit SHA:
  `https://github.com/<owner>/<repo>/raw/<sha>/<path>`. Ask the author before the
  first push to that branch.
- Reference every screenshot as `![<appearance> <case> <name>](<url>)` and every
  video as `[<appearance> <case> run.mp4](<url>)` (videos open as links; they do
  not play inline). A local path, a CI log or a prose description does not count.
- Do not commit the artifacts directory to the PR branch.

Spec: if this change implements a spec, run spec-lifecycle first and link the spec.
Delete checklist lines that do not apply and say why a usual gate was skipped.
-->

## Summary

<!-- What changed and what a reviewer must know first: source of truth for generated
code, rollout order, migrations, flags. -->

Spec: <!-- docs/specs/...-design.md (status: implemented) or "none" -->

## UI evidence

<!-- One group per case and appearance. Delete only when nothing visual or temporal
changed, and say why in the summary. -->

### light / <case>

![light <case> <capture>](<url>)

[light <case> run.mp4](<url>)

### dark / <case>

![dark <case> <capture>](<url>)

[dark <case> run.mp4](<url>)

## Test

- [ ] `<lint / typecheck>`
- [ ] `<tests>`
- [ ] `<bundle / build>`
- [ ] UI checks (light and dark, video) for: <cases>
- [ ] Every screenshot and video above links to the evidence branch by commit SHA
- [ ] Spec Implementation Record appended (`spec-lifecycle`) and `check-specs` passes

Acceptance: <!-- acceptance round path / report, or why none is needed -->

## Related

<!-- Closes #123 / Refs #123 / companion PRs -->

## AI

Delete this section if a person wrote the change.

- Harness:
- Model:
- Thinking level:

### User prompts

1.

```text

```
