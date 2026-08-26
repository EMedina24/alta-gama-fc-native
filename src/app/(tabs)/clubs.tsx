/**
 * Follow clubs.
 *
 * ⚠ Toggling a club subscribes or unsubscribes **immediately, with no confirm**.
 * It is reversible and the feed regenerates; the design's only two-step action
 * is deleting an account. (In an anonymous v1 that becomes "turn off alerts on
 * this device" — ADR 0019.)
 *
 * ⚠ Search folds accents: `atletico` must find `Atlético`. `foldAccents` is the
 * same NFD-strip the monogram derivation uses.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, SkeletonRows, Text } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { ClubBrowser } from '@/components/organisms/club-browser';
import { ScreenScaffold } from '@/components/templates/screen-scaffold';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { DEFAULT_LEAGUE } from '@/lib/cronogol/leagues';
import { foldAccents } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useTeams } from '@/queries/use-teams';
import { followClub, unfollowClub, usePreferences } from '@/store/preferences';

export default function ClubsScreen() {
  const router = useRouter();
  const { copy } = useI18n();
  const { followed } = usePreferences();
  /**
   * ⚠ TWO queries, and they are not redundant.
   *
   * `TeamView` carries NO league field — league membership is only knowable from
   * which league's roster a slug appears in (the web app derives it the same way,
   * in `clubDirectory`). So the browse list must be fetched league-scoped; it
   * cannot be filtered out of the full set.
   *
   * The unscoped call is the SEARCH corpus: the design's field says "Search 100
   * clubs", and a reader looking for Arsenal from the LaLiga tab should find it.
   */
  const teams = useTeams();
  const browse = useTeams(DEFAULT_LEAGUE.apiSlug);
  const [query, setQuery] = useState('');

  const all = teams.data ?? [];

  const subscribed = useMemo(
    // Ordered by the follow list, so a newly followed club appears where the
    // user put it rather than jumping to an alphabetical slot.
    () => followed.map((slug) => all.find((t) => t.slug === slug)).filter((t) => t !== undefined),
    [followed, all],
  );

  const results = useMemo(() => {
    const needle = foldAccents(query.trim());
    // No search: the default league's roster. Searching: every tracked club.
    const pool = needle ? all : (browse.data ?? []);
    const rest = pool.filter((t) => !followed.includes(t.slug));
    if (!needle) return rest;
    return rest.filter((t) => foldAccents(t.name).includes(needle));
  }, [all, browse.data, followed, query]);

  const toggle = (slug: string) =>
    followed.includes(slug) ? unfollowClub(slug) : followClub(slug);

  return (
    <ScreenScaffold
      title={copy.clubs.title}
      onRefresh={() => {
        void teams.refetch();
        void browse.refetch();
      }}
      refreshing={teams.isRefetching || browse.isRefetching}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={copy.clubs.search(all.length)}
        placeholderTextColor={Colors.dark.textFaint}
        style={styles.search}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel={copy.clubs.search(all.length)}
      />

      {teams.isError ? (
        <View style={styles.state}>
          <Text color="textSecondary">{copy.clubs.error}</Text>
          <Button label={copy.clubs.retry} tone="secondary" onPress={() => void teams.refetch()} />
        </View>
      ) : teams.isPending || browse.isPending ? (
        <SkeletonRows count={8} height={Size.rowSkeleton} />
      ) : (
        <>
          {subscribed.length > 0 && !query ? (
            <>
              <SectionHeader
                title={copy.clubs.subscribed}
                meta={String(subscribed.length)}
                tone="accent"
              />
              <View style={styles.group}>
                <ClubBrowser
                  teams={subscribed}
                  followed={followed}
                  variant="subscribed"
                  onToggle={toggle}
                  onOpen={(slug) => router.push({ pathname: '/club/[slug]', params: { slug } })}
                  copy={copy.clubs}
                />
              </View>
            </>
          ) : null}

          <SectionHeader title={query ? copy.clubs.title : copy.clubs.browse(DEFAULT_LEAGUE.name)} />

          {results.length === 0 ? (
            <Text color="textSecondary">{copy.clubs.noResults}</Text>
          ) : (
            <ClubBrowser
              teams={results}
              followed={followed}
              onToggle={toggle}
              onOpen={(slug) => router.push({ pathname: '/club/[slug]', params: { slug } })}
              copy={copy.clubs}
            />
          )}
        </>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: Size.minTouch,
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    color: Colors.dark.text,
    fontSize: 15,
  },
  group: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.group,
    overflow: 'hidden',
  },
  state: { gap: Spacing.four, paddingVertical: Spacing.six },
});
