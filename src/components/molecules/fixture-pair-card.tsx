/**
 * A match as a card with both sides (ADR 0202) — the Medina kit's
 * `FixtureCard`: the competition and round on top with the kickoff opposite,
 * then home crest and name, a Saira centre (the dash before kickoff, or the
 * score), and away crest and name.
 *
 * ⚠ Presentational (ADR 0013). The caller orders the sides — a club page's
 * fixture is told from the club's view (`homeAway`), and the card must still
 * read home-first, the way a match is named.
 *
 * ⚠ The names WRAP to two lines and never shrink (0186's rule for paired
 * names: a shrunk long name reads as a rendering fault next to a full one).
 */
import { StyleSheet, View } from 'react-native';

import { Crest, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface FixturePairSide {
  name: string;
  crest: string | null;
  /** The `Crest` fallback code. */
  abbr: string;
}

export interface FixturePairCardProps {
  /** `LALIGA · MATCHDAY 8` — the competition, then the round. */
  eyebrow: string;
  /** `SAT 12:30` — or `--:--` for a published-but-unscheduled kickoff. */
  kickoff: string;
  home: FixturePairSide;
  away: FixturePairSide;
  /** `–` before kickoff, the score after. */
  centre: string;
  accessibilityLabel: string;
}

export function FixturePairCard({ eyebrow, kickoff, home, away, centre, accessibilityLabel }: FixturePairCardProps) {
  return (
    <View style={styles.card} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.top}>
        <Text variant="eyebrow" color="textMuted" numberOfLines={1} style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <Text variant="eyebrow" color="textSecondary">
          {kickoff}
        </Text>
      </View>
      <View style={styles.teams}>
        <View style={styles.side}>
          <Crest src={home.crest} fallback={home.abbr} size={Size.crestCard} />
          <Text variant="bodyStrong" numberOfLines={2}>
            {home.name}
          </Text>
        </View>
        <Text variant="scoreLarge">{centre}</Text>
        <View style={[styles.side, styles.right]}>
          <Crest src={away.crest} fallback={away.abbr} size={Size.crestCard} />
          <Text variant="bodyStrong" numberOfLines={2} style={styles.rightText}>
            {away.name}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineMid,
    padding: Spacing.four + 2,
    gap: Spacing.four,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // ⚠ The eyebrow is the elastic half; the kickoff is intrinsic (trap 56).
  eyebrow: { flex: 1, minWidth: 0 },
  teams: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  side: { flex: 1, minWidth: 0, gap: Spacing.two },
  right: { alignItems: 'flex-end' },
  rightText: { textAlign: 'right' },
});
