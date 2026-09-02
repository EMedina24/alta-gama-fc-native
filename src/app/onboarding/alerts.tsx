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
import { StatusBar } from 'expo-status-bar';

import { type AlertKind, Button, Check, Hairline, MeshGround, Text } from '@/components/atoms';
import { AlertPreview, AlertTile, StepDots } from '@/components/molecules';
import { Crown } from '@/components/templates/crown';
import { Colors, Radius, Spacing, Surfaces } from '@/constants/theme';
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
      {/* Statically dark: no scroll, so the crown's bright band never leaves
          the top (ADR 0094's flip, degenerate case — ADR 0099). */}
      <StatusBar style="dark" />
      <MeshGround />
      <Crown
        eyebrow={copy.onboarding.step(2, 2)}
        title={copy.onboarding.alertsTitle}
        meta={<StepDots count={2} active={1} />}
        topInset={insets.top}
        padBottom={Spacing.four}>
        <Text variant="body" color="onCrownDim" style={styles.body}>
          {copy.onboarding.alertsBody}
        </Text>
      </Crown>
      <View style={styles.content}>
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
                {/* ⚠ `accent`, not the account sheet's per-type tones: these
                    three are not controls, and this screen's lime budget is
                    already spent on rows rather than a switch (ADR 0081). */}
                <AlertTile kind={row.kind} />
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
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { flex: 1, paddingHorizontal: Spacing.five, gap: Spacing.three },
  body: { lineHeight: 21 },
  preview: { marginTop: Spacing.two, marginBottom: Spacing.one },
  // Glass on the mesh (ADR 0087's ladder) — `card` was the old flat ground's.
  group: {
    ...Surfaces.glass,
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
  rowText: { flex: 1, minWidth: 0, gap: Spacing.half },
  footer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
});
