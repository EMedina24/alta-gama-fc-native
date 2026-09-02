# 0103 — Email/password sign-in; confirmation and reset land on the web

- **Date:** 2026-09-01
- **Status:** Accepted
- **Supersedes:** the "No email/password" clause of
  [0038](./0038-accounts-apple-and-google.md) — the rest of 0038 stands
- **Decided by:** Ed Medina

## Context
0038 rejected email/password for three named reasons: no text-input atom,
*"three Supabase mail flows, a resend lock"*, and *"a deep-link landing page for
confirm and reset — a second project"*. Meanwhile the web shipped the whole flow
on 2026-07-29 (`cronogol/components/auth-form.tsx` is the reference
implementation), the email provider is already on in the shared Supabase
project, and the backend needs nothing — its guard verifies any GoTrue JWT
regardless of provider ([0039](./0039-auth-goes-direct-to-supabase.md) stands).

The third reason — the cross-repo landing-page decision — dissolves once the
mail links land on the web pages that already exist and are already on
Supabase's Redirect URLs allowlist. The first is one molecule.

## Decision
**Email/password ships as the sign-in sheet's third option, and every mail link
lands on `altagamafc.com`.**

- The sign-in sheet gains a quiet **"Continuar con correo"** below Google —
  deliberately the least prominent of the three, so 4.8's Apple ≥ Google
  ordering is untouched. It pushes a full-detent form sheet
  (`(sheets)/sign-in-email` → `organisms/email-auth-sheet.tsx`) with
  Entrar / Crear cuenta modes, forgot-password, and a 60-second resend lock.
- `features/auth/password.ts` calls Supabase directly, like `apple.ts` and
  `google.ts`. `emailRedirectTo`/`redirectTo` are the web's own locale-prefixed
  URLs — `{SITE_ORIGIN}/{locale}/auth/callback` and
  `{SITE_ORIGIN}/{locale}/reset-password`. **No native deep links, no in-app
  reset screen, no Supabase config or template changes.** The user confirms or
  resets in the browser and returns to the app to sign in.
- Ported behaviour (the web's rules, not inventions):
  - `signUp` returning **no session is SUCCESS** (`mailer_autoconfirm` is off) —
    rendered as "check your email", never an error.
  - `email_not_confirmed` **branches** to a neutral notice + resend button,
    never a red "wrong password".
  - Wrong password and unknown email are ONE message (`invalid_credentials`),
    and a reset request answers identically for a real and an unknown address —
    enumeration resistance, both directions.
  - Errors map from GoTrue `code` (`emailAuthCode` in `features/auth/errors.ts`);
    Supabase prose never renders.
- New building blocks: `molecules/form-field.tsx` (the labelled text field 0038
  said didn't exist), `molecules/segmented-control.tsx` (EventTabs' track,
  generic), `atoms/google-mark.tsx` (Google's four-colour "G" — the ONE literal-
  hex exception to the theme rule; recolouring it violates the branding rules
  that require it).

## Consequences
- An email/password account's `displayName` is `null` until edited — the
  backend writes `display_name` on profile INSERT only, and there is nothing to
  read from a password signup. No name field in the form (web parity: a typed
  name would go nowhere).
- Clicking a confirmation/reset link on the phone signs the user into the
  **website** in their browser as a side effect. Accepted: it is the web's own
  flow, and the app asks them to come back and sign in.
- ⚠ The mail templates live in the Supabase dashboard and are shared with the
  web — nothing here may assume their content.
- ⚠ `email_provider_disabled` / `signup_disabled` map to copy instead of a
  runtime provider probe — the web's `/auth/v1/settings` discovery did not
  port; email/password has been live since 2026-07-29 and a kill-switch would
  be our own.
- **No marketing-consent checkbox** — the one parity gap with the web form. Its
  checkbox feeds Mailchimp through a Next server action with server-side
  secrets; the app has no legitimate path there (no backend endpoint exists,
  and the backend is not changing). Unlock: a subscribe endpoint on
  `senpai-backend`.

## Alternatives considered
- **Native deep links + in-app reset screen** — cross-repo Supabase URL-config
  and template churn for a flow the web already serves; `detectSessionInUrl` is
  deliberately off, so every link would need hand-rolled session exchange; and
  mail scanners prefetch single-use links, which is the web's known "expired"
  gotcha doubled.
- **6-digit OTP (`{{ .Token }}` + `verifyOtp`)** — scanner-proof and fully
  in-app, but it edits the shared project's mail templates, which changes the
  web flow too.
- **Keep 0038's rejection** — the app stays narrower than the web for readers
  who never had a Google account, and the web's live provider set already
  disagrees with it.
