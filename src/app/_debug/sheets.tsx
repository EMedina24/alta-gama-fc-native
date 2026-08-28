/** Sheet previews, so a modal can be seen without completing the flow it sits behind. */
import { AccountSheet } from '@/components/organisms/account-sheet';
import { CalendarSheet } from '@/components/organisms/calendar-sheet';
import { clubFeedUrl } from '@/lib/cronogol/feed';
import { useI18n } from '@/lib/i18n/use-i18n';
import { zoneLabel } from '@/lib/timezones';
import {
  setAlert,
  setClock,
  setLanguage,
  setReminderLead,
  usePreferences,
  useZone,
} from '@/store/preferences';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function DebugSheets() {
  const { which } = useLocalSearchParams<{ which?: string }>();
  const router = useRouter();
  const { copy, locale } = useI18n();
  const zone = useZone();
  const prefs = usePreferences();

  if (which === 'calendar') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.dark.card }}>
        <CalendarSheet
          title={copy.sheets.calendarTitle('Barcelona')}
          body={copy.sheets.calendarBody}
          feedUrl={clubFeedUrl('barcelona')}
          copy={copy.sheets}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.card }}>
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
        feeds={[
          { slug: 'barcelona', name: 'Barcelona', url: clubFeedUrl('barcelona') },
          { slug: 'valencia', name: 'Valencia', url: clubFeedUrl('valencia') },
        ]}
        onSetAlert={setAlert}
        onSetReminderLead={setReminderLead}
        onSetLanguage={setLanguage}
        onSetClock={setClock}
        /**
         * ⚠ `?which=account-in` previews the SIGNED-IN sheet with a stub identity.
         * The two states differ by an identity block, a Sign in row and two footer
         * buttons, and the signed-in one is the harder to reach by hand — it needs a
         * real Apple ID and a real first authorization.
         */
        account={
          which === 'account-in' ? { name: 'Alicia Álvarez', email: 'fan@example.com' } : null
        }
        canSignIn
        onSignIn={() => {}}
        onSignOut={() => {}}
        onDeleteAccount={() => {}}
        deletingAccount={false}
        deleteAccountError={null}
        onReplayOnboarding={() => {}}
        onTurnOffAlerts={() => {}}
        onClose={() => router.back()}
      />
    </View>
  );
}
