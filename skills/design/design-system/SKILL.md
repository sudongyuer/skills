---
name: design-system
description: 'Work inside a project design system: HTML mockups, new components (web or React Native), mockup-to-code handoff, token-compliance and typography audits. Triggers on "make a mockup / design a new component / design a new screen / convert mockup to code / audit token compliance / audit typography / 做一个 mockup / 设计一个新组件 / mockup 转代码 / 检查 token 合规".'
---

# design-system

A fill-in-the-blanks design-system contract: one cheatsheet of tokens and
invariants, reference specs, HTML mockup snippets, and a zero-dependency check
script. Platform-neutral: tokens can live in CSS (plain, Tailwind v4 `@theme`,
StyleX vars) and/or a TS data file for React Native / iOS.

## Adopting this skill

Until a project fills it in, every value here is an **EXAMPLE**. Before using
the skill for real work:

1. Fill `CHEATSHEET.md` (resolve every `TODO(adopt)`) and replace
   `tokens/tokens.example.css` / `tokens/tokens.example.ts` with your values, or
   point the config at your existing token files.
2. Fill the placeholder sections in `references/*.md` (component inventory,
   mapping table, project-specific anti-patterns).
3. Copy `design-system.config.example.json` to `design-system.config.json`,
   either **next to this SKILL.md** or in the **project root** (the root wins
   when you run from it). Paths are relative to the config file:

   | Key             | Meaning                                                    |
   | --------------- | ---------------------------------------------------------- |
   | `tokensCss`     | CSS token file (omit for native-only projects)             |
   | `tokensTs`      | TS token data file (omit for web-only projects)            |
   | `cheatsheet`    | Defaults to this skill's `CHEATSHEET.md`                   |
   | `componentsDir` | Where existing primitives live; check here before building |
   | `lintCommand`   | Project lint command to run on changed files               |
   | `scan`          | Globs the check script scans for forbidden patterns        |
   | `ignore`, `allowHex`, `forbid` | Scan exclusions, allowed literals, extra regex rules |

4. Run `node <skill-dir>/scripts/check.mjs` until it is green.

If the cheatsheet still contains `EXAMPLE` values and the user did not ask to
adopt the skill, say so once and ask whether to proceed with the examples.

## Step 1 · Identify the task

| User says | Task tier | Read |
|---|---|---|
| "make a mockup for X" / "design a new screen / hero / modal / sheet" / "做一个 mockup" | **New mockup** | `CHEATSHEET.md` + `references/tokens.md` + `references/anti-patterns.md` |
| "build component X" / "new Button variant" / "设计一个新组件" | **New component** | `CHEATSHEET.md` + `references/components.md` + `references/anti-patterns.md` |
| "convert this mockup to code / React / React Native" / "mockup 转代码" / "implement this design" | **Handoff** | `references/mockup-to-code.md` + `references/components.md` |
| "audit this file for token compliance" / "is this color right?" / "检查 token 合规" | **Token audit** | `references/anti-patterns.md` + `references/tokens.md` |
| "what size for this text?" / "audit typography" / "migrate hardcoded font sizes" / "字号" | **Type audit** | `references/typography.md` + `CHEATSHEET.md` § Typography |

If unsure, ask one short question instead of guessing. Read the config (if any)
to learn `componentsDir`, `lintCommand` and the token file paths.

## Step 2 · Produce

### New mockup
1. Copy `templates/scaffold.html` to where the user wants it (ask if unclear)
   and fix its `<link>` to the project's `tokensCss`.
2. Pick pieces from `templates/snippets/` (hero, list-card, modal, sheet, form,
   code-block, stat-grid, comment-thread). Copy and adapt.
3. Use only tokens listed in `CHEATSHEET.md`, via `var(--…)` and the scaffold's
   `.t-*` type-role classes. No raw hex, rgb or px font sizes.
4. For mobile screens: honour `--touch-min`, use a sheet instead of a modal,
   and show status as color + shape.
5. Open the file in a browser (light and dark) before declaring done.

### New component
1. **First** check `references/components.md` and `componentsDir` to confirm the
   primitive does not already exist. Reuse or extend beats reinvent.
2. If something new is genuinely needed, confirm with the user, then follow the
   file layout and API conventions in `components.md`.
3. Use only cheatsheet tokens and type roles; no inline literals.
4. Run `lintCommand` on changed files only.

### Handoff
1. Open the mockup and `references/mockup-to-code.md` side by side.
2. Walk the mapping table top to bottom: every mockup pattern has a target
   component or token utility (web and React Native columns).
3. **Structure first, styling second.** **Do not introduce new tokens** during
   handoff; if one is missing, fix the mockup to use an existing token first.
4. Run `lintCommand` on changed files, then the check script on them.

### Token audit
1. Run `node <skill-dir>/scripts/check.mjs <files…>` for the mechanical hits.
2. Read the file for what the script cannot see (see `anti-patterns.md`):
   wrong tier (text on tier 1, `neutral-5` as text), accent used for anything
   but interactive / in-progress, status by color alone, inline style objects,
   invented z-index or durations.
3. Report a **punch list with `file:line`**, the offending snippet, and the
   proposed token replacement. Do not edit unless asked.

### Type audit
1. Map every text node to a role from `CHEATSHEET.md` § Typography.
2. Flag raw sizes (`font-size: 13px`, `text-[13px]`, `fontSize: 13`), bundled
   line-heights overridden without reason, synthetic bold on CJK, eyebrow
   tracking outside the eyebrow role.
3. Propose replacements using `references/typography.md` § Migration mapping,
   as a punch list with `file:line`.

## Step 3 · Verify

```bash
node <skill-dir>/scripts/check.mjs            # uses design-system.config.json
node <skill-dir>/scripts/check.mjs src/Foo.tsx  # scan only these files
node --test <skill-dir>/scripts/              # the checker's own tests
```

Fails (exit 1, `file:line` output) when the cheatsheet and the token files
drift, when token files declare undocumented tokens, or when scanned files
contain raw colors, raw font sizes, hardcoded font families or configured
`forbid` patterns. A line containing `ds-allow` is exempt; use it sparingly and
say why on the same line. Then run the project's `lintCommand`.

## When NOT to use this skill

- Application logic, routes, data fetching, state: this skill is design-only.
- Documents, slides, PDFs or marketing pages with their own visual identity.
- Third-party or vendored packages that carry their own token system.
- Runtime theming code (dynamic accent injection, user themes): that is
  application-owned, not the static contract.
- Changing the design language itself: that is a spec change. Edit the
  cheatsheet and tokens deliberately, with the user, not as a side effect.
