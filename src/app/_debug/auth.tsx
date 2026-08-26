/**
 * Auth gate — dev-only.
 *
 * ⚠ Exists because the two things most likely to be wrong here are invisible from
 * the app's own UI: whether the bearer actually reaches `crono-gol.com`, and
 * whether `PUT /cronogol/push/device` came back `linked: true`. Both are silent
 * failures — a broken bearer just looks like a signed-out app that says it is
 * signed in.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/atoms';
import { Colors, Spacing, Type } from '@/constants/theme';
import { signInWithApple } from '@/features/auth/apple';
import { appleAvailable, AUTH_AVAILABLE, AUTH_REQUIRED } from '@/features/auth/capability';
import { signInWithGoogle, GOOGLE_REDIRECT_URL } from '@/features/auth/google';
import { syncPushRegistration } from '@/features/push/sync';
import { getAccount } from '@/lib/cronogol/account';
import { useLocale, usePreferences } from '@/store/preferences';
import { getAccessToken, signOut, useSession } from '@/store/session';

export default function DebugAuth() {
  const session = useSession();
  const prefs = usePreferences();
  const locale = useLocale();
  const [log, setLog] = useState<string[]>([]);

  const say = (line: string) => setLog((prev) => [line, ...prev].slice(0, 20));

  async function probe(label: string, run: () => Promise<unknown>) {
    try {
      say(`${label} → ${JSON.stringify(await run())}`);
    } catch (cause) {
      say(`${label} ✗ ${cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)}`);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Auth gate</Text>

      <Row label="AUTH_AVAILABLE" value={String(AUTH_AVAILABLE)} />
      <Row label="AUTH_REQUIRED" value={String(AUTH_REQUIRED)} />
      <Row label="session" value={session ? session.userId : 'signed out'} />
      <Row label="jwt email (goes stale)" value={session?.email ?? '—'} />
      {/* ⚠ Must appear VERBATIM in Supabase → URL Configuration → Redirect URLs.
          An unlisted value falls back to the Site URL and the app never hears back. */}
      <Row label="google redirect" value={GOOGLE_REDIRECT_URL} />

      <View style={styles.actions}>
        <Button
          label="Apple sign-in"
          onPress={() => void probe('apple', async () => {
            if (!(await appleAvailable())) return 'unavailable on this device';
            await signInWithApple();
            return 'ok';
          })}
        />
        <Button label="Google sign-in" tone="secondary" onPress={() => void probe('google', signInWithGoogle)} />
        <Button
          label="GET /cronogol/me"
          tone="outline"
          onPress={() => void probe('me', getAccount)}
        />
        <Button
          label="Access token present?"
          tone="outline"
          onPress={() => void probe('token', async () => Boolean(await getAccessToken()))}
        />
        {/* ⚠ THE check that matters: `linked: true` proves the bearer reached the
            push route. `sent` alone only says the registration went through. */}
        <Button
          label="PUT push/device (want linked)"
          tone="outline"
          onPress={() => void probe('push', () => syncPushRegistration(prefs, locale))}
        />
        <Button label="Sign out" tone="danger" onPress={() => void probe('signOut', signOut)} />
      </View>

      {log.map((line, i) => (
        <Text key={`${i}-${line}`} style={styles.log}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.five, paddingTop: Spacing.eight * 2, gap: Spacing.two },
  title: { ...Type.title, color: Colors.dark.text, marginBottom: Spacing.four },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  label: { ...Type.footnote, color: Colors.dark.textSecondary, flexShrink: 1 },
  value: { ...Type.footnote, color: Colors.dark.accent, flexShrink: 1, textAlign: 'right' },
  actions: { gap: Spacing.two, marginVertical: Spacing.four },
  log: { ...Type.micro, color: Colors.dark.textDim, fontFamily: 'Menlo' },
});
