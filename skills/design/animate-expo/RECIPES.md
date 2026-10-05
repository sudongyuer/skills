# Expo Animation Recipes

Starting points for the cases that come up most in an Expo iOS app. Each one
still goes through the gate and the numbered options in [SKILL.md](SKILL.md);
the values shown are the recommended option, taken from
[motion-standards](../emil-design-eng/references/motion-standards.md). Several
recipes are marked **Optional**: use them only when no platform component fits.

---

## Setup the recipes assume

```bash
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler expo-haptics
```

Install `react-native-gesture-handler` and `expo-haptics` only when a recipe
uses them. With pnpm and `autoInstallPeers: false`, keep
`react-native-worklets` listed explicitly in `package.json`. The worklets
Babel plugin is configured by `babel-preset-expo`.

`GestureHandlerRootView` wraps the root navigator once. In an app whose tabs
are `NativeTabs`, the root layout is usually a stack that hosts the `(tabs)`
group and the modal routes; wrap whatever the root renders:

```tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

Shared imports and curves:

```ts
import { useMemo, useState } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction, useReducedMotion,
  withSpring, withTiming, Easing, cubicBezier,
  FadeInDown, FadeOutDown, LinearTransition,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

const EASE_ENTER = Easing.bezier(0.23, 1, 0.32, 1);
const CSS_EASE_ENTER = cubicBezier(0.23, 1, 0.32, 1);
```

`EASE_ENTER` is the strong ease-out for `withTiming` and layout builders;
`CSS_EASE_ENTER` is the same curve as the helper object that Reanimated CSS
`transitionTimingFunction` requires.

Conventions used throughout:

- Shared values are read and written with `.get()` / `.set()`.
- `scheduleOnRN(fn, ...args)` replaces the deprecated `runOnJS(fn)(...args)`.
- Gestures use the Gesture Handler v2 builder that Expo SDK 57 bundles, wrapped
  in `useMemo` so a re-render does not drop a drag mid-flight.

Gesture Handler v3, if a project is already on it: each gesture is a hook
taking one config object (`usePanGesture({...})`), `onStart` becomes
`onActivate`, `onEnd` becomes `onDeactivate`, the `success` flag is replaced by
an inverted `event.canceled`, and the `useMemo` goes away. Translate the
recipes; do not upgrade a project to v3 for them.

---

## Press feedback for a custom pressable

Native buttons from the platform or the project's kit already highlight; leave
them as they are. This recipe is one option for a custom pressable, not a
mandate for every one. It passes the frequency gate only because it is
near-imperceptible: 120ms and a 3% scale.

```tsx
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

export function PressableScale({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const pressedStyle = reduced ? styles.pressedReduced : styles.pressed;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={12}
      pressRetentionOffset={16}
    >
      <Animated.View style={[styles.box, pressed && pressedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    opacity: 1,
    transform: [{ scale: 1 }],
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: '120ms',
    transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
  },
  pressed: { transform: [{ scale: 0.97 }] },
  pressedReduced: { opacity: 0.7 },
});
```

`setState` is fine here; it fires twice per press, not per frame. Reanimated
CSS transitions ignore Reduce Motion, so the component swaps the scale for an
opacity change itself. `hitSlop` brings a small visual up to the 44pt target.

---

## Screen transitions and sheets (Expo Router)

Configure the native stack; never rebuild a transition in JS. The native one
runs on the platform side, keeps the interactive back swipe, and matches every
other app on the device.

```tsx
<Stack screenOptions={{ headerLargeTitleEnabled: true }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="[id]" />
  <Stack.Screen
    name="filter"
    options={{
      presentation: 'formSheet',
      sheetAllowedDetents: [0.5, 1],
      sheetGrabberVisible: true,
    }}
  />
</Stack>
```

| Navigation | Option |
| --- | --- |
| Deeper into a hierarchy | No `animation` option: the platform default push |
| A self-contained task the user can abandon | `presentation: 'modal'` |
| A short interruption: picker, filter, share | `presentation: 'formSheet'` with detents |
| A flow that returns a result | The project's presentation contract (for example `await present(page, params)`, which settles `completed` or `cancelled`), not a pushed route plus callbacks |
| Between tabs | NativeTabs: platform tab switching, nothing to configure |
| Large title | `headerLargeTitleEnabled: true`; the large title collapses into the regular bar on scroll when the scroll view sets `contentInsetAdjustmentBehavior="automatic"` |

- Do not hand-build a drag-to-dismiss sheet. `formSheet` is a real
  `UISheetPresentationController` with detents, the grabber, velocity-aware
  dismissal and its own detent haptics.
- `sheetAllowedDetents: 'fitToContents'` needs explicitly sized content; a
  `flex: 1` root has no intrinsic height to fit.
- Optional, under reduced motion or for a deliberate cross-fade:
  `animation: 'fade'`. When any custom `animation` is set, also set
  `animationMatchesGesture: true`, so the back swipe runs the same transition
  in reverse instead of the default push.

---

## List entrances

For content the user asked for and is waiting on, not a list they scroll past
all day. Builders are created once per row with `useMemo`, because an inline
chain in JSX rebuilds the builder on every render.

```tsx
function Row({ item, index }: { item: Item; index: number }) {
  const entering = useMemo(() => FadeInDown.duration(250).delay(index * 40), [index]);
  return <Animated.View entering={entering}><RowContent item={item} /></Animated.View>;
}
```

Stagger 30–80ms per item, per the
[duration table](../emil-design-eng/references/motion-standards.md#duration).
Never put `entering` on a row inside `FlatList`, `FlashList` or any virtualized
list: rows are recycled, so the animation re-fires as rows scroll back into
view. Animate the container once on mount, or use `itemLayoutAnimation` for
reflow only. Under reduced motion, replace `FadeInDown` with a plain fade or
nothing.

---

## Firing something once at a threshold

When a crossing point in a custom gesture matters (a custom drag arming or
committing), do not poll it from JS and do not `scheduleOnRN` every frame.

```tsx
const armed = useSharedValue(false);

useAnimatedReaction(
  () => dragDistance.get() > COMMIT_THRESHOLD,
  (isArmed, wasArmed) => {
    if (isArmed !== wasArmed) {
      armed.set(isArmed);
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
    }
  },
);
```

The comparison runs on the UI thread every frame; the RN call happens only at
the crossing. Native controls (sheets, `RefreshControl`) already emit their
own haptics; this pattern is for custom gestures only.

---

## Swipe to delete a row

**Optional — only when no platform component fits; prefer native swipe
actions / system UI.** If the project's kit provides native swipe actions, use
them. Otherwise gesture-handler's
[`ReanimatedSwipeable`](https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/)
covers swipe-to-reveal actions. Build the gesture only for swipe-to-commit.

```tsx
const x = useSharedValue(0);
const start = useSharedValue(0);

const pan = useMemo(
  () =>
    Gesture.Pan()
      .activeOffsetX([-10, 10])
      .onStart(() => {
        start.set(x.get());
      })
      .onUpdate((e) => {
        x.set(Math.min(0, start.get() + e.translationX));
      })
      .onEnd((e) => {
        const flicked = e.velocityX < -FLICK_VELOCITY;
        const far = x.get() < -SWIPE_THRESHOLD;
        if (flicked || far) {
          x.set(
            withTiming(-ROW_WIDTH, { duration: 200, easing: EASE_ENTER }, (finished) => {
              if (finished) scheduleOnRN(onDelete, id);
            }),
          );
        } else {
          x.set(withSpring(0, { duration: 300, dampingRatio: 1, velocity: e.velocityX }));
        }
      }),
  [onDelete, id],
);
```

- `activeOffsetX` declares the axis. Without it the pan steals vertical scrolls
  and the list feels broken in a way that looks like a scrolling bug.
- `onStart` captures the current value, so grabbing a row mid-spring continues
  from where it is.
- Velocity or distance commits; a quick flick is enough.
- With Reduce Motion on, `withTiming` and `withSpring` jump to the end value
  (`ReduceMotion.System`), which is acceptable here.

Closing the gap is the list's job. Build the layout transition at module scope:

```tsx
const ROW_CLOSE = LinearTransition.duration(200);

<Animated.FlatList data={items} itemLayoutAnimation={ROW_CLOSE} renderItem={renderRow} />
```

---

## Toast

**Optional — only when no platform component fits; prefer native swipe
actions / system UI.** Check first whether the project's kit or the system
offers the feedback (a banner, an inline status, a native alert).

```tsx
const TOAST_ENTER = FadeInDown.duration(250).easing(EASE_ENTER);
const TOAST_EXIT = FadeOutDown.duration(200).easing(EASE_ENTER);

<Animated.View
  entering={TOAST_ENTER}
  exiting={TOAST_EXIT}
  style={{ position: 'absolute', bottom: insets.bottom + 16, left: 16, right: 16 }}
/>
```

- The builders live at module scope.
- It exits the way it entered, and the exit is no longer than the enter.
- Safe-area insets always; `bottom: 16` sits under the home indicator.
- Under reduced motion, use `FadeIn` / `FadeOut` without the translation.

---

## Keyboard-following UI

**Optional — last resort; don't wrap views that own keyboard layout natively.**
Form sheets, native text views from the project's kit, and a `ScrollView` with
`automaticallyAdjustKeyboardInsets` already handle the keyboard. Reach for
`react-native-keyboard-controller` only for a custom element pinned above the
keyboard.

```bash
npx expo install react-native-keyboard-controller
```

`KeyboardProvider` goes in the root layout next to `GestureHandlerRootView`;
the hooks do nothing without it.

```tsx
import { KeyboardProvider, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';

const { height } = useReanimatedKeyboardAnimation();
const footerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: height.get() }] }));
```

`height` runs from 0 to minus the keyboard height. On iOS the value is set when
the keyboard starts moving, not updated frame by frame, so judge the sync on a
device. Never build this from `Keyboard.addListener` plus your own timing
animation: the keyboard uses a private system curve and any duration you pick
will lag or lead it.
