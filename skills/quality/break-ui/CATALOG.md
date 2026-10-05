# Worst-Case Catalog

Realistic values that break UI, grouped by what kind of value the component renders. Use the rows that apply to the fields in your Phase 1 table. Each value is something a real user could produce; the note says what it tends to break.

Use `example.com`, `example.org`, or `.test` domains for emails and URLs, so the fixture never points at a real inbox or site.

Rows marked *web only* name a browser mechanism (CSS, `dir`, zoom, hover) and do not apply to iOS / React Native; the native equivalents are in [references/native.md](references/native.md).

---

## People and names

| Value | Breaks |
| --- | --- |
| `Aleksandra Wiśniewska-Kowalczyk` | Long, hyphenated, diacritics; wraps to two lines, and the hyphen is a line-break point |
| `Christopher Alexander Montgomery III` | Long with a suffix; naive first + last initials give `CI` |
| `Konstantin Oberhauser-Wettstein` | Long and compound; overflows single-line rows |
| `Jo` | Two letters; leaves the name column mostly empty, and naive initials give `J` |
| `J` | One letter; single-character initials, very short click target if the name is the link |
| `Ólafur Darri Ólafsson` | Leading accented capital; uppercase/sort logic, initials `ÓÓ` |
| `Đặng Thị Ngọc Hân` | Stacked Vietnamese diacritics; clipped by tight `line-height` + `overflow: hidden` |
| `王秀英` | CJK, no spaces; "first + last word" initials logic finds one word, and CJK breaks anywhere |
| `欧阳娜娜` | Two-character compound surname; "first character is the surname" logic is wrong |
| `陈美玲 (Tan Mei Ling)` | Chinese name with a romanized name in parentheses; doubles the width, mixed scripts change line height |
| `张伟 David` | Chinese and English in one field; initials logic picks `张D` or `张` |
| `Nurul Aisyah binti Abdul Rahman` | Malay patronymic; no family name, so "last name" sorting and `First Last` initials (`NR`) are wrong |
| `Muhammad Hafiz bin Mohd Yusof` | Malay patronymic with an abbreviated `Mohd`; long, and `bin` is not a surname |
| `نور الهدى عبد الرحمن` | RTL; punctuation and icons land on the wrong side without `dir="auto"` (web); natively only if a supported locale is RTL |
| `Seán O'Brien-Ó Súilleabháin` | Apostrophe and accents; escaping, initials, search |
| `María José de la Cruz y Fernández` | Lowercase particles; initials `Md` or `MF`, sorting by "last name" |
| `dana` | All lowercase; initials should still be uppercase |
| `🦊 Fox` | Emoji first; `.charAt(0)` returns half a surrogate pair (`�`) |
| `👩🏽‍💻 Priya` | ZWJ emoji sequence; `.length` is 7+, slicing breaks it into pieces |
| `  Sam   Lee ` | Leading, trailing, and repeated spaces; initials from empty words, odd gaps |
| *(missing)* | No name at all, only an email; the UI must fall back to something |

## Emails, URLs, identifiers

Unbreakable strings: they have no spaces, so the browser has nowhere to wrap them.

| Value | Breaks |
| --- | --- |
| `bartholomew.fitzgerald.northwind.industries@example.com` | The classic. Pushes every sibling off the row without `overflow-wrap: anywhere` |
| `a@example.org` | One-letter local part; layout that assumed a long email looks empty, and naive initials from the email give `A` |
| `first.last+billing-notifications@example.com` | Plus-addressing; validation that rejects `+`, display that truncates the meaningful part |
| `ops@sub.department.region.example.co.uk` | Many subdomains, two-part TLD; "domain" extraction logic <!-- privacy-allow --> |
| `https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved` | Long URL; overflow, and end-truncation hides the part that differs |
| `9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f` | UUID; monospace width, middle-truncation candidate |
| `Q3 Board Deck — FINAL (revised) v12 [approved by legal].pdf` | File name; end-truncation hides the version and extension, brackets and dashes in paths |
| `IMG_20250914_183022_HDR_portrait_edited_edited.HEIC` | Camera file name; unbreakable, uppercase extension |
| `@a` / `@thisisaverylongusernamethatisallowed` | Handle extremes |

## Labels, titles, and copy from data

| Value | Breaks |
| --- | --- |
| `Senior Product Design Engineer, Platform Infrastructure` | Long job title; wraps to three lines in a secondary slot |
| `Invitation expired 12 days ago` | Long status badge; badge wraps or squeezes the name column |
| `已过期的邀请将在三十天后自动删除` | Long zh-Hans status with no spaces; wraps at any character and can leave one orphaned character on the second line |
| `通知与隐私` vs `Notifications & Privacy` | A label measured in zh-Hans; the English string is several times wider and overflows a button sized for the Chinese |
| `iCloud 同步与备份设置` | Mixed Latin and Chinese; the break falls after `iCloud`, and the two scripts sit on different baselines |
| `设置` | Two-character label; buttons and tabs sized for English look empty, and touch targets shrink to the text |
| Twelve tags on one item: `design`, `frontend`, `q3`, `urgent`, `needs-review`, … | Tag rows that wrap into a wall; needs a `+8` overflow |
| A tag named `customer-feedback-from-enterprise-onboarding` | One tag wider than its container |
| `Untitled` / empty string / `   ` | Title missing; collapsed heading, zero-height row |
| `<script>alert(1)</script>` / `&amp;` / `**bold**` | Escaping; must render as literal text (HTML injection is web only; markdown and entities still apply natively) |
| `Line one` + newline + `Line two` | Newline in a single-line field; doubles row height or is silently dropped |
| A 2,000-character pasted description | Clamps, "show more", and textarea growth |

## Numbers and money

| Value | Breaks |
| --- | --- |
| `0` | Zero states: "0 members", empty progress bar, division by zero in percentages |
| `1` | Plurals: "1 members", "1 days ago" |
| `1284` | Needs a thousands separator: `1,284` |
| `1000000` | Width of the count badge; consider compact form `1M` where precision doesn't matter |
| `12345678.9` as currency | `$12,345,678.90`; overflows totals columns |
| `-42.5` | Negative sign, red color logic, parentheses in accounting formats |
| `0.1 + 0.2` | `0.30000000000000004` rendered raw |
| `142%` / `-3%` | Progress bars and meters past their bounds |
| `null` / `undefined` / `NaN` | Rendered literally |
| `1.284` in `de-DE` vs `1,284` in `en-US` | Locale formatting; hardcoded separators are wrong for half the world |
| `12,345.60` in `ms-MY` vs `1.2万` compact in `zh-Hans` | Compact forms differ by locale; a hand-built `1.2K` is wrong in Chinese |
| A value that changes live (`99` → `100`) | Width jump and jitter without `tabular-nums` |

## Collections

| Value | Breaks |
| --- | --- |
| 0 items | The empty state, and whether one exists at all |
| 1 item | Grids that look broken with one card; "1 of 1" |
| Exactly page size, and page size + 1 | Off-by-one in "Showing 40 of 40", pagination that shows an empty page 2 |
| 1,000+ items, unpaginated | Scroll performance, render time, memory; also "Showing 40 of 1,284" copy |
| One item 10× the size of the others | Masonry and grid rows stretching to the tallest item |
| Items with identical names | Lists where the name is the only distinguishing field |

## Time

| Value | Breaks |
| --- | --- |
| Now | "0 seconds ago" instead of "just now" |
| 12 days ago, 11 months ago, 3 years ago | Relative-time thresholds; switch to an absolute date after a week or so |
| A future date | "in 3 days" vs "-3 days ago" |
| `1970-01-01` | A zero timestamp shown as a real date |
| `2025-12-31T23:30:00-08:00` | Shows as a different day in UTC and the user's timezone |
| Very long duration (`1,284 hours`) | Duration formatting that never rolls up to days |

Use `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat`, not hand-built strings. In React Native, go through the project's i18n and date helpers, and check which `Intl` APIs the installed Hermes supports before calling them directly.

## Images and media

| Value | Breaks |
| --- | --- |
| Avatar URL that 404s | Broken-image icon instead of the initials fallback |
| No avatar at all | The fallback itself: initials, color, size parity with real avatars |
| 4000×200 panorama as avatar or cover | Distortion without `object-fit: cover` (`contentFit="cover"` natively) |
| 200×4000 tall image | Same, other axis; can also blow out a card's height |
| Transparent PNG logo, dark logo on dark mode | Invisible on the background |
| Slow-loading image | Layout shift without fixed dimensions or `aspect-ratio` |

## States

| Value | Breaks |
| --- | --- |
| Loading | Skeletons that don't match final layout, spinners that shift content |
| Error from the API | No error state, or a raw error message (`TypeError: Cannot read properties of undefined`) |
| Partial data | Some optional fields filled, others not, in the same list; misaligned rows |
| Every status at once | All enum values in one list (`active`, `invited`, `expired`, `suspended`); badge widths vary |
| No permission | Disabled actions; does the row still lay out the same? |
| The current user in the list | "You" labels, actions that shouldn't apply to yourself |

## Environment

Not data, but checked the same way: flip to the worst case, then change these.

| Condition | Breaks |
| --- | --- |
| Container at 320px *(web only)* | Every overflow above, at once |
| Narrow sidebar placement *(web only)* | Components designed full-width, reused in a 280px column |
| 2560px wide *(web only)* | Lines too long to read, content stranded on one side |
| Browser zoom 200% / large text setting *(web only)* | Fixed heights that clip growing text |
| Dark mode | Hardcoded colors, invisible borders and logos |
| `dir="rtl"` *(web only)* | Icons, chevrons, padding, and the order of trailing actions |
| Touch device *(web only)* | Hover-only actions (the ••• that appears on hover) are unreachable |

Native projects check the environment list in [references/native.md](references/native.md#environment) instead.
