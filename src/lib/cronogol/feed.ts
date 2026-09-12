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
 * The Champions League, whole competition (backend §125).
 *
 * ⚠⚠ **This is the ONLY feed that carries the knockout rounds.** A knockout tie
 * has no matchday, so the round feed below structurally cannot reach one — that
 * is why this exists at all, and the sheet copy has to say it. The league phase
 * is in here too, so this is a superset of all eight rounds.
 *
 * ⚠⚠ **A subscriber who also follows a club in this competition sees that
 * club's ties TWICE, and it is deliberate.** This feed keys
 * `UID:ucl-fixture-{id}`, the club feed keys `UID:fixture-{id}`, because the
 * club-side twin exists for only 40 of 144 fixtures and **can be attached
 * late** — keying on it would mean a UID that changes under a live
 * subscription, orphaning the event on every device for ever with no recall.
 * ⚠ **Never try to dedupe across feeds client-side:** the calendar app owns
 * that state and nothing here can reach it. Say it in the copy instead.
 *
 * ⚠ A season we hold nothing for **404s, and must** — an empty calendar DELETES
 * every event from the subscriber's device, where a 404 leaves their copy alone
 * and shows a refresh error.
 */
export function uclSeasonFeedUrl(season: number): string {
  return `${FEED_ORIGIN}/cronogol/feed/ucl/${season}.ics`;
}

/**
 * One Champions League league-phase round.
 *
 * ⚠ League phase only — see `uclSeasonFeedUrl` for why a knockout tie cannot
 * appear here.
 *
 * ⚠ The matchday is validated 1-20 server-side (the column's own CHECK) and out
 * of range is a **400**, unlike the JSON round route which answers an empty 200.
 */
export function uclJornadaFeedUrl(season: number, matchday: number): string {
  return `${FEED_ORIGIN}/cronogol/feed/ucl/jornada/${season}/${matchday}.ics`;
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
