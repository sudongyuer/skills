# break-ui on iOS / React Native

Load this file when the project is a native iOS app or a React Native / Expo app. It replaces the web toggle, the web environment checks, and the web failure signatures. The catalog in [../CATALOG.md](../CATALOG.md) still applies, except rows marked *web only*.

## Scenes

The worst case enters only through the services boundary: the fixture services that the verify build swaps in for live services. There is no on-screen toggle and no edit to a product screen.

1. **One Debug scene per dataset.** For a screen called `members`: `members`, `members-worst`, `members-empty`, `members-one`, `members-huge`. Register them where the project registers Debug scenes (for example `src/debug/scenes.ts`) with titles in every locale file, the same way existing scenes are added.
2. **Verify build only.** Fixture services exist only when the verify flag is set (for example `EXPO_PUBLIC_UI_VERIFY=1`). A dataset scene in a development build that talks to live services would show live data under a worst-case label, so register dataset scenes only when the verify flag is on.
3. **Open by deep link.** Use the project's scene link (for example `<scheme>://debug/scene/members-worst`) with `xcrun simctl openurl <device> <url>`, so every dataset is reachable without tapping through the app.
4. **The scene selects, the service reads.** Opening a scene selects a fixture variant in a fixture store under the services fixtures, then navigates to the product route. Fixture services read the variant when they are called, not when the module loads, so switching scenes changes the data without a rebuild. This is the "fixture store keyed by scene name" seam from `ios-ui-verify`.
5. **No mechanism yet is the first finding.** If the project's scenes only navigate and its fixture services return one fixed value, report that first, describe the store and the scene field it needs, and wait for the user's go-ahead before adding it.

A minimal shape, adapted to the project's conventions. The scene entry gains a `fixture` field, and the scene route calls `fixtureStore.select(scene.fixture ?? 'demo')` before it redirects:

```ts
export type FixtureVariant = 'demo' | 'worst' | 'empty' | 'one' | 'huge'

let current: FixtureVariant = 'demo'

export const fixtureStore = {
  select(next: FixtureVariant) {
    current = next
  },
  get variant() {
    return current
  },
}
```

```ts
export const fixtureMembersService: MembersService = {
  listMembers: async () => membersByVariant[fixtureStore.variant],
}
```

When a fixture is kept after the run, it becomes a ui-check: a case in the project's ui-checks that opens the dataset scene and captures light and dark screenshots, following `ios-ui-verify`.

## Environment

Check each dataset scene under these conditions, one at a time, then the worst combination (smallest width + largest text + Bold Text):

| Condition | How | Breaks |
| --- | --- | --- |
| Smallest supported iPhone width | Simulator of the narrowest iPhone the deployment target supports | Every overflow at once |
| Dynamic Type up to AX5 | `xcrun simctl ui <device> content_size accessibility-extra-extra-extra-large` (list sizes with `xcrun simctl help ui`) | Fixed heights, single-line rows, side-by-side layouts that should stack |
| Bold Text | Simulator Settings › Accessibility › Display & Text Size | Wider glyphs; labels that fit only at regular weight |
| Increase Contrast | `xcrun simctl ui <device> increase_contrast enabled` if the installed Xcode supports it, otherwise Simulator Settings | Hardcoded colors, separators that disappear |
| Dark mode | `xcrun simctl ui <device> appearance dark` | Hardcoded colors, invisible logos and borders |
| VoiceOver | Accessibility Inspector, or the AX tree from the ui-check run | Missing or truncated labels, wrong reading order, decorative views announced |
| Keyboard shown | Focus a text field in the scene | Content and primary actions hidden under the keyboard |
| Safe areas and Dynamic Island | A device with a Dynamic Island, portrait and landscape if supported | Content under the status bar, home indicator, or island |
| RTL | Only if a supported locale is right-to-left | Chevrons, trailing actions, and padding on the wrong side |

Findings that appear only at the largest accessibility sizes are rated **Fragile** and reported, not fixed by default, unless the project's `AGENTS.md` says otherwise. Many projects deliberately rely on system text sizing without special layouts for those sizes.

## Failure signatures

| What you see | Cause | Fix |
| --- | --- | --- |
| Long text pushes the trailing button or chevron off-screen | RN's default `flexShrink` is `0`, so the text column refuses to shrink | `flex: 1` (or `flexShrink: 1`) plus `minWidth: 0` on the text column; `flexShrink: 0` on the trailing action |
| Text runs to many lines or off the edge | No line limit | `numberOfLines` plus `ellipsizeMode`; `'middle'` for emails, paths, and file names, `'tail'` for previews |
| Badge wraps onto two lines | Badge text without a line limit | `numberOfLines={1}` and `flexShrink: 0` on the badge, and decide what yields instead |
| Avatar stretched or rows misaligned once text wraps | RN's default `alignItems` is `'stretch'` | `alignItems: 'flex-start'` on rows that can wrap |
| Numbers jitter when they update, columns misalign | Proportional figures | `fontVariant: ['tabular-nums']` |
| Vietnamese or Thai diacritics clipped top or bottom | `lineHeight` too tight for the script | Raise `lineHeight` from the type tokens, or remove it for that text and let the system choose |
| Blank or broken avatar | No error fallback on `Image` / `expo-image` | `onError` falls back to initials or a symbol; `contentFit="cover"` (`resizeMode="cover"` for `Image`) for any aspect ratio |
| Truncated text with no way to read it | iOS has no hover or `title` | Full value in `accessibilityLabel`, plus a context menu or a detail view that shows it |
| 1,000 rows stutter or take seconds to appear | Every row laid out at once: a `ScrollView` with `map`, or a non-scrolling native list that sizes itself to all its cells | `FlatList` or `FlashList` (or a scrolling native list); a self-sizing native list over all rows is a performance finding, not only a visual one |
| "1 members", `1284`, wrong separators | Hardcoded plurals or raw numbers | The project's i18n with a count (`t(key, { count })`) and its number formatter; check Hermes `Intl` support in the installed React Native before relying on `Intl.PluralRules` or `Intl.NumberFormat` directly |
| List cut short or rows overlapping only at large text sizes | A native view measures its content height in a bounded loop and stops before layout converges | Report as Fragile with the size where it starts; fix only if the project asks for those sizes |
| Raw `<b>`, `&amp;`, or `**text**` shown | Markup in data rendered by the wrong component | Render plain `Text` for user data; use a markdown renderer only where the field is markdown |
