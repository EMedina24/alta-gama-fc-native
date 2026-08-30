/**
 * Onboarding — a welcome, then two steps, before the tabs (ADR 0076).
 *
 * ⚠ Skipping still lands in the app **with the picks subscribed**. A skip is
 * "don't ask me the rest", not "discard what I just chose".
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
