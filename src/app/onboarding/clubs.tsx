/**
 * Step 1 — the club picker. A 2-up grid with search, behind a league chooser.
 *
 * ⚠ TWO team queries, and they are not redundant. `TeamView` carries NO league
 * field — membership is only knowable from which league's roster a slug comes
 * back in — so the browse grid must be fetched league-scoped and cannot be
 * filtered out of the unscoped set. The unscoped call is the SEARCH corpus:
 * a reader looking for Arsenal from the LaLiga chip has to find it (ADR 0032).
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Crest, SkeletonRows, Text } from '@/components/atoms';
import { LeagueChips } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { DEFAULT_LEAGUE, findLeague, leagueOptions } from '@/lib/cronogol/leagues';
import { foldAccents } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useLeagueArtwork } from '@/queries/use-leagues';
import { useTeams } from '@/queries/use-teams';
import { followClubs, setOnboarded } from '@/store/preferences';

export default function OnboardingClubs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();

  /**
   * The league being browsed. Screen state, not a preference (ADR 0032): it is
   * a place in a list, and nothing about a reader's follows depends on it. The
   * Clubs tab and Matchdays both forget theirs on the same reasoning.
   */
  const [leagueSlug, setLeagueSlug] = useState(DEFAULT_LEAGUE.slug);
  const league = findLeague(leagueSlug) ?? DEFAULT_LEAGUE;

  const all = useTeams();
  // ⚠ `apiSlug`, never `slug`. They differ only for LaLiga (`laliga` vs
  // `la-liga`) and the wrong one returns `[]`, not a 404 — it fails silently
  // and looks like a coverage gap.
  const browse = useTeams(league.apiSlug);
  const artwork = useLeagueArtwork();

  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const needle = foldAccents(query.trim());
    if (!needle) return browse.data ?? [];
    return (all.data ?? []).filter((t) => foldAccents(t.name).includes(needle));
  }, [all.data, browse.data, query]);

  // ⚠ Picks SURVIVE a league switch — a reader can take Barça, move to the
  // Premier League and take Arsenal. The footer count is the only feedback that
  // the off-screen ones are still held.
  const toggle = (slug: string) =>
    setPicked((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );

  const finish = () => {
    // ⚠ Picks are committed even on skip — see the layout's comment.
    if (picked.length > 0) followClubs(picked);
    router.replace('/onboarding/alerts');
  };

  const skip = () => {
    if (picked.length > 0) followClubs(picked);
    setOnboarded(true);
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.six }]}>
        <Text variant="largeTitle">{copy.onboarding.pickTitle}</Text>
        <Text variant="body" color="textDim">
          {copy.onboarding.pickBody}
        </Text>

        {/* ⚠ The search field sits ABOVE the chips on purpose. The chips unmount
            on the first keystroke, and anything below them would be yanked
            upward under the reader's finger mid-type. */}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={copy.onboarding.search}
          placeholderTextColor={Colors.dark.textFaint}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />

        {/* ⚠ Hidden while searching: search spans EVERY tracked club, so a
            league filter over those results would claim a scope the list does
            not have (ADR 0032). */}
        {query ? null : (
          <LeagueChips
            leagues={leagueOptions(artwork.data)}
            active={league.slug}
            onSelect={setLeagueSlug}
          />
        )}

        {/* ⚠ Only the GRID waits on the league's roster. Gating the screen would
            take the chips off-screen under the finger that just tapped them, and
            the empty grid paints before the skeleton would (ADR 0032). */}
        {browse.isPending && !query ? (
          <SkeletonRows count={8} height={Size.rowSkeleton} />
        ) : (
          <View style={styles.grid}>
            {shown.map((team) => {
              const on = picked.includes(team.slug);
              return (
                <Pressable
                  key={team.slug}
                  onPress={() => toggle(team.slug)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.tile, on && styles.tileOn]}>
                  <Crest
                    src={crestSrc(team.logoUrls, team.logoUrl, 'small')}
                    fallback={abbreviate(team.name, team.slug, team.shortName)}
                    size={Size.crestList}
                  />
                  <Text variant="callout" numberOfLines={1} style={styles.tileName}>
                    {displayName(team.name)}
                  </Text>
                  {on ? (
                    <Text variant="callout" color="accent">
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Button
          label={copy.onboarding.continueWith(picked.length)}
          onPress={finish}
          disabled={picked.length === 0}
        />
        <Button label={copy.onboarding.skip} tone="quiet" onPress={skip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.three, paddingBottom: Spacing.six },
  search: {
    minHeight: Size.minTouch,
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    color: Colors.dark.text,
    fontSize: 15,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '48%',
    minHeight: 56,
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.tile,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: Spacing.three,
  },
  tileOn: { borderColor: Colors.dark.accentRing, backgroundColor: Colors.dark.raised },
  tileName: { flex: 1, minWidth: 0 },
  footer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.hairlineMid,
  },
});
