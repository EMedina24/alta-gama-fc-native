/**
 * Calendar feed URLs.
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/feed.ts` (ADR 0018).
 *
 * ⚠ **`FEED_ORIGIN` is pinned here and never derived from `API_BASE`.** A
 * `webcal://` host is a one-way door: it is copied onto the subscriber's device
 * the moment they subscribe, it lives in their calendar app for as long as the
 * subscription does, and nothing we can ever ship will tell them it moved. A
 * developer pointing `EXPO_PUBLIC_CRONOGOL_API_URL` at `localhost:3001` must not
 * be able to mint `webcal://localhost:3001/…` and hand it to a real user.
 *
 * This is also why `crono-gol.com` answering a JSON 404 at `/` is correct and
 * must never be "fixed" into a redirect to `altagamafc.com`.
 */

export const FEED_ORIGIN = 'https://crono-gol.com';

/** A club's whole season. Public — no token, no account, nothing to create. */
export function clubFeedUrl(slug: string): string {
  return `${FEED_ORIGIN}/cronogol/feed/${encodeURIComponent(slug)}.ics`;
}

/**
 * One matchweek. A matchday feed is a SEPARATE, ADDITIONAL thing from a club
 * subscription — both can be on, and the sheet copy has to say so.
 *
 * The season sits in the path and is permanent, like the host.
 */
export function jornadaFeedUrl(
  leagueApiSlug: string,
  season: number,
  matchweek: number,
): string {
  return `${FEED_ORIGIN}/cronogol/feed/jornada/${encodeURIComponent(leagueApiSlug)}/${season}/${matchweek}.ics`;
}

/**
 * `https://…` → `webcal://…`.
 *
 * iOS hands a `webcal://` URL straight to Calendar's subscribe sheet, which is
 * the whole point: the subscription stays live, so a moved kickoff moves the
 * event. A downloaded `.ics` is a snapshot and never updates again.
 */
export function webcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https?:\/\//, 'webcal://');
}

/**
 * The Google Calendar "add by URL" link.
 *
 * ⚠ **The `cid` must carry the `webcal://` URL, not the `https://` one.** Handed
 * an `https://` cid, Google opens, adds nothing, and reports no error — so it
 * looks like it worked. That bug shipped twice on the web app.
 */
export function googleAddUrl(webcal: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
}
