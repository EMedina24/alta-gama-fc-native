/**
 * Step 1 — the club picker. The CROWN carries the step, the title and the
 * search + league pills; the clubs are the Clubs tab's own liquid-glass
 * BUBBLES, here as selection toggles (ADR 0099 — reversing 0076's tile grid
 * and the repaint's floodlight carve-out).
 *
 * ⚠ TWO team queries, and they are not redundant. `TeamView` carries NO league
 * field — membership is only knowable from which league's roster a slug comes
 * back in — so the browse grid must be fetched league-scoped and cannot be
 * filtered out of the unscoped set. The unscoped call is the SEARCH corpus:
 * a reader looking for Arsenal from the LaLiga chip has to find it (ADR 0032).
 *
 * ⚠ This screen wears a crown but cannot use `ScreenScaffold` — it needs a
 * pinned CTA footer and keyboard-persistent taps — so it borrows the
 * scaffold's status-bar arithmetic (`BRIGHT_BAND`, ADR 0094) instead of
 * duplicating the number.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button, MeshGround, SkeletonRows, Text, WashGradient } from '@/components/atoms';
import { ClubBubble, LeaguePills, PickStack, SearchField, StepDots } from '@/components/molecules';
import { BRIGHT_BAND } from '@/components/templates/screen-scaffold';
import { Crown } from '@/components/templates/crown';
import { Colors, CrownRamp, Size, Spacing } from '@/constants/theme';
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

  /** The scaffold's status-bar flip (ADR 0094), inlined for the same crown. */
  const [overBright, setOverBright] = useState(true);
  const threshold = Math.max(0, (insets.top + CrownRamp) * BRIGHT_BAND - insets.top);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOverBright(e.nativeEvent.contentOffset.y < threshold);
  };

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
      <StatusBar style={overBright ? 'dark' : 'light'} />
      <MeshGround />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Crown
          eyebrow={copy.onboarding.step(1, 2)}
          title={copy.onboarding.pickTitle}
          meta={<StepDots count={2} active={0} />}
          topInset={insets.top}>
          <View style={styles.controls}>
            {/* The body copy rides the crown, in its dark-on-bright ink. */}
            <View style={styles.crownBody}>
              <Text variant="body" color="onCrownDim" style={styles.crownBodyText}>
                {copy.onboarding.pickBody}
              </Text>
            </View>
            {/* ⚠ The search field sits ABOVE the pills on purpose. The pills
                unmount on the first keystroke, and anything below them would be
                yanked upward under the reader's finger mid-type. */}
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={copy.onboarding.search}
            />
            {/* ⚠ Hidden while searching: search spans EVERY tracked club, so a
                league filter over those results would claim a scope the list
                does not have (ADR 0032). */}
            {query ? null : (
              <LeaguePills
                leagues={leagueOptions(artwork.data)}
                active={league.slug}
                onSelect={setLeagueSlug}
              />
            )}
          </View>
        </Crown>

        <View style={styles.body}>
          {/* ⚠ Only the GRID waits on the league's roster. Gating the screen
              would take the pills off-screen under the finger that just tapped
              them, and the empty grid paints before the skeleton would. */}
          {browse.isPending && !query ? (
            <SkeletonRows count={8} height={Size.rowSkeleton} />
          ) : (
            <View style={styles.grid}>
              {shown.map((team) => (
                <View key={team.slug} style={styles.cell}>
                  <ClubBubble
                    name={pickerName(team.name)}
                    crest={crestSrc(team.logoUrls, team.logoUrl, 'small')}
                    abbr={abbreviate(team.name, team.slug, team.shortName)}
                    rank={null}
                    rankColor={null}
                    checked={picked.includes(team.slug)}
                    accessibilityLabel={team.name}
                    onPress={() => toggle(team.slug)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
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
  // ⚠ No horizontal padding — the crown is full-bleed; the gutter is `body`'s
  // (the scaffold's own contract, ADR 0087).
  content: { paddingBottom: Spacing.eight + Spacing.seven },
  controls: { gap: Spacing.three },
  crownBody: { marginTop: -Spacing.two },
  crownBodyText: { lineHeight: 21 },
  body: { paddingHorizontal: Spacing.five, paddingTop: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.five },
  // Thirds, with the 88pt bubble centred in each — no gap arithmetic to
  // drift, and a short last row stays left-aligned.
  cell: { width: '33.33%', alignItems: 'center' },
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
