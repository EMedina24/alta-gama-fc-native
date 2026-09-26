/**
 * The Starting XI club switcher (ADR 0212) — the tab's club button opens it.
 * Declared in the ROOT stack (ADR 0030).
 *
 * ⚠ Offered clubs only: a squad-publishing league's table (`xiClubDirectory`).
 * A pick becomes the tab's `lastClub` — the reader's choice, written by their
 * tap — and nothing about any club's XI changes.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { XiClubSheet } from '@/components/organisms/xi-club-sheet';
import { matchClub, xiClubDirectory } from '@/features/starting-xi/clubs';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useStandings } from '@/queries/use-standings';
import { useTeams } from '@/queries/use-teams';
import { setLastClub } from '@/store/starting-xi';

export default function XiClubRoute() {
  const { current } = useLocalSearchParams<{ current?: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const standings = useStandings();
  const teams = useTeams();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const groups = useMemo(() => xiClubDirectory(standings.data?.tables, teams.data), [standings.data, teams.data]);
  const sections = groups
    .filter((group) => filter === 'all' || group.league.slug === filter)
    .map((group) => {
      const clubs = group.clubs
        .filter((team) => matchClub(team, query))
        .map((team) => ({
          slug: team.slug,
          name: displayName(team.name),
          crest: crestSrc(team.logoUrls, team.logoUrl, 'small'),
          abbr: abbreviate(team.name, team.slug, team.shortName),
          current: team.slug === current,
        }));
      return { key: group.league.slug, title: `${group.league.name} · ${clubs.length}`, clubs };
    })
    .filter((section) => section.clubs.length > 0);

  return (
    <XiClubSheet
      title={xi.clubsTitle}
      query={query}
      onQuery={setQuery}
      searchPlaceholder={xi.searchClubs}
      filters={[
        { key: 'all', label: xi.allLeagues },
        ...groups.map((group) => ({ key: group.league.slug, label: group.league.name })),
      ]}
      filter={filter}
      onFilter={setFilter}
      sections={sections}
      empty={groups.length > 0 && sections.length === 0 ? xi.noClubs(query.trim()) : null}
      onPick={(slug) => {
        setLastClub(slug);
        router.back();
      }}
      onClose={() => router.back()}
      closeLabel={copy.sheets.close}
    />
  );
}
