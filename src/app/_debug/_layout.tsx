/**
 * Guards every `/\_debug/*` route.
 *
 * ⚠ The leading underscore does NOT make a route private: expo-router treats
 * only `_layout` specially, and the generated `router.d.ts` lists `/_debug` and
 * `/_debug/gallery` as ordinary navigable hrefs. Without this redirect a release
 * build would serve an internal diagnostics screen at a guessable URL.
 */
import { Redirect, Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function DebugLayout() {
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    />
  );
}
