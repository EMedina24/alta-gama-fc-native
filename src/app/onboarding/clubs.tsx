/**
 * Step 1 — the club picker. A 3-up crest-led grid with search, behind a row of
 * league pills (ADR 0076; the 3-up is what SPEC §3.7 asked for).
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

import { Button, Check, Crest, Eyebrow, Glow, SearchGlyph, SkeletonRows, Text, WashGradient } from '@/components/atoms';
import { LeaguePills, PickStack, StepDots } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, pickerName } from '@/lib/cronogol/derive';
import { DEFAULT_LEAGUE, findLeague, leagueOptions } from '@/lib/cronogol/leagues';
import { foldAccents } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useLeagueArtwork } from '@/queries/use-leagues';
import { useTeams } from '@/queries/use-teams';
import { followClubs } from '@/store/preferences';

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

  // The CTA's crest stack resolves against the UNSCOPED corpus, so a club picked
  // in another league still draws (ADR 0076).
  const stack = useMemo(() => {
    const bySlug = new Map((all.data ?? []).map((t) => [t.slug, t]));
    return picked.flatMap((slug) => {
      const team = bySlug.get(slug);
      return team
        ? [{ slug, src: crestSrc(team.logoUrls, team.logoUrl, 'small'), fallback: abbreviate(team.name, slug, team.shortName) }]
        : [];
    });
  }, [all.data, picked]);

  // ⚠ Picks SURVIVE a league switch — a reader can take Barça, move to the
  // Premier League and take Arsenal. The footer count is the only feedback that
  // the off-screen ones are still held.
  const toggle = (slug: string) =>
    setPicked((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );

  const finish = () => {
    if (picked.length > 0) followClubs(picked);
    router.replace('/onboarding/alerts');
  };

  return (
    <View style={styles.screen}>
      <Glow opacity={0.1} cx={0.15} cy={0} r={0.5} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.six }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.stepRow}>
          <Eyebrow color="accent">{copy.onboarding.step(1, 2)}</Eyebrow>
          <StepDots count={2} active={0} />
        </View>
        <Text variant="largeTitle">{copy.onboarding.pickTitle}</Text>
        <Text variant="body" color="textSecondary" style={styles.body}>
          {copy.onboarding.pickBody}
        </Text>

        {/* ⚠ The search field sits ABOVE the pills on purpose. The pills unmount
            on the first keystroke, and anything below them would be yanked
            upward under the reader's finger mid-type. */}
        <View style={styles.search}>
          <SearchGlyph />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.onboarding.search}
            placeholderTextColor={Colors.dark.textFaint}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {/* ⚠ Hidden while searching: search spans EVERY tracked club, so a
            league filter over those results would claim a scope the list does
            not have (ADR 0032). */}
        {query ? null : (
          <LeaguePills
            leagues={leagueOptions(artwork.data)}
            active={league.slug}
            onSelect={setLeagueSlug}
          />
        )}

        {/* ⚠ Only the GRID waits on the league's roster. Gating the screen would
            take the pills off-screen under the finger that just tapped them, and
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
                  accessibilityLabel={team.name}
                  style={({ pressed }) => [styles.tile, on && styles.tileOn, pressed && styles.pressed]}>
                  <Crest
                    src={crestSrc(team.logoUrls, team.logoUrl, 'small')}
                    fallback={abbreviate(team.name, team.slug, team.shortName)}
                    size={Size.crestPick}
                  />
                  {/* ⚠ `pickerName`, not `displayName`: three across, one line each. */}
                  <Text variant="caption" color={on ? 'text' : 'textSecondary'} numberOfLines={1} center>
                    {pickerName(team.name)}
                  </Text>
                  {on ? (
                    <View style={styles.badge}>
                      <Check color="onAccent" size={Size.pickBadge - 8} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
        {/* The grid fades under the footer instead of being cut by it. */}
        <View style={styles.fade} pointerEvents="none">
          <WashGradient
            angle="vertical"
            stops={[
              { offset: 0, color: Colors.dark.background, opacity: 0 },
              { offset: 1, color: Colors.dark.background, opacity: 1 },
            ]}
          />
        </View>
        <Button
          label={copy.onboarding.continueWith(picked.length)}
          icon={<PickStack items={stack} />}
          onPress={finish}
          disabled={picked.length === 0}
          tall
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.three, paddingBottom: Spacing.seven },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { lineHeight: 21 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: Size.minTouch + 2,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four - 2,
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.control,
  },
  searchInput: { flex: 1, minWidth: 0, minHeight: Size.minTouch + 2, color: Colors.dark.text, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  tile: {
    // Three across inside the gutter, with two 8pt gaps: (100% − 16) / 3.
    width: '31.5%',
    flexGrow: 1,
    maxWidth: '32.5%',
    minHeight: 108,
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three + 2,
    paddingHorizontal: Spacing.two,
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.tile,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tileOn: { borderColor: Colors.dark.accentRing, backgroundColor: Colors.dark.raised },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: Size.pickBadge,
    height: Size.pickBadge,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.hairlineMid,
    backgroundColor: Colors.dark.background,
  },
  fade: { position: 'absolute', left: 0, right: 0, top: -Spacing.eight - 12, height: Spacing.eight + 12 },
});
