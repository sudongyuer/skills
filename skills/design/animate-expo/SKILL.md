---
name: animate-expo
description: Build animations in React Native and Expo (iOS), deciding in the order that determines whether they feel right — should it animate, which platform component already does it, which thread, which properties, spring or timing, how the gesture hands off, how it degrades under Reduce Motion — then offering numbered motion options and implementing the one the user picks with Reanimated, Gesture Handler, Expo Router and expo-haptics. Use when animating anything in an Expo app, adding gestures, sheets, screen transitions, press feedback or haptics, or fixing motion that stutters on device ("Expo 动效", "RN 动画", "手势", "sheet 动画", "触感反馈", "动画卡顿"). For web animation use `animate`; for Apple's motion principles and acceptance criteria use `apple-design`; for reviewing a motion diff use `review-animations`; for finding places to animate use `find-animation-opportunities`; for general motion judgment use `emil-design-eng`.
---

# Building Animations in Expo

A construction skill for React Native on iOS. It turns a request for motion
into an implementation that survives a strict review on a real device, not in
the simulator and not in a dev build.

Mobile changes three things about animation, and everything here follows from
them:

1. **There is no hover.** Every affordance the web puts in hover lives in
   press, position, or nothing.
2. **There are two runtimes.** Worklets (Reanimated 4) makes this explicit:
   the React Native runtime, where React renders and app logic runs, and the
   UI runtime, where worklets run every frame. An animation that touches the
   RN runtime stutters the moment the app does anything else.
3. **The finger is on the element.** Gestures are the primary input, so
   interruptibility and velocity handoff are the baseline, not polish.

All motion values (frequency gate, purposes, curves, durations, springs, entry
scale, reduced motion) come from
[motion-standards](../emil-design-eng/references/motion-standards.md). This
file holds only the React Native and iOS API facts. If the project's
`AGENTS.md` has a Motion section, it overrides this file where they differ.

## Operating posture

Native iOS first: the platform's own components (native stack, form sheets,
NativeTabs, context menus, the project's native UI kit) already carry correct
motion, haptics and accessibility, so most requests end at "use the platform
component". Never imitate a native control or effect with RN views. Where
motion has to be built, the user chooses the feel; you run the gate, offer
numbered options and implement the pick.

Two failure modes, and the first is worse:

1. **Animating something that should not animate**, or rebuilding in JS
   something the platform already animates. The gate exists to produce zero
   lines of code sometimes.
2. **Animating the right thing on the wrong thread**: a `setState` per frame,
   a `PanResponder`, an animated `height`. It looks fine in dev on a new phone
   and drops frames on the oldest supported iPhone.

## Gate

Stop with no code when any of these holds, and say why:

- The motion is seen 100+ times a day (tab switches, the keyboard, scrolling,
  settings toggles), per the
  [frequency gate](../emil-design-eng/references/motion-standards.md#frequency-gate).
  Those keep platform behaviour.
- No purpose from the
  [purpose list](../emil-design-eng/references/motion-standards.md#purpose)
  applies.
- A platform component already provides the motion (step 3). The answer is
  that component, configured.

## Hard rules

1. Run the sequence in order; steps 1 and 2 gate everything.
2. Reanimated, not core `Animated`. Core `Animated` cannot be driven by a
   gesture on the UI thread, and `useNativeDriver` accepts only transform and
   opacity.
3. Every value comes from motion-standards or the Reanimated mappings below;
   none is approximated from memory.
4. Reduced motion ships with the animation, gated manually where Reanimated
   does not honour it (step 9).
5. Feel is judged on a Release build on the oldest supported iPhone. Nothing
   else counts as verified.
6. Motion choices are offered as numbered options; technical defects (wrong
   thread, layout properties, `scale(0)`, missing reduced motion, a gesture
   that cannot be interrupted) are fixed, not offered.

## The build sequence

### 1. Should this animate at all?

Apply the
[frequency gate](../emil-design-eng/references/motion-standards.md#frequency-gate).
On iOS the 100+/day tier is tab switches, keyboard open and close, scrolling
and settings toggles: platform default or nothing.

NativeTabs: platform tab switching, nothing to configure. Tabs are peers, so
never add a slide between them.

**Completion criterion:** a frequency tier is named, or the run stops.

### 2. What is the purpose?

Name one purpose from the
[purpose list](../emil-design-eng/references/motion-standards.md#purpose).
Cannot name one: do not build it.

**Completion criterion:** one purpose word is written down.

### 3. Pick the tool: the platform first, then the cheapest that works

Walk down; stop at the first that fits.

| Need | Tool |
| --- | --- |
| Screen to screen | Native stack in Expo Router, platform default push. Never hand-rolled |
| A sheet that is its own screen | `presentation: 'formSheet'` (a real `UISheetPresentationController`); flows that return a result use the project's presentation contract (for example `present()`) |
| Tab bar | `NativeTabs` (`expo-router/unstable-native-tabs`) |
| Context menu, press-and-hold preview | `Link.Menu` / `Link.Preview` from Expo Router |
| Large title that collapses into the regular bar on scroll | `headerLargeTitleEnabled: true` on the native stack, with `contentInsetAdjustmentBehavior="automatic"` on the scroll view |
| Segmented control, switch, picker, slider | The native control, through the project's kit if it has one |
| Row swipe actions | Native swipe actions if the project provides them; otherwise `ReanimatedSwipeable` from gesture-handler |
| Pull to refresh | `RefreshControl` |
| Content that stays above the keyboard | Views that own keyboard layout natively (form sheets, a `ScrollView` with `automaticallyAdjustKeyboardInsets`); `react-native-keyboard-controller` is a last resort |
| A state-driven change with no gesture: press, toggle, color | Reanimated CSS transition (`transitionProperty` in the style) |
| A loop, multi-stage, or on-mount motion with no state change | Reanimated CSS animation (`animationName` keyframes) |
| An element mounting or unmounting, or a list reflowing | Layout animations (`entering` / `exiting` / `itemLayoutAnimation`) |
| Anything a finger drags, or anything derived from scroll | `useSharedValue` + `Gesture` + `useAnimatedStyle` |
| Illustration, celebration, empty state | Lottie, for illustration only, never for UI state |
| A large animated scene or freeform drawing | `@shopify/react-native-skia` |

Use a shared value only when the value is continuous or interruptible. A press
scale is a CSS transition; a drag is a shared value.

**Dependencies.** Install with `npx expo install`, which resolves versions that
match the SDK:

```bash
npx expo install react-native-reanimated react-native-worklets
```

Add `react-native-gesture-handler` when there is a gesture and `expo-haptics`
when there is a custom haptic. A project with `autoInstallPeers: false` (pnpm)
must list `react-native-worklets` explicitly, with the version `expo install`
picks. Expo SDK 57 bundles Gesture Handler v2 (~2.32); the recipes use its
`Gesture.Pan()` builder.

**Completion criterion:** the tool is named; if it is a platform component,
the run ends with its configuration.

### 4. Pick the properties

- `transform` and `opacity` only (see
  [performance](../emil-design-eng/references/motion-standards.md#performance)).
  `width`, `height`, `margin`, `padding`, `flex`, `top`, `left` and `gap`
  re-run Yoga every frame for that node and its siblings.
- The one exception: an absolutely positioned element with no children (a
  progress fill). It is out of flow, so nothing else re-lays out.
- Never `scale(0)`; entry scale per
  [entry scale](../emil-design-eng/references/motion-standards.md#entry-scale).
- `transform` is an array and order matters: `[{ translateY }, { scale }]`
  scales after moving. Keep translate first.
- Materials (blur) come from the platform or the project's kit. Never animate
  blur intensity; crossfade the opacity of a static material view.
- Percentages work in `translate` and are relative to the element's own size.

**Completion criterion:** every animated property is `transform` or `opacity`,
or the exception is named.

### 5. Timing or spring, and the options

If a finger was involved, use a spring; springs carry velocity through an
interruption. Everything else uses timing.

Reanimated's `withSpring` takes Apple's designer parameters directly. Map the
[spring table](../emil-design-eng/references/motion-standards.md#springs) like
this:

| Standards row | Reanimated config |
| --- | --- |
| Default UI, bounce 0 | `{ duration: 300, dampingRatio: 1 }` |
| Release after a drag or flick that carried momentum | `{ duration: 350, dampingRatio: 0.8, velocity }` |
| Must not pass a hard edge | add `overshootClamping: true` |

Spring `duration` in Reanimated is perceptual: the spring actually settles in
about 1.5× that time, so `duration: 300` runs about 450ms. Compare the
perceptual value, not the settle time, with the 300ms UI budget.

Curves from the
[easing table](../emil-design-eng/references/motion-standards.md#easing), as
Reanimated objects:

```ts
import { Easing, cubicBezier } from 'react-native-reanimated';

export const EASE_ENTER = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_MOVE = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);

export const CSS_EASE_ENTER = cubicBezier(0.23, 1, 0.32, 1);
```

`Easing.bezier` feeds `withTiming` and layout-animation builders.
`EASE_DRAWER` is the sheet/drawer curve from Ionic, for a sheet that is not
gesture-driven. Reanimated CSS `transitionTimingFunction` (4.5.x) accepts
only named curves or the `cubicBezier()` helper object, not a
`cubic-bezier(...)` string; the string form works only inside the
`transition` shorthand.

Durations come from the
[duration table](../emil-design-eng/references/motion-standards.md#duration).
Screen transitions keep the platform's timing.

Then offer 2–4 numbered options, for example:

1. **(Recommended)** spring `{ duration: 300, dampingRatio: 1 }`: no
   overshoot, retargets if the user taps again mid-motion.
2. `withTiming` 250ms with `EASE_ENTER`: predictable, but restarts on
   interruption.
3. spring `{ duration: 350, dampingRatio: 0.8, velocity }`: a small settle,
   right only if the motion follows a flick.

Mark one recommendation with a one-line reason and wait for the pick.

**Completion criterion:** the user has picked an option, or said to use the
recommendation.

### 6. Keep it off the JS thread

- Never `setState` from a gesture or scroll handler. Shared value →
  `useAnimatedStyle`, and React never re-renders.
- Never schedule back to the RN runtime inside `onUpdate` or a scroll
  handler. `scheduleOnRN(fn, ...args)` from `react-native-worklets` (the
  replacement for the deprecated `runOnJS(fn)(...args)`) belongs in `onEnd`
  or in a `useAnimatedReaction` that fires at a threshold.
- Never read or write a shared value during render. Touch shared values only
  in worklets, handlers and effects.
- Use `.get()` / `.set()`, not `.value`; it is the form the React Compiler can
  see through. `set` takes a functional update: `sv.set((v) => v + 1)`.
- Functions called from a worklet need `'worklet'` as their first line, or
  they throw on device.
- Wrap Gesture Handler v2 gestures in `useMemo`; rebuilding one every render
  can drop a drag mid-flight.

**Completion criterion:** no per-frame path crosses to the RN runtime.

### 7. Press, not hover

- Feedback on press-in, commit on press-out.
- Native buttons from the platform or the project's kit already highlight;
  leave them alone. For a custom pressable, `scale: 0.97` in 100–160ms through
  a CSS transition is one option, not a mandate; an opacity or background
  change is another.
- 44×44pt minimum touch target. If the visual is smaller, add `hitSlop`.
- `pressRetentionOffset` so a drifting finger does not cancel a press.

### 8. Haptics

Native sheet detents, switches, pickers, segmented controls, context menus and
other UIKit controls already emit haptics. Do not add `expo-haptics` on top of
them. Custom haptics are for custom interactions only:

| Moment in a custom interaction | Call |
| --- | --- |
| A value ticks past a step | `Haptics.selectionAsync()` |
| A custom drag snaps home or commits | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| A destructive custom action fires | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` |
| A custom operation succeeded or failed | `Haptics.notificationAsync(NotificationFeedbackType.Success / Error)` |

- Same frame as the visual: fire at the causal moment, not when the animation
  ends.
- One per user action; never on scroll, per frame, or on an entrance the user
  did not cause.
- Never the only feedback; many people turn system haptics off.
- From a worklet: `scheduleOnRN(Haptics.selectionAsync)`.

### 9. Reduced motion and accessibility

Reduced motion follows
[motion-standards](../emil-design-eng/references/motion-standards.md#reduced-motion):
drop translation, scale, parallax and overshoot; keep opacity and color
changes that explain the state change; no blur transitions.

What Reanimated does and does not do:

- `withSpring` and `withTiming` default to `ReduceMotion.System`: with Reduce
  Motion on, they jump to the end value. Pass `reduceMotion` explicitly when a
  gentler fade is wanted instead of a jump.
- Reanimated CSS transitions and CSS animations do not honour Reduce Motion.
  Gate them manually: read `useReducedMotion()` and drop the transform, keeping
  an opacity change.
- `useReducedMotion()` reads the setting once and does not update if the user
  changes it mid-session.
- Native stack, sheet and tab transitions are the platform's; the system
  applies its own Reduce Motion behaviour. A fade (`animation: 'fade'`) under
  reduced motion is an option to offer, not a default.

```tsx
import { useReducedMotion } from 'react-native-reanimated';

const reduced = useReducedMotion();
const enterFrom = reduced ? { opacity: 0 } : { opacity: 0, transform: [{ scale: 0.95 }] };
```

Text scales: any height measured at the default type size is wrong at large
Dynamic Type sizes. Never animate to a hardcoded height; measure with
`onLayout`, or animate a transform.

**Completion criterion:** the reduced-motion path is in the code, and the
CSS-transition paths are gated manually.

## Setup that silently breaks motion

- `babel-preset-expo` configures the worklets Babel plugin; only a bare RN
  project adds it by hand, and there it must be last.
- `GestureHandlerRootView` must wrap the root navigator, or gestures do
  nothing with no error.
- Reanimated 4 requires the New Architecture.
- Expo Go and dev builds are not performance environments; judge feel in a
  Release build.
- On ProMotion iPhones, third-party animations are capped at 60fps unless
  `CADisableMinimumFrameDurationOnPhone` is set. Check the app config and add
  it if missing:

```json
{ "expo": { "ios": { "infoPlist": { "CADisableMinimumFrameDurationOnPhone": true } } } }
```

## Recipes

Load [RECIPES.md](RECIPES.md) when the request matches one: press feedback,
screen transitions and sheets, list entrances, firing once at a threshold,
and the optional swipe-to-delete, toast and keyboard-following cases.

## Required output format

Before code:

- **Gate result**: frequency tier and purpose, or the reason it stops. Name
  any platform component that replaces the request.
- **Motion options**: 2–4 numbered options (tool, properties, curve or spring
  config, duration), one marked recommended with a one-line reason.

Stop and wait for the pick. After implementing:

- **Ingredients**: tool, properties, config, thread, reduced-motion path.
- **Feel-check on device**: what to try on a Release build (flick it,
  interrupt it mid-flight, reverse it, turn on Reduce Motion, turn haptics
  off).

## Invocation variants

| Input | Result |
| --- | --- |
| `1`, `pick 2` | Implement that option |
| `go` | Implement the recommendation |
| `none` | Leave it unanimated; confirm the platform behaviour stays |
| `tune <n>` | Offer variants of option n only |

## Never ship

| Never | Instead |
| --- | --- |
| A native control or effect imitated with RN views | The platform component or the project's kit |
| A hand-built sheet, collapsing header or segmented indicator | `formSheet`, `headerLargeTitleEnabled`, the native segmented control |
| `PanResponder` | `Gesture.Pan()` from gesture-handler |
| `setState` in a gesture or scroll handler | shared value + `useAnimatedStyle` |
| `runOnJS` | `scheduleOnRN` from `react-native-worklets` |
| `scheduleOnRN` per frame | `onEnd`, or `useAnimatedReaction` at a threshold |
| Reading or writing a shared value during render | `.get()` / `.set()` in worklets, handlers, effects |
| Core `Animated` for anything a finger touches | Reanimated |
| Animating `height` / `width` / `margin` / `flex` / `top` | `transform` + `opacity` (absolute, childless elements exempt) |
| Animating blur intensity | crossfade a static material view |
| `entering` on a virtualized list row | animate the container, or `itemLayoutAnimation` |
| A screen transition rebuilt in JS | the native stack's default push |
| Any transition between tabs | NativeTabs as is |
| `cubic-bezier(...)` string in `transitionTimingFunction` | `cubicBezier(0.23, 1, 0.32, 1)` |
| `Easing.in(...)` on a UI element | `Easing.bezier(0.23, 1, 0.32, 1)` |
| `scale(0)` entrance | `scale(0.95)` + `opacity: 0` |
| An ungated Reanimated CSS transition | `useReducedMotion()` drops the transform |
| Distance-only dismissal threshold | velocity or distance |
| `expo-haptics` on a native sheet detent or UIKit control | the control's own haptic |
| A haptic per frame, or as the only feedback | one per commit, paired with a visual |
| Judging feel in Expo Go or the simulator | Release build, oldest supported iPhone |
