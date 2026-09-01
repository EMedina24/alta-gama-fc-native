import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, type NativeStackNavigationOptions } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AUTH_REQUIRED } from '@/features/auth/capability';
import { usePushSync } from '@/features/push/use-push-sync';
import { watchAppStateForRefresh } from '@/lib/supabase/client';
import { queryClient } from '@/queries/client';
import { hydratePreferences, usePreferences } from '@/store/preferences';
import { hydrateSession, useSession } from '@/store/session';
import { hydrateStartingXi } from '@/store/starting-xi';

// ⚠ Module scope, deliberately un-awaited — the docs are explicit that calling
// this from inside a component or hook runs it too late to catch the auto-hide.
//
// ⚠ The `.catch` is load-bearing on both calls, not defensive noise. Each one
// rejects harmlessly when the splash is already gone, which happens on every Fast
// Refresh, and an unhandled rejection surfaces as a red box in dev.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });

export default function RootLayout() {
  // AsyncStorage is async, so preferences arrive after first paint. Holding the
  // tree back for one read avoids every screen having to distinguish "follows
  // nothing" from "we have not looked yet" — the two render very differently.
  //
  // ⚠ The stored SESSION is awaited alongside it, for the same reason and one
  // more: without it the account sheet paints its signed-out slot — Sign in
  // button and all — for a frame before the session lands, at somebody who is
  // already signed in.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([hydratePreferences(), hydrateSession(), hydrateStartingXi()]).finally(() => setReady(true));
  }, []);

  // ⚠ This is what makes the `return null` below survivable. Without it the
  // native splash auto-hides at first mount, so the two hydration reads play out
  // against an EMPTY screen — a black frame or two before anything paints. Held
  // here, the launch artwork stays up until there is a real screen behind it.
  //
  // ⚠ Keyed to `ready`, so it fires in the commit that renders the Stack, not
  // before it.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // ⚠ Token refresh follows the foreground. Left to `autoRefreshToken` alone it
  // keeps firing while the app is suspended, waking to spend requests nobody is
  // waiting on.
  useEffect(watchAppStateForRefresh, []);

  if (!ready) return null;

  return (
    // ⚠ Outermost, for the Starting XI board's drag gesture (ADR 0065). A
    // `GestureDetector` without this root throws at runtime, not compile time.
    <GestureHandlerRootView style={styles.root}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <OnboardingGate />
        <AuthGate />
        <PushSync />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.dark.background },
          }}>
          <Stack.Screen name="(tabs)" />
          {/* ⚠ The sheets are declared HERE, in the stack that PRESENTS them (ADR 0030). */}
          <Stack.Screen name="(sheets)/account" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          {/* ⚠ Declared HERE like every other sheet (ADR 0030) — a `(sheets)/_layout`
              silently renders it as a full-screen card. `fitToContents`: it is two
              buttons and a paragraph, and a 0.6 detent would leave half a sheet of
              dead space under them. */}
          <Stack.Screen
            name="(sheets)/sign-in"
            options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }}
          />
          <Stack.Screen name="(sheets)/alerts" options={sheet} />
          <Stack.Screen name="(sheets)/calendar" options={sheet} />
          <Stack.Screen name="(sheets)/calendar-jornada" options={sheet} />
          {/* The news link-out sheet (ADR 0064): one headline and three buttons. */}
          <Stack.Screen
            name="(sheets)/news-link"
            options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }}
          />
          {/* ⚠ `fitToContents` rather than a fraction: the player sheet is one
              fixed block, and a 0.6 detent would either clip its Done button or
              leave dead space under the footnote. */}
          <Stack.Screen
            name="(sheets)/player"
            options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }}
          />
          {/* The Starting XI builder's three sheets (ADR 0065). Export gets a
              tall detent because it holds a text field and a card preview. */}
          <Stack.Screen
            name="(sheets)/xi-shape"
            options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }}
          />
          <Stack.Screen
            name="(sheets)/xi-look"
            options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }}
          />
          <Stack.Screen name="(sheets)/xi-export" options={{ ...sheet, sheetAllowedDetents: [1] }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
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
const styles = { root: { flex: 1 } } as const;

const sheet: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.6],
  // ⚠ `sheetGround`, opaque, NOT the mesh or glass (ADR 0093): a sheet sits
  // over a scrim, and glass over a scrim reads muddy.
  contentStyle: { backgroundColor: Colors.dark.sheetGround },
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
 * Sends a signed-out reader to sign in — **when sign-in is mandatory, which it is
 * not yet**.
 *
 * ⚠ Inert while `AUTH_REQUIRED` is false, which is the point: v1.1 ships sign-in
 * as an optional upgrade (ADR 0038), and this is the seam that makes requiring it
 * later a constant change rather than a retrofit.
 *
 * ⚠ Modelled on `OnboardingGate` and **not** on `PushSync` — a redirect effect
 * that depends on `[router]` alone can fire before the navigator has mounted and
 * be silently dropped (HANDOFF open item 3). `useSegments()` re-runs once routing
 * is live, so this cannot lose its redirect the same way.
 *
 * ⚠ Ordered AFTER `OnboardingGate`: a first run must still pick clubs first, and
 * both gates bail out while the reader is inside the other's flow.
 *
 * ⚠ Turning this on also makes Guideline 5.1.1(v) unavoidable and turns the
 * sign-in sheet into a blocking screen — it would need its own `Close`-less
 * presentation, not just this flag.
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const session = useSession();
  const { onboarded } = usePreferences();

  useEffect(() => {
    if (!AUTH_REQUIRED || session) return;
    if (!onboarded) return;
    if (segments[0] === 'onboarding' || segments[0] === '_debug') return;
    if (segments[1] === 'sign-in') return;
    router.push('/(sheets)/sign-in');
  }, [session, onboarded, segments, router]);

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
    router.replace('/onboarding/welcome');
  }, [onboarded, segments, router]);

  return null;
}
