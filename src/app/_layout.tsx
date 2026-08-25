import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { queryClient } from '@/queries/client';
import { hydratePreferences } from '@/store/preferences';

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
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.dark.background },
          }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
