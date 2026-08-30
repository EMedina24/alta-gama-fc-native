/**
 * Crest, identity, and the subscribe block.
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
 * ⚠ The identity block sits on the club's own colour when `wash` is set
 * (ADR 0068): a vertical gradient from the tamed colour at the top of the
 * screen to `background` by the bottom of the block, bleeding through the
 * screen's gutter and up under the transparent nav — which is what the two
 * `bleed*` props are for. The subscribe block and everything below it are
 * untouched. `wash: null` is the whole Premier League and Serie A, and renders
 * the header exactly as before.
 */
import { StyleSheet, View } from 'react-native';

import { Button, Crest, Text, WashGradient } from '@/components/atoms';
import { ClubWash, Colors, Radius, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import type { FixtureView, TeamView } from '@/lib/cronogol/types';
import { homeGround, primaryCompetition } from '@/lib/cronogol/derive';

export interface ClubHeaderProps {
  team: TeamView;
  fixtures: readonly FixtureView[];
  subscribed: boolean;
  onToggleAlerts: () => void;
  onOpenCalendar: () => void;
  /** Already tamed (`clubWash`); null → no wash, today's header. */
  wash?: string | null;
  /**
   * How far the wash extends past the screen's content padding: the horizontal
   * gutter, and the top inset the transparent header sits in. Passed by the
   * screen because only it knows its own padding.
   */
  bleedX?: number;
  bleedTop?: number;
  copy: {
    alertsOn: string;
    alertsOff: string;
    calendar: string;
    /** The "one subscription covers the season" note. */
    note: string;
  };
}

export function ClubHeader({
  team,
  fixtures,
  subscribed,
  onToggleAlerts,
  onOpenCalendar,
  wash = null,
  bleedX = 0,
  bleedTop = 0,
  copy,
}: ClubHeaderProps) {
  const ground = homeGround(team, fixtures);
  const competition = primaryCompetition(fixtures);
  const place = [ground.city, ground.venue].filter(Boolean).join(' · ');

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.identityWrap,
          wash
            ? {
                marginHorizontal: -bleedX,
                paddingHorizontal: bleedX,
                marginTop: -bleedTop,
                paddingTop: bleedTop + Spacing.four,
                paddingBottom: Spacing.four,
              }
            : null,
        ]}>
        {wash ? (
          <WashGradient
            angle="vertical"
            stops={[
              { offset: 0, color: wash },
              { offset: ClubWash.heroEnd, color: Colors.dark.background },
            ]}
          />
        ) : null}
      <View style={styles.identity}>
        <Crest
          src={crestSrc(team.logoUrls, team.logoUrl, 'card')}
          fallback={abbreviate(team.name, team.slug, team.shortName)}
          size={Size.crestHero}
        />
        <View style={styles.names}>
          {competition ? (
            <Text variant="eyebrowSm" color={wash ? 'washInk' : 'textFaint'}>
              {competition}
            </Text>
          ) : null}
          <Text variant="title">{displayName(team.name)}</Text>
          {place ? (
            <Text variant="body" color="textDim" numberOfLines={1}>
              {place}
            </Text>
          ) : null}
        </View>
      </View>
      </View>

      <View style={styles.subscribe}>
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label={subscribed ? copy.alertsOn : copy.alertsOff}
              tone={subscribed ? 'outline' : 'primary'}
              onPress={onToggleAlerts}
            />
          </View>
          <View style={styles.action}>
            <Button label={copy.calendar} tone="secondary" onPress={onOpenCalendar} />
          </View>
        </View>
        <Text variant="footnote" color="textDim">
          {copy.note}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.four },
  /** Relative + clipped so the wash fills exactly this block and no more. */
  identityWrap: { position: 'relative', overflow: 'hidden' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  names: { flex: 1, gap: Spacing.half, minWidth: 0 },
  subscribe: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
