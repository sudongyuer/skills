---
name: ios-ui-verify
description: >
  Build and run offline, deterministic UI verification for an iOS app on the
  Simulator: a UI-verify launch mode that bypasses login and network, a
  development-only Debug scene per case using production components and fixture
  data, AXe-driven interaction scripts that wait on accessibility state, and
  screenshots plus video in light and dark appearance. Use when adding or
  changing iOS UI and it needs a regression check, when setting up UI
  verification for a new iOS project (React Native / Expo or native), when a
  UI check is flaky, or when asked to "verify on the simulator", "add a UI
  check", "截图验证", "模拟器验证", "录屏验证".
---

# ios-ui-verify

A UI change is verified when a script drives the real UI to the changed state,
asserts it on accessibility data, and captures screenshots (static state) and
video (temporal behavior) in both appearances — without an account, network,
or a paired machine.

**Prerequisites:** macOS, Xcode with a Simulator runtime, `xcrun simctl`,
[AXe](https://github.com/cameroncooke/AXe) (`axe`), Python 3 or Node for scripts.
**Out of scope:** physical-device-only behavior (haptics, camera, thermal,
real performance); publishing acceptance evidence (use `acceptance`).

## Architecture

```text
 launch env UI_VERIFY=1 ──▶ app boots into verify mode
                             ├─ auth / network / clock replaced at the service boundary
                             └─ Debug screen lists scenes; each scene = production
                                components + fixture data, independently resettable
 runner ──▶ for appearance in (light, dark):
              simctl ui appearance → launch → open scene → start recordVideo
              → run case script (AXe taps, waits on AX tree, asserts) → screenshots
              → stop video → result.json
```

Details and code shapes: [references/verify-mode.md](references/verify-mode.md).
Runner and case script contract: [references/runner.md](references/runner.md).

## Setting up a project (once)

1. **Verify mode.** Add a build-time flag (e.g. `EXPO_PUBLIC_UI_VERIFY=1` or a
   launch argument) that swaps the auth, catalog/data, network and clock
   services for deterministic fixtures **at their boundary**. Product code
   paths above the boundary stay unchanged. Verify mode never ships enabled.
2. **Debug scenes.** A development-only Debug screen (reachable from Settings)
   lists one entry per scene. A scene renders production components with a
   named fixture, can be reset independently, and exposes a
   `ui-verify-ready` accessibility identifier when it has settled.
3. **Identifiers.** Give every control a case needs a stable `testID` /
   `accessibilityIdentifier` and a real `accessibilityLabel` (this also serves
   VoiceOver).
4. **Runner.** Add `verify:ui` (runner), `verify:build` (one shared build
   cache per checkout), and `verify:clean`. Commit a README listing cases.
5. **Rules into AGENTS.md:** "UI changes add or update a check under
   `verification/ui`", "run in light and dark", "screenshots for state, video
   for behavior", "missing scenes and timeouts fail".

## Writing a case

1. Name the behavior in one sentence; that sentence is the script's docstring.
2. Add or reuse a Debug scene that reaches the starting state from fixtures.
3. Script: find elements by identifier, act, **wait on accessibility state**
   (never fixed sleeps as the assertion), assert the observable outcome
   (label, value, frame, presence), capture named screenshots at each state.
4. Assert design rules that matter as numbers (touch target ≥ 44 pt, element
   inside safe area, no overlap with the keyboard).
5. Cover failure paths by injecting outcomes at the service boundary (rejected
   request, offline, empty list), and screenshot the user-facing message.
6. Run in both appearances with video; open the screenshots and check them
   yourself before reporting — an assertion passing does not prove it looks
   right.

## Failure rules

- A missing scene, a missing identifier, or a timeout is a failure, never a skip.
- A flaky case is fixed by waiting on the right state or making the fixture
  deterministic; it is not retried into green.
- The build under test must be the current source: record commit, build
  command, Simulator model/runtime/UDID in the result.
- Lease or name Simulators per task so parallel runs do not share a device; do
  not create ad-hoc devices from scripts without cleaning them up.

## Verification

- [ ] The case fails before the change (or with the behavior broken) and passes after.
- [ ] Light and dark screenshots exist for every named state; video exists for motion.
- [ ] Screenshots were opened and inspected.
- [ ] The case runs without login, network, or a paired machine.
