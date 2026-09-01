/**
 * Follow clubs (ADR 0082).
 *
 * The clubs you follow are a horizontal RAIL of crest bubbles; everything else
 * is one browse tray under a row of league chips. There is no second vertical
 * list of subscribed clubs any more, and no unfollow on this screen at all.
 *
 * ⚠⚠ **Following is one tap, unfollowing is not on this screen.** The follow
 * pill subscribes immediately with no confirm — it is reversible and the rail
 * is the receipt. Unfollow lives on the club page behind `Match alerts`, which
 * asks first, because it drops a whole season of calendar entries. The rail
 * bubble's only action is opening the club.
 *
 * ⚠ Search folds accents: `atletico` must find `Atlético`. `foldAccents` is the
 * same NFD-strip the monogram derivation uses.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BAND_COLOR, Button, SkeletonRows, Text } from '@/components/atoms';
import { LeagueSwitch, SearchField, SectionHeader } from '@/components/molecules';
import { ClubBrowser, type BrowseClub } from '@/components/organisms/club-browser';
import { ClubRail, type RailClub } from '@/components/organisms/club-rail';
import { AvatarButton, ScreenScaffold } from '@/components/templates/screen-scaffold';
import { useIdentityInitials } from '@/features/auth/use-identity';
import { Size, Spacing } from '@/constants/theme';
import { hapticToggle } from '@/lib/haptics';
import { abbreviate, crestSrc, displayName, hasCompleteSchedule, pickerName } from '@/lib/cronogol/derive';
import {
  DEFAULT_LEAGUE,
  findLeague,
  findLeagueByApiSlug,
  leagueOptions,
} from '@/lib/cronogol/leagues';
import { bandsApply, zoneFor } from '@/lib/cronogol/standings';
import { foldAccents } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useLeagueArtwork } from '@/queries/use-leagues';
import { useStandings } from '@/queries/use-standings';
import { useTeams } from '@/queries/use-teams';
import { followClub, usePreferences } from '@/store/preferences';

export default function ClubsScreen() {
  const router = useRouter();
  const initials = useIdentityInitials();
  const { copy } = useI18n();
  const { followed } = usePreferences();
  /**
   * ⚠ TWO queries, and they are not redundant.
   *
   * `TeamView` carries NO league field — league membership is only knowable from
   * which league's roster a slug appears in (the web app derives it the same way,
   * in `clubDirectory`). So the browse list must be fetched league-scoped; it
   * cannot be filtered out of the full set.
   *
   * The unscoped call is the SEARCH corpus: the design's field says "Search 100
   * clubs", and a reader looking for Arsenal from the LaLiga tab should find it.
   */
  const teams = useTeams();
  /**
   * The league being browsed. Screen state, not a preference: it is a place in
   * a list, and the Matchdays switcher forgets its league the same way.
   */
  const [leagueSlug, setLeagueSlug] = useState(DEFAULT_LEAGUE.slug);
  const league = findLeague(leagueSlug) ?? DEFAULT_LEAGUE;
  const browse = useTeams(league.apiSlug);
  const artwork = useLeagueArtwork();
  /**
   * The rail's rank badges. ⚠ Shares its query key with the Table tab, so this
   * is usually a cache read rather than a request — and it is deliberately NOT
   * gated on: a bubble with no rank yet is the same bubble a Premier League club
   * draws, so nothing on screen waits for it.
   */
  const standings = useStandings();
  const [query, setQuery] = useState('');

  const all = useMemo(() => teams.data ?? [], [teams.data]);

  /**
   * `slug → { rank, zone }`, over the tables a position may honestly be quoted
   * from.
   *
   * ⚠ **`bandsApply` gates the whole entry, not just the colour.** A short table
   * ranks clubs against a league it is not actually a table of — see its own
   * comment. Absent is the honest answer; a wrong `#4` on a crest is not.
   *
   * ⚠ **A table with no `League` config is skipped, and that is the point.**
   * `/cronogol/standings` also returns `segunda`, where five of LaLiga's tracked
   * clubs actually sit. The bubble carries no league label, so an unbadged `#7`
   * from segunda would read as a LaLiga position.
   */
  const ranks = useMemo(() => {
    const map = new Map<string, { rank: number; color: string | null }>();
    for (const table of standings.data?.tables ?? []) {
      const config = findLeagueByApiSlug(table.league.slug);
      if (!config || !bandsApply(table, config)) continue;
      for (const row of table.rows) {
        // ⚠ `row.rank` off the wire — 1-based and contiguous, never an index.
        const zone = zoneFor(row.rank, config);
        map.set(row.team.slug, { rank: row.rank, color: zone ? BAND_COLOR[zone] : null });
      }
    }
    return map;
  }, [standings.data]);

  const rail: RailClub[] = useMemo(
    () =>
      // Ordered by the follow list, so a newly followed club appears where the
      // user put it rather than jumping to an alphabetical slot.
      followed.flatMap((slug) => {
        const team = all.find((t) => t.slug === slug);
        if (!team) return [];
        const placed = ranks.get(slug) ?? null;
        // ⚠ `pickerName`, not `displayName`: an 88pt bubble is ~13 characters.
        const name = pickerName(team.name);
        return [
          {
            slug,
            name,
            crest: crestSrc(team.logoUrls, team.logoUrl, 'small'),
            abbr: abbreviate(team.name, slug, team.shortName),
            rank: placed?.rank ?? null,
            rankColor: placed?.color ?? null,
            accessibilityLabel: copy.clubs.railClub(displayName(team.name), placed?.rank ?? null),
          },
        ];
      }),
    [followed, all, ranks, copy],
  );

  const results: BrowseClub[] = useMemo(() => {
    const needle = foldAccents(query.trim());
    // No search: the league's roster. Searching: every tracked club.
    const pool = needle ? all : (browse.data ?? []);
    const rest = pool.filter((t) => !followed.includes(t.slug));
    const matched = needle ? rest.filter((t) => foldAccents(t.name).includes(needle)) : rest;
    return matched.map((team) => {
      const name = displayName(team.name);
      return {
        slug: team.slug,
        name,
        /**
         * ⚠ City where the API states one, the ground where it does not, and
         * nothing where it has neither — verified 2026-08-31: `venue.city` is
         * served for the Premier League and Serie A, null on all 20 LaLiga
         * clubs, and Bundesliga clubs carry no `venue` at all.
         *
         * ⚠ `schedulePending` outranks both: an opponent-only club has a
         * handful of matches and must never be presented as a season (trap 1).
         */
        place: !hasCompleteSchedule(team)
          ? copy.clubs.schedulePending
          : (team.venue?.city ?? team.venue?.name ?? null),
        crest: crestSrc(team.logoUrls, team.logoUrl, 'small'),
        abbr: abbreviate(team.name, team.slug, team.shortName),
        followAccessibilityLabel: copy.clubs.followClub(name),
      };
    });
  }, [all, browse.data, followed, query, copy]);

  const follow = (slug: string) => {
    hapticToggle();
    followClub(slug);
  };

  const openClub = (slug: string) =>
    // ⚠ Object form, not a template string: typed routes validate the pathname
    // against the route tree and the params separately.
    router.push({ pathname: '/club/[slug]', params: { slug } });

  return (
    <ScreenScaffold
      title={copy.clubs.title}
      // The one 48pt crown: its subhead carries the follow count (ADR 0087).
      titleVariant="crownTitleLg"
      subtitle={copy.clubs.followedCount(followed.length)}
      accessory={
        <AvatarButton initials={initials} onPress={() => router.push('/(sheets)/account')} />
      }
      // Search and the subscribed rail ride the crown. The SUBSCRIBED header
      // and the rail sit past the gradient's midpoint, where the ground is
      // dark green — so they keep their normal dark-theme inks, the ink rule's
      // live example (APP-SHELL).
      payload={
        <View style={styles.crownControls}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={copy.clubs.search(all.length)}
          />
          {!teams.isError && !teams.isPending && rail.length > 0 && !query ? (
            <>
              <SectionHeader
                title={copy.clubs.subscribed}
                meta={String(rail.length)}
                tone="accent"
              />
              <ClubRail clubs={rail} onOpen={openClub} />
            </>
          ) : null}
        </View>
      }
      onRefresh={() => {
        void teams.refetch();
        void browse.refetch();
      }}
      refreshing={teams.isRefetching || browse.isRefetching}>
      {teams.isError ? (
        <View style={styles.state}>
          <Text color="textSecondary">{copy.clubs.error}</Text>
          <Button label={copy.clubs.retry} tone="secondary" onPress={() => void teams.refetch()} />
        </View>
      ) : teams.isPending ? (
        <SkeletonRows count={8} height={Size.rowSkeleton} />
      ) : (
        <>
          {/* ⚠ Hidden while searching: search spans EVERY tracked club, so a
              league filter sitting over those results would claim a scope the
              list does not have (ADR 0032). */}
          {query ? null : (
            <LeagueSwitch
              leagues={leagueOptions(artwork.data)}
              active={league.slug}
              onSelect={setLeagueSlug}
            />
          )}

          <SectionHeader title={query ? copy.clubs.title : copy.clubs.browse(league.name)} />

          {/* ⚠ Only the browse list waits on the league's roster. Gating the
              screen on it would take the chips off-screen mid-tap. */}
          {browse.isPending && !query ? (
            <SkeletonRows count={8} height={Size.rowSkeleton} />
          ) : results.length === 0 ? (
            <Text color="textSecondary">{copy.clubs.noResults}</Text>
          ) : (
            <ClubBrowser
              clubs={results}
              followLabel={copy.clubs.follow}
              onFollow={follow}
              onOpen={openClub}
            />
          )}

          {/* ⚠ Not drawn over search results — it describes the league row. */}
          {query ? null : (
            <Text variant="caption" color="textFaint" style={styles.footnote}>
              {copy.clubs.moreLeagues}
            </Text>
          )}
        </>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  crownControls: { gap: Spacing.four },
  state: { gap: Spacing.four, paddingVertical: Spacing.six },
  footnote: { lineHeight: 18 },
});
