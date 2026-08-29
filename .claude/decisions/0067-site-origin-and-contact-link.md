# 0067 — A "Contact us" link on the account sheet, and the first `altagamafc.com` URL

- **Date:** 2026-08-29
- **Status:** Accepted — not yet verified on the simulator
- **Decided by:** Ed Medina
- **Builds on:** [0064](./0064-news-card-and-screen.md) (external opens via the system browser)

## Context

The account sheet had no way to reach the club. The website has a bilingual contact
page at `altagamafc.com/{es|en}/contact`, and until now no `altagamafc.com` URL existed
anywhere in `src/` — only `crono-gol.com`, the API host (ECOSYSTEM.md, "two hosts").

## Decision

1. **`src/lib/cronogol/site.ts` holds `SITE_ORIGIN = 'https://altagamafc.com'`, pinned**
   like `FEED_ORIGIN` — never derived from `API_BASE` or env. A developer running against
   `localhost:3001` must not send a reader to `localhost:3001/en/contact`.
2. **`contactUrl(locale)` maps the app's `Locale` straight onto the site's path segment.**
   Both repos declare `['es', 'en']`, so the link follows the language the reader chose in
   the sheet, not a fixed `/en/`.
3. **It is a small `Text` link at the very end of the footer, not a `Button`.** It is a
   way out to the website, not an action on the account, and it must not compete with
   sign-out / delete / turn-off-alerts. It renders signed in and signed out.
4. **Opened with `Linking.openURL` (system browser)**, matching the calendar sheet and
   news phase 1. The `expo-web-browser` in-app sheet is deferred together with 0064's
   phase 2; no link atom is introduced for a single link.

## Consequences

- Any future website URL (privacy, terms) belongs in `site.ts`, beside `contactUrl`.
- If the site ever changes its locale segments, `contactUrl` is the one place to remap.
