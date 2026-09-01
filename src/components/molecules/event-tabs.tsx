/**
 * The match-events panel's group control: four segments — goals, cards, subs,
 * other — each printing its own count, one group shown at a time (ADR 0046).
 *
 * ⚠ **It replaces the panel's eyebrow, it does not sit under one.** The tabs
 * name themselves; with `MATCH EVENTS` above them the panel said the same thing
 * twice, one line apart.
 *
 * ⚠ **An empty group is DIMMED AND INERT, never hidden.** `Cards 0` in a
 * four-goal game is information — the reader learns there were no bookings
 * without opening anything. A tab that disappeared would leave them wondering
 * whether the app had them.
 *
 * ⚠ No animation. ADR 0045 rejected animating this feature for consistency with
 * the rest of the app; the selection moves by re-render.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { EVENT_GROUPS, type EventGroup } from '@/lib/cronogol/events';

export interface EventTabsProps {
  /** Every group's count, `0`s included — they are rendered, not filtered. */
  counts: Record<EventGroup, number>;
  active: EventGroup;
  labels: Record<EventGroup, string>;
  onSelect: (group: EventGroup) => void;
}

export function EventTabs({ counts, active, labels, onSelect }: EventTabsProps) {
  return (
    <View style={styles.track}>
      {EVENT_GROUPS.map((group) => {
        const count = counts[group];
        const empty = count === 0;
        const selected = group === active;

        return (
          <Pressable
            key={group}
            onPress={() => onSelect(group)}
            disabled={empty}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: empty }}
            // ⚠ The segment is 28pt tall, under the 44pt minimum. The track
            // cannot grow without spending the panel height this control exists
            // to save, so the target grows instead of the paint.
            hitSlop={{ top: 8, bottom: 8 }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentActive,
              pressed && !selected && styles.segmentPressed,
            ]}>
            <Text
              variant="eventTab"
              color={selected ? 'text' : empty ? 'textGhost' : 'textMuted'}
              // ⚠ Four segments share the panel's width and `Tarjetas` is the
              // longest label we ship. It fits at default Dynamic Type and only
              // just — above it, this is what stops the label wrapping the track
              // to two lines.
              numberOfLines={1}>
              {labels[group]}
            </Text>
            {/* The ONE accent in the panel, and only on the active tab. */}
            <Text
              variant="eventTabCount"
              color={selected ? 'accent' : empty ? 'textGhost' : 'textFaint'}
              tabular>
              {count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: Spacing.one,
    // ⚠ One step ABOVE the panel it sits on. `MatchEvents` paints `recess` on
    // every surface it appears in (ADR 0087), so unlike the design — which puts
    // the panel on two different grounds and gives the track two colours —
    // there is one ground here and one rule: a glass lift on the recess.
    backgroundColor: Colors.dark.glassFill,
    borderRadius: Radius.chip,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: Size.eventTab,
    borderRadius: Radius.seg,
  },
  segmentActive: { backgroundColor: Colors.dark.raisedAlt },
  segmentPressed: { opacity: 0.6 },
});
