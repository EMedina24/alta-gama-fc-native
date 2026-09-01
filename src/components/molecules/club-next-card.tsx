/**
 * The club page's NEXT UP card (ADR 0091): the opponent, big, over a club-tint
 * wash with their crest bled off the bottom-right — in the wider `Tray`.
 *
 * ⚠ **The opponent's own colour, not this club's.** The card is about who they
 * play next; tinting it in the page's colour would make every club's next-up
 * card look the same. `tint: null` (every Premier League and Serie A club
 * today) draws the plain inner, which is a real state and not a degradation.
 *
 * ⚠ An away fixture reads "at {opponent}" through `phrases.at` — the same
 * construction `SeasonSpine` uses, so the two never disagree. The H/A pill
 * carries `phrases.home`/`phrases.away`, which are `L`/`V` in Spanish.
 *
 * ⚠ `kickoffTbd` renders `--:--`, which means published-but-unscheduled and
 * never "missing". The line under it states the reader's own zone — every time
 * in this app is the reader's, and saying so is what stops it being read as
 * the stadium's local clock (ADR 0034).
 */
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { Crest, Pill, Text, WashGradient } from '@/components/atoms';
import { Tray } from './tray';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface ClubNextCardProps {
  /** Already localised — `copy.today.nextUp`. */
  label: string;
  opponent: string;
  crest: string | null;
  abbr: string;
  /** The opponent's `clubTint`, or null for no wash. */
  tint: string | null;
  /** `phrases.home` / `phrases.away` — `L`/`V` in Spanish. */
  homeAwayTag: string;
  /** Set on an AWAY fixture only: `phrases.at`, rendered before the name. */
  atPrefix: string | null;
  /** "MD 6 · SAT 5 SEP", already joined by the screen. */
  meta: string;
  /** `--:--` when TBD. */
  kickoffLabel: string;
  venue: string | null;
}

export function ClubNextCard({
  label,
  opponent,
  crest,
  abbr,
  tint,
  homeAwayTag,
  atPrefix,
  meta,
  kickoffLabel,
  venue,
}: ClubNextCardProps) {
  return (
    <Tray radius={Radius.trayLg}>
      {/* ⚠ Half the mock's alpha (.18 against .34): `clubTint` deliberately
          drops 0068's lightness clamp (0082), so a bright kit — Valencia's
          orange is the loud one — arrives unmuted, and at the mock's value it
          washed the whole card rather than lighting its shoulder. */}
      {tint ? (
        <WashGradient
          angle="diagonal"
          stops={[
            { offset: 0, color: tint, opacity: 0.18 },
            { offset: 0.48, color: tint, opacity: 0.05 },
            { offset: 0.86, color: tint, opacity: 0 },
          ]}
        />
      ) : null}
      {crest ? (
        <Image
          source={{ uri: crest }}
          style={styles.bleedCrest}
          contentFit="contain"
          accessible={false}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.headLabel}>
            <View style={styles.dot} />
            <Text variant="eyebrowSm" color="accent">
              {label}
            </Text>
          </View>
          <Pill label={homeAwayTag} />
        </View>

        <View style={styles.pairing}>
          <Crest src={crest} fallback={abbr} size={Size.crestCard} />
          <Text variant="title3" numberOfLines={2} style={styles.opponent}>
            {atPrefix ? `${atPrefix} ` : ''}
            {opponent}
          </Text>
        </View>

        <View style={styles.foot}>
          <Text variant="eyebrowSm" color="textFaint" numberOfLines={1} style={styles.footItem}>
            {meta}
          </Text>
          <Text variant="numeralLg" tabular>
            {kickoffLabel}
          </Text>
        </View>
        {venue ? (
          <Text variant="footnote" color="textFaint" numberOfLines={1}>
            {venue}
          </Text>
        ) : null}
      </View>
    </Tray>
  );
}

const styles = StyleSheet.create({
  // ⚠ 8 %, not the mock's 14 %: the kickoff time sits over this corner and a
  // crest behind a tabular numeral costs its legibility first.
  bleedCrest: {
    position: 'absolute',
    right: -34,
    bottom: -42,
    width: Size.oppCrestBleed,
    height: Size.oppCrestBleed,
    opacity: 0.08,
  },
  body: { padding: Spacing.four, gap: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.dark.accent },
  pairing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  opponent: { flex: 1, minWidth: 0 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.glassLine,
  },
  footItem: { flexShrink: 1 },
});
