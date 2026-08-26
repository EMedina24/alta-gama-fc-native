/**
 * A club: identity, the subscribe block, and its season.
 *
 * ⚠ **`lastSyncedAt === null` renders the pending state, never the partial
 * list.** An opponent-only club returns just the matches where it happened to
 * face a tracked club — six games, not a season. Showing those as a schedule is
 * the single easiest way to ship a convincing-looking bug, which is why
 * `hasCompleteSchedule` exists and why this branch comes before the spine.
 *
 * ⚠ Sits outside `(tabs)/` so it pushes over the tab bar (ADR 0020).
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkeletonRows, Text } from '@/components/atoms';
import { ClubHeader } from '@/components/organisms/club-header';
import { SeasonSpine } from '@/components/organisms/season-spine';
import { SquadList } from '@/components/organisms/squad-list';
import { BottomTabInset, Colors, Radius, Size, Spacing } from '@/constants/theme';
import { hasCompleteSchedule } from '@/lib/cronogol/derive';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubFixtures, useClubSquad } from '@/queries/use-club';
import { usePreferences, useZone } from '@/store/preferences';

export default function ClubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const { clock, followed } = usePreferences();

  const [tab, setTab] = useState<'fixtures' | 'players'>('fixtures');

  const fixtures = useClubFixtures(slug);
  const squad = useClubSquad(slug);

  const data = fixtures.data;
  const subscribed = followed.includes(slug);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerTintColor: Colors.dark.accent,
          /**
           * ⚠ Chevron only, no label.
           *
           * Left to itself the back button inherits the previous route's name
           * and renders the ROUTE GROUP — "(tabs)" — which is a file-system
           * concept that must never reach a reader. The obvious fix, the club's
           * competition, prints the PROVIDER's copy ("LALIGA EA SPORTS") and is
           * wrong anyway: this screen is reached from Clubs, from the Table and
           * from a push notification, so no single label is true.
           */
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 44, paddingBottom: BottomTabInset },
        ]}>
        {fixtures.isPending ? (
          <SkeletonRows count={8} height={Size.rowSkeleton} />
        ) : !data ? (
          <Text color="textSecondary">{copy.club.notFound}</Text>
        ) : (
          <>
            <ClubHeader
              team={data.team}
              fixtures={data.fixtures}
              subscribed={subscribed}
              // ⚠ Always via the sheet, in BOTH directions — the design confirms
              // a subscribe and a unsubscribe in the same place.
              onToggleAlerts={() =>
                router.push({ pathname: '/(sheets)/alerts', params: { slug } })
              }
              onOpenCalendar={() =>
                router.push({
                  pathname: '/(sheets)/calendar',
                  params: { slug, name: data.team.name },
                })
              }
              copy={{
                alertsOn: copy.club.alertsOn,
                alertsOff: copy.club.alertsOff,
                calendar: copy.club.calendar,
                note: copy.club.subscribeNote,
              }}
            />

            <View style={styles.segmented}>
              {(['fixtures', 'players'] as const).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === key }}
                  style={[styles.segment, tab === key && styles.segmentActive]}>
                  <Text variant="bodyStrong" color={tab === key ? 'text' : 'textDim'}>
                    {key === 'fixtures' ? copy.club.fixtures : copy.club.players}
                  </Text>
                </Pressable>
              ))}
            </View>

            {tab === 'fixtures' ? (
              hasCompleteSchedule(data.team) ? (
                <SeasonSpine
                  data={data}
                  zone={zone}
                  clock={clock}
                  phrases={phrases}
                  roundPrefix={copy.club.roundPrefix}
                />
              ) : (
                <View style={styles.pending}>
                  <Text variant="headline">{copy.club.noScheduleTitle}</Text>
                  <Text variant="body" color="textDim">
                    {copy.club.noScheduleBody}
                  </Text>
                </View>
              )
            ) : squad.isPending ? (
              <SkeletonRows count={6} height={Size.rowSkeleton} />
            ) : (
              <SquadList
                players={squad.data?.players ?? []}
                bandLabels={copy.club.bandLabels}
                emptyLabel={copy.club.squadEmpty}
                // ⚠ The PERSON id, never the shirt — a Premier League squad can
                // carry two players wearing the same number.
                onSelectPlayer={(id) =>
                  router.push({ pathname: '/(sheets)/player', params: { slug, id } })
                }
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.control,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.seg,
  },
  segmentActive: { backgroundColor: Colors.dark.raised },
  pending: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
