/**
 * One player: portrait, identity, and the six fields the league publishes.
 *
 * ⚠⚠ **There are no player statistics and none are coming** — no appearances,
 * goals, assists, minutes or cards, from any provider, at any price point the
 * backend holds. Getting them is a new paid contract, not a new field. Do not
 * add a slot here "for later".
 *
 * ⚠ **A null renders an EMPTY CELL that keeps its label and its place in the
 * grid** — never `—`, never `0`, never "Unknown". A substituted value cannot be
 * told apart from a real one by anyone reading the sheet. This is where the
 * design diverges from the web dialog, which drops the whole row instead; the
 * footnote is what pays for the difference.
 *
 * ⚠ **FOOT is blank on every Spanish player, permanently** — LaLiga publishes
 * none. On a LaLiga club that cell is *always* empty, which is exactly why the
 * footnote is not decoration: without it a blank cell reads as our bug rather
 * than as the league's silence. The Premier League serves it for ~88%, and
 * `"both"` is a REAL value, not a placeholder for unknown.
 *
 * ⚠ `dateOfBirth` and `placeOfBirth` are NOT rendered and must not be. They are
 * exact birth dates and home towns of named living people on an unauthenticated
 * cacheable route, and squads register 16- and 17-year-olds. `age` exists
 * precisely so no UI has to touch either.
 *
 * ⚠ No `Grabber` — the root stack draws one via `sheetGrabberVisible` (ADR 0030),
 * and rendering the atom too gives you two.
 *
 * ⚠ No `flex: 1` wrapper. Inside a `formSheet` the screen is laid out at its
 * content's height, so a flexed wrapper collapses to zero and paints its children
 * on top of each other (ADR 0030).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Crest, PlayerPhoto, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { playerDisplayName } from '@/lib/cronogol/derive';
import type { SquadPlayerView } from '@/lib/cronogol/types';

export interface PlayerSheetLabels {
  age: string;
  nationality: string;
  height: string;
  weight: string;
  foot: string;
  registered: string;
}

export interface PlayerSheetProps {
  player: SquadPlayerView;
  club: { name: string; crestUrl: string | null; abbr: string };
  /** Already formatted — `"2026/27"`. ⚠ Null season is a blank cell, not a guess. */
  seasonLabel: string | null;
  /** ⚠ SINGULAR — "Goalkeeper", not the list's "Goalkeepers". */
  positionLabel: string;
  /** Resolved from `foot`; null stays null and blanks the cell. */
  footLabel: string | null;
  heightValue: (cm: number) => string;
  weightValue: (kg: number) => string;
  labels: PlayerSheetLabels;
  note: string;
  doneLabel: string;
  /** Accessibility label for the ✕. The glyph itself is not a readable name. */
  closeLabel: string;
  onClose: () => void;
}

/**
 * One cell of the grid.
 *
 * ⚠ `value` is `string | null` on purpose: the caller passes null rather than an
 * empty string so that "the league did not publish this" is a decision made once,
 * at the top, and not re-derived per cell.
 */
function Cell({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.cell}>
      {/* ⚠ One line, always. `NACIONALIDAD` wrapped to two in `es` and pushed its
          value below the neighbouring cells' — the row stretches to the tallest
          cell, so one wrapped label misaligns the whole row. Shrinking to fit is
          the same trick `crest.tsx` uses to keep a 3-letter code inside a tile. */}
      <Text
        variant="eyebrowSm"
        color="textFaint"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}>
        {label}
      </Text>
      {/* ⚠ Rendered even when empty — the row must keep its height so the two
          rows of the grid stay aligned across players. */}
      <Text variant="headline" numberOfLines={1}>
        {value ?? ''}
      </Text>
    </View>
  );
}

export function PlayerSheet({
  player,
  club,
  seasonLabel,
  positionLabel,
  footLabel,
  heightValue,
  weightValue,
  labels,
  note,
  doneLabel,
  closeLabel,
  onClose,
}: PlayerSheetProps) {
  return (
    <View style={styles.wrap}>
      {/* ⚠ Sits ABOVE the head in z-order but outside its row, so a long club
          name cannot push it off the edge. Swipe-down is an invisible
          affordance and `Done` is below the fold on a small device. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        hitSlop={Spacing.two}
        style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
        <Text variant="headline" color="textSecondary">
          ✕
        </Text>
      </Pressable>

      <View style={styles.head}>
        <PlayerPhoto src={player.photoUrl} variant="card" />

        <View style={styles.identity}>
          <View style={styles.clubLine}>
            <Crest src={club.crestUrl} fallback={club.abbr} size={Size.crestRow} />
            <Text variant="eyebrowSm" color="textSecondary" numberOfLines={1} style={styles.clubName}>
              {club.name}
            </Text>
          </View>

          {/* The full registered name — often the legal one, and long. Read
              in given-name-first order; some federations serve it inverted. */}
          <Text variant="title" numberOfLines={2}>
            {playerDisplayName(player.name)}
          </Text>

          {/* ⚠ A chip has no blank form, so a null field drops its chip entirely
              rather than rendering an empty one. That is NOT the grid's rule. */}
          <View style={styles.chips}>
            <Chip label={positionLabel} tone="accent" />
            {player.shirt === null ? null : <Chip label={`#${player.shirt}`} />}
            {player.nationality ? <Chip label={player.nationality.code} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Cell label={labels.age} value={player.age === null ? null : String(player.age)} />
          <Cell label={labels.nationality} value={player.nationality?.name ?? null} />
          <Cell
            label={labels.height}
            value={player.heightCm === null ? null : heightValue(player.heightCm)}
          />
        </View>
        <View style={styles.gridRow}>
          <Cell
            label={labels.weight}
            value={player.weightKg === null ? null : weightValue(player.weightKg)}
          />
          <Cell label={labels.foot} value={footLabel} />
          <Cell label={labels.registered} value={seasonLabel} />
        </View>
      </View>

      <Button label={doneLabel} tone="secondary" onPress={onClose} />

      <Text variant="footnote" color="textFaint" center>
        {note}
      </Text>
    </View>
  );
}

/** Local to this sheet: the `Pill` atom is uppercase-only and this needs `#1` verbatim. */
function Chip({ label, tone = 'quiet' }: { label: string; tone?: 'accent' | 'quiet' }) {
  return (
    <View style={[styles.chip, tone === 'accent' && styles.chipAccent]}>
      <Text variant="eyebrowSm" color={tone === 'accent' ? 'accent' : 'textSecondary'}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.five },
  close: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    zIndex: 1,
    width: Size.minTouch,
    height: Size.minTouch,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.glassFill,
  },
  closePressed: { backgroundColor: Colors.dark.raisedAlt },
  head: { flexDirection: 'row', gap: Spacing.four },
  identity: { flex: 1, gap: Spacing.two, justifyContent: 'center', minWidth: 0 },
  // ⚠ Keeps the club name clear of the ✕. `Atlético de Madrid` already reaches
  // most of the way across; a longer one would run underneath it.
  clubLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Size.minTouch + Spacing.three,
  },
  clubName: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineStrong,
  },
  chipAccent: { borderColor: Colors.dark.accentRing, backgroundColor: Colors.dark.accentWash },
  grid: { backgroundColor: Colors.dark.glassFill, borderRadius: Radius.group, overflow: 'hidden' },
  gridRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    // Hairlines do all the separating — there are no shadows in this design.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairline,
  },
});
