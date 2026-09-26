/**
 * The time-zone picker (ADR 0208) — Settings' Time zone row. The first caller
 * `setTimezoneId` has ever had: the six quick picks were ported from the web
 * app with the store field behind them (ADR 0018) and never given a control.
 *
 * ⚠ "Your device's" is FIRST and is `null`, not a zone — the normal state,
 * which follows the phone across a flight. The six are a shortlist, not the
 * set of zones this app can render: a reader in Chicago on the device option
 * sees Chicago kickoffs (`effectiveZone`'s docblock).
 *
 * ⚠ Device-only, like the `tz` field it writes. It does NOT patch the
 * account's `timeZone` — this app has never written that field
 * (`features/auth/apple.ts` says so), and a display pick made on one phone
 * should not quietly become the account's.
 *
 * ⚠ No `flex: 1` inside a formSheet (trap 19).
 */
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Check, Text } from '@/components/atoms';
import { ListGroup, SettingsRow } from '@/components/molecules';
import { Spacing } from '@/constants/theme';
import { hapticToggle } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n/use-i18n';
import {
  DEFAULT_TIMEZONE,
  TIMEZONES,
  deviceTimeZone,
  timezoneLabel,
  zoneLabel,
} from '@/lib/timezones';
import { setTimezoneId, usePreferences } from '@/store/preferences';

export default function TimeZoneSheet() {
  const router = useRouter();
  const { copy, locale } = useI18n();
  const { tz } = usePreferences();

  const pick = (id: string | null) => {
    void hapticToggle();
    setTimezoneId(id);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="headline" accessibilityRole="header">
        {copy.settings.timezoneTitle}
      </Text>
      <ListGroup>
        <SettingsRow
          title={copy.settings.deviceZone}
          note={copy.settings.deviceZoneNote(
            zoneLabel(deviceTimeZone() ?? DEFAULT_TIMEZONE.zone, locale),
          )}
          trailing={tz === null ? <Check /> : null}
          selected={tz === null}
          chevron={false}
          onPress={() => pick(null)}
        />
        {TIMEZONES.map((zone) => (
          <SettingsRow
            key={zone.id}
            title={timezoneLabel(zone, locale)}
            trailing={tz === zone.id ? <Check /> : null}
            selected={tz === zone.id}
            chevron={false}
            onPress={() => pick(zone.id)}
          />
        ))}
      </ListGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four },
});
