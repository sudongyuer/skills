# Typography · Full Spec

Companion to `CHEATSHEET.md` § Typography. Read when authoring a component,
auditing type usage, or migrating hardcoded sizes.

## Contract at a glance

- **Semantic roles only.** Every text node uses one role: `display`, `title`,
  `body`, `secondary`, `meta`, `eyebrow`, `mono` (EXAMPLE set).
- **Bundled size + line-height** per role, both absolute (px / pt), so web and
  native render the same rhythm. Weight stays separate.
- **No ad-hoc font sizes.** `font-size: 13px`, `text-[13px]`, `fontSize: 13`
  and framework default ramps (`text-sm`, `text-lg`, …) are banned in product
  code. The check script catches the literal forms.
- **No synthetic bold on CJK.** Headings cap at medium (500).
- **Three font roles at most** (sans, mono, optional serif), each with a CJK
  fallback wherever CJK can render.

## Why roles

1. Intent is visible in the code: `t-meta` / `typeStyle('meta')` tells a
   reviewer what the text *is*, not just how big it is.
2. One place to change: a role's size moves everywhere at once, including
   native list cells that must match JS-rendered text.
3. No drift: a designer's "section title" maps to exactly one token.

## Scale (EXAMPLE)

```
display    32 / 40   hero, empty-state headline
title      20 / 28   page, section, sheet title
body   ★   16 / 24   default: paragraphs, list-row titles, inputs
secondary  14 / 20   row subtitles, helper text
meta       12 / 16   time, status, footers, chips
eyebrow    11 / 14   uppercase label + 0.08em tracking, group headers
mono       13 / 20   paths, branches, IDs, code (only these)
```

TODO(adopt): replace with your scale. On iOS, if half the UI is native list
cells, align roles with the system text styles so the two never sit one step
apart side by side.

### Role boundaries

| Role      | Means                                           | Not for                         |
| --------- | ----------------------------------------------- | ------------------------------- |
| display   | Content that is shown, not read                 | Page headings in dense UI       |
| title     | Headings of pages, sections, sheets, dialogs    | Emphasis inside body text       |
| body      | Continuous reading text; the default            | Metadata                        |
| secondary | Supporting line under a title                   | Primary content                 |
| meta      | Time, status words, counts, footnotes           | Anything the user must read     |
| eyebrow   | Short uppercase labels; always with its tracking | Sentences, CJK text            |
| mono      | Machine strings: paths, IDs, code, versions     | Prose, numbers in tables (use tabular figures instead) |

### Weight

| Weight token             | Use                                         |
| ------------------------ | ------------------------------------------- |
| `--font-weight-regular`  | Body                                        |
| `--font-weight-medium`   | Headings, emphasised labels; the CJK cap    |
| `--font-weight-semibold` | Short Latin emphasis (badges, eyebrow)      |

CJK fonts rarely ship true bold cuts; the renderer fakes them by stroking
glyphs, producing blurry uneven weight. Never `font-weight: 700`, `<b>`,
`font-bold` or `fontWeight: 'bold'` on text that can render CJK.

### Line-height

- Line-height ships with the role. Override locally only for a stated reason
  (e.g. a single-line badge).
- React Native / iOS: multi-line text inputs should set only `fontSize` and
  symmetric padding. A `lineHeight` on a multi-line input maps to a minimum
  line height and adds the extra space above the text, skewing padding and
  stretching the caret.

### Font scaling (mobile)

Decide once and encode it: either follow the platform's dynamic type fully, or
clamp the scale to a documented range (EXAMPLE: 14/17 to 23/17 of the default
body size). TODO(adopt): record your policy and where it is implemented.

## Migration mapping (legacy → role)

TODO(adopt): fill from a sweep of the codebase. Pattern:

| Old                         | New                     | Note                         |
| --------------------------- | ----------------------- | ---------------------------- |
| `font-size: 12px`           | meta                    |                              |
| `text-[13px]` / `fontSize: 13` | mono or secondary    | Decide by content, not size  |
| `font-size: 16px`           | body                    |                              |
| `font-size: 20px`           | title                   |                              |
| `text-xs` / `text-sm`       | meta / secondary        | Framework defaults           |
| 10-11px text                | eyebrow (uppercase) or meta | Sizes under the scale are bumped up |
| Relative `em` inside rich content | keep            | `em` relative sizing is intentional |

## Banned patterns

Caught by `scripts/check.mjs` (`raw-font-size`, `raw-font-family`):

- `font-size: <n>(px|rem|pt)` and `font: … <n>px …` in CSS / HTML.
- Tailwind arbitrary sizes `text-[<n>px]`.
- `fontSize: <number>` / `fontSize={<number>}` in JS / React Native.
- `font-family:` / `fontFamily:` literals outside the token files.

Add framework-default ramps (`text-sm`, …) through the config's `forbid` list.

## Edge cases

- **Image / OG renderers** that cannot resolve CSS variables may use literal
  sizes; import the numbers from the TS tokens and mark the line `ds-allow`.
- **Mobile browser input zoom**: inputs below 16px trigger zoom on some mobile
  browsers; keep inputs at body size or larger.
- **Icons** take sizes from the icon set or a dedicated icon-size token, never
  a text role.

## Project-specific rules

<!-- TODO(adopt): base font size / rem anchor, print rules, rich-content
     overrides, platform text-style mapping. -->
