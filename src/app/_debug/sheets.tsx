/** Sheet previews, so a modal can be seen without completing the flow it sits behind. */
import { useState } from 'react';

import { CalendarSheet } from '@/components/organisms/calendar-sheet';
import { EmailAuthSheet, type EmailAuthMode } from '@/components/organisms/email-auth-sheet';
import { clubFeedUrl } from '@/lib/cronogol/feed';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function DebugSheets() {
  const { which, state } = useLocalSearchParams<{ which?: string; state?: string }>();
  const router = useRouter();
  const { copy } = useI18n();
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

  /**
   * The account sheet this used to fall through to is the Settings SCREEN now
   * (ADR 0208), previewed at `/_debug/settings`. The old links still land:
   * `?which=account-in` is the signed-in state, anything else signed out.
   */
  return <Redirect href={`/_debug/settings?state=${which === 'account-in' ? 'in' : 'out'}`} />;
}
