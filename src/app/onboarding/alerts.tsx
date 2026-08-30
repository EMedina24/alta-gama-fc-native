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

import { AlertGlyph, type AlertKind, Button, Check, Eyebrow, Glow, Hairline, Text } from '@/components/atoms';
import { AlertPreview, StepDots } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
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

  const rows: { kind: AlertKind; title: string; note: string; on: boolean }[] = [
    {
      kind: 'reminder',
      title: copy.account.reminder,
      /**
       * ⚠ Reads the ACTUAL lead times rather than naming 30 in prose (ADR 0040).
       * The primer runs before anything has been chosen, so this shows the
       * default — but a reader replaying onboarding from the account sheet has
       * their own picks, and a hardcoded "30 minutes" would be wrong for them.
       */
      note: prefs.reminderLeads.map((lead) => copy.account.leads[lead]).join(' · '),
      on: prefs.alertReminder,
    },
    { kind: 'moved', title: copy.account.moved, note: copy.account.movedNote, on: prefs.alertMoved },
    { kind: 'postponed', title: copy.account.postponed, note: copy.account.postponedNote, on: prefs.alertPostponed },
  ];

  return (
    <View style={styles.screen}>
      <Glow opacity={0.12} cx={0.5} cy={0.2} r={0.6} />
      <View style={[styles.content, { paddingTop: insets.top + Spacing.six }]}>
        <View style={styles.stepRow}>
          <Eyebrow color="accent">{copy.onboarding.step(2, 2)}</Eyebrow>
          <StepDots count={2} active={1} />
        </View>
        <Text variant="largeTitle">{copy.onboarding.alertsTitle}</Text>
        <Text variant="body" color="textSecondary" style={styles.body}>
          {copy.onboarding.alertsBody}
        </Text>

        {/* What a reader is saying yes to — a SAMPLE, before the prompt (ADR 0076). */}
        <View style={styles.preview}>
          <AlertPreview
            eyebrow={copy.onboarding.previewEyebrow}
            title={copy.onboarding.previewTitle}
            body={copy.onboarding.previewBody}
            time={copy.onboarding.previewTime}
          />
        </View>

        <View style={styles.group}>
          {rows.map((row, index) => (
            <View key={row.title}>
              {index > 0 ? <Hairline /> : null}
              <View style={styles.row}>
                <View style={styles.glyph}>
                  <AlertGlyph kind={row.kind} />
                </View>
                <View style={styles.rowText}>
                  <Text variant="bodyStrong">{row.title}</Text>
                  <Text variant="footnote" color="textMuted">
                    {row.note}
                  </Text>
                </View>
                <Check color="accent" />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Button label={copy.onboarding.allow} onPress={() => void allow()} loading={asking} tall />
        {/* ⚠ Does not ask — see the header. The prompt stays unspent. */}
        <Button label={copy.onboarding.notNow} tone="quiet" onPress={finish} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background, justifyContent: 'space-between' },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.three },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { lineHeight: 21 },
  preview: { marginTop: Spacing.four, marginBottom: Spacing.one },
  group: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.group,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three + 2,
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.four,
  },
  glyph: {
    width: Size.alertGlyphTile,
    height: Size.alertGlyphTile,
    borderRadius: Radius.seg + 1,
    backgroundColor: Colors.dark.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, gap: Spacing.half },
  footer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
});
