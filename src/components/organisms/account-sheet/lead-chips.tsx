/**
 * The kickoff reminder's lead times, as chips under their master row
 * (ADR 0081, replacing ADR 0040's three indented switch rows).
 *
 * ⚠ **This changes how the lead times are DRAWN, not how they behave.** The
 * store still couples the master and the list in both directions
 * (`setAlert` restores `[30]`, `setReminderLead` turns the master off with the
 * last chip), the set is still closed and still ordered earliest-first by
 * `REMINDER_LEAD_OPTIONS` — the parent maps that constant, so nothing here
 * sorts. Adding a fourth lead is still a four-file change.
 *
 * ⚠ The three rows had to be indented, `disabled` and dimmed while the master
 * was off, because a live switch under a dead one lies about what will be
 * delivered. Chips solve that more honestly: while the master is off they are
 * not drawn at all, so there is nothing to misread.
 *
 * ⚠ The chip's label is `leadsShort` but its accessibility label is the full
 * `leads` sentence — "30 min" is a fine thing to see next to a row that says
 * "Antes del partido" and a poor thing to hear alone.
 */
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/atoms';
import { Colors, Motion, Radius, Size, Spacing } from '@/constants/theme';
import { hapticToggle } from '@/lib/haptics';
import type { ReminderLead } from '@/store/preferences';

export interface LeadChipsProps {
  /** `REMINDER_LEAD_OPTIONS`, passed in so the order stays the constant's. */
  options: readonly ReminderLead[];
  selected: readonly ReminderLead[];
  /** `copy.account.leadsShort` — what is drawn. */
  labels: Readonly<Record<ReminderLead, string>>;
  /** `copy.account.leads` — what is announced. */
  longLabels: Readonly<Record<ReminderLead, string>>;
  onToggle: (lead: ReminderLead, value: boolean) => void;
}

export function LeadChips({ options, selected, labels, longLabels, onToggle }: LeadChipsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(Motion.base)}
      exiting={reduceMotion ? undefined : FadeOut.duration(Motion.quick)}
      style={styles.row}>
      {options.map((lead) => {
        const on = selected.includes(lead);
        return (
          <Pressable
            key={lead}
            onPress={() => {
              void hapticToggle();
              onToggle(lead, !on);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={longLabels[lead]}
            // The chip is below `minTouch` on purpose — three of them share one
            // row inside a group — so it buys the difference back here.
            hitSlop={{ top: Spacing.two, bottom: Spacing.two }}
            style={({ pressed }) => [
              styles.chip,
              on ? styles.on : styles.off,
              pressed && styles.pressed,
            ]}>
            <Text variant="callout" color={on ? 'accent' : 'textSecondary'} tabular>
              {labels[lead]}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    // ⚠ `Spacing.seven` is the indent the `LeadRow`s used. It is the only thing
    // saying "these belong to the row above", since the group has no nesting
    // affordance of its own.
    paddingLeft: Spacing.seven,
    paddingRight: Spacing.four,
    paddingBottom: Spacing.three,
  },
  chip: {
    height: Size.leadChip,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ring and wash, never a fill — the idiom the league pills, the club picker
  // and the shape sheet all use for a chosen thing.
  on: { backgroundColor: Colors.dark.accentWash, borderColor: Colors.dark.accentRing },
  off: { backgroundColor: Colors.dark.raisedAlt, borderColor: 'transparent' },
  pressed: { opacity: 0.7 },
});
