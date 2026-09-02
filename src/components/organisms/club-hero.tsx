/**
 * The club page's hero (ADR 0091): the club's colour as a corner-lit wash, its
 * crest bled huge off the bottom-left, a back pill, the league eyebrow, the
 * name at `heroTitle`, its ground, and the crest at reading size.
 *
 * Replaces `club-header.tsx`'s identity block. The subscribe buttons that
 * organism also carried moved into the club page's alerts+calendar tray.
 *
 * ⚠ The city comes from `homeGround(team, fixtures)`, which reads it off the
 * first HOME fixture — `venue.city` is null on every LaLiga, Premier League and
 * Bundesliga club, and only Serie A states it. A component that renders
 * `venue.city` directly works for Italy and is blank everywhere else.
 *
 * ⚠ The eyebrow is `primaryCompetition(fixtures)` — the most common league
 * competition among the club's own fixtures — not the league it was browsed
 * from. Five of LaLiga's tracked clubs are actually in segunda.
 *
 * ⚠ `wash: null` is a REAL state, not a degradation: every Premier League and
 * Serie A club has no usable hex today (0068's taming), and they take the
 * neutral white fade instead. Never substitute graphite — a grey hero reads as
 * a rendering fault.
 *
 * ⚠ The wash bleeds through the screen gutter and up under the transparent
 * nav via `bleedX`/`bleedTop`, which only the screen knows. The block is
 * `overflow: 'hidden'` so the bleed stops at its own foot — and so the bled
 * crest is clipped to it (trap 40's other half).
 *
 * ⚠ The FOLLOWING pill (ADR 0097) sits opposite the back pill, and only while
 * subscribed. It NEVER unfollows directly — its tap opens the alerts sheet,
 * the one place both directions confirm (0082) — and it wears the settled
 * wash-and-ring, not solid lime: the screen's solid-lime invitation belongs
 * to the alerts row below, and there is one lime hero per screen.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Check, Crest, FadeOutImage, Text, WashGradient, WashRadial } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName, homeGround } from '@/lib/cronogol/derive';
import type { FixtureView, TeamView } from '@/lib/cronogol/types';

/** A 34pt pill is below `minTouch`, and carries hitSlop to make the difference up. */
const PILL_SLOP = { top: (Size.minTouch - Size.pill) / 2, bottom: (Size.minTouch - Size.pill) / 2 };

/** How far the wallpaper crest hangs off the bottom-left corner. */
const BLEED_OFF = 96;
/**
 * Where the hero's `overflow: 'hidden'` cuts the crest, as a fraction of its
 * box — derived from `BLEED_OFF` so the fade and the clip cannot drift apart
 * (ADR 0098). The dissolve completes a hair above the line; only the LEFT
 * edge still hard-clips, at the physical screen edge where a cut reads as
 * intentional.
 */
const BLEED_CLIP = (Size.bigCrestBleed - BLEED_OFF) / Size.bigCrestBleed;

export interface ClubHeroProps {
  team: TeamView;
  fixtures: readonly FixtureView[];
  /** The club's own colour (`clubTint`); null → the neutral white fade. */
  wash?: string | null;
  /** How far the wash bleeds past the screen's own padding. */
  bleedX?: number;
  bleedTop?: number;
  onBack: () => void;
  /** The back pill's label — the league name, or a neutral fallback. */
  backLabel: string;
  /**
   * The follow-state pill (ADR 0097). Null hides it — the unsubscribed page's
   * follow invitation is the solid-lime alerts row, not the hero.
   *
   * `hint` is the VoiceOver hint: the visible label states the STATE
   * ("Following"), so the hint carries the ACTION (opens the unfollow confirm).
   */
  follow?: { label: string; hint: string; onPress: () => void } | null;
}

export function ClubHero({
  team,
  fixtures,
  wash = null,
  bleedX = 0,
  bleedTop = 0,
  onBack,
  backLabel,
  follow = null,
}: ClubHeroProps) {
  const ground = homeGround(team, fixtures);
  const place = [ground.city, ground.venue].filter(Boolean).join(' · ');
  const crest = crestSrc(team.logoUrls, team.logoUrl, 'card');

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
          {/* Corner light, then the vertical fall — the mock's two layers. */}
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

      {/* The club's own crest as wallpaper. Decorative — the identity crest
          below is the one that carries the accessibility weight. It DISSOLVES
          before the hero's clip line rather than being chopped by it: the
          hero's wash fades to nothing, so a hard cut there had no visible
          container to explain it (ADR 0098). */}
      {crest ? (
        <FadeOutImage
          uri={crest}
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
          <Text variant="eyebrowSm" color="text">
            {`‹  ${backLabel}`}
          </Text>
        </Pressable>

        {follow ? (
          <Pressable
            onPress={follow.onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
            accessibilityLabel={follow.label}
            accessibilityHint={follow.hint}
            hitSlop={PILL_SLOP}
            style={({ pressed }) => [styles.follow, pressed && styles.backPressed]}>
            <Check color="accent" size={11} />
            <Text variant="eyebrowSm" color="accent">
              {follow.label}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.identity}>
        <View style={styles.names}>
          {/* ⚠ No competition eyebrow here — the back pill already carries it,
              and the two stacked read as the same words printed twice. */}
          <Text variant="heroTitle">{displayName(team.name)}</Text>
          {place ? (
            <Text variant="caption" color="textDim" numberOfLines={1}>
              {place}
            </Text>
          ) : null}
        </View>
        <View style={styles.crest}>
          <Crest
            src={crest}
            fallback={abbreviate(team.name, team.slug, team.shortName)}
            size={Size.crestHero}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Relative + clipped so the wash and the bled crest stop at this block. */
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  /**
   * The club's crest as wallpaper. ⚠ Pushed hard off the bottom-left corner
   * and kept at 6 %: at the mock's 10 % it read as a second crest competing
   * with the identity one, because this block is shorter than the mock's.
   */
  bleedCrest: {
    position: 'absolute',
    left: -BLEED_OFF,
    bottom: -BLEED_OFF,
    opacity: 0.06,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    height: Size.pill,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.recess,
    borderWidth: 1,
    borderColor: Colors.dark.glassLine,
  },
  backPressed: { transform: [{ scale: 0.955 }] },
  // The settled state's chrome — the alerts row's `alertsOn`, at pill size.
  follow: {
    height: Size.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.accentWash,
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
  },
  identity: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  names: { flex: 1, gap: Spacing.one, minWidth: 0 },
  /** The mock's lifted crest — the one shadow 0087 sanctions here. */
  crest: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
  },
});
