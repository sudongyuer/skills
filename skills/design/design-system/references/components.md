# Components · Catalog and Selection

**Reuse beats reinvent.** Before writing a component, scan this catalog and
`componentsDir` (from `design-system.config.json`) and confirm nothing fits.

## Inventory

TODO(adopt): list the primitives that exist today. Refresh with
`ls <componentsDir>` before planning a new one.

```
<componentsDir>/
├── button/          — actions (variants: primary, secondary, ghost, danger)
├── text/            — typography primitive; the only way to set a type role
├── status-dot/      — status color + shape, one per state
├── list/            — list rows with leading accessory, title, subtitle, trailing
├── input/           — text field, text area
├── dialog/          — confirm / alert (desktop, wide layouts)
├── sheet/           — bottom sheet (mobile)
├── toast/           — transient notification
├── list-state/      — loading / empty / error for any list
└── …                — TODO(adopt)
```

## Layering

Keep two layers when the platform wraps native views:

1. **Kit / bindings**: thin wrappers over native or third-party views, bare
   props.
2. **Product primitives** (`componentsDir`): wrap the kit into product
   semantics (closures, measurement, id mapping, token usage).

Feature code imports only product primitives, never the kit layer directly.

## Selection rules

### Overlay surfaces

| Surface  | Use                                                                 |
| -------- | ------------------------------------------------------------------- |
| Dialog   | Confirm / alert / one-field prompt. Focus-locked. Wide layouts.     |
| Modal    | Multi-field form or viewer on wide layouts.                          |
| Sheet    | Phones. Bottom edge, swipe to dismiss, detents if the platform has them. |
| Popover  | Anchored, non-blocking, small content.                               |
| Menu     | A list of actions. Prefer the platform's native menu on mobile.      |
| Toast    | Transient result or error that needs no decision.                    |

Pick one per breakpoint; never a desktop modal that slides up like a sheet.
Flows that need several steps inside a sheet use nested navigation inside the
sheet, not a second presentation on the root stack.

### Action vs navigation vs label

| Need                           | Use                          |
| ------------------------------ | ---------------------------- |
| Mutates state                  | Button                       |
| Changes route / screen         | Link / list row with chevron |
| Static label (category, state) | Tag / chip, or StatusDot for state |
| Action inside a menu           | Menu item, not a button      |
| Navigation-bar action (mobile) | The platform's native toolbar/bar button, not a hand-drawn view |

### Text

Use the text primitive with a role (`<Text role="meta">`,
`<AppText role="secondary">`) instead of hand-rolled size classes or style
objects.

### State of a list

Loading, empty and error states go through one primitive (`ListState`), not
placeholder strings, footers hijacked for errors, or ad-hoc `<Text>` nodes.

## Adding a new primitive

1. **Confirm with the user first.** New primitives are project-wide commitments.
2. Place it in `componentsDir/<kebab-name>/` (or the project's convention).
3. Compose existing primitives (a banner uses the text and button primitives).
4. Use only cheatsheet tokens and type roles; expose variants, not style props
   that accept raw values.
5. Interactive elements meet `--touch-min` and show a focus state (web) or
   press state (native, `--duration-press`).
6. Document it here and, if it maps to a mockup pattern, in
   `mockup-to-code.md`.

## Import conventions

<!-- TODO(adopt): import alias, barrel files, where styles live
     (e.g. `~/components/ui/button`, co-located `.css.ts` / StyleX file). -->

## Project-specific rules

<!-- TODO(adopt): variant API conventions, animation library, native bridge
     rules, components that must never be used directly. -->
