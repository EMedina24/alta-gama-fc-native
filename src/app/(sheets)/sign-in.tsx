/** Sign in — Apple or Google. Reached from the account sheet. */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { SignInSheet } from '@/components/organisms/sign-in-sheet';
import { signInWithApple } from '@/features/auth/apple';
import { appleAvailable as probeApple } from '@/features/auth/capability';
import { classifyAuthError, type AuthFailure } from '@/features/auth/errors';
import { signInWithGoogle } from '@/features/auth/google';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { Copy } from '@/lib/i18n/copy';

function message(copy: Copy, failure: AuthFailure): string | null {
  switch (failure) {
    // ⚠ Not an error. A user opening the Apple sheet and dismissing it is the
    // single most common outcome here; a red line under it would be a lie.
    case 'cancelled':
      return null;
    case 'rejected':
      return copy.auth.errorRejected;
    case 'rateLimited':
      return copy.auth.errorRateLimited;
    case 'unavailable':
      return copy.auth.errorUnavailable;
    default:
      return copy.auth.errorUnknown;
  }
}

export default function SignInSheetRoute() {
  const router = useRouter();
  const { copy } = useI18n();

  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⚠ Async, so the button cannot be drawn from a constant. It is false on a
  // simulator with no Apple ID signed in, and tapping a button that throws is
  // worse than not drawing one.
  useEffect(() => {
    let alive = true;
    void probeApple().then((ok) => {
      if (alive) setApple(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * ⚠ The sheet is dismissed on SUCCESS only, and by this route rather than by
   * the provider modules. A failed sign-in must leave the sheet up with its
   * message — closing it would drop the reader back on Today with no idea
   * anything went wrong.
   */
  async function run(sign: () => Promise<boolean>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // ⚠ `false` is "the reader backed out" — no session, but no error either,
      // so the sheet stays put and says nothing. Google reports a dismissed
      // browser this way rather than throwing; Apple throws instead, and
      // `classifyAuthError` maps that to the same silent outcome.
      if (await sign()) router.back();
    } catch (cause) {
      setError(message(copy, classifyAuthError(cause)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SignInSheet
      copy={copy}
      appleAvailable={apple}
      busy={busy}
      error={error}
      onApple={() =>
        void run(async () => {
          await signInWithApple();
          return true;
        })
      }
      onGoogle={() => void run(signInWithGoogle)}
      onClose={() => router.back()}
    />
  );
}
