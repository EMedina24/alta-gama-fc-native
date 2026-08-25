/** Account. Reached from the avatar in any tab's header. */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { AccountSheet, type AccountFeed } from '@/components/organisms/account-sheet';
import { disablePushForDevice } from '@/features/push/sync';
import { displayName } from '@/lib/cronogol/derive';
import { clubFeedUrl } from '@/lib/cronogol/feed';
import { useI18n } from '@/lib/i18n/use-i18n';
import { zoneLabel } from '@/lib/timezones';
import { useTeams } from '@/queries/use-teams';
import {
  clearFollows,
  setAlert,
  setClock,
  setLanguage,
  setOnboarded,
  usePreferences,
  useZone,
} from '@/store/preferences';

export default function AccountSheetRoute() {
  const router = useRouter();
  const { copy, locale } = useI18n();
  const zone = useZone();
  const prefs = usePreferences();
  const teams = useTeams();

  /**
   * ⚠ Derived from the local follow list, not `GET /cronogol/me/feeds` — there is
   * no bearer in an anonymous v1. A per-club season feed is a PUBLIC URL that
   * needs no token and no creation, so there is nothing to list server-side.
   */
  const feeds: AccountFeed[] = useMemo(
    () =>
      prefs.followed.map((slug) => {
        const team = teams.data?.find((t) => t.slug === slug);
        return {
          slug,
          name: team ? displayName(team.name) : slug,
          url: clubFeedUrl(slug),
        };
      }),
    [prefs.followed, teams.data],
  );

  return (
    <AccountSheet
      copy={copy}
      locale={locale}
      clock={prefs.clock}
      zoneLabel={zoneLabel(zone, locale)}
      alerts={{
        reminder: prefs.alertReminder,
        moved: prefs.alertMoved,
        postponed: prefs.alertPostponed,
      }}
      feeds={feeds}
      onSetAlert={setAlert}
      onSetLanguage={setLanguage}
      onSetClock={setClock}
      onReplayOnboarding={() => {
        setOnboarded(false);
        router.dismissAll();
        router.replace('/onboarding/clubs');
      }}
      onTurnOffAlerts={() => {
        clearFollows();
        // ⚠ Also tell the server. Clearing local follows alone would leave this
        // device registered with its last club list and still receiving pushes.
        void disablePushForDevice();
        router.back();
      }}
    />
  );
}
