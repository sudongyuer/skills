# Interaction cost (GOMS-KLM)

An optional overlay for **UI rounds**: while you drive the product, record what a
person would have had to do to reach the same state. The round then carries a
_user-equivalent_ interaction cost, so a flow can be judged on what it costs to
walk, not just on whether it passed.

**Where it surfaces:** in that round's `report.md`, as its own collapsed
section after the cases. It is a decision aid for the owner of the flow, not a
case; never turn it into a pass/fail check unless the requirement names a cost
budget.

**Skip it whenever it does not apply.** A CLI or backend round has no interaction
to price. A machine without a UI driver installed (no `agent-browser`) records no
trace. In both cases you seal exactly as usual — no trace file, no cost section,
no warning. Never hand-write the numbers to fill the gap.

## The seam: you count actions, the pinned model prices them

You never compute seconds. The driver appends one JSON atom per action to
`interaction-trace.jsonl` in the round directory, carrying raw **operator
counts**; `validate-round.mjs seal` finds that file and prices it with the pinned
timing model `goms-klm@1`.

That split is the point: every round is priced by one model, and any recorded
number can be recomputed from its trace. A summary you calculated yourself is not
comparable with anyone else's.

```jsonl
{"schema":"klm-trace@1","type":"action","phase":{"id":"login","label":"Sign in"},"klm":{"category":"action","operators":{"P":1,"K":1}},"durationMs":840}
{"schema":"klm-trace@1","type":"mental_estimate","phase":{"id":"first-view"},"klm":{"category":"mental","operators":{"M":2}},"mentalEstimate":{"score":3,"confidence":0.75,"reason":"Reading the state and deciding the next action"}}
```

| Field                | Meaning                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `schema`             | Must be `klm-trace@1`; a foreign tag is not summed                        |
| `phase.id` / `label` | Groups atoms into a step of the journey; `phase.caseId` links a case      |
| `klm.operators`      | Raw counts — see the operator table below                                 |
| `klm.category`       | `action` \| `mental` \| `blocked` — `blocked` charges nothing             |
| `durationMs`         | Agent wall-clock, reported separately from the user-equivalent price      |

## Operators and the pinned model

`goms-klm@1` uses the classic Card, Moran & Newell operator times:

| Operator  | Counts                                    | Typical source                       | Seconds       |
| --------- | ----------------------------------------- | ------------------------------------ | ------------- |
| `P`       | Pointing at a target                      | `click`, drag                        | 1.10          |
| `K`       | One keystroke / button press              | `click` (the press), `press`         | 0.28          |
| `T_chars` | Characters typed                          | `fill`, `type`                       | 0.28 per char |
| `H`       | Homing between keyboard and pointer       | Switching input device               | 0.40          |
| `M`       | Mental preparation — **estimated by you** | Deciding, locating, reading state    | 1.35          |
| `R_ms`    | Measured system wait, in ms — not modeled | Navigation / load the user waits out | reported apart |

Changing a constant is a new model id, never an edit of `goms-klm@1`.

Two rules keep the number honest:

- **An action that did not happen costs nothing.** A failed, timed-out, or
  blocked command is recorded with `"category":"blocked"` and zero operators.
  Never charge a retry loop as if a person performed it.
- **`M` is an estimate, and it is yours.** Record it explicitly at the moments a
  person would actually have to think — first view of a screen, choosing between
  options, re-orienting after a state change — with a short reason. Do not
  sprinkle it on every action to inflate the total.

## Recording and sealing

Leave `interaction-trace.jsonl` in the round directory and seal normally:

```bash
node <skill-dir>/scripts/validate-round.mjs seal "$DIR"
```

Seal prices the trace and renders the cost section into `report.md`. If a trace
exists but records nothing priceable — every action blocked, for instance — the
round seals without a cost section rather than claiming a 0s journey. An explicit
`result.json.interactionCost` (`{ model, userSeconds, systemWaitSeconds,
phases[] }`) is rendered as given, so a driver that already computed a summary
with a named model is never overwritten.
