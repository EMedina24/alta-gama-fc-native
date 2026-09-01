/**
 * The club page's alerts + calendar tray (ADR 0091) — the two club-level
 * actions, and the note that says what a subscription covers. Replaces
 * `club-header.tsx`'s two-button subscribe block.
 *
 * ⚠⚠ **Both directions go through the SHEET.** Subscribing and unsubscribing
 * confirm in the same place, deliberately (0082): unfollowing drops a season
 * of calendar entries, and this row is the only unfollow in the app.
 *
 * ⚠ The alert row INVERTS with state, the way the mock draws it: unsubscribed
 * is SOLID lime (the invitation — one lime hero per screen, and on this screen
 * it is this), subscribed is the lime wash with a lime ring (a settled state,
 * not a call to action). Never two solid-lime things at once.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertGlyph, Chevron, Text } from '@/components/atoms';
import { Tray } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface ClubActionsProps {
  subscribed: boolean;
  onToggleAlerts: () => void;
  onOpenCalendar: () => void;
  copy: {
    alertsOn: string;
    alertsOff: string;
    calendar: string;
    /** The "one subscription covers the season" note. */
    note: string;
  };
}

export function ClubActions({
  subscribed,
  onToggleAlerts,
  onOpenCalendar,
  copy,
}: ClubActionsProps) {
  return (
    <Tray>
      <View style={styles.body}>
        <Pressable
          onPress={onToggleAlerts}
          accessibilityRole="button"
          accessibilityState={{ selected: subscribed }}
          accessibilityLabel={subscribed ? copy.alertsOn : copy.alertsOff}
          style={({ pressed }) => [
            styles.alerts,
            subscribed ? styles.alertsOn : styles.alertsOff,
            pressed && styles.pressed,
          ]}>
          <View style={[styles.disc, subscribed ? styles.discOn : styles.discOff]}>
            <AlertGlyph kind="reminder" color={subscribed ? 'accent' : 'onAccent'} size={18} />
          </View>
          <Text variant="bodyStrong" color={subscribed ? 'accent' : 'onAccent'}>
            {subscribed ? copy.alertsOn : copy.alertsOff}
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpenCalendar}
          accessibilityRole="button"
          accessibilityLabel={copy.calendar}
          style={({ pressed }) => [styles.calendar, pressed && styles.pressed]}>
          <Text variant="bodyStrong">{copy.calendar}</Text>
          <View style={styles.chevron}>
            <Chevron direction="right" color="accent" />
          </View>
        </Pressable>

        <Text variant="footnote" color="textDim">
          {copy.note}
        </Text>
      </View>
    </Tray>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.two + 1, gap: Spacing.two },
  alerts: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.tile,
    borderWidth: 1,
  },
  // ⚠ Solid lime is the INVITATION (not subscribed); the wash is the settled
  // state. See the header before swapping these.
  alertsOff: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  alertsOn: { backgroundColor: Colors.dark.accentWash, borderColor: Colors.dark.accentRing },
  disc: {
    width: Size.followPillDisc,
    height: Size.followPillDisc,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discOff: { backgroundColor: Colors.dark.onAccentFill },
  discOn: { backgroundColor: Colors.dark.accentWashStrong },
  calendar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.tile,
    backgroundColor: Colors.dark.calRow,
    borderWidth: 1,
    borderColor: Colors.dark.activityHairline,
  },
  chevron: {
    width: Size.followPillDisc,
    height: Size.followPillDisc,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});
