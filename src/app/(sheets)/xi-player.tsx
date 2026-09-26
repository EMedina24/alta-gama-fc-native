/**
 * One player on the Starting XI builder (ADR 0214): his numbers, and Replace /
 * Move to bench / Remove. Declared in the ROOT stack (ADR 0030).
 *
 * ⚠ Replace is `back()` then `push(xi-pick)` — the card dismisses before the
 * picker presents, so the picker is never stacked inside this sheet (the
 * ADR 0207 order).
 *
 * ⚠ The numbers are one cache read (`usePlayerStats`, shared with the picker)
 * and only where the league publishes player stats (`statsSlug`). Age is the
 * squad's own.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';

import { XiPlayerCard } from '@/components/organisms/xi-player-card';
import { actXi, squadIndex } from '@/features/starting-xi/act';
import { orbInitials } from '@/features/starting-xi/card-geometry';
import { xiStats } from '@/features/starting-xi/stats';
import { BENCH_SIZE, whereIs } from '@/features/starting-xi/xi-state';
import { playerDisplayName } from '@/lib/cronogol/derive';
import { SEASON, leagueSeasonLabel } from '@/lib/cronogol/leagues';
import { leagueOfClub } from '@/lib/cronogol/standings';
import { statsSlug } from '@/lib/cronogol/stats';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { useStandings } from '@/queries/use-standings';
import { usePlayerStats } from '@/queries/use-stats';
import { setXiView, useClubXi, useXiView } from '@/store/starting-xi';

export default function XiPlayerRoute() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string; slot: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const squad = useClubSquad(slug);
  const club = useClubXi(slug);
  const view = useXiView();
  const standings = useStandings();
  const league = leagueOfClub(standings.data?.tables, slug);
  const player = squad.data?.players.find((p) => p.id === id);
  const statsQuery = usePlayerStats(player ? statsSlug(player, league) : null);

  if (!player) return null;

  const index = squadIndex(squad.data?.players ?? []);
  const at = whereIs(club, player.id);
  const onPitch = at?.kind === 'slot';
  const figures = xiStats(statsQuery.data, view.statsMode, SEASON);
  const done = () => router.back();

  const meta = [
    playerDisplayName(player.name),
    player.shirt === null ? null : `#${player.shirt}`,
    copy.player.positionNames[player.position],
    player.nationality?.code ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <XiPlayerCard
      orb={{ initials: orbInitials(player), photoUrl: player.photoUrl, shirt: player.shirt }}
      name={player.shortName ?? playerDisplayName(player.name)}
      meta={meta}
      tiles={[
        { key: 'goals', label: xi.goals, value: figures?.goals ?? null, lime: true },
        { key: 'assists', label: xi.assists, value: figures?.assists ?? null },
        { key: 'yellows', label: xi.yellows, value: figures?.yellows ?? null },
        { key: 'age', label: xi.age, value: player.age },
      ]}
      stats={
        league?.playerStats
          ? {
              mode: view.statsMode,
              options: [
                { value: 'season', label: xi.seasonMode },
                { value: 'recent', label: xi.recentMode },
              ],
              onMode: (mode) => setXiView({ statsMode: mode }),
              caption:
                view.statsMode === 'season'
                  ? xi.seasonCaption(leagueSeasonLabel(league, SEASON))
                  : figures?.seasons
                    ? xi.recentCaption(figures.seasons)
                    : null,
            }
          : null
      }
      noStats={xi.noStats}
      onReplace={
        onPitch
          ? () => {
              done();
              router.push({ pathname: '/(sheets)/xi-pick', params: { slug, slot: at.slot } });
            }
          : undefined
      }
      onBench={
        onPitch
          ? () => {
              actXi(slug, { type: 'toBench', id: player.id }, index);
              done();
            }
          : undefined
      }
      benchFull={club.bench.length >= BENCH_SIZE}
      onRemove={() => {
        actXi(slug, { type: 'unplace', id: player.id }, index);
        done();
      }}
      labels={{ replace: xi.replace, toBench: xi.toBench, benchFull: xi.benchFull, remove: xi.remove }}
      onClose={done}
      closeLabel={copy.sheets.close}
    />
  );
}
