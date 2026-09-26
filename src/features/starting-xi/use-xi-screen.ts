/**
 * Everything the Starting XI screen shows and does, for either host (ADR 0212):
 * the TAB (`/starting-xi`, club resolved) or a builder PUSHED from a club page
 * (`/club/[slug]/starting-xi`, club fixed).
 *
 * The routes are thin shells over this hook and the prop-driven
 * `templates/starting-xi-screen.tsx` (ADR 0013: fetching lives above the
 * component tiers). Every read here is a cache read the rest of the app has
 * usually made already — the squad, the club catalogue, the standings.
 *
 * ⚠ The tab's club is RESOLVED (`resolveXiClub`), never written by this hook.
 * The one write is the `?club=` deep-link param, which is consumed and cleared
 * exactly as the Table tab consumes `?league=` (ADR 0185).
 *
 * ⚠ Every XI change goes through `actXi` — the store's one writer plus its
 * haptic. The sheets use the same door.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert } from 'react-native';

import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { SEASON, leagueSeasonLabel, type League } from '@/lib/cronogol/leagues';
import { clubSceneTheme } from '@/lib/cronogol/league-theme';
import { leagueOfClub } from '@/lib/cronogol/standings';
import type { SquadPlayerView } from '@/lib/cronogol/types';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { useStandings } from '@/queries/use-standings';
import { useTeams } from '@/queries/use-teams';
import { usePreferences } from '@/store/preferences';
import { setLastClub, setXiView, useClubXi, useLastClub, useXiFx, useXiView, type XiFx } from '@/store/starting-xi';

import { actXi, squadIndex } from './act';
import { offeredSlugs, resolveXiClub, xiClubDirectory } from './clubs';
import type { XiHost } from './export';
import type { XiView } from './migrate';
import { CAMERA } from './projection';
import type { FormationId, SlotId } from './slots';
import { validateXi, type ClubXi, type SquadIndex, type XiValidity, MAX_LINEUPS } from './xi-state';

export interface XiScreenClub {
  kind: 'club';
  host: XiHost;
  slug: string;
  squad: 'pending' | 'empty' | 'ready';
  team: {
    name: string;
    abbr: string;
    crest: string | null;
    watermark: string | null;
    scene: { base: string; glow: string } | null;
  };
  /** `LaLiga · 2026/27`, or the name alone when the league is unknown. */
  meta: string;
  league: League | undefined;
  players: readonly SquadPlayerView[];
  byId: ReadonlyMap<string, SquadPlayerView>;
  index: SquadIndex;
  /** The club's XI with departed players hidden (they are pruned on the next action). */
  xi: ClubXi;
  view: XiView;
  validity: XiValidity;
  canSave: boolean;
  /** The last placement on this pitch, for its one-shot pop (ADR 0217). Null in previews. */
  fx: XiFx | null;
}

export type XiScreenModel = { kind: 'pending'; host: XiHost } | { kind: 'none'; host: XiHost } | XiScreenClub;

export interface XiScreenActions {
  back: () => void;
  openClubs: () => void;
  openLineups: () => void;
  openSave: () => void;
  openExport: () => void;
  tapSlot: (slot: SlotId, playerId: string | null) => void;
  tapBench: (index: number, playerId: string | null) => void;
  setFormation: (formation: FormationId) => void;
  mirror: () => void;
  clear: () => void;
  toggleBench: () => void;
  toggleFlat: () => void;
  flip: () => void;
  resetAngles: () => void;
  cameraEnd: (patch: { rotZ: number; tiltX: number }) => void;
  gestured: () => void;
}

const NO_PLAYERS: readonly SquadPlayerView[] = [];

export function useXiScreen(host: XiHost, fixedSlug: string | null): { model: XiScreenModel; actions: XiScreenActions } {
  const router = useRouter();
  const { copy } = useI18n();
  const xiCopy = copy.startingXi;
  const params = useLocalSearchParams<{ club?: string }>();
  const { favourite, followed } = usePreferences();
  const lastClub = useLastClub();
  const view = useXiView();
  const standings = useStandings();
  const teams = useTeams();

  // `?club=` on the TAB (a deep link): adopt it, then clear it — the Table
  // tab's `?league=` pattern (ADR 0185). Written because the reader asked for
  // this club, and cleared so a later pick in the club sheet is not overridden.
  const clubParam = host === 'tab' ? (params.club ?? null) : null;
  useEffect(() => {
    if (!clubParam) return;
    setLastClub(clubParam);
    router.setParams({ club: undefined });
  }, [clubParam, router]);

  const directory = useMemo(
    () => xiClubDirectory(standings.data?.tables, teams.data),
    [standings.data, teams.data],
  );
  const offered = offeredSlugs(directory, Boolean(standings.data && teams.data));
  const pick =
    host === 'club' && fixedSlug
      ? ({ kind: 'club', slug: fixedSlug } as const)
      : resolveXiClub({ param: clubParam, lastClub, favourite, followed, offered });
  const slug = pick.kind === 'club' ? pick.slug : null;

  const squadQuery = useClubSquad(slug ?? '');
  const xi = useClubXi(slug);
  const fx = useXiFx(slug);
  const players = squadQuery.data?.players ?? NO_PLAYERS;
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const index = useMemo(() => squadIndex(players), [players]);

  // Draw only players still in the squad; the prune happens inside the next action.
  const visible = useMemo<ClubXi>(() => {
    if (byId.size === 0) return xi;
    const placements: Record<SlotId, string> = {};
    for (const [slot, id] of Object.entries(xi.placements)) if (byId.has(id)) placements[slot] = id;
    return { ...xi, placements, bench: xi.bench.filter((id) => byId.has(id)) };
  }, [xi, byId]);

  const catalogueTeam = slug ? teams.data?.find((t) => t.slug === slug) : undefined;
  const league = slug ? leagueOfClub(standings.data?.tables, slug) : undefined;

  let model: XiScreenModel;
  if (pick.kind === 'pending') model = { kind: 'pending', host };
  else if (pick.kind === 'none' || !slug) model = { kind: 'none', host };
  else {
    const squadTeam = squadQuery.data?.team;
    const name = displayName(catalogueTeam?.name ?? squadTeam?.name ?? slug);
    const validity = validateXi(visible, index);
    const season = squadQuery.data?.season ?? SEASON;
    model = {
      kind: 'club',
      host,
      slug,
      squad: squadQuery.isPending ? 'pending' : players.length === 0 ? 'empty' : 'ready',
      team: {
        name,
        abbr: abbreviate(
          catalogueTeam?.name ?? squadTeam?.name ?? slug,
          slug,
          catalogueTeam?.shortName ?? squadTeam?.shortName ?? null,
        ),
        crest: catalogueTeam
          ? crestSrc(catalogueTeam.logoUrls, catalogueTeam.logoUrl, 'small')
          : (squadTeam?.crestUrl ?? null),
        watermark: catalogueTeam ? crestSrc(catalogueTeam.logoUrls, catalogueTeam.logoUrl, 'hero') : null,
        scene: catalogueTeam ? clubSceneTheme(catalogueTeam) : null,
      },
      meta: league ? `${league.name} · ${leagueSeasonLabel(league, season)}` : leagueSeasonLabel(undefined, season),
      league,
      players,
      byId,
      index,
      xi: visible,
      view,
      validity,
      canSave: validity.ready && xi.lineups.length < MAX_LINEUPS,
      fx,
    };
  }

  const act = (action: Parameters<typeof actXi>[1]) => {
    if (slug) actXi(slug, action, index);
  };

  const actions: XiScreenActions = {
    back: () => router.back(),
    openClubs: () => router.push({ pathname: '/(sheets)/xi-club', params: { current: slug ?? '' } }),
    openLineups: () => slug && router.push({ pathname: '/(sheets)/xi-lineups', params: { slug } }),
    openSave: () => slug && router.push({ pathname: '/(sheets)/xi-save', params: { slug } }),
    openExport: () => slug && router.push({ pathname: '/(sheets)/xi-export', params: { slug, host } }),
    tapSlot: (slot, playerId) => {
      if (!slug) return;
      if (playerId) router.push({ pathname: '/(sheets)/xi-player', params: { slug, id: playerId, slot } });
      else router.push({ pathname: '/(sheets)/xi-pick', params: { slug, slot } });
    },
    tapBench: (_index, playerId) => {
      if (!slug) return;
      if (playerId) router.push({ pathname: '/(sheets)/xi-player', params: { slug, id: playerId, slot: 'bench' } });
      else router.push({ pathname: '/(sheets)/xi-pick', params: { slug, slot: 'bench' } });
    },
    setFormation: (formation) => act({ type: 'setFormation', formation }),
    mirror: () => act({ type: 'mirror' }),
    clear: () => {
      if (Object.keys(visible.placements).length === 0 && visible.bench.length === 0) return;
      // ⚠ Kept from ADR 0065 though the handoff drops it: Clear takes the
      // bench too now, and a saved lineup is the only undo.
      Alert.alert(xiCopy.clearTitle, xiCopy.clearBody, [
        { text: xiCopy.cancel, style: 'cancel' },
        { text: xiCopy.clearConfirm, style: 'destructive', onPress: () => act({ type: 'clear' }) },
      ]);
    },
    toggleBench: () => setXiView({ benchOpen: !view.benchOpen }),
    toggleFlat: () => setXiView({ flat: !view.flat }),
    flip: () =>
      view.flat ? setXiView({ flatRot: view.flatRot === 0 ? 180 : 0 }) : setXiView({ rotZ: view.rotZ + 180 }),
    resetAngles: () => setXiView({ rotZ: 0, tiltX: CAMERA.tilt }),
    cameraEnd: (patch) => setXiView(patch),
    gestured: () => setXiView({ gestured: true }),
  };

  return { model, actions };
}
