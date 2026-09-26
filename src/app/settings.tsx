/**
 * Settings (ADR 0208) — reached from the avatar in any tab's header. It
 * replaces the `(sheets)/account` formSheet: same stores, same handlers, a
 * pushed screen in Ed's Medina layout.
 *
 * ⚠ A PUSHED screen, not a sheet, because the page wears the reader's
 * background pick (`bdBg`) as its scene — the club page's scene for a club,
 * the league tabs' for a league, the lime glow for the brand default. On iOS 26
 * a sheet is system glass, which has no room for a scene behind it.
 *
 * ⚠ Sign out, Delete and Turn off alerts now STAY on the screen. On the sheet
 * they dismissed it; here the page re-renders into its new state, which is the
 * confirmation.
 *
 * ⚠ No `_layout.tsx` next to this: a route at the app root is pushed by the
 * ROOT stack over the tabs, like `club/[slug]` (ADR 0020). The sheets it opens
 * are declared in that root stack as well (ADR 0030).
 */
import * as Application from 'expo-application';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsScreen, type SettingsFeed } from '@/components/organisms/settings-screen';
import { BackgroundScene, backgroundTiles } from '@/components/templates/board-background';
import { Colors, Spacing } from '@/constants/theme';
import { AUTH_AVAILABLE } from '@/features/auth/capability';
import { useIdentityInitials } from '@/features/auth/use-identity';
import { stripOptions } from '@/features/board/background-options';
import { requestPushPermission } from '@/features/push/capability';
import { disablePushForDevice } from '@/features/push/sync';
import { usePushPermission } from '@/features/push/use-push-permission';
import { decodeBoardBackground } from '@/lib/board-background';
import { deleteAccount, NotSignedInError } from '@/lib/cronogol/account';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { clubFeedUrl } from '@/lib/cronogol/feed';
import { findLeague, leagueSceneLogo } from '@/lib/cronogol/leagues';
import { contactUrl, privacyUrl } from '@/lib/cronogol/site';
import { clubStanding, leagueOfClub } from '@/lib/cronogol/standings';
import { formatKickoffTime } from '@/lib/format';
import { hapticToggle } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n/use-i18n';
import { findTimezone, timezoneLabel, zoneAbbreviation } from '@/lib/timezones';
import { useAccount } from '@/queries/use-account';
import { useLeagueArtwork } from '@/queries/use-leagues';
import { useStandings } from '@/queries/use-standings';
import { useCanOpenClub, useTeams } from '@/queries/use-teams';
import { usePushSyncStatus } from '@/store/push-sync-status';
import { signOut, useSession } from '@/store/session';
import {
  clearFollows,
  setAlert,
  setBoardBackground,
  setClock,
  setLanguage,
  setOnboarded,
  setReminderLead,
  usePreferences,
  useZone,
} from '@/store/preferences';

/**
 * "2.4.0 (318)" — the marketing version and the build, from the NATIVE bundle.
 *
 * ⚠ Not `app.json`'s `version`: `eas.json` sets `appVersionSource: remote`, so
 * the number a build ships with is decided by EAS and lives only in the binary
 * (ADR 0210). Computed once — neither can change while the app runs.
 */
const VERSION = (() => {
  const version = Application.nativeApplicationVersion;
  const build = Application.nativeBuildVersion;
  if (!version) return null;
  return build ? `${version} (${build})` : version;
})();

export default function SettingsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, locale } = useI18n();
  const zone = useZone();
  const prefs = usePreferences();
  const teams = useTeams();
  const standings = useStandings();
  const artwork = useLeagueArtwork();
  const canOpenClub = useCanOpenClub();
  const session = useSession();
  const account = useAccount();
  const initials = useIdentityInitials();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const teamBySlug = useMemo(
    () => new Map((teams.data ?? []).map((team) => [team.slug, team])),
    [teams.data],
  );

  /**
   * The scene is the Board's background pick (ADR 0208). ⚠ A club the
   * catalogue cannot answer YET renders the lime glow and NEVER rewrites the
   * pick — a slow network must not destroy it (`BackgroundScene`'s rule).
   */
  const bgChoice = decodeBoardBackground(prefs.bdBg);
  const bgTeam = bgChoice.kind === 'club' ? (teamBySlug.get(bgChoice.slug) ?? null) : null;
  const bgLeague = bgChoice.kind === 'league' ? findLeague(bgChoice.slug) : undefined;

  const followedTeams = prefs.followed.flatMap((slug) => {
    const team = teamBySlug.get(slug);
    return team ? [team] : [];
  });

  /**
   * The favourite (ADR 0209), quoted the way the club hero quotes it — the
   * same `clubStanding`, so an incomplete table is not quoted here either
   * (trap 20). Without a quotable table the line falls back to the league's
   * name, and without a league to nothing.
   */
  const favouriteTeam = prefs.favourite ? teamBySlug.get(prefs.favourite) : undefined;
  const favourite = prefs.favourite
    ? (() => {
        const slug = prefs.favourite;
        const standing = clubStanding(standings.data?.tables, slug);
        return {
          name: favouriteTeam ? displayName(favouriteTeam.name) : slug,
          line: standing
            ? copy.club.rankLine(standing.league.name, standing.row.rank, standing.row.points)
            : (leagueOfClub(standings.data?.tables, slug)?.name ?? null),
          crest: favouriteTeam
            ? crestSrc(favouriteTeam.logoUrls, favouriteTeam.logoUrl, 'small')
            : null,
          abbr: favouriteTeam
            ? abbreviate(favouriteTeam.name, favouriteTeam.slug, favouriteTeam.shortName)
            : slug.slice(0, 3).toUpperCase(),
        };
      })()
    : null;

  /** The line under the alert switches (ADR 0079) — the sheet's rule, unchanged. */
  const syncStatus = usePushSyncStatus();

  /**
   * ⚠⚠ **The no-permission line OUTRANKS the sync report (ADR 0136).** The
   * registration lands without the banner permission, so "saved · 14:32" can
   * be true while iOS will never show a banner. Banner switches only: the goals
   * switch's Live Activity needs no permission. `'unknown'` (the first async
   * beat) renders the ordinary report — never flash the warning at readers who
   * granted.
   */
  const permission = usePushPermission();
  const bannerAlertsOn = prefs.alertReminder || prefs.alertMoved || prefs.alertPostponed;
  const permissionMissing =
    bannerAlertsOn && (permission === 'undetermined' || permission === 'denied');

  const alertsNote = permissionMissing
    ? copy.sheets.alertsNoPermission
    : syncStatus.at === null
      ? copy.sheets.alertsPendingNote
      : syncStatus.ok
        ? copy.sheets.alertsSynced(formatKickoffTime(syncStatus.at, zone, prefs.clock))
        : copy.sheets.alertsSyncFailed;

  /** The unspent prompt, or Settings once it was spent (ADR 0136). */
  const onAlertsNotePress = permissionMissing
    ? () => {
        if (permission === 'undetermined') void requestPushPermission();
        else void Linking.openSettings();
      }
    : undefined;

  /**
   * ⚠ Flipping a BANNER switch on while the one system prompt is unspent asks
   * right there (ADR 0024, completed by 0136); a fresh denial turns the switch
   * back off. `alertGoals` never prompts — cards deliver without it.
   */
  const handleSetAlert: typeof setAlert = (key, value) => {
    setAlert(key, value);
    if (!value || key === 'alertGoals' || permission !== 'undetermined') return;
    void requestPushPermission().then((outcome) => {
      if (outcome === 'denied') setAlert(key, false);
    });
  };

  /**
   * ⚠ From the local follow list, not `GET /cronogol/me/feeds`, even signed in:
   * a per-club season feed is a PUBLIC URL built from the slug, and this app has
   * never created a claimed feed (ADR 0038).
   */
  const feeds: SettingsFeed[] = prefs.followed.map((slug) => {
    const team = teamBySlug.get(slug);
    return {
      slug,
      name: team ? displayName(team.name) : slug,
      url: clubFeedUrl(slug),
      crest: team ? crestSrc(team.logoUrls, team.logoUrl, 'small') : null,
      abbr: team ? abbreviate(team.name, team.slug, team.shortName) : slug.slice(0, 3),
    };
  });

  const follows = prefs.followed.map((slug) => {
    const team = teamBySlug.get(slug);
    return {
      key: slug,
      label: team ? displayName(team.name) : slug,
      crest: team ? crestSrc(team.logoUrls, team.logoUrl, 'xsmall') : null,
      crestFallback: team ? abbreviate(team.name, team.slug, team.shortName) : slug.slice(0, 3),
      // ⚠ Only a club with a page to open is a link (`useCanOpenClub`).
      onPress: canOpenClub(slug)
        ? () => router.push({ pathname: '/club/[slug]', params: { slug } })
        : undefined,
    };
  });

  /**
   * "Your time · EDT" while the zone follows the device — the mock's wording
   * — or the picked zone's own label, which names a place.
   */
  const zoneValue =
    prefs.tz === null
      ? copy.settings.yourTime(zoneAbbreviation(zone))
      : timezoneLabel(findTimezone(prefs.tz), locale);

  return (
    <View style={styles.screen}>
      <BackgroundScene
        team={bgTeam}
        league={bgLeague}
        leagueLogo={bgLeague ? leagueSceneLogo(artwork.data, bgLeague.apiSlug) : null}
      />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.six },
        ]}>
        <SettingsScreen
          copy={copy}
          locale={locale}
          clock={prefs.clock}
          onBack={() => router.back()}
          /**
           * ⚠ Keyed off the SESSION, not `account.data`: the query takes a round
           * trip, and gating on it would flash the signed-out header — Sign in
           * button and all — at somebody already signed in.
           */
          account={
            session
              ? {
                  name: account.data?.displayName ?? null,
                  email: account.data?.email ?? session.email,
                }
              : null
          }
          initials={initials}
          canSignIn={AUTH_AVAILABLE}
          onSignIn={() => router.push('/(sheets)/sign-in')}
          onEditProfile={() => router.push('/(sheets)/edit-profile')}
          favourite={favourite}
          onChooseFavourite={() => router.push('/(sheets)/favourite-club')}
          follows={follows}
          onAddFollow={() => router.navigate('/clubs')}
          alerts={{
            reminder: prefs.alertReminder,
            moved: prefs.alertMoved,
            postponed: prefs.alertPostponed,
            goals: prefs.alertGoals,
            leads: prefs.reminderLeads,
          }}
          onSetAlert={handleSetAlert}
          onSetReminderLead={setReminderLead}
          alertsNote={alertsNote}
          onAlertsNotePress={onAlertsNotePress}
          onTurnOffAlerts={() => {
            clearFollows();
            // ⚠ Also tell the server: clearing local follows alone would leave
            // this device registered with its last club list, still receiving.
            void disablePushForDevice();
          }}
          backgroundTiles={backgroundTiles({
            options: stripOptions(copy.board.backgroundDefault, prefs.bdBg, followedTeams, bgTeam),
            moreLabel: copy.board.more,
            tileLabel: copy.board.backgroundTile,
            onPick: (id) => {
              void hapticToggle();
              setBoardBackground(id);
            },
            onMore: () => router.push('/(sheets)/board-background'),
          })}
          onSetLanguage={setLanguage}
          onSetClock={setClock}
          zoneValue={zoneValue}
          onChooseZone={() => router.push('/(sheets)/time-zone')}
          feeds={feeds}
          onPrivacy={() => void Linking.openURL(privacyUrl(locale))}
          onHelp={() => void Linking.openURL(contactUrl(locale))}
          onReplayOnboarding={() => {
            setOnboarded(false);
            router.dismissAll();
            router.replace('/onboarding/welcome');
          }}
          version={VERSION}
          onSignOut={() => {
            // ⚠ Does NOT touch `followed` or the push registration: alerts are
            // device state and survive sign-out by design (ADR 0019).
            void signOut();
          }}
          deletingAccount={deleting}
          deleteAccountError={deleteError}
          onDeleteAccount={() => {
            /**
             * ⚠ Fired on the SECOND press; the organism owns the confirm. Alerts
             * on this device are left running — the server detaches the
             * registration (`ON DELETE SET NULL`) rather than deleting it.
             */
            if (deleting) return;
            setDeleting(true);
            setDeleteError(null);
            void deleteAccount()
              .then(() => signOut())
              .catch((cause) => {
                /**
                 * ⚠ **Do NOT sign out on a failure** — it would look exactly like
                 * success. The one exception is a session already dead: there is
                 * nothing to stay signed in to.
                 */
                if (cause instanceof NotSignedInError) {
                  void signOut();
                  return;
                }
                setDeleteError(copy.account.deleteAccountFailed);
              })
              .finally(() => setDeleting(false));
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five },
});
