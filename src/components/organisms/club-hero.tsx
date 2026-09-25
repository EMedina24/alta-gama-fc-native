/**
 * The club page's hero, the Medina kit's way (ADR 0202, superseding 0091's
 * bled wash and back pill and 0097's FOLLOWING chip): two glass circles —
 * back and share — then the crest leading the name (0189's call, kept), a
 * one-line rank or ground under it, and the full-width follow button.
 *
 * ⚠ No colour of its own. The club's scene (`SceneGround kind="club"`, behind
 * the whole screen) is the colour now; a wash here would double it.
 *
 * ⚠⚠ **The follow button never follows or unfollows directly** (0082/0097):
 * both states open the alerts sheet, the one place a subscription confirms.
 *  - NOT following: solid lime "☆ Follow" — the page's one invitation.
 *  - Following: a lime OUTLINE "★ Following" — the settled state, never solid
 *    lime (0097's rule and the kit's own RN template), so a followed club's
 *    page does not shout at its own subscriber.
 *
 * ⚠ The subline is the club's STANDING when one is quotable ("LaLiga · 1st ·
 * 67 Pts" — the caller gates it on `bandsApply`, trap 20), otherwise its
 * ground ("Barcelona · Spotify Camp Nou"). The city comes from
 * `homeGround(team, fixtures)` — `venue.city` is null outside Serie A.
 */
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Chevron,
  Crest,
  GlassIconButton,
  ShareGlyph,
  StarGlyph,
  Text,
} from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName, homeGround } from '@/lib/cronogol/derive';
import type { FixtureView, TeamView } from '@/lib/cronogol/types';

export interface ClubHeroProps {
  team: TeamView;
  fixtures: readonly FixtureView[];
  /** "LaLiga · 1st · 67 Pts", already composed — null falls back to the ground. */
  rankLine: string | null;
  subscribed: boolean;
  onFollow: () => void;
  onBack: () => void;
  onShare: () => void;
  copy: {
    follow: string;
    following: string;
    followHint: string;
    followingHint: string;
    back: string;
    share: string;
  };
}

export function ClubHero({
  team,
  fixtures,
  rankLine,
  subscribed,
  onFollow,
  onBack,
  onShare,
  copy,
}: ClubHeroProps) {
  const ground = homeGround(team, fixtures);
  const subline = rankLine ?? [ground.city, ground.venue].filter(Boolean).join(' · ');
  const crest = crestSrc(team.logoUrls, team.logoUrl, 'card');

  return (
    <View style={styles.hero}>
      <View style={styles.bar}>
        <GlassIconButton onPress={onBack} accessibilityLabel={copy.back}>
          <Chevron direction="left" color="text" />
        </GlassIconButton>
        <GlassIconButton onPress={onShare} accessibilityLabel={copy.share}>
          <ShareGlyph size={Size.shareGlyph} />
        </GlassIconButton>
      </View>

      <View style={styles.identity} accessibilityRole="header">
        {/* ⚠ Crest LEADS, name follows (ADR 0189). */}
        <Crest
          src={crest}
          fallback={abbreviate(team.name, team.slug, team.shortName)}
          size={Size.crestHero}
        />
        <View style={styles.names}>
          <Text variant="heroTitle">{displayName(team.name)}</Text>
          {subline ? (
            <Text variant="footnote" color="textSecondary" numberOfLines={1}>
              {subline}
            </Text>
          ) : null}
        </View>
      </View>

      <Button
        label={subscribed ? copy.following : copy.follow}
        tone={subscribed ? 'outline' : 'primary'}
        tall
        onPress={onFollow}
        accessibilityHint={subscribed ? copy.followingHint : copy.followHint}
        icon={
          <StarGlyph
            size={Size.starGlyph}
            filled={subscribed}
            color={subscribed ? 'accent' : 'onAccent'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.five },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  // ⚠ The only elastic column: the crest is intrinsic (trap 56).
  names: { flex: 1, minWidth: 0, gap: Spacing.one },
});
