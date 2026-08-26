/**
 * The signed-in account.
 *
 * ⚠ `feed` cadence rather than `catalogue`: `displayName` and `pendingEmail`
 * change because the user just changed them, and a day-long `staleTime` would
 * show the old name back to whoever made the edit.
 *
 * ⚠ **Disabled while signed out**, so the sheet renders its signed-out state
 * from `session === null` instead of from a query that would 401 on every mount.
 */
import { useQuery } from '@tanstack/react-query';

import { getAccount, NotSignedInError } from '@/lib/cronogol/account';
import { useSession } from '@/store/session';
import { keys } from './keys';
import { STALE } from './stale';

export function useAccount() {
  const session = useSession();

  return useQuery({
    queryKey: keys.account(session?.userId ?? 'anonymous'),
    queryFn: getAccount,
    enabled: session !== null,
    staleTime: STALE.feed,
    /**
     * ⚠ `withAuth` already refreshed once and signed out before throwing this.
     * Retrying would re-run that whole dance against a session that is provably
     * gone. (The client's global predicate stops 4xx retries; this catches the
     * case that never reaches an HTTP status.)
     */
    retry: (count, error) => !(error instanceof NotSignedInError) && count < 2,
  });
}
