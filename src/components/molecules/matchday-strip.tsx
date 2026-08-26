/**
 * The 1…N matchday pills.
 *
 * ⚠ **This is the primary navigation of the Matchdays screen** — it replaces the
 * web page's paginator, per the handoff. The prev/next arrows drive the same
 * state.
 *
 * ⚠ Sized from `totalMatchweeks`, never a literal. It is 38 in the top flight,
 * 42 in segunda and **34 in the Bundesliga** — a strip hardcoded at 38 runs four
 * rounds off the end of a German season.
 *
 * ⚠ Not in SPEC §5's molecule list; added because the screen's own spec (§3.2)
 * describes it in detail and it is reused by the prev/next pair.
 */
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface MatchdayStripProps {
  total: number;
  current: number;
  /** Rounds whose last kickoff has passed — drawn `raised` rather than `card`. */
  played: (n: number) => boolean;
  onSelect: (n: number) => void;
  /** The accessibility label for pill n — `copy.matchdays.title`, so it speaks the reader's language. */
  label: (n: number) => string;
}

export function MatchdayStrip({ total, current, played, onSelect, label }: MatchdayStripProps) {
  const scroller = useRef<ScrollView>(null);

  // Keep the active round in view when it changes from the pager or a league switch.
  useEffect(() => {
    const x = Math.max(0, (current - 1) * (Size.pill + Spacing.two) - Size.pill * 2);
    scroller.current?.scrollTo({ x, animated: true });
  }, [current]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const active = n === current;
        return (
          <Pressable
            key={n}
            onPress={() => onSelect(n)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label(n)}
            hitSlop={6}
            style={({ pressed }) => [
              styles.pill,
              played(n) && !active && styles.played,
              active && styles.active,
              pressed && { opacity: 0.7 },
            ]}>
            <Text variant="bodyStrong" tabular color={active ? 'onAccent' : 'textSecondary'}>
              {n}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { gap: Spacing.two, paddingRight: Spacing.five },
  pill: {
    width: Size.pill,
    height: Size.pill,
    minWidth: Size.pill,
    borderRadius: Radius.chip,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  played: { backgroundColor: Colors.dark.raised },
  active: { backgroundColor: Colors.dark.accent },
});
