# FEATURES.md — feature map for <project name>

<!--
Copy to <repo>/.agents/acceptance/FEATURES.md. One row per user-visible feature.
Keep the five columns and their order: scripts/check-feature-map.mjs parses them.
Files: backticked repo-relative paths, a trailing slash for a directory, `*` and `**`
globs allowed. Every path must exist; `check` fails otherwise.
Update a row in the same change that moves, adds or removes the feature's files.
-->

| Feature | Surface | Entry | Files | Verify |
| --- | --- | --- | --- | --- |
| <Note export> | <web> | <`/notes/:id` → ⋯ menu → Export> | `<src/notes/export.ts>`, `<src/ui/ExportMenu.tsx>` | <`goto /notes/1`; export a note, open the file> |
