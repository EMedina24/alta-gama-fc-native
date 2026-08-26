/**
 * An upcoming match, stated as the pairing it is: the two crests either side of
 * a `vs`, with kickoff · day · venue on the line below.
 *
 * ⚠ The crests are the fixture's own sides, home first — the order the match is
 * played and named in. Which of them is *yours* is not marked: every row in
 * this section involves a followed club, so marking it would mark them all
 * (ADR 0029). The venue is the fact that says whether you are travelling.
 *
 * ⚠ The names live on the accessibility label, not on the row. Two 40pt crests
 * carry the pairing at a glance, and a club with no artwork falls back to its
 * monogram tile, which is part of the design rather than a failure state.
 *
 * ⚠ Takes flat scalars, never a fixture object (ADR 0013). The day word and
 * its tone are decided by `formatRelativeDay`; this component only paints.
 */
import { StyleSheet, Pressable, View } from 'react-native';

import { Crest, Text } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';

export interface UpcomingSide {
  crest?: string | null;
  /** The monogram shown when there is no crest. */
  abbr: string;
  /** Read by a screen reader only. */
  name: string;
}

export interface UpcomingRowProps {
  home: UpcomingSide;
  away: UpcomingSide;
  /** "21:00" / "9:00 pm" / "--:--". */
  kickoffLabel: string;
  /** "HOY" / "MAÑANA" / "SÁB 30 AGO". */
  dayLabel: string;
  dayTone: 'accent' | 'faint';
  /** The ground, or null where the feed has none. */
  venue?: string | null;
  /** Draws the hairline above — every row but the first. */
  divided?: boolean;
  onPress?: () => void;
}

/** The middle dot between meta parts. Never rendered against an empty part. */
function Dot() {
  return (
    <Text variant="footnote" color="textFaint">
      ·
    </Text>
  );
}

export function UpcomingRow({
  home,
  away,
  kickoffLabel,
  dayLabel,
  dayTone,
  venue,
  divided = false,
  onPress,
}: UpcomingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        `${home.name} vs ${away.name}`,
        `${kickoffLabel} ${dayLabel}`,
        venue,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.row, divided && styles.divided, pressed && styles.pressed]}>
      <View style={styles.pairing}>
        <Crest src={home.crest} fallback={home.abbr} size={Size.crestCard} filled={!home.crest} />
        <Text variant="eyebrowSm" color="textFaint">
          vs
        </Text>
        <Crest src={away.crest} fallback={away.abbr} size={Size.crestCard} filled={!away.crest} />
      </View>

      <View style={styles.meta}>
        <Text variant="numeral" tabular color={kickoffLabel === '--:--' ? 'textFaint' : 'text'}>
          {kickoffLabel}
        </Text>
        <Dot />
        <Text variant="eyebrowSm" color={dayTone === 'accent' ? 'accent' : 'textFaint'}>
          {dayLabel}
        </Text>
        {venue ? (
          <>
            <Dot />
            <Text variant="footnote" color="textDim" numberOfLines={1} style={styles.venue}>
              {venue}
            </Text>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.dark.hairline },
  pressed: { backgroundColor: Colors.dark.rowActive },
  pairing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  // ⚠ One line, centred. The venue is the only part allowed to shrink — the
  // kickoff and the day word are the reason the row exists.
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    maxWidth: '100%',
  },
  venue: { flexShrink: 1 },
});
