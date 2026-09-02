# 0038 — Accounts: Apple and Google, sign-in optional

- **Date:** 2026-08-26
- **Status:** Accepted — email/password clause superseded by
  [0103](./0103-email-password-sign-in.md); the rest stands
- **Supersedes:** [0019](./0019-anonymous-v1.md)
- **Decided by:** Ed Medina

## Context
[0019](./0019-anonymous-v1.md) shipped v1 signed-out and named the two things
that would have to change first: the Apple Developer Program membership, and
*"Sign in with Apple, which the backend does not support — a backend project."*

The membership landed on 2026-08-25 ([0024](./0024-push-enabled.md)). The second
objection turned out to be wrong twice over:

1. **The backend needs no code.** `senpai-backend` does not authenticate anyone.
   Clients authenticate against Supabase Auth and send the resulting JWT as a
   bearer; `SupabaseUserGuard` verifies it through JWKS **regardless of which
   provider minted the session**, and `public.profiles` has no provider column.
   An Apple session is indistinguishable from a Google one to that guard. The
   backend even planned for it — `welcome-dispatch.service.ts:25` gates the
   welcome email on *"has no email-provider identity", not "is Google"*,
   explicitly so *"an Apple or Microsoft signup"* would work the day one existed.
2. **Native-only Apple needs no Apple OAuth infrastructure.** Supabase needs the
   bundle id under *Client IDs* and nothing else. The Services ID, the `.p8` and
   the rotation schedule — the whole basis of the cost objection recorded in
   `senpai-backend` `CRONOGOL.md` §15.8, `CRONOGOL-API.md:2166` and `:3969`, and
   backend decision 0005 — are **web-flow** requirements.

## Decision
**Sign-in ships, with Apple and Google, and it is optional.**

- **Apple** is native (`expo-apple-authentication` → `signInWithIdToken`). No
  browser, no redirect.
- **Google** is the browser hop (`signInWithOAuth` + `openAuthSessionAsync`), the
  same flow the web app uses. It needs no Google Cloud work — it goes through
  Supabase's existing web client. Native one-tap is a later upgrade, contained to
  [features/auth/google.ts](../../src/features/auth/google.ts).
- **No email/password.** The app has no text-input atom, and email/password is
  three Supabase mail flows, a resend lock, and a deep-link landing page for
  confirm and reset — a second project, not a corner of this one.
- **Signing in buys:** an identity in the account sheet, Sign out, Delete account,
  and a bearer on push registration that links the device row to the account.
- **Follows stay device-local.** The backend has no follows endpoint; the web app
  derives them from `GET /cronogol/me/feeds`, which means CLAIMED feeds — a
  `POST /cronogol/feed`, an `editSecret` to store, and a reconcile. 0019 excluded
  all three and this decision does not reverse that. ⚠ **So the account sheet's
  `CALENDAR FEEDS` list still derives from the local follow set even when signed
  in** — the account's server-side feed list is empty and always would be.

**Optional now, required later.** `AUTH_REQUIRED` in
[features/auth/capability.ts](../../src/features/auth/capability.ts) is the seam,
and `AuthGate` in the root layout already reads it. Flipping it is a constant
change plus copy — but it also makes Guideline 5.1.1(v) unavoidable and turns the
sign-in sheet into a blocking screen, which needs its own `Close`-less
presentation.

## Consequences
- ⚠ **Guideline 5.1.1(v) binds from now on.** Account creation ships, so in-app
  deletion must exist and must really delete. `DELETE /cronogol/me` was already
  live; the sheet arms a two-step confirm because the server has no undo.
- ⚠ **Guideline 4.8 governs the sign-in sheet's layout, not just its contents.**
  Apple is drawn first, at the same height as Google, using Apple's own component.
  Promoting Google is a rejection.
- ⚠ **Apple gives a name exactly once**, on the first authorization ever for that
  Apple ID and app, and the identity token carries no name claim. It is written
  to `PATCH /cronogol/me` inside the same function; missing it is permanent short
  of the user revoking the app in iOS Settings.
- ⚠ **Signing out does not unlink the push device row.** There is no unlink on the
  backend and an anonymous re-register keeps an existing link. Sign-out is
  therefore session-only, and push re-registers on sign-IN only — a sign-out would
  spend one of 20/min telling the server something it already knows.
- ⚠ **Sign-out must never touch `followed`.** It is device state whose loss is
  permanent (0019), and wiping it would silently unsubscribe the reader from every
  alert they have.
- ⚠ **Deleting the account does not stop alerts.** `device_tokens.user_id` is
  `ON DELETE SET NULL`, deliberately. "Turn off alerts on this device" stays in
  the sheet for signed-in readers for exactly this reason.
- ⚠ **The privacy nutrition labels change.** HANDOFF open item 7 committed to "an
  APNs token and followed club slugs, device-keyed, **no account**". Email and
  name, linked to identity, are now collected.
- The design's `VERIFIED` pill is **not** drawn: nothing in `GET /cronogol/me`
  reports verification, and asserting it from a provider guess is worse than
  omitting it.
- `AvatarButton` gets its product answer — initials from `displayName`, then the
  email's local part, then a neutral mark. That closes HANDOFF front-end §5.
- Nothing in `senpai-backend` changes. Two courtesies remain open there:
  `PROVIDER_LABELS` in `welcome-dispatch.service.ts:490` is `{ google: 'Google' }`
  and could gain `apple`, and the four docs asserting Apple sign-in will never
  exist are now wrong.

## Alternatives considered
- **Apple only** — no 4.8 exposure at all, but a narrower door than the web app
  offers for no saving; Google is already configured server-side.
- **Email/password too** — full web parity, roughly double the work, and it drags
  in a cross-repo decision about where confirm and reset links land.
- **Cross-device follows via claimed feeds** — fixes the reinstall problem 0019
  called the strongest argument for accounts, but needs `POST /cronogol/feed`,
  `editSecret` handling and a reconcile. Deferred, not rejected.
