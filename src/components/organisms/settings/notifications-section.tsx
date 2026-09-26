/**
 * Settings' NOTIFICATIONS (ADR 0208) — the account sheet's alert group,
 * re-drawn as the Medina mock's plain rows.
 *
 * ⚠ The rows lost their glyph tiles (the mock has none) and kept their NOTES.
 * The notes are not decoration: the goals note is the switch's real limit, and
 * the others say what the alert is for. HANDOFF reserves the goals note's copy
 * for Ed — it is carried over unchanged.
 *
 * ⚠ Goals first, as the mock orders it. That one switch covers goals, red
 * cards AND full time (ADR 0053); the mock's separate "Full-time results" and
 * "Live Activities" switches have no backend behind them and are not drawn.
 *
 * ⚠ The reminder's lead times stay CHIPS under its row, not the mock's
 * trailing "30 min": a reader can hold several at once (1 h and 15 min), and a
 * single value would misstate that.
 *
 * ⚠⚠ The `alertsNote` line sits DIRECTLY under the switches (ADR 0079). It is
 * the only thing on screen that says whether they ever reached the server —
 * its absence is how three dispatched goals reached zero devices for two days.
 *
 * ⚠ "Turn off alerts on this device" stays reachable signed in AND out:
 * alerts are DEVICE state, surviving sign-out and account deletion, so this is
 * the only control that stops them.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Switch, Text } from '@/components/atoms';
import { ListGroup, SettingsRow } from '@/components/molecules';
import { Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';
import { REMINDER_LEAD_OPTIONS, type ReminderLead } from '@/store/preferences';

import { LeadChips } from './lead-chips';

export type AlertKey = 'alertReminder' | 'alertMoved' | 'alertPostponed' | 'alertGoals';

export interface NotificationsSectionProps {
  copy: Copy['account'];
  alerts: {
    reminder: boolean;
    moved: boolean;
    postponed: boolean;
    /** ⚠ Goals, reds and full time share ONE switch (ADR 0053). */
    goals: boolean;
    /** ⚠ Never empty while `reminder` is true — the store couples the two. */
    leads: readonly ReminderLead[];
  };
  onSetAlert: (key: AlertKey, value: boolean) => void;
  onSetReminderLead: (lead: ReminderLead, value: boolean) => void;
  /** Resolved by the route (ADR 0079) — see the header. */
  alertsNote: string;
  /** Present only when the note is an instruction (ADR 0136). */
  onAlertsNotePress?: () => void;
  onTurnOffAlerts: () => void;
}

export function NotificationsSection({
  copy: a,
  alerts,
  onSetAlert,
  onSetReminderLead,
  alertsNote,
  onAlertsNotePress,
  onTurnOffAlerts,
}: NotificationsSectionProps) {
  const toggle = (key: AlertKey, value: boolean, label: string) => (
    <Switch value={value} onValueChange={(v) => onSetAlert(key, v)} accessibilityLabel={label} />
  );

  return (
    <View style={styles.stack}>
      <ListGroup>
        <SettingsRow
          title={a.goals}
          note={a.goalsNote}
          trailing={toggle('alertGoals', alerts.goals, a.goals)}
        />
        {/* The chips ride INSIDE the reminder's slot, so no rule cuts them off
            from the row they belong to (`ListGroup`'s docblock). */}
        <View>
          <SettingsRow
            title={a.reminder}
            note={a.reminderNote}
            trailing={toggle('alertReminder', alerts.reminder, a.reminder)}
          />
          {alerts.reminder ? (
            <LeadChips
              options={REMINDER_LEAD_OPTIONS}
              selected={alerts.leads}
              labels={a.leadsShort}
              longLabels={a.leads}
              onToggle={onSetReminderLead}
            />
          ) : null}
        </View>
        <SettingsRow
          title={a.moved}
          note={a.movedNote}
          trailing={toggle('alertMoved', alerts.moved, a.moved)}
        />
        <SettingsRow
          title={a.postponed}
          note={a.postponedNote}
          trailing={toggle('alertPostponed', alerts.postponed, a.postponed)}
        />
      </ListGroup>

      {/* ⚠ ADR 0079 — see the header. Pressable only when the route sent a
          handler (the no-permission instruction, ADR 0136). */}
      {onAlertsNotePress ? (
        <Pressable
          onPress={onAlertsNotePress}
          accessibilityRole="button"
          accessibilityLabel={alertsNote}
          hitSlop={Spacing.two}>
          <Text variant="footnote" color="textDim" style={styles.note}>
            {alertsNote}
          </Text>
        </Pressable>
      ) : (
        <Text variant="footnote" color="textDim" style={styles.note}>
          {alertsNote}
        </Text>
      )}

      <ListGroup>
        <SettingsRow title={a.turnOffAlerts} tone="danger" onPress={onTurnOffAlerts} />
      </ListGroup>
      <Text variant="footnote" color="textFaint" style={styles.note}>
        {a.turnOffAlertsNote}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.two },
  // Aligned with the rows' text, not the card's edge — the iOS footer inset.
  note: { paddingHorizontal: Spacing.four },
});
