/**
 * Step 2 — the alert primer.
 *
 * ⚠ **The permission is asked AFTER the explanation, never on cold launch.** That
 * is the design's rule and it is also the only way to get a good grant rate: iOS
 * gives an app exactly one system prompt, and spending it before the user knows
 * what they are agreeing to spends it badly.
 *
 * ⚠ `Not now` does NOT ask. iOS grants one prompt per install, so an explicit
 * decline must leave it unspent — the reader can still turn alerts on later from
 * the account sheet and get the real prompt then.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Hairline, Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/use-i18n';
import { requestPushPermission } from '@/features/push/capability';
import { setAlert, setOnboarded, usePreferences } from '@/store/preferences';

export default function OnboardingAlerts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();
  const prefs = usePreferences();

  const [asking, setAsking] = useState(false);

  const finish = () => {
    setOnboarded(true);
    router.replace('/');
  };

  const allow = async () => {
    setAsking(true);
    const outcome = await requestPushPermission();
    // ⚠ A refusal turns the switches off rather than leaving them on and silent:
    // an account sheet showing three green switches that deliver nothing is the
    // same dishonesty the score-age line exists to prevent.
    if (outcome !== 'granted') {
      setAlert('alertReminder', false);
      setAlert('alertMoved', false);
      setAlert('alertPostponed', false);
    }
    finish();
  };

  const rows = [
    { title: copy.account.reminder, note: copy.account.reminderNote, on: prefs.alertReminder },
    { title: copy.account.moved, note: copy.account.movedNote, on: prefs.alertMoved },
    { title: copy.account.postponed, note: copy.account.postponedNote, on: prefs.alertPostponed },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.eight }]}>
        <Text variant="largeTitle">{copy.onboarding.alertsTitle}</Text>
        <Text variant="body" color="textDim">
          {copy.onboarding.alertsBody}
        </Text>

        <View style={styles.group}>
          {rows.map((row, index) => (
            <View key={row.title}>
              {index > 0 ? <Hairline /> : null}
              <View style={styles.row}>
                <Text variant="callout" color="accent" style={styles.check}>
                  ✓
                </Text>
                <View style={styles.rowText}>
                  <Text variant="bodyStrong">{row.title}</Text>
                  <Text variant="footnote" color="textFaint">
                    {row.note}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>


      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Button label={copy.onboarding.allow} onPress={() => void allow()} loading={asking} />
        {/* ⚠ Does not ask — see the header. The prompt stays unspent. */}
        <Button label={copy.onboarding.notNow} tone="quiet" onPress={finish} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background, justifyContent: 'space-between' },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.three },
  group: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.group,
    overflow: 'hidden',
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  check: { width: 16 },
  rowText: { flex: 1, gap: Spacing.half },
  footer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
});
