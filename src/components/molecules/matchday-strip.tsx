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
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

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
  /**
   * A control PINNED to the row's right end, outside the scroller — the Calendar
   * pill (ADR 0165). The scroller beside it then shows WHOLE pills only (ADR
   * 0187). Absent keeps the original full-bleed strip, whose last round runs
   * off the screen edge.
   */
  trailing?: ReactNode;
}

/**
 * One pill plus the gap after it — the distance between two pills' left edges.
 *
 * ⚠ **The SLOT, not the pill.** Scrolling by a multiple of this is what lands
 * the strip on a pill boundary; scrolling by a multiple of `Size.pill` alone
 * does not, and drifts further out of step with every round.
 */
const SLOT = Size.roundPill + Spacing.two;

/** Whole rounds kept visible BEFORE the active one, so it has context on its left. */
const LEAD = 2;

export function MatchdayStrip({
  total,
  current,
  played,
  onSelect,
  label,
  trailing,
}: MatchdayStripProps) {
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

  /**
   * The width the scroller may take beside a pinned `trailing`, measured.
   *
   * ⚠ **A pinned strip shows WHOLE pills only** (ADR 0187). Left to fill the
   * row, the viewport ended wherever the Calendar pill began, so the last round
   * was drawn sliced against it — the right-hand twin of the `SLOT` bug above. The
   * viewport is snapped DOWN to a whole number of slots and the remainder (under
   * one slot) stays empty, reading as part of the gap before the pill.
   *
   * ⚠ `null` until the first layout, which renders the scroller unconstrained
   * rather than empty — one frame of the old look beats a blank row.
   */
  const [room, setRoom] = useState<number | null>(null);
  const fit = room === null ? null : Math.max(1, Math.floor((room + Spacing.two) / SLOT));
  const onRoom = (e: LayoutChangeEvent) => setRoom(e.nativeEvent.layout.width);

  return (
    <View style={styles.row}>
    <View style={styles.scroller} onLayout={trailing ? onRoom : undefined}>
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={trailing && fit !== null ? { width: fit * SLOT - Spacing.two } : undefined}
      /**
       * ⚠ The drag's twin of the `SLOT` rule: a hand-scroll comes to rest on a
       * pill edge too, never mid-pill. With `trackPinned` (no tail pad) the end
       * of the track is also a whole number of slots, so the last round lands
       * flush. The full-bleed strip keeps free scrolling — its tail pad is off
       * the grid by design.
       */
      snapToInterval={trailing ? SLOT : undefined}
      decelerationRate={trailing ? 'fast' : 'normal'}
      disableIntervalMomentum={!!trailing}
      contentContainerStyle={[styles.track, trailing ? styles.trackPinned : styles.trackBleed]}>
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
            <Text
              variant="numeral"
              tabular
              opticalCentre
              color={active ? 'onAccent' : played(n) ? 'textSecondary' : 'text'}>
              {n}
            </Text>
          </Pressable>
        );
      })}
      </ScrollView>
    </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * ⚠ The scroller is no longer the root (ADR 0165): the Calendar pill is PINNED
   * beside it rather than scrolling away with the chips, which the mock's own
   * row shows. `flexShrink` on the scroller is what keeps the pill at its
   * intrinsic width — content with an intrinsic width gets flex: 0, never a share.
   *
   * ⚠ `scroller` is now the WRAPPER that measures the room (ADR 0187); the
   * ScrollView inside it takes a whole-slot width, not the wrapper's.
   */
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  scroller: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  track: { gap: Spacing.two },
  /** Full-bleed: the tail pad lets the last round clear the screen's own edge. */
  trackBleed: { paddingRight: Spacing.five },
  /**
   * ⚠ Pinned: the tail pad becomes WRONG next to a pinned control — it would
   * hold the last round a gutter away from a pill that is already there, and
   * read as a gap in the row rather than as bleed.
   */
  trackPinned: { paddingRight: 0 },
  /**
   * The Medina kit's round pill (ADR 0200): 44pt, a translucent fill and a
   * hairline over the league crown. ⚠ A FILL, not `GlassView` — a dozen glass
   * views scrolling over the crown is traps 59/74, and the kit's own `GLASS2`
   * is a fill and a hairline anyway. The played rounds keep their step back
   * (dimmer fill, `textSecondary` ink); the current round is the screen's lime.
   */
  pill: {
    width: Size.roundPill,
    height: Size.roundPill,
    minWidth: Size.roundPill,
    borderRadius: Radius.roundPill,
    backgroundColor: Colors.dark.glassFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  played: { backgroundColor: Colors.dark.glassFillDim },
  active: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
});
