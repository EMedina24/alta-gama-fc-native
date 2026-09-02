/** Sheet previews, so a modal can be seen without completing the flow it sits behind. */
import { useState } from 'react';

import { AccountSheet } from '@/components/organisms/account-sheet';
import { CalendarSheet } from '@/components/organisms/calendar-sheet';
import { EmailAuthSheet, type EmailAuthMode } from '@/components/organisms/email-auth-sheet';
import { clubFeedUrl } from '@/lib/cronogol/feed';
import { initials } from '@/lib/format';
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
  const { which, state } = useLocalSearchParams<{ which?: string; state?: string }>();
  const router = useRouter();
  const { copy, locale } = useI18n();
  const zone = useZone();
  const prefs = usePreferences();
  // For `?which=email-auth` — a live mode switch, the rest of the app unwired.
  const [emailMode, setEmailMode] = useState<EmailAuthMode>('signin');

  /**
   * ⚠ `?which=email-auth` previews the email/password form (ADR 0103). The
   * `state` param reaches the outcomes that are hard to produce by hand:
   * `notice` (confirmation sent, resend locked), `resend` (unconfirmed
   * account, resend armed), `error` (the merged wrong-credential line).
   */
  if (which === 'email-auth') {
    const preview =
      state === 'error'
        ? { error: copy.emailAuth.errorInvalidCredentials, notice: null, canResend: false, resendLocked: false }
        : state === 'notice'
          ? { error: null, notice: copy.emailAuth.confirmSent, canResend: true, resendLocked: true }
          : state === 'resend'
            ? { error: null, notice: copy.emailAuth.confirmFirst, canResend: true, resendLocked: false }
            : { error: null, notice: null, canResend: false, resendLocked: false };
    return (
      // `sheetGround`, not `card`: the organism's sticky bar paints sheetGround
      // and a mismatched ground would show at its edges.
      <View style={{ flex: 1, backgroundColor: Colors.dark.sheetGround }}>
        <EmailAuthSheet
          copy={copy}
          mode={emailMode}
          onMode={setEmailMode}
          busy={false}
          {...preview}
          onSubmit={() => {}}
          onResend={() => {}}
          onForgotPassword={() => {}}
          onClose={() => router.back()}
        />
      </View>
    );
  }

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
        // ⚠ The gallery has no registration behind it; the "never" line is honest.
        alertsNote={copy.sheets.alertsPendingNote}
        alerts={{
          reminder: prefs.alertReminder,
          moved: prefs.alertMoved,
          postponed: prefs.alertPostponed,
        goals: prefs.alertGoals,
          leads: prefs.reminderLeads,
        }}
        // ⚠ `crest: null` on purpose. There is no club catalogue behind this
        // preview, and the monogram fallback is the harder state to reach by
        // hand anyway — a hot-linked crest that 404s looks exactly like this.
        feeds={[
          { slug: 'barcelona', name: 'Barcelona', url: clubFeedUrl('barcelona'), crest: null, abbr: 'BAR' },
          { slug: 'valencia', name: 'Valencia', url: clubFeedUrl('valencia'), crest: null, abbr: 'VAL' },
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
        // ⚠ Derived from the stub with the real helper, not typed as 'AÁ' — the
        // hook the app uses reads the live session, which is signed out here.
        initials={which === 'account-in' ? initials('Alicia Álvarez') : null}
        canSignIn
        onSignIn={() => {}}
        onSignOut={() => {}}
        onDeleteAccount={() => {}}
        deletingAccount={false}
        deleteAccountError={null}
        onReplayOnboarding={() => {}}
        onTurnOffAlerts={() => {}}
        onContactUs={() => {}}
        onClose={() => router.back()}
      />
    </View>
  );
}
