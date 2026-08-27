/**
 * One upcoming match, as its own card: matchday · ground over the two sides
 * named and stacked, with the kickoff over its date on the right (ADR 0043).
 *
 * ⚠ The sides are the fixture's own, home first — the order the match is played
 * and named in — and the HOME name is the lit one. Which side is *yours* stays
 * unmarked, the rule ADR 0029 set and this layout keeps: every card in this
 * section involves a followed club, so marking it would mark them all.
 *
 * ⚠ The names are ON the card now, not just on the accessibility label. A club
 * with no artwork still falls back to its monogram tile, which is part of the
 * design rather than a failure state (ADR 0018).
 *
 * ⚠ `todayLabel` is lit or absent — never a faint word. Only today is accented
 * (SPEC §2), and the date under the kickoff already dates every other card.
 *
 * ⚠ Takes flat scalars, never a fixture object (ADR 0013). The screen resolves
 * every string, the crest URLs and the matchday before this component paints.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Crest, Eyebrow, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface UpcomingSide {
  crest?: string | null;
  /** The monogram shown when there is no crest. */
  abbr: string;
  name: string;
}

export interface UpcomingCardProps {
  home: UpcomingSide;
  away: UpcomingSide;
  /** "MD 4 · Camp de Mestalla" — joined by the screen, uppercased by the token. */
  meta: string;
  /** "Tonight" / "Hoy" when the match is today, else null. Never for tomorrow. */
  todayLabel?: string | null;
  /** "21:00" / "9:00 pm" / "--:--". */
  kickoffLabel: string;
  /** "SAT 5 SEP" — present on every card, a TBD kickoff included. */
  dateLabel: string;
  onPress?: () => void;
}

/** A crest beside its club, one line. The name is the part allowed to shrink. */
function Side({ side, dim }: { side: UpcomingSide; dim: boolean }) {
  return (
    <View style={styles.side}>
      <Crest src={side.crest} fallback={side.abbr} size={Size.crestList} filled={!side.crest} />
      <Text
        variant="title3"
        color={dim ? 'textSecondary' : 'text'}
        numberOfLines={1}
        style={styles.name}>
        {side.name}
      </Text>
    </View>
  );
}

export function UpcomingCard({
  home,
  away,
  meta,
  todayLabel,
  kickoffLabel,
  dateLabel,
  onPress,
}: UpcomingCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        `${home.name} vs ${away.name}`,
        `${kickoffLabel} ${dateLabel}`,
        todayLabel,
        meta,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.head}>
        {/* ⚠ Flexed and clipped: a long ground truncates rather than shoving
            the day word off the card. */}
        <Eyebrow numberOfLines={1} style={styles.meta}>
          {meta}
        </Eyebrow>
        {todayLabel ? <Eyebrow color="accent">{todayLabel}</Eyebrow> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.sides}>
          <Side side={home} dim={false} />
          <Side side={away} dim />
        </View>

        {/* ⚠ Both runs are tabular (SPEC §2) — the times and dates stack down
            the section and proportional digits make the column look broken. */}
        <View style={styles.when}>
          <Text
            variant="kickoffSm"
            tabular
            color={kickoffLabel === '--:--' ? 'textFaint' : 'text'}>
            {kickoffLabel}
          </Text>
          <Text variant="eyebrowLg" tabular color="textSecondary">
            {dateLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  pressed: { backgroundColor: Colors.dark.rowActive },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  meta: { flex: 1, minWidth: 0 },
  body: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  sides: { flex: 1, minWidth: 0, gap: Spacing.two },
  side: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { flexShrink: 1, minWidth: 0 },
  when: { alignItems: 'flex-end', gap: Spacing.one },
});
