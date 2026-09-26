/**
 * The Starting XI picker sheet (ADR 0214) — who goes into `slot`, or onto the
 * bench (`slot=bench`). Declared in the ROOT stack (ADR 0030).
 *
 * ⚠ Cache reads: the squad the builder already holds, the standings for the
 * league, and — for LaLiga only (`statsSlug`) — one stats payload per player,
 * four at a time, shared with the player card and Season stats.
 *
 * ⚠ The pick lands through `actXi` like every builder action, then the sheet
 * closes: a player already on the pitch SWAPS with the one here, a benched one
 * trades places with him, anyone else pushes him to the bench if it has room.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { XiPickerSheet, type PickerBand, type PickerSection } from '@/components/organisms/xi-picker-sheet';
import { actXi, squadIndex } from '@/features/starting-xi/act';
import { orbInitials, tokenName } from '@/features/starting-xi/card-geometry';
import { BAND_ORDER, bandOf, isSlotOf } from '@/features/starting-xi/slots';
import { xiStats } from '@/features/starting-xi/stats';
import { whereIs } from '@/features/starting-xi/xi-state';
import { SEASON } from '@/lib/cronogol/leagues';
import { leagueOfClub } from '@/lib/cronogol/standings';
import { statsSlug } from '@/lib/cronogol/stats';
import { foldAccents } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { useStandings } from '@/queries/use-standings';
import { useSquadStats } from '@/queries/use-stats';
import { useClubXi, useXiView } from '@/store/starting-xi';

export default function XiPickRoute() {
  const { slug, slot } = useLocalSearchParams<{ slug: string; slot: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const squad = useClubSquad(slug);
  const club = useClubXi(slug);
  const view = useXiView();
  const standings = useStandings();
  const league = leagueOfClub(standings.data?.tables, slug);

  const toBench = slot === 'bench';
  const [band, setBand] = useState<PickerBand>(toBench || !slot ? 'ALL' : bandOf(slot));
  const [query, setQuery] = useState('');

  const players = useMemo(() => squad.data?.players ?? [], [squad.data]);
  const slugs = useMemo(
    () => players.map((p) => statsSlug(p, league)).filter((s): s is string => s !== null),
    [players, league],
  );
  const stats = useSquadStats(slugs);

  const sections: PickerSection[] = useMemo(() => {
    const needle = foldAccents(query.trim());
    const shirt = /^\d+$/.test(query.trim()) ? Number(query.trim()) : null;
    const matches = players.filter((p) => {
      if (band !== 'ALL' && p.position !== band) return false;
      if (!needle) return true;
      if (shirt !== null) return p.shirt === shirt;
      return foldAccents(p.name).includes(needle) || foldAccents(p.shortName ?? '').includes(needle);
    });
    const ordered = [...matches].sort(
      (a, b) => (a.shirt ?? 999) - (b.shirt ?? 999) || a.name.localeCompare(b.name),
    );
    return BAND_ORDER.map((b) => {
      const rows = ordered
        .filter((p) => p.position === b)
        .map((p) => {
          const at = whereIs(club, p.id);
          const current = toBench ? at?.kind === 'bench' : at?.kind === 'slot' && at.slot === slot;
          const s = statsSlug(p, league);
          const figures = s ? xiStats(stats.get(s), view.statsMode, SEASON) : null;
          const name = tokenName(p);
          return {
            id: p.id,
            initials: orbInitials(p),
            photoUrl: p.photoUrl,
            shirt: p.shirt,
            name,
            where:
              at?.kind === 'slot'
                ? { kind: 'slot' as const, label: at.slot }
                : at?.kind === 'bench'
                  ? { kind: 'bench' as const, label: xi.onBench }
                  : null,
            current,
            // ⚠ Empty until loaded, and empty where the league has no stats — never "0 · 0".
            stats: figures && figures.goals !== null ? `${figures.goals} · ${figures.assists ?? ''}` : null,
            accessibilityLabel: [name, at?.kind === 'slot' ? at.slot : at ? xi.onBench : null]
              .filter(Boolean)
              .join(', '),
          };
        });
      return { key: b, title: `${xi.bands[b]} · ${rows.length}`, rows };
    }).filter((section) => section.rows.length > 0);
  }, [players, band, query, club, toBench, slot, league, stats, view.statsMode, xi]);

  const pick = (id: string) => {
    const index = squadIndex(players);
    if (toBench) actXi(slug, { type: 'toBench', id }, index);
    else if (isSlotOf(club.formation, slot)) actXi(slug, { type: 'place', slot, id }, index);
    router.back();
  };

  return (
    <XiPickerSheet
      title={toBench ? xi.benchTitle : xi.pickFor(slot ?? '')}
      caption={league?.playerStats ? xi.statsCaption : null}
      query={query}
      onQuery={setQuery}
      searchPlaceholder={xi.search}
      band={band}
      bands={[
        { value: 'ALL', label: xi.all },
        ...BAND_ORDER.map((b) => ({ value: b as PickerBand, label: xi.bandShort[b] })),
      ]}
      onBand={setBand}
      sections={sections}
      empty={xi.noPlayers}
      onPick={pick}
      onClose={() => router.back()}
      closeLabel={copy.sheets.close}
    />
  );
}
