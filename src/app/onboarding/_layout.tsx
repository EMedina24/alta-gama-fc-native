/**
 * Onboarding — a welcome, then two steps, before the tabs (ADR 0076).
 *
 * ⚠ The ONLY skip is the alert primer's `Not now` (ADR 0077). The welcome and
 * the picker have none: a followed club is the precondition for everything
 * after, so `Continue` (disabled at zero picks) is the picker's one way out.
 * The primer's skip still lands in the app with the picks subscribed — it is
 * "don't ask me about alerts", not "discard what I just chose".
 */
import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.background },
        // No swipe-back out of a gated flow.
        gestureEnabled: false,
      }}
    />
  );
}
