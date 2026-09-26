/**
 * The favourite-club picker (ADR 0209) — Settings' FAVOURITE CLUB row.
 *
 * ⚠ It offers FOLLOWED clubs only, and "None". A favourite is always a club
 * the reader follows (the store refuses anything else): choosing one is not
 * consent to its alerts, so it cannot be how a club gets followed. With nothing
 * followed there is nothing to choose, and the sheet says where to go instead.
 *
 * ⚠ The league line comes from `leagueOfClub`, deliberately NOT the gated
 * `clubStanding`: it asks which competition a club plays in, which a
 * half-played table answers perfectly well — there is no rank here to quote.
 *
 * ⚠ No `flex: 1` inside a formSheet (trap 19).
 */
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Button, Check, Crest, Text } from '@/components/atoms';
import { ListGroup, SettingsRow } from '@/components/molecules';
import { Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { leagueOfClub } from '@/lib/cronogol/standings';
import { hapticToggle } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useStandings } from '@/queries/use-standings';
import { useTeams } from '@/queries/use-teams';
import { setFavouriteClub, usePreferences } from '@/store/preferences';

export default function FavouriteClubSheet() {
  const router = useRouter();
  const { copy } = useI18n();
  const { followed, favourite } = usePreferences();
  const teams = useTeams();
  const standings = useStandings();

  const pick = (slug: string | null) => {
    void hapticToggle();
    setFavouriteClub(slug);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="headline" accessibilityRole="header">
        {copy.settings.favouriteTitle}
      </Text>

      {followed.length === 0 ? (
        <>
          <Text variant="body" color="textSecondary">
            {copy.settings.noFollows}
          </Text>
          {/* To the Clubs tab: `navigate` pops this sheet and Settings on the
              way, which is where following happens. */}
          <Button
            label={copy.settings.findClubs}
            tone="secondary"
            onPress={() => router.navigate('/clubs')}
          />
        </>
      ) : (
        <ListGroup>
          {followed.map((slug) => {
            const team = teams.data?.find((t) => t.slug === slug);
            return (
              <SettingsRow
                key={slug}
                leading={
                  <Crest
                    src={team ? crestSrc(team.logoUrls, team.logoUrl, 'small') : null}
                    fallback={team ? abbreviate(team.name, team.slug, team.shortName) : slug.slice(0, 3)}
                    size={Size.crestList}
                  />
                }
                title={team ? displayName(team.name) : slug}
                note={leagueOfClub(standings.data?.tables, slug)?.name ?? null}
                trailing={favourite === slug ? <Check /> : null}
                selected={favourite === slug}
                chevron={false}
                onPress={() => pick(slug)}
              />
            );
          })}
          <SettingsRow
            title={copy.settings.noFavourite}
            trailing={favourite === null ? <Check /> : null}
            selected={favourite === null}
            chevron={false}
            onPress={() => pick(null)}
          />
        </ListGroup>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four },
});
