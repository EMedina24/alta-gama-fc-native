/**
 * Notification payload → router target. **Pure**: no `expo-notifications` import,
 * so it runs in a plain-JS harness and is verified without a build.
 *
 * ⚠ `deepLink` is read off the payload rather than rebuilt from `clubSlug`, so a
 * server push and a locally scheduled reminder route through one code path — the
 * two carry the same shape deliberately.
 */

export interface NotificationRoute {
  pathname: '/club/[slug]';
  params: { slug: string };
}

/**
 * `altagamafc://club/valencia` → a router target, or null.
 *
 * ⚠ Tolerates an unknown payload rather than throwing. A notification type this
 * build does not understand — a future `goal_scored`, say — must open the app,
 * not crash it.
 */
export function routeFor(data: unknown): NotificationRoute | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as { deepLink?: unknown; clubSlug?: unknown };

  const link = typeof payload.deepLink === 'string' ? payload.deepLink : null;
  if (link) {
    const match = /^altagamafc:\/\/club\/([^/?#]+)/.exec(link);
    if (match) return { pathname: '/club/[slug]', params: { slug: decodeURIComponent(match[1]) } };
  }

  // Fall back to the slug the payload carries alongside the link.
  if (typeof payload.clubSlug === 'string' && payload.clubSlug) {
    return { pathname: '/club/[slug]', params: { slug: payload.clubSlug } };
  }

  return null;
}
