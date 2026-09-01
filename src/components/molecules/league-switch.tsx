/**
 * The horizontal league selector — 0089's mark-hugging chips, on either of two
 * grounds (`tone`): the CROWN's bright band (Matchdays, Table) or the screen
 * body (Clubs).
 *
 * ⚠ **Artwork alone — no text label** (ADR 0031, which 0089 keeps). The chips
 * are a filter row, not a legend; the name still reaches VoiceOver through
 * `accessibilityLabel`. The text branch survives for a league that arrives
 * with NO artwork at all — an empty chip is unpickable.
 *
 * ⚠ **An inactive mark is drawn in true grayscale** via
 * `react-native-svg/filter-image`'s `feColorMatrix saturate 0` — the native
 * `RNSVGFeColorMatrix` ships in the installed build, so no new dependency.
 * A SELECTED chip inverts to a near-black plate and the mark returns to full
 * colour — the system's one double inversion (ADR 0089).
 *
 * ⚠ Artwork comes from the API (`league.logoUrls`), not a bundled asset, so a
 * new league appears without an asset drop. Prefer `icon`, fall back to
 * `primary` — only LaLiga ships an icon-only cut today.
 */
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { FilterImage } from 'react-native-svg/filter-image';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface LeagueOption {
  slug: string;
  name: string;
  /** `logoUrls.icon ?? logoUrls.primary ?? logoUrl`, resolved by the screen. */
  logoUrl: string | null;
}

export interface LeagueSwitchProps {
  leagues: readonly LeagueOption[];
  active: string;
  onSelect: (slug: string) => void;
  /** Which ground the row sits on. The default is the screen body. */
  tone?: 'crown' | 'ground';
}

/** The mock's dimmed-mark treatment: grayscale, at .78 (ADR 0089). */
const IDLE_MARK_OPACITY = 0.78;

/**
 * ⚠ `FilterImage` draws through react-native-svg's `Image`, which renders
 * BITMAPS only — an SVG source (Serie A's `primary` is one) comes out as an
 * empty chip. Found on the simulator, the P2 spike doing its job. SVG marks
 * take the opacity-only approximation instead (recorded divergence, ADR 0089).
 */
const isSvgUrl = (url: string) => /\.svg(\?|#|$)/i.test(url);
const SVG_IDLE_OPACITY = 0.45;

export function LeagueSwitch({ leagues, active, onSelect, tone = 'ground' }: LeagueSwitchProps) {
  const crown = tone === 'crown';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}>
      {leagues.map((league) => {
        const selected = league.slug === active;
        return (
          <Pressable
            key={league.slug}
            onPress={() => onSelect(league.slug)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={league.name}
            style={({ pressed }) => [
              styles.chip,
              crown ? styles.chipCrown : styles.chipGround,
              selected && (crown ? styles.onCrown : styles.onGround),
              !selected && crown && styles.idleCrown,
              pressed && { opacity: 0.7 },
            ]}>
            {league.logoUrl ? (
              selected || isSvgUrl(league.logoUrl) ? (
                <Image
                  source={{ uri: league.logoUrl }}
                  style={[
                    styles.mark,
                    !selected && { opacity: SVG_IDLE_OPACITY },
                  ]}
                  contentFit="contain"
                  accessible={false}
                />
              ) : (
                // ⚠ `FilterImage` draws through an Svg — its size must be the
                // style's, and the filter id is its own (no trap-40 collision).
                <FilterImage
                  source={{ uri: league.logoUrl }}
                  style={[styles.mark, { opacity: IDLE_MARK_OPACITY }]}
                  resizeMode="contain"
                  filters={[{ name: 'feColorMatrix', type: 'saturate', values: '0' }]}
                />
              )
            ) : (
              <Text
                variant="eyebrow"
                color={
                  crown
                    ? selected
                      ? 'crownChipInk'
                      : 'onCrownDim'
                    : selected
                      ? 'text'
                      : 'textFaint'
                }>
                {league.name}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { gap: Spacing.two, paddingRight: Spacing.five },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Size.leagueChipH,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // On the crown the chip takes the tighter control radius; on the ground it
  // matches the segmented thumb's.
  chipCrown: { borderRadius: Radius.crownControl, backgroundColor: Colors.dark.onCrownFill },
  chipGround: { borderRadius: Radius.thumb, backgroundColor: 'transparent', borderColor: Colors.dark.glassLine },
  // The double inversion (ADR 0089): a near-black plate, mark back in colour.
  onCrown: { backgroundColor: Colors.dark.crownChipOn, borderColor: Colors.dark.crownChipOnLine },
  onGround: { backgroundColor: Colors.dark.segThumb, borderColor: Colors.dark.accentRing },
  // The whole idle chip dims a step on the crown; its mark is grayscale on
  // both grounds.
  idleCrown: { opacity: 0.72, borderColor: Colors.dark.onCrownLine },
  mark: { width: Size.leagueChipMarkW, height: Size.leagueChipMarkH },
});
