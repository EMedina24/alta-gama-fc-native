/**
 * The reader's initials for the account avatar, or `null` when signed out.
 *
 * ⚠ This is the product answer HANDOFF front-end §5 was waiting on. `AvatarButton`
 * shipped rendering `initials=""` because an anonymous v1 had no name to derive
 * one from; an account supplies one, and the signed-out case keeps a neutral mark
 * rather than an empty circle.
 *
 * ⚠ Falls back to the EMAIL's local part, which matters more here than it would
 * on the web: Apple hands over a name only on the very first authorization, so a
 * reader whose account predates that write — or who used Hide My Email — has an
 * address and nothing else.
 */
import { initials } from '@/lib/format';
import { useAccount } from '@/queries/use-account';
import { useSession } from '@/store/session';

export function useIdentityInitials(): string | null {
  const session = useSession();
  const account = useAccount();

  if (!session) return null;

  const name = account.data?.displayName;
  if (name) return initials(name);

  const email = account.data?.email ?? session.email;
  // ⚠ The local part, not the whole address — `initials()` splits on whitespace
  // and would return the first two characters of the domain for anything with a
  // dot in it. `fan@example.com` → `FA`.
  const local = email?.split('@')[0];
  if (local) return initials(local.replace(/[._-]+/g, ' '));

  // Signed in, but nothing to name them by yet — the account query has not landed.
  return null;
}
