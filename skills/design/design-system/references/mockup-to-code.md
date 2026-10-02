# Mockup → Code Handoff

A mockup is plain HTML built from `templates/` using token variables and the
scaffold's `.t-*` / `.btn` / `.field` classes. Handoff turns each pattern into a
production component: React (web) or React Native. This file is the
translation table.

## General rules

1. **Structure first, styling second.** Rebuild the component tree with
   existing primitives, then carry over only the layout the primitives do not
   absorb (gap, alignment, positioning).
2. **Never introduce new tokens during handoff.** If a value has no token, fix
   the mockup to use an existing one first, or raise it as a design change.
3. **Reuse primitives aggressively.** Most snippets map to one or two existing
   components (see `components.md`).
4. **No inline literals.** Mockup `style="…"` values become component props,
   token utilities, or style objects that read from the TS tokens.
5. Run `lintCommand` and `scripts/check.mjs` on changed files only.

## Mapping table

TODO(adopt): replace the right-hand columns with your real components and
import paths. Rows are the snippet vocabulary shipped in `templates/`.

| Mockup pattern                              | React (web)                        | React Native                              |
| ------------------------------------------- | ---------------------------------- | ----------------------------------------- |
| `.btn.btn-primary`                          | `<Button variant="primary">`       | `<Button variant="primary">` (native press) |
| `.btn` (secondary)                          | `<Button variant="secondary">`     | `<Button variant="secondary">`            |
| `.btn.btn-danger`                           | `<Button variant="danger">`        | `<Button variant="danger">` / destructive menu action |
| `<a>` navigation                            | `<Link>`                           | list row with chevron / `router.push`     |
| `.t-display` … `.t-mono`                    | `<Text role="display">` …          | `<AppText role="display">` …              |
| status marker (color + shape)               | `<StatusDot state="running">`      | `<StatusDot state="running">` / native leading accessory |
| `list-card` snippet                         | `<ListRow>` in `<List>`            | native grouped list row or `<ListRow>`    |
| `stat-grid` snippet                         | composition: grid + `<Text>`       | composition: `View` rows + `<AppText>`    |
| `form` snippet `.field`                     | `<Input>` / `<Textarea>` + `<Label>` | `<TextField>`; multi-line: no `lineHeight` |
| inline error text                           | `<FieldError>` (icon + text)       | same, or toast for submit errors          |
| `modal` snippet                             | `<Dialog>` / `<Modal>`             | alert / action sheet; prefer a sheet      |
| `sheet` snippet                             | `<Sheet>` (mobile breakpoint)      | native sheet presentation with detents    |
| `code-block` snippet                        | `<CodeBlock>`                      | `<AppText role="mono">` in a scroll view  |
| `comment-thread` snippet                    | composition: `<Avatar>` + `<Text>` | composition: `<Avatar>` + `<AppText>`     |
| avatar circle                               | `<Avatar>`                         | `<Avatar>`                                |
| relative time ("2 hours ago")               | `<RelativeTime date={…}>`          | `formatRelative()` in `<AppText role="meta">` |
| theme toggle                                | app theme provider                 | follows system appearance                 |

## React (web) specifics

- CSS variables work directly: `className` utilities (Tailwind v4 `@theme`),
  StyleX `defineVars`, or `var(--token)` in CSS modules.
- Replace `onmouseover`/`onfocus` inline handlers with `:hover`,
  `:focus-visible` and component state.
- Keep focus rings on the accent; keep hit areas ≥ `--touch-min` on touch
  breakpoints.

## React Native specifics

- Read values from the TS tokens (`token()`, `typeStyle()`, `space`), never
  literals. Theme through one palette hook that picks `vars` or `darkVars`.
- `var(--space-4)` → `space[3]`; `.t-meta` → `typeStyle('meta')` via the text
  primitive; `--radius-md` → `token('--radius-md')`.
- Borders: 1px CSS borders map to `StyleSheet.hairlineWidth` where the design
  means "hairline".
- `--shadow-whisper` → the platform shadow props or `boxShadow` (new
  architecture); keep it as subtle as the token.
- Blur / materials: use the platform material (e.g. a native blur view or
  system sheet material) instead of emulating `backdrop-filter`.
- Navigation-bar actions use the navigator's native toolbar items, not custom
  views placed in header slots.
- Press feedback: a native press / scale with `--duration-press`, not opacity.
- Touch: enforce `--touch-min` with padding or `hitSlop`.

## Handoff steps

1. Open the mockup and the target file side by side.
2. Walk the mockup top to bottom. For each block: find its row above, replace
   the markup with the component, keep only unabsorbed layout.
3. Delete the mockup's `<style>` rules; anything still needed becomes component
   styles using tokens.
4. Replace placeholder text with props or data.
5. Verify in the running app (light and dark; on mobile at the default text
   size), then lint and check the changed files.

## When the table is silent

Do not invent a primitive on the spot. Ask:

1. Is this really new, or did I miss an existing primitive?
2. Is it a one-off composition that belongs in the feature, not in
   `componentsDir`?
3. If a new primitive is genuinely needed, escalate to the user first.

Most "new" patterns are compositions, not primitives.

## Project-specific rules

<!-- TODO(adopt): data layer to wire into, dev server command, screenshot /
     simulator verification steps, native module boundaries. -->
