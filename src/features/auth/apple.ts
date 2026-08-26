/**
 * Sign in with Apple.
 *
 * ⚠ **Native, so none of Apple's OAuth apparatus applies.** No Services ID, no
 * `.p8`, no secret on a rotation schedule, no redirect URL — those are web-flow
 * requirements, and the cost objection recorded across the backend docs was
 * about them. All Supabase needs is the bundle id listed under *Client IDs*.
 *
 * ⚠ Guideline 4.8: this exists because Google does. If the Google button ever
 * ships without this one, review rejects the build.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { digestStringAsync, CryptoDigestAlgorithm, randomUUID } from 'expo-crypto';

import { supabase } from '@/lib/supabase/client';
import { getAccount, patchAccount } from '@/lib/cronogol/account';

/**
 * Apple's name parts, as one string.
 *
 * ⚠ Both halves are independently nullable and a name may legitimately be one
 * part. Returns `undefined` rather than an empty string so the caller can omit
 * the field entirely — `displayName: ""` fails the backend's `/\S/` check and
 * 400s the whole save.
 */
function fullName(name: AppleAuthentication.AppleAuthenticationFullName | null): string | undefined {
  if (!name) return undefined;
  const joined = [name.givenName, name.familyName].filter(Boolean).join(' ').trim();
  return joined === '' ? undefined : joined;
}

export async function signInWithApple(): Promise<void> {
  if (!supabase) throw new Error('Auth is not configured');

  /**
   * ⚠ **Hashed to Apple, raw to Supabase.** Apple copies the value it is given
   * into the identity token's `nonce` claim verbatim; Supabase hashes what we
   * send it and compares. Sending the same string to both means the comparison
   * fails, and sending the raw one to Apple puts it in a token in plain text.
   *
   * Hex, not base64: `digestStringAsync` defaults to hex and that is what
   * Supabase computes.
   */
  const rawNonce = randomUUID();
  const hashedNonce = await digestStringAsync(CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  // Documented as optional on the credential. There is nothing to exchange
  // without it, and it has never been observed absent on a successful sign-in.
  if (!credential.identityToken) throw new Error('Apple returned no identity token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  /**
   * ⚠⚠ **This is the ONLY chance to keep the user's name, ever.**
   *
   * Apple returns `fullName` on the FIRST authorization for this Apple ID and
   * this app, and never again — and the identity token carries no name claim, so
   * Supabase never sees it either. Every later sign-in returns `null` here. If
   * this write does not happen now the account is permanently nameless, short of
   * the user revoking the app in Settings → Apple ID → Sign in with Apple.
   *
   * ⚠ Deliberately NOT awaited into the sign-in's failure path. The session is
   * already valid at this point; failing the whole sign-in over a name would be
   * the worse outcome, and the sheet reads the account back from
   * `GET /cronogol/me` regardless.
   *
   * ⚠⚠ **The account is READ FIRST, and that is not a nicety.**
   *
   * "First authorization" is once per Apple ID **per app** — NOT once per
   * account. Anyone who signed up on `altagamafc.com` and then signs in here for
   * the first time lands in this branch against an account that is months old,
   * because Supabase links the Apple identity to the existing user by matching
   * verified email. Confirmed on device 2026-08-26: the first real Apple sign-in
   * returned a profile carrying a `timeZone` this app never writes.
   *
   * Two things follow, and both are silent data loss if you skip the read:
   *
   * - `notifyFixtureChanges` is REQUIRED by the DTO (an absent one is a 400), so
   *   a value must be sent. Sending `false` blind switches off the fixture-change
   *   emails a web user had opted into, invisibly, from a sign-in they expected
   *   to change nothing. It must be echoed back, never assumed.
   * - A `displayName` the user already chose is **theirs** — the backend stops
   *   re-deriving it from the provider precisely so it survives later sign-ins.
   *   Overwriting it with Apple's version would undo that.
   *
   * ⚠ On a read failure this writes NOTHING and the name is lost for good. That
   * is the deliberate side to fail on: a lost name is visible and the user can
   * live with it, whereas a silently disabled notification opt-in is neither.
   *
   * ⚠ Deliberately NOT awaited into the sign-in's failure path. The session is
   * already valid at this point; failing the whole sign-in over a name would be
   * the worse outcome, and the sheet reads the account back from
   * `GET /cronogol/me` regardless.
   */
  const name = fullName(credential.fullName);
  if (!name) return;

  try {
    const account = await getAccount();
    // Already named — by the user, or by a previous provider sign-in. Leave it.
    if (account.displayName) return;

    await patchAccount({
      notifyFixtureChanges: account.notifyFixtureChanges,
      displayName: name,
    });
  } catch {
    // See the read-failure note above: losing the name beats corrupting the opt-in.
  }
}
