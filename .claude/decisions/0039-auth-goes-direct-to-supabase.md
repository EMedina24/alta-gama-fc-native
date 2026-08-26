# 0039 — Auth goes direct to Supabase `/auth/v1`; the backend stays the only *data* gateway

- **Date:** 2026-08-26
- **Status:** Accepted — **and explicitly a waypoint.** See "Where this is going".
- **Qualifies:** [0009](./0009-backend-is-only-data-gateway.md)
- **Decided by:** Ed Medina

## Context
[0009](./0009-backend-is-only-data-gateway.md) says the client never talks to
Supabase. Signing in ([0038](./0038-accounts-apple-and-google.md)) appears to
break that, so it needs recording — otherwise the next reader finds
`@supabase/supabase-js` in `package.json` and reasonably reads it as a violation.

It is not a new exception. It is the one the ecosystem already makes, and both
other repos document it:

> Sign-in is the one thing that does not go through crono-gol.com: the browser
> authenticates against Supabase directly, then sends the resulting access token
> to the API as `Authorization: Bearer …`
>
> — `cronogol/lib/supabase/client.ts`

`senpai-backend` decision 0005 records the same split from the other side. It
**rejected** proxying sign-in — *"owning password hashing, reset flows, OAuth
callbacks and session storage"* — and its 2026-08-01 amendment confirms
*"Sign-in remains browser-to-Supabase."* The backend has no sign-in route at all;
its only outbound GoTrue call is `PUT /auth/v1/user` for the email change.

## Decision
**This app authenticates against Supabase `/auth/v1` directly, and does nothing
else with Supabase ever.**

0009's substance is untouched: no PostgREST query, no table read, every byte of
football data through `crono-gol.com`. The boundary is enforced rather than
merely intended — the grants on `profiles`, `feed_selections` and `subscriptions`
are revoked for the publishable key, so a table read answers `401 / 42501`.

⚠ The publishable key ships in the bundle. That is what it is for (`/auth/v1`
only) and the web app already ships it in every browser. It is in `.env`, which
**this repo does not gitignore** — a conscious call, not an oversight.

## Where this is going — proxied auth
**This is the decision for this cut, not the end state.** The intent is to move
both surfaces onto backend-proxied auth, because it is the safer boundary:

- **One audited surface.** Sign-in becomes a route we own, so rate limiting,
  abuse detection, logging and revocation are enforceable in one place rather
  than being whatever the Supabase project is configured to do, per client.
- **No identity-provider coupling in a shipped binary.** A native app cannot be
  hot-fixed; it ships and waits on review. Anything hard-coded about the provider
  is frozen into every installed copy until the next release.
- **Provider-swappable** — the property 0009 exists to protect, applied to auth.

The target surface is `POST /cronogol/auth/{native,refresh,signout}`, relaying
GoTrue's tokens **verbatim** so `SupabaseUserGuard`, `profiles` and
`device_tokens.user_id` need no change. Note that the native id_token grant
avoids everything backend 0005 actually rejected: **there is no OAuth callback**
in it, no password hashing, no session storage, and no session of ours to mint.

Doing it now would roughly double the work and leave two auth implementations in
the ecosystem while the web still goes direct — precisely the drift
`.claude/ECOSYSTEM.md` warns about. Doing it once, with both surfaces, is cheaper
and ends with 0009 true everywhere.

### ⚠ The containment rule that keeps that migration cheap
**`supabase.auth.*` appears in three places and may never appear in a fourth:**
[lib/supabase/](../../src/lib/supabase/), [store/session.ts](../../src/store/session.ts)
and [features/auth/](../../src/features/auth/). Everything above them sees
`getAccessToken()` and our own `Session` and `AccountView` types — no screen, no
query and no transport imports `@supabase/supabase-js`.

Held to that, proxying is a swap of three modules. The day a screen reaches for
`supabase.auth` directly, it stops being one.

## Consequences
- One dependency (`@supabase/supabase-js`) and two `EXPO_PUBLIC_` variables.
- The session lives in the **Keychain**, not AsyncStorage — see
  [lib/supabase/session-storage.ts](../../src/lib/supabase/session-storage.ts) for
  why it is chunked and why the chunk count is written last.
- ⚠ `AUTH_STORAGE_KEY` is explicit and permanent. Unset, `supabase-js` derives it
  from the hostname; the web app is pinned to a stale project ref forever because
  moving to the custom domain silently renamed its key and signed everyone out.
- ⚠ CORS does not apply here — a native client sends no `Origin`. The bearer
  contract is otherwise identical to the web's.
- `eslint` and `eslint-config-expo` were added as devDependencies to verify this
  work. Not a choice so much as a repair: `eslint.config.js` had been in the repo
  from the start requiring both, and `npm run lint` had never once run. It paid
  for itself immediately — see the HANDOFF section on it.
- `expo-secure-store`'s config plugin is passed `faceIDPermission: false`. It
  otherwise injects `NSFaceIDUsageDescription` ("…access your Face ID biometric
  data"), and nothing here ever passes `requireAuthentication` — declaring an
  unused, English-only biometric purpose string in a bilingual app is a question
  at review for no benefit. Set it if that ever changes.
- ⚠ `react-native-url-polyfill` is deliberately **not** installed. Verified
  against `@supabase/auth-js`: its `new URL()` calls are all on `window.location`
  paths that `isBrowser()` gates off. Our own redirect parsing is hand-rolled for
  the same reason — RN's `URL.hash` truncates at a `/` and its `URLSearchParams`
  truncates values at the first `=`, and both corrupt credentials silently.

## Alternatives considered
- **Proxy through the backend now** — the better boundary, ~2× the work across
  two repos, and a second auth implementation to keep correct meanwhile. Deferred
  above, with the containment rule that keeps it cheap.
- **Proxy, then migrate the web too** — the consistent end state, and where this
  is heading. It additionally touches a live signed-in user base.
