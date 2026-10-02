# CLI / backend surface

The default surface for backend, CLI, library, and data-logic changes. The proof
is the command's own output — text, not pixels. This is the cheapest and strongest
evidence: a passing assertion or a correct JSON result is harder to fake than a
screenshot, and it runs anywhere (no browser, no display).

Use this surface when your change is verifiable by running something and reading
what it prints. Return to the surface router only when the criterion is actually
about rendered UI.

## How to verify

1. Run the command, test, or query that exercises the change. Prefer a machine
   output mode (`--json`, a structured dump) so the proof is assertable, not prose.
2. Write the output into the round's `assets/` and cite it as `text` evidence,
   together with a short reasoning artifact (claim, fixture, pass criteria,
   limits) — non-visual claims carry both.

```bash
# $DIR is the round directory from `validate-round.mjs new`.
{ echo '$ your-cli command --json'; your-cli command --json; echo "exit=$?"; } \
  > "$DIR/assets/command-run.txt" 2>&1

# a script that asserts the product behavior is itself proof (verifier: program)
./scripts/assert-new-field.sh > "$DIR/assets/assert-new-field.txt" 2>&1
```

```json
"evidence": [
  { "type": "text", "path": "assets/new-field-reasoning.txt", "caption": "claim, fixture, pass criteria", "provenance": "program" },
  { "type": "text", "path": "assets/command-run.txt", "caption": "command reports the new field; exit 0", "provenance": "cli" }
]
```

Provenance: `cli` for command stdout, `program` for a script you ran. A green
test suite is not a case — it is one **Verification** line in `notes` (SKILL.md,
HARD RULE). See [../references/evidence.md](../references/evidence.md) for the
evidence contract.

## Auth

A product CLI under test carries its own auth (API key or stored login) —
configure it per `PROJECT.md` §3 before capturing its output, and verify the
credential belongs to the intended test environment.

## Boundaries

- **Don't open a browser for a backend change.** If the criterion is satisfied by
  output, a screenshot adds noise, not proof.
- **Make the assertion legible.** Cite the specific lines/fields that prove the
  criterion (or name them in the caption), not a 10k-line log the reviewer must
  scan.
- **Never record secrets.** Strip tokens/keys from output before writing it to
  `assets/` — see
  [../references/evidence.md](../references/evidence.md#artifact-safety).
