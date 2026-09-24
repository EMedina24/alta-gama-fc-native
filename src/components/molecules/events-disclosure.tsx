/**
 * The footer row that opens a match's timeline — promoted from
 * `match-board.tsx` when the live card left for `live-plate.tsx` (ADR 0088),
 * per 0013's rule: a private part moves to `molecules/` on its second consumer.
 *
 * ⚠ **The whole row is the tap target, as the design has it** — not the
 * chevron. It carries the panel's name, which is also why `MatchEvents` is
 * handed `showTitle={false}` by both consumers: left on, the eyebrow printed
 * the same words again one line below this.
 *
 * ⚠ One component rather than two copies (ADR 0050): two copies of an
 * accessibility contract is two chances for one of them to lose its `expanded`
 * state, which is the half VoiceOver actually announces.
 *
 * ⚠ Both inks are `textSecondary`, not the list rows' `textFaint`: the only
 * two consumers are DARK PLATES (LivePlate's `plateDark`, LAST RESULT's
 * `plateBody`), where the faint ink measures ≤ 2.2 (ADR 0186). A third
 * consumer on plain glass re-measures before reusing this row as is.
 */
import { Pressable, StyleSheet } from 'react-native';

import { Chevron, Text } from '@/components/atoms';
import { Colors, Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';

export function EventsDisclosure({
  open,
  onToggle,
  copy,
}: {
  open: boolean;
  onToggle: () => void;
  copy: Copy['events'];
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? copy.collapse : copy.expand}
      style={({ pressed }) => [styles.disclosure, pressed && { opacity: 0.75 }]}>
      <Text variant="eyebrowSm" color="textSecondary">
        {copy.title}
      </Text>
      <Chevron expanded={open} color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.hairlineMid,
  },
});
