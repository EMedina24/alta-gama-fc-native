/**
 * Email/password sign-in (ADR 0103). Reached from the sign-in sheet.
 *
 * The flow logic mirrors the web's `auth-form.tsx`:
 * - A sign-up with confirmations on returns NO session — that is SUCCESS, and
 *   it renders `confirmSent` with a resend button, never an error.
 * - Signing in before confirming branches (`isUnconfirmed`) to a neutral
 *   notice + resend, never a red "wrong password".
 * - The resend button locks for 60 seconds — Supabase's per-address window;
 *   a send inside it fails with nothing worth showing.
 * - A reset request answers with ONE notice whether the address has an
 *   account or not, and its rejection is swallowed on purpose — a response
 *   that differs for an unknown address enumerates accounts.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { EmailAuthSheet, type EmailAuthMode } from '@/components/organisms/email-auth-sheet';
import {
  classifyAuthError,
  emailAuthCode,
  isUnconfirmed,
  type EmailAuthCode,
} from '@/features/auth/errors';
import {
  requestPasswordReset,
  resendConfirmation,
  signInWithPassword,
  signUpWithPassword,
} from '@/features/auth/password';
import type { Copy } from '@/lib/i18n/copy';
import { useI18n } from '@/lib/i18n/use-i18n';

/** ⚠ Supabase's own per-address window. Shorter and the retry fails silently. */
const RESEND_LOCK_MS = 60_000;

function message(copy: Copy, cause: unknown): string {
  const code = emailAuthCode(cause);
  if (code) {
    const table: Record<EmailAuthCode, string> = {
      invalid_credentials: copy.emailAuth.errorInvalidCredentials,
      email_not_confirmed: copy.emailAuth.errorNotConfirmed,
      user_already_exists: copy.emailAuth.errorUserExists,
      weak_password: copy.emailAuth.errorWeakPassword,
      same_password: copy.emailAuth.errorSamePassword,
      email_address_invalid: copy.emailAuth.errorEmailInvalid,
      validation_failed: copy.emailAuth.errorValidation,
      signup_disabled: copy.emailAuth.errorSignupDisabled,
      email_provider_disabled: copy.emailAuth.errorEmailDisabled,
    };
    return table[code];
  }
  switch (classifyAuthError(cause)) {
    case 'rateLimited':
      return copy.auth.errorRateLimited;
    case 'unavailable':
      return copy.auth.errorUnavailable;
    case 'rejected':
      return copy.auth.errorRejected;
    default:
      return copy.auth.errorUnknown;
  }
}

export default function EmailSignInRoute() {
  const router = useRouter();
  const { copy, locale } = useI18n();

  const [mode, setMode] = useState<EmailAuthMode>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendLocked, setResendLocked] = useState(false);

  const resendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (resendTimer.current) clearTimeout(resendTimer.current);
    },
    [],
  );

  function lockResend() {
    setResendLocked(true);
    if (resendTimer.current) clearTimeout(resendTimer.current);
    resendTimer.current = setTimeout(() => setResendLocked(false), RESEND_LOCK_MS);
  }

  function report(cause: unknown) {
    // The diagnosis belongs in the console; the mapped copy on the screen.
    if (__DEV__) console.error('[email-auth]', cause);
    setError(message(copy, cause));
  }

  /**
   * Pops this sheet AND the sign-in sheet behind it — the account sheet under
   * both re-renders signed-in off the session store on its own
   * (`onAuthStateChange` already fired by the time the promise resolves).
   */
  function dismissAll() {
    router.dismiss(2);
  }

  async function submit(email: string, password: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
        dismissAll();
      } else {
        const signedIn = await signUpWithPassword(email, password, locale);
        if (signedIn) {
          // Autoconfirm — production never runs it, but it is a signed-in user.
          dismissAll();
          return;
        }
        // ⚠ No session is SUCCESS: the confirmation mail is on its way.
        setNotice(copy.emailAuth.confirmSent);
        setCanResend(true);
        lockResend();
      }
    } catch (cause) {
      if (isUnconfirmed(cause)) {
        // A user who did everything right, one step early. Neutral, with the fix.
        setNotice(copy.emailAuth.confirmFirst);
        setCanResend(true);
      } else {
        report(cause);
      }
    } finally {
      setBusy(false);
    }
  }

  async function resend(email: string) {
    if (busy || resendLocked) return;
    // Lock BEFORE the call — the window is Supabase's, not ours, and a second
    // tap during the request would burn it.
    lockResend();
    try {
      await resendConfirmation(email, locale);
      setError(null);
      setNotice(copy.emailAuth.resent);
    } catch (cause) {
      report(cause);
    }
  }

  async function forgot(email: string) {
    if (busy) return;
    if (!email) {
      setError(copy.emailAuth.emailFirst);
      return;
    }
    setError(null);
    // ⚠ A resend button under the reset notice would offer the WRONG mail.
    setCanResend(false);
    try {
      await requestPasswordReset(email, locale);
    } catch (cause) {
      // Deliberately swallowed — the notice below must not depend on the outcome.
      if (__DEV__) console.error('[email-auth]', cause);
    } finally {
      setNotice(copy.emailAuth.resetSent);
    }
  }

  return (
    <EmailAuthSheet
      copy={copy}
      mode={mode}
      onMode={(next) => {
        setMode(next);
        setError(null);
        setNotice(null);
        setCanResend(false);
      }}
      busy={busy}
      error={error}
      notice={notice}
      canResend={canResend}
      resendLocked={resendLocked}
      onSubmit={(email, password) => void submit(email, password)}
      onResend={(email) => void resend(email)}
      onForgotPassword={(email) => void forgot(email)}
      onClose={() => router.back()}
    />
  );
}
