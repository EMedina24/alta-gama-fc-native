# 0019 — Anonymous v1: follows are device-keyed, accounts designed-for

- **Date:** 2026-08-24
- **Status:** Superseded by [0038](./0038-accounts-apple-and-google.md)
- **Decided by:** Ed Medina

## Context
The design's account sheet shows an identity, sign-out and delete-account. All
three need `GET /cronogol/me` and a Supabase bearer.

But the backend's push registration is **anonymous-first**: `PUT
/cronogol/push/device` takes an APNs token and a `clubSlugs` array with no auth
at all, and the per-club `.ics` feed is a public URL needing no token and no
account. The entire follow → alert → calendar loop works signed-out.

Adding accounts to v1 means Supabase Auth, a native OAuth redirect scheme, and —
because shipping Google sign-in on iOS generally obliges an equivalent private
option under **Guideline 4.8** — Sign in with Apple, which the backend does not
support.

## Decision
**v1 ships with no sign-in.** Follows, alert preferences, language, clock and
timezone are device-local ([store/preferences.ts](../../src/store/preferences.ts)),
and the follow list is sent wholesale as `clubSlugs` on every push registration.

The account sheet keeps its designed **shape** — identity slot, alert types,
preferences, feeds, destructive action — so auth is a fill rather than a rebuild.
Two things change:

- The identity block reads *"Not signed in — alerts and feeds are tied to this
  device"* rather than a name and a `VERIFIED` pill.
- The destructive action becomes **"Turn off alerts on this device"** →
  `DELETE /cronogol/push/device`, not "Delete account".

Apple's Guideline 5.1.1(v) account-deletion requirement binds only on apps that
support account *creation*. With no accounts it does not apply — and shipping a
"Delete account" button that deletes nothing is worse than shipping none.

## Consequences
- ⚠ **`followed` means something different here than on the web.** There it was a
  cache of the account's calendar feeds, refillable from `listMyFeeds`. Here the
  device's array **is** the follow state and nothing can rebuild it. That is why
  `store/preferences.ts` keeps `SCHEMA_VERSION` and `FOLLOWED_RULE_VERSION` as
  separate constants: bumping the wrong one would wipe every user's
  subscriptions silently, and here the loss is permanent.
- The `CALENDAR FEEDS` list derives from the local follow set — one fewer round
  trip, but unfollowing removes the row while the subscription stays live in the
  user's Calendar app until they delete it there. The copy must say so.
- No `POST /cronogol/feed`, no claimed feeds, no `editSecret` handling in v1.
- Signing in later does not invalidate anything: a device row can be linked to an
  account by re-registering with a bearer, and the backend keeps the link.
- Reinstalling the app loses the follow list. Accepted for v1; it is the strongest
  single argument for adding accounts in v1.1.

## Alternatives considered
- **Accounts in v1** — the designed sheet, but it pulls in Supabase Auth, an
  OAuth redirect scheme, and a Guideline 4.8 blocker that is a backend project.
- **Anonymous forever** — loses cross-device follows and the durable claimed feed;
  the sheet is shaped for auth precisely so this is not a one-way door.
