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

/**
 * One pill plus the gap after it — the distance between two pills' left edges.
 *
 * ⚠ **The SLOT, not the pill.** Scrolling by a multiple of this is what lands
 * the strip on a pill boundary; scrolling by a multiple of `Size.pill` alone
 * does not, and drifts further out of step with every round.
 */
const SLOT = Size.pill + Spacing.two;

/** Whole rounds kept visible BEFORE the active one, so it has context on its left. */
const LEAD = 2;

export function MatchdayStrip({ total, current, played, onSelect, label }: MatchdayStripProps) {
  const scroller = useRef<ScrollView>(null);

  /**
   * Keep the active round in view when it changes from the pager or a league
   * switch, **aligned to a pill edge**.
   *
   * ⚠ **It must land on a multiple of `SLOT`.** The first cut subtracted
   * `Size.pill * 2` — two pill WIDTHS (68) where two whole slots are 84 — so
   * every offset sat 16pt inside a pill and the leading round was drawn sliced
   * down the middle, at every round and in every league. Ed caught it on
   * LaLiga matchday 6, where the `4` showed as a half pill.
   *
   * ⚠ `Math.max(0, …)` covers the first `LEAD + 1` rounds, where there is
   * nothing to lead with; the ScrollView clamps the other end itself.
   */
  useEffect(() => {
    scroller.current?.scrollTo({ x: Math.max(0, (current - 1 - LEAD) * SLOT), animated: true });
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
