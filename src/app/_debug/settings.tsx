/**
 * Settings preview (ADR 0208) — the real organism over the real scene, with a
 * STUB identity, so the signed-in half can be seen without an account.
 *
 * - `?state=in` — signed in as a stub (name, email, favourite, account card).
 *   `out` (the default) is the signed-out header with its Sign in button.
 * - `?bg=club:barcelona` / `league:la-liga` / `default` — the scene, without
 *   touching the reader's own `bdBg`. The strip's taps change it LOCALLY.
 * - `?y=900` — opens scrolled that far, so the lower groups can be
 *   screenshotted from a deep link, with no synthetic swipe.
 *
 * ⚠ The follows, the favourite and the feeds are stubs resolved against the
 * live catalogue, so the crests are real; nothing here writes a preference.
 * The alert switches and the language / clock controls are the real ones.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsScreen } from '@/components/organisms/settings-screen';
import { BackgroundScene, backgroundTiles } from '@/components/templates/board-background';
import { Colors, Spacing } from '@/constants/theme';
import { stripOptions } from '@/features/board/background-options';
import { decodeBoardBackground, parseBoardBackground } from '@/lib/board-background';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { clubFeedUrl } from '@/lib/cronogol/feed';
import { findLeague, leagueSceneLogo } from '@/lib/cronogol/leagues';
import { initials } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { zoneAbbreviation } from '@/lib/timezones';
import { useLeagueArtwork } from '@/queries/use-leagues';
import { useTeams } from '@/queries/use-teams';
import {
  setAlert,
  setClock,
  setLanguage,
  setReminderLead,
  usePreferences,
  useZone,
} from '@/store/preferences';

/** The stub's follows — a LaLiga pair and a Premier League club. */
const STUB_FOLLOWS = ['barcelona', 'real-madrid', 'arsenal'];
const STUB_NAME = 'Alicia Álvarez';

export default function DebugSettings() {
  const { state, bg, y } = useLocalSearchParams<{ state?: string; bg?: string; y?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, locale } = useI18n();
  const zone = useZone();
  const prefs = usePreferences();
  const teams = useTeams();
  const artwork = useLeagueArtwork();
  /**
   * A tile tapped HERE, scoped to the `bg` it was tapped under. ⚠ Not a
   * `useState(() => bg)` initialiser: a second deep link with a new `bg` lands
   * on the SAME mounted route, and an initialiser would keep the first scene.
   */
  const [picked, setPicked] = useState<{ from: string | undefined; id: string } | null>(null);
  const bdBg =
    picked && picked.from === bg ? picked.id : parseBoardBackground(bg ?? prefs.bdBg);
  const signedIn = state === 'in';

  const team = (slug: string) => teams.data?.find((t) => t.slug === slug);
  const choice = decodeBoardBackground(bdBg);
  const bgTeam = choice.kind === 'club' ? (team(choice.slug) ?? null) : null;
  const bgLeague = choice.kind === 'league' ? findLeague(choice.slug) : undefined;
  const followedTeams = STUB_FOLLOWS.flatMap((slug) => {
    const hit = team(slug);
    return hit ? [hit] : [];
  });
  const barca = team('barcelona');

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      <BackgroundScene
        team={bgTeam}
        league={bgLeague}
        leagueLogo={bgLeague ? leagueSceneLogo(artwork.data, bgLeague.apiSlug) : null}
      />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentOffset={{ x: 0, y: Number(y) || 0 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.five,
          paddingTop: insets.top + Spacing.two,
          paddingBottom: insets.bottom + Spacing.six,
        }}>
        <SettingsScreen
          copy={copy}
          locale={locale}
          clock={prefs.clock}
          onBack={() => router.back()}
          account={signedIn ? { name: STUB_NAME, email: 'fan@example.com' } : null}
          // ⚠ Derived with the real helper, not typed as 'AÁ'.
          initials={signedIn ? initials(STUB_NAME) : null}
          canSignIn
          onSignIn={() => {}}
          onEditProfile={() => {}}
          favourite={
            signedIn
              ? {
                  name: barca ? displayName(barca.name) : 'Barcelona',
                  line: copy.club.rankLine('LaLiga', 1, 21),
                  crest: barca ? crestSrc(barca.logoUrls, barca.logoUrl, 'small') : null,
                  abbr: 'BAR',
                }
              : null
          }
          onChooseFavourite={() => {}}
          follows={STUB_FOLLOWS.map((slug) => {
            const hit = team(slug);
            return {
              key: slug,
              label: hit ? displayName(hit.name) : slug,
              crest: hit ? crestSrc(hit.logoUrls, hit.logoUrl, 'xsmall') : null,
              crestFallback: hit ? abbreviate(hit.name, hit.slug, hit.shortName) : slug.slice(0, 3),
              onPress: () => {},
            };
          })}
          onAddFollow={() => {}}
          alerts={{
            reminder: prefs.alertReminder,
            moved: prefs.alertMoved,
            postponed: prefs.alertPostponed,
            goals: prefs.alertGoals,
            leads: prefs.reminderLeads,
          }}
          onSetAlert={setAlert}
          onSetReminderLead={setReminderLead}
          // ⚠ No registration behind the preview; the "never" line is honest.
          alertsNote={copy.sheets.alertsPendingNote}
          onTurnOffAlerts={() => {}}
          backgroundTiles={backgroundTiles({
            options: stripOptions(copy.board.backgroundDefault, bdBg, followedTeams, bgTeam),
            moreLabel: copy.board.more,
            tileLabel: copy.board.backgroundTile,
            onPick: (id) => setPicked({ from: bg, id }),
            onMore: () => {},
          })}
          onSetLanguage={setLanguage}
          onSetClock={setClock}
          zoneValue={copy.settings.yourTime(zoneAbbreviation(zone))}
          onChooseZone={() => {}}
          feeds={STUB_FOLLOWS.slice(0, 2).map((slug) => ({
            slug,
            name: team(slug) ? displayName(team(slug)!.name) : slug,
            url: clubFeedUrl(slug),
            crest: null,
            abbr: slug.slice(0, 3).toUpperCase(),
          }))}
          onPrivacy={() => {}}
          onHelp={() => {}}
          onReplayOnboarding={() => {}}
          version="2.4.0 (318)"
          onSignOut={() => {}}
          onDeleteAccount={() => {}}
          deletingAccount={false}
          deleteAccountError={null}
        />
      </ScrollView>
    </View>
  );
}
