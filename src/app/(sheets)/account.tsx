/** Account. Reached from the avatar in any tab's header. */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { AccountSheet, type AccountFeed } from '@/components/organisms/account-sheet';
import { AUTH_AVAILABLE } from '@/features/auth/capability';
import { disablePushForDevice } from '@/features/push/sync';
import { deleteAccount, NotSignedInError } from '@/lib/cronogol/account';
import { displayName } from '@/lib/cronogol/derive';
import { clubFeedUrl } from '@/lib/cronogol/feed';
import { useI18n } from '@/lib/i18n/use-i18n';
import { zoneLabel } from '@/lib/timezones';
import { useAccount } from '@/queries/use-account';
import { useTeams } from '@/queries/use-teams';
import { signOut, useSession } from '@/store/session';
import {
  clearFollows,
  setAlert,
  setClock,
  setLanguage,
  setOnboarded,
  setReminderLead,
  usePreferences,
  useZone,
} from '@/store/preferences';

export default function AccountSheetRoute() {
  const router = useRouter();
  const { copy, locale } = useI18n();
  const zone = useZone();
  const prefs = usePreferences();
  const teams = useTeams();
  const session = useSession();
  const account = useAccount();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /**
   * ⚠ Derived from the local follow list, not `GET /cronogol/me/feeds` — even
   * signed in. A per-club season feed is a PUBLIC URL that needs no token and no
   * creation, and this app has never created a CLAIMED feed, so the account's
   * server-side feed list is empty and always would be. Listing it would show a
   * signed-in reader nothing while they follow five clubs (ADR 0038).
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
        goals: prefs.alertGoals,
        leads: prefs.reminderLeads,
      }}
      feeds={feeds}
      onSetAlert={setAlert}
      onSetReminderLead={setReminderLead}
      onSetLanguage={setLanguage}
      onSetClock={setClock}
      /**
       * ⚠ Keyed off the SESSION, not off `account.data`. The query takes a round
       * trip to land, and gating on it would flash the signed-out slot — with its
       * Sign in button — at somebody who is already signed in. The email falls
       * back to the JWT's copy only until `/cronogol/me` answers.
       */
      account={
        session
          ? {
              name: account.data?.displayName ?? null,
              email: account.data?.email ?? session.email,
            }
          : null
      }
      canSignIn={AUTH_AVAILABLE}
      onSignIn={() => router.push('/(sheets)/sign-in')}
      onSignOut={() => {
        // ⚠ Does NOT touch `followed` or the push registration. Alerts are device
        // state and survive sign-out by design (ADR 0019) — wiping them here
        // would silently unsubscribe the reader from everything they follow.
        void signOut();
        router.back();
      }}
      deletingAccount={deleting}
      deleteAccountError={deleteError}
      onDeleteAccount={() => {
        /**
         * ⚠ Fired on the SECOND press; the sheet owns the confirm.
         *
         * ⚠ Alerts on this device are deliberately left running. The server
         * detaches the registration rather than deleting it (`user_id` is
         * `ON DELETE SET NULL`), precisely so deleting an account does not
         * silently kill a device's notifications. "Turn off alerts" above is the
         * control for that, and it stays reachable signed out.
         */
        if (deleting) return;
        setDeleting(true);
        setDeleteError(null);
        void deleteAccount()
          .then(async () => {
            await signOut();
            router.back();
          })
          .catch((cause) => {
            /**
             * ⚠ **Do NOT sign out here.** A failed delete leaves the account
             * alive, and signing the reader out would look exactly like success —
             * they would believe their data was gone when it is not. The one
             * exception is a session that was already dead: there is nothing to
             * stay signed in to, and the delete is moot.
             */
            if (cause instanceof NotSignedInError) {
              void signOut();
              router.back();
              return;
            }
            setDeleteError(copy.account.deleteAccountFailed);
          })
          .finally(() => setDeleting(false));
      }}
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
      onClose={() => router.back()}
    />
  );
}
