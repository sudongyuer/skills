# Cross-surface evidence contract

This reference defines the artifact contract shared by every surface. Capture
commands belong to the selected surface guide; do not load another surface's
instructions merely to learn how to cite an artifact.

Every artifact is a file under the round's `assets/` directory, cited from its
case as `{ "type", "path", "caption", "provenance" }` (schema in
[report.md](./report.md#resultjson-schema)). Write captures there directly —
`$DIR` below is the round directory printed by `validate-round.mjs new`.

## Evidence media

| Type           | Use when                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `text`         | Command output, logs, focused request/response data, or computed assertions prove the criterion   |
| `markdown`     | Reviewer-facing prose (a reasoning write-up, structured findings) should render as body text      |
| `dom_snapshot` | Structured content is stronger and smaller than pixels                                            |
| `screenshot`   | A settled visual state, layout, or native rendering is the claim                                  |
| `gif`          | A short temporal state should render inline, usually no more than about 10 seconds                |
| `video`        | A longer animation, transition, gesture, or multi-step flow needs a player and better compression |
| `audio`        | The deliverable is something the user **hears** — TTS output, a voice reply, an alert tone        |
| `transcript`   | A conversation, event stream, or request log is itself the proof                                  |

The declared `requiredEvidence` type is binding. Do not replace a required video
with a final screenshot or a required DOM snapshot with prose.

## Audio deliverables

A sound cannot be verified in prose, and a waveform screenshot proves only that
a file exists. Attach the clip itself as `type: "audio"` so the reviewer can play
it.

```jsonc
// The generated file is the evidence — attach the artifact the feature produced,
// not a re-encode and not a screenshot of the player.
{
  "type": "audio",
  "path": "assets/tts-output.mp3",
  "caption": "TTS output for the sample sentence, female voice, 2.4s",
  "provenance": "program"
}
```

- Use a common container (`mp3` / `wav` / `m4a` / `aac` / `flac` / `ogg` /
  `opus`) so the reviewer's player opens it.
- **Listen before citing it.** Confirm the clip is non-silent and is the right
  content (duration + a transcription pass, or a spectral check) — an empty or
  truncated file looks identical to a good one in the file list.
- Pair the clip with a short `text` artifact when the claim is about _what was
  said_ (the input text, the voice/model, the measured duration). The player
  proves it plays; the text artifact makes it auditable.
- Capture what the product produced. A screen recording with system audio is a
  fallback for "the UI plays it at the right moment" — for "the output is
  correct", attach the file itself.

## Dual text evidence for non-visual behavior

CLI, API, backend, policy, security, and migration claims normally need two
separate `text` artifacts on the same case:

1. A reasoning artifact: claim, setup or threat model, method, pass criteria,
   interpretation, and limitations.
2. An execution artifact: exact command or request, relevant raw observations,
   exit/status values, and a short mapping back to the pass criteria.

Keep both artifacts in the current immutable round. Do not ask a reviewer to
join an explanation from an older round with fresh execution output.

## Files and captions

- Every artifact is a file — write even a one-line assertion to
  `assets/<name>.txt`. A path outside the round directory, or an empty file, is
  not evidence.
- Name files for what they show (`export-done.png`, not `shot3.png`).
- Keep the caption factual: identify the action, observed state, and relevant
  target. Do not place the verdict in the caption; the case `status` carries it.

```bash
your-cli export --json > "$DIR/assets/export-run.txt" 2>&1; echo "exit=$?" >> "$DIR/assets/export-run.txt"
agent-browser --session app screenshot "$DIR/assets/export-done.png"
```

## Provenance

Set `provenance` to the producer named by the selected surface guide:
`agent-browser` (captured through the agent-browser CLI), `cdp` (a direct CDP
client), `cli` (a shell command's own output or an OS capture tool), or
`program` (a deterministic test, script, or media transform such as an
FFmpeg-assembled GIF). Use the direct capture source for an unmodified artifact.
Do not infer provenance from the file extension.

## Artifact safety

- Inspect every image, clip, and generated document before citing it.
- Never include credentials, cookies, tokens, private user data, unrelated host
  windows, or notifications — the round may be pushed to a PR.
- Prefer a focused artifact over an unfiltered log or full-session recording.
- Retain the raw source when citing a derived chart, contact sheet, GIF, or
  edited comparison image.
