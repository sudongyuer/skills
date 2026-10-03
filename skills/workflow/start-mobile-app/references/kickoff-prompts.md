# Kickoff prompts

A kickoff states constraints only. Features are inferred from the product
noun ("an iOS client for X"). Write it from the Gate 2 decisions; the user may
also paste one directly (fast path).

## Shape

```text
Based on the feasibility study in <docs/research/...>,
initialize the project in <path> using the architecture of <reference project>.
<Module boundary: where native code lives.>
<What is out of scope: platforms, fallbacks.>
<Escape hatch: what to do when the framework cannot meet a requirement.>
```

Each line is a decision the user made at a gate. Nothing about screens,
features, or visual design belongs here.

## Example — RN / Expo + Swift kit

```text
Based on the feasibility study in docs/research/2026-10-03-feasibility.md,
initialize the project in ~/work/my-app using the architecture of
~/work/<reference-app>. All native modules are carried by a single Kit module.
Do not consider Android. Anything the UI cannot achieve at system quality in
React Native is written natively in Swift inside the Kit.
```

## Example — pure Swift / SwiftUI

```text
Based on the feasibility study in docs/research/2026-10-03-feasibility.md,
initialize an iOS-only Xcode project in ~/work/my-app, minimum iOS <n>.
SwiftUI by default; UIKit where SwiftUI cannot meet the Human Interface
Guidelines. Follow the module layout of ~/work/<reference-app>. No
cross-platform layers.
```

## From kickoff to AGENTS.md

The kickoff is a message; `AGENTS.md` is what persists. Turn each kickoff line
and each research finding into one rule, with its reason when the reason is
not obvious:

| Kickoff / finding | AGENTS.md rule |
| --- | --- |
| "All native modules in one Kit module" | "All first-party native capabilities and native UI live in `modules/<kit>`; register them through `<KitModule>`; do not create separate bridge packages." |
| "Do not consider Android" | "Do not add Android implementations, fallback stubs, or Android build scripts." |
| Finding: package X pulls Node-only dependencies | "Do not import X: the feasibility study found <dependencies> that Metro cannot bundle." |
| Reference project rule adopted | Copy the rule, adapted; mention the reference in the commit message, not in the file. |
