/** Step 1 — the club picker. A 2-up grid with search. */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Crest, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { DEFAULT_LEAGUE } from '@/lib/cronogol/leagues';
import { foldAccents } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useTeams } from '@/queries/use-teams';
import { followClubs, setOnboarded } from '@/store/preferences';

export default function OnboardingClubs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();
  const all = useTeams();
  const league = useTeams(DEFAULT_LEAGUE.apiSlug);

  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const needle = foldAccents(query.trim());
    if (!needle) return league.data ?? [];
    return (all.data ?? []).filter((t) => foldAccents(t.name).includes(needle));
  }, [all.data, league.data, query]);

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
