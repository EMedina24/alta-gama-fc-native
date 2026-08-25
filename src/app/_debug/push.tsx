/**
 * Dev tool: surface this device's APNs token so it can be pasted into the
 * backend's `yarn cronogol:probe:apns <token>`.
 *
 * ⚠ Dev-only (the `_debug` layout redirects in release). The raw token is a
 * routing address, not a secret — but it identifies one device, so it does not
 * belong on a user-facing screen.
 */
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  PUSH_AVAILABLE,
  apnsEnvironment,
  getDeviceToken,
  requestPushPermission,
} from '@/features/push/capability';
import { normaliseToken } from '@/lib/cronogol/push';
import { buildRegistration } from '@/features/push/sync';
import { readLastRegistration } from '@/store/registration';
import { useI18n } from '@/lib/i18n/use-i18n';
import { usePreferences } from '@/store/preferences';

export default function DebugPush() {
  const prefs = usePreferences();
  const { locale } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState('idle');
  const [lastSent, setLastSent] = useState<string>('(never)');
  const [copied, setCopied] = useState(false);
  const [scheduled, setScheduled] = useState<string>('…');

  const load = async () => {
    setStatus('requesting permission…');
    const outcome = await requestPushPermission();
    setStatus(`permission: ${outcome}`);
    const raw = await getDeviceToken();
    setToken(raw);
    const previous = await readLastRegistration();
    setLastSent(previous ? JSON.stringify(previous.clubSlugs) : '(never)');

    // ⚠ The real proof that `applyReminders` ran: iOS's own pending queue.
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const soonest = pending
      .map((n) => (n.trigger as { value?: number } | null)?.value)
      .filter((v): v is number => typeof v === 'number')
      .sort((a, b) => a - b)[0];
    setScheduled(
      `${pending.length} pending` +
        (soonest ? ` · next ${new Date(soonest).toISOString().slice(0, 16)}Z` : ''),
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const normalised = token ? normaliseToken(token) : null;
  const body = normalised ? buildRegistration(prefs, locale, normalised) : null;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text variant="title">Push</Text>

      <Row label="PUSH_AVAILABLE" value={String(PUSH_AVAILABLE)} />
      <Row label="environment" value={apnsEnvironment()} />
      <Row label="status" value={status} />
      <Row label="last registered slugs" value={lastSent} />
      <Row label="local reminders" value={scheduled} />
      <Row label="followed clubs" value={String(prefs.followed.length)} />

      <Text variant="eyebrowSm" color="textFaint">
        APNs device token
      </Text>
      <View style={styles.tokenBox}>
        <Text variant="micro" color={normalised ? 'accent' : 'textFaint'} style={styles.mono}>
          {normalised ??
            (token
              ? `INVALID (${token.length} chars) — ${token}`
              : 'null · simulators cannot register for remote notifications; use a physical device')}
        </Text>
      </View>

      {normalised ? (
        <Button
          label={copied ? 'COPIED' : 'Copy token'}
          tone="secondary"
          onPress={async () => {
            await Clipboard.setStringAsync(normalised);
            setCopied(true);
          }}
        />
      ) : null}

      <Text variant="eyebrowSm" color="textFaint">
        Registration body (what the PUT sends)
      </Text>
      <View style={styles.tokenBox}>
        <Text variant="micro" color="textSecondary" style={styles.mono}>
          {body
            ? JSON.stringify({ ...body, token: `${body.token.slice(0, 8)}…` }, null, 1)
            : '(no token)'}
        </Text>
      </View>

      <Button label="Re-check" tone="quiet" onPress={() => void load()} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="footnote" color="textSecondary">
        {label}
      </Text>
      <Text variant="footnote" color="accent" style={styles.mono}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.five, paddingTop: Spacing.eight * 2, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  tokenBox: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  mono: { fontFamily: 'Menlo' },
});
