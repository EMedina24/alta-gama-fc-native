/**
 * The Season stats hero (ADR 0141): the club's wash, its crest as wallpaper, a
 * back chip naming the club, the league eyebrow, the screen title, and the
 * view switch.
 *
 * ⚠ **The chrome is `club-hero.tsx`'s, deliberately duplicated in geometry and
 * NOT extracted.** The two heroes carry different content — that one is an
 * identity block with a crest at reading size and a follow pill, this one is a
 * titled screen with a segmented control — and the shared part is six style
 * rules. An abstraction over them would have to take a dozen props to express
 * the difference, which is how a shell stops being readable. If a third hero
 * appears, extract then.
 *
 * ⚠ The back chip is labelled with the CLUB, where the club page's is labelled
 * with the competition — a chip that names where you ARE going back to, not
 * where you are. Same reason 0091 gives for not using the native back button.
 *
 * ⚠ The title is `heroTitle` (36/300), not the mock's 36/700 (ADR 0147/0131):
 * this screen pushes off the club page, which is `heroTitle`, and two
 * consecutive screens in different title voices is what 0131 exists to stop.
 *
 * ⚠ `wash: null` is a REAL state — every Premier League and Serie A club has
 * no usable hex — and takes the neutral white fade, never graphite.
 */
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { FadeOutImage, Text, WashGradient, WashRadial } from '@/components/atoms';
import { SegmentedControl } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

/** A 34pt pill is below `minTouch`; hitSlop makes the difference up. */
const PILL_SLOP = { top: (Size.minTouch - Size.pill) / 2, bottom: (Size.minTouch - Size.pill) / 2 };

const BLEED_OFF = 70;
const BLEED_CLIP = (Size.bigCrestBleed - BLEED_OFF) / Size.bigCrestBleed;

export type StatsMode = 'club' | 'players';

export interface SeasonStatsHeroProps {
  title: string;
  /** "LALIGA 2026/27 · 38 PARTIDOS", already uppercased by `copy.stats.eyebrow`. */
  eyebrow: string;
  /** The league's wordmark, or null — Puerto Rico serves none (ADR 0031). */
  wordmarkUrl?: string | null;
  /** The club's crest, as wallpaper. Decorative. */
  crestUrl?: string | null;
  backLabel: string;
  onBack: () => void;
  wash?: string | null;
  bleedX?: number;
  bleedTop?: number;
  /**
   * The view switch. ⚠ `null` renders NO control, which is the correct state
   * for a club whose league publishes no player stats — the Club view then
   * stands alone rather than offering a segment that leads to an empty screen.
   */
  segments?: {
    value: StatsMode;
    options: readonly { value: StatsMode; label: string }[];
    onChange: (value: StatsMode) => void;
    accessibilityLabel: string;
  } | null;
}

export function SeasonStatsHero({
  title,
  eyebrow,
  wordmarkUrl = null,
  crestUrl = null,
  backLabel,
  onBack,
  wash = null,
  bleedX = 0,
  bleedTop = 0,
  segments = null,
}: SeasonStatsHeroProps) {
  return (
    <View
      style={[
        styles.wrap,
        {
          marginHorizontal: -bleedX,
          paddingHorizontal: bleedX,
          marginTop: -bleedTop,
          paddingTop: bleedTop + Spacing.two,
        },
      ]}>
      {wash ? (
        <>
          <WashRadial
            cx={0.06}
            cy={0}
            rx={1.5}
            ry={0.76}
            stops={[
              { offset: 0, color: wash, opacity: 0.5 },
              { offset: 0.64, color: wash, opacity: 0 },
            ]}
          />
          <WashGradient
            angle="vertical"
            stops={[
              { offset: 0, color: wash, opacity: 0.22 },
              { offset: 0.76, color: wash, opacity: 0 },
            ]}
          />
        </>
      ) : (
        <WashGradient
          angle="vertical"
          stops={[
            { offset: 0, color: '#ffffff', opacity: 0.055 },
            { offset: 0.72, color: '#ffffff', opacity: 0 },
          ]}
        />
      )}

      {/* Wallpaper, top-RIGHT here rather than the club page's bottom-left:
          the title runs long ("La temporada en cifras") and the control sits
          under it, so the only quiet corner is beside the eyebrow. */}
      {crestUrl ? (
        <FadeOutImage
          uri={crestUrl}
          size={Size.bigCrestBleed}
          fadeFrom={0.25}
          fadeTo={BLEED_CLIP - 0.02}
          style={styles.bleedCrest}
        />
      ) : null}

      <View style={styles.topRow}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={PILL_SLOP}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
          <Text variant="eyebrowSm" color="text" numberOfLines={1}>
            {`‹  ${backLabel}`}
          </Text>
        </Pressable>
      </View>

      <View style={styles.head}>
        <View style={styles.eyebrowRow}>
          {wordmarkUrl ? (
            <Image
              source={{ uri: wordmarkUrl }}
              style={styles.wordmark}
              contentFit="contain"
              contentPosition="left center"
              transition={120}
              accessible={false}
            />
          ) : null}
          <Text variant="eyebrowSm" color="textSecondary" numberOfLines={1} style={styles.eyebrow}>
            {eyebrow}
          </Text>
        </View>
        <Text variant="heroTitle">{title}</Text>
      </View>

      {segments ? (
        <SegmentedControl
          tone="accent"
          options={segments.options}
          value={segments.value}
          onChange={segments.onChange}
          accessibilityLabel={segments.accessibilityLabel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  bleedCrest: {
    position: 'absolute',
    right: -BLEED_OFF,
    top: -BLEED_OFF / 3,
    opacity: 0.08,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  back: {
    height: Size.pill,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.recess,
    borderWidth: 1,
    borderColor: Colors.dark.glassLine,
    maxWidth: '70%',
  },
  backPressed: { transform: [{ scale: 0.955 }] },
  head: { gap: Spacing.two },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // ⚠ A fixed height and a flexible width: the wordmarks are wildly different
  // aspect ratios and only the height is a design decision.
  wordmark: { height: Size.leagueChipMarkH * 0.55, width: Size.leagueChipMarkW },
  eyebrow: { flexShrink: 1 },
});
