/**
 * Web front-end URLs — `altagamafc.com`, the OTHER host (ECOSYSTEM.md).
 *
 * ⚠ Pinned like `FEED_ORIGIN`, never derived from `API_BASE`: the API host is
 * `crono-gol.com` and a dev pointing the env at `localhost:3001` must not send a
 * reader to `localhost:3001/en/contact`. The site's locale segment matches the
 * app's `Locale` (`es` | `en`) one-to-one (ADR 0067).
 */
import type { Locale } from '@/lib/i18n/phrases';

export const SITE_ORIGIN = 'https://altagamafc.com';

/** The website's contact page, in the reader's language. */
export function contactUrl(locale: Locale): string {
  return `${SITE_ORIGIN}/${locale}/contact`;
}

/**
 * A club's page on the website, in the reader's language (ADR 0202) — what the
 * club page's share sends. The site's route is `app/[lang]/clubs/[slug]`, and
 * its slugs are the API's own, so no mapping stands between the two.
 */
export function clubUrl(locale: Locale, slug: string): string {
  return `${SITE_ORIGIN}/${locale}/clubs/${encodeURIComponent(slug)}`;
}
