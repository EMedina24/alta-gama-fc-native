/** Subscribe / unsubscribe confirm for one club. */
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AlertsSheet } from '@/components/organisms/alerts-sheet';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubFixtures } from '@/queries/use-club';
import { followClub, unfollowClub, usePreferences } from '@/store/preferences';

export default function AlertsSheetRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const { followed } = usePreferences();
  const fixtures = useClubFixtures(slug);

  const team = fixtures.data?.team;
  const subscribed = followed.includes(slug);

  return (
    <AlertsSheet
      clubName={team ? displayName(team.name) : slug}
      crest={crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'small')}
      abbr={team ? abbreviate(team.name, team.slug, team.shortName) : '?'}
      matches={fixtures.data?.count ?? 0}
      subscribed={subscribed}
      onConfirm={() => {
        if (subscribed) unfollowClub(slug);
        else followClub(slug);
        router.back();
      }}
      onCancel={() => router.back()}
      copy={copy.alerts}
    />
  );
}
