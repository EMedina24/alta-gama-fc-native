import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, type NativeStackNavigationOptions } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { usePushSync } from '@/features/push/use-push-sync';
import { queryClient } from '@/queries/client';
import { hydratePreferences, usePreferences } from '@/store/preferences';

export default function RootLayout() {
  // AsyncStorage is async, so preferences arrive after first paint. Holding the
  // tree back for one read avoids every screen having to distinguish "follows
  // nothing" from "we have not looked yet" — the two render very differently.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    hydratePreferences().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <OnboardingGate />
        <PushSync />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.dark.background },
          }}>
          <Stack.Screen name="(tabs)" />
          {/* ⚠ The sheets are declared HERE, in the stack that PRESENTS them (ADR 0030). */}
          <Stack.Screen name="(sheets)/account" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="(sheets)/alerts" options={sheet} />
          <Stack.Screen name="(sheets)/calendar" options={sheet} />
          <Stack.Screen name="(sheets)/calendar-jornada" options={sheet} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * The modal-sheet options, shared by every route in `(sheets)/`.
 *
 * ⚠ `presentation: 'formSheet'` only takes effect on a screen its PARENT
 * navigator presents. Setting it in a `(sheets)/_layout.tsx` did nothing — the
 * group's first route is that nested stack's ROOT, so it rendered as a
 * full-screen card: no grabber, no swipe-to-dismiss, and content under the status
 * bar (ADR 0030).
 *
 * ⚠ `sheetGrabberVisible` draws the grabber, so a sheet presented this way must
 * NOT also render the `Grabber` atom — that gives you two.
 */
const sheet: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.6],
  contentStyle: { backgroundColor: Colors.dark.card },
};

/**
 * Holds the device registration and local reminders in step.
 *
 * ⚠ A sibling component rather than a hook in `RootLayout`, so it sits INSIDE the
 * QueryClientProvider — it reads the upcoming-fixtures query to plan reminders.
 */
function PushSync() {
  usePushSync();
  return null;
}

/**
 * Sends a first-run reader to onboarding.
 *
 * ⚠ Runs as a sibling of the `Stack` rather than inside a screen, so the
 * redirect fires once the navigator is mounted and cannot loop: it only acts
 * while the reader is NOT already in `onboarding/`.
 */
function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const { onboarded } = usePreferences();

  useEffect(() => {
    if (onboarded) return;
    // Already there, or in dev tooling — `_debug` is deliberately not gated, so
    // a component can be previewed without completing a flow first.
    if (segments[0] === 'onboarding' || segments[0] === '_debug') return;
    router.replace('/onboarding/clubs');
  }, [onboarded, segments, router]);

  return null;
}
