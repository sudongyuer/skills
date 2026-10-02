# Verify mode and Debug scenes

## Flag

Inline the flag at build time so the verify bundle does not depend on a dev
server:

```ts
// src/lib/uiVerify.ts
export const uiVerify = process.env.EXPO_PUBLIC_UI_VERIFY === '1';
```

Native-only apps use a launch argument instead (`-UIVerify YES`, read via
`ProcessInfo.processInfo.arguments` / `UserDefaults`). Store builds never set it.

## Replace services at the boundary

Pick the narrowest seams that make the app deterministic and offline:

| Seam | Verify-mode implementation |
| --- | --- |
| Auth / account restore | Signed-in fixture user; no Keychain read, no network |
| Data / catalog / sync | In-memory fixture store keyed by scene name |
| Network client | Rejects any request that was not stubbed (fails loudly) |
| Clock / timers | Fixed "now"; durations derived from fixtures |
| Push / permissions | Recorded requests; never prompt the real system dialog |

Everything above the seam — screens, view models, navigation, native views —
is production code. A scene that needs a code path not reachable through the
seam is a sign the seam is in the wrong place.

Fault injection lives behind the same seam and is selected by the scene:
`{ send: 'reject-once' }`, `{ list: 'empty' }`, `{ network: 'offline' }`.

## Debug screen

- Reachable only in development / verify builds (e.g. long-press Settings).
- One row per scene; tapping a row resets that scene's fixture state and
  presents it through the app's normal navigation or sheet API.
- Each scene sets an accessibility identifier `ui-verify-ready` on a view that
  appears only after data, layout and animations have settled.
- A global reset hook (e.g. `globalThis.__uiVerifyReset`) exists only in the
  verify bundle.

## Identifiers

- `testID` (RN) / `accessibilityIdentifier` (UIKit) on every control a case
  touches or asserts on: kebab-case, stable across releases (`session-input`,
  `composer-send`, `settings-row-appearance`).
- `accessibilityLabel` is user-facing text for VoiceOver; cases may assert on
  it, but should locate elements by identifier.
- Some framework-owned controls drop identifiers (toolbars, system sheets).
  Locate those by type + position and write a comment naming the framework
  limitation.

## Language and appearance

- Run cases in one locale (usually English) to keep text assertions stable;
  translations are checked by the i18n catalog check, not by UI runs.
- Run every case in `light` and `dark`: `xcrun simctl ui <udid> appearance dark`.
