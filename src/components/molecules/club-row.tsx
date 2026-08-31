/**
 * One club in the Clubs screen's browse list (ADR 0082).
 *
 * The crest, the name over a place, and the follow pill.
 *
 * ⚠ **No club-colour tick.** The pack draws a 3pt coloured rail down each row
 * and a first pass built it: twenty of them read as a stack of unexplained
 * status bars, and the one rail this app already has — `BandRail` on the
 * standings row — means a qualification zone. Two 3pt vertical rails with
 * different meanings is the ambiguity that rail cannot afford. Club colour now
 * appears on this screen in the rail bubbles alone.
 *
 * ⚠ **Two targets, two outcomes.** The ROW opens the club; the PILL follows it.
 * Opening a club has never followed it, and must not start here.
 *
 * ⚠ The pill is only ever `+ FOLLOW`. A followed club is not in this list at
 * all — it is in the rail, which is the receipt — so there is no unfollow state
 * to draw and no confirmation to ask for.
 *
 * ⚠ The place line is `venue.city ?? venue.name`, resolved by the organism.
 * Verified against production 2026-08-31: `city` is served for the Premier
 * League and Serie A, is null on all 20 LaLiga clubs, and Bundesliga clubs
 * carry no `venue` object at all. A row with neither draws one line — that is
 * data, not a bug. `Schedule pending` outranks both (trap 1).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ChipButton, Crest, PlusGlyph, Text } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';

export interface ClubRowProps {
  name: string;
  /** City, stadium, `Schedule pending`, or null. See the header. */
  place: string | null;
  crest: string | null;
  abbr: string;
  followLabel: string;
  onOpen: () => void;
  onFollow: () => void;
  /** `Follow {club}` — the pill's own label is the bare verb. */
  followAccessibilityLabel: string;
  /** False on the last row: a rule under it would float above the tray's floor. */
  rule: boolean;
}

export function ClubRow({
  name,
  place,
  crest,
  abbr,
  followLabel,
  onOpen,
  onFollow,
  followAccessibilityLabel,
  rule,
}: ClubRowProps) {
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={place ? `${name}, ${place}` : name}
      style={({ pressed }) => [styles.row, rule && styles.ruled, pressed && styles.pressed]}>
      <Crest src={crest} fallback={abbr} size={Size.crestBrowse} filled={!crest} />
      <View style={styles.text}>
        <Text variant="callout" numberOfLines={1}>
          {name}
        </Text>
        {place ? (
          <Text variant="micro" color="textMuted" numberOfLines={1} style={styles.place}>
            {place}
          </Text>
        ) : null}
      </View>
      <ChipButton
        label={followLabel}
        onPress={onFollow}
        shape="pill"
        trailing={<PlusGlyph />}
        accessibilityLabel={followAccessibilityLabel}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Size.minTouch + Spacing.two,
    paddingVertical: Spacing.three - 1,
    paddingHorizontal: Spacing.four - 2,
  },
  ruled: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.dark.hairline },
  pressed: { backgroundColor: Colors.dark.rowActive },
  text: { flex: 1, minWidth: 0 },
  place: { marginTop: Spacing.half + 1 },
});
