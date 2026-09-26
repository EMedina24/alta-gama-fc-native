/**
 * Starting XI previews (ADR 0065, rebuilt for 0212–0217). Dev-only, like the
 * gallery: taps and gestures cannot always be driven from a script, so the
 * DERIVED states are reached here and screenshotted.
 *
 * - `/_debug/xi?slug=&state=empty|partial|full|nogk|bench&shape=&view=flat|3d&rot=&tilt=&probe=1`
 *   — the REAL screen template over a synthetic XI on a real squad. Nothing is
 *   written to the store. `probe=1` draws the camera proof: marks drawn by the
 *   native transform and rings placed by `projectPoint`; coincident means the
 *   maths IS the transform (ADR 0216).
 * - `?card=1&size=4:5|1:1|9:16` — the export card at sheet width.
 * - `?status=saved|denied|failed` — the export sheet in that state (ADR 0074).
 * - `?seedV1=1` — writes a v1 blob (ADR 0065's shape) to storage for the
 *   migration check. Relaunch the app afterwards; hydration migrates it.
 *
 * ⚠ The synthetic XI seats players BY BAND in squad order — a debug fill, not
 * a prediction, and deliberately not reachable from the product.
 */
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkeletonRows, Text } from '@/components/atoms';
import { LineupCard } from '@/components/organisms/lineup-card';
import { XiExportSheet } from '@/components/organisms/xi-export-sheet';
import { StartingXiScreen } from '@/components/templates/starting-xi-screen';
import { Colors, Size, Spacing } from '@/constants/theme';
import { squadIndex } from '@/features/starting-xi/act';
import { EXPORT_SIZES, type ExportSize } from '@/features/starting-xi/card-geometry';
import { DEFAULT_VIEW } from '@/features/starting-xi/migrate';
import { CAMERA } from '@/features/starting-xi/projection';
import { FORMATION_SLOTS, bandOf, isFormationId, type SlotId } from '@/features/starting-xi/slots';
import type { XiScreenActions, XiScreenClub } from '@/features/starting-xi/use-xi-screen';
import { EMPTY_CLUB, validateXi, type ClubXi } from '@/features/starting-xi/xi-state';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { SEASON, leagueSeasonLabel } from '@/lib/cronogol/leagues';
import { clubSceneTheme } from '@/lib/cronogol/league-theme';
import { leagueOfClub } from '@/lib/cronogol/standings';
import type { SquadPlayerView } from '@/lib/cronogol/types';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { useStandings } from '@/queries/use-standings';
import { useTeams } from '@/queries/use-teams';
import { seedV1ForDebug } from '@/store/starting-xi';

const W = 353;

type State = 'empty' | 'partial' | 'full' | 'nogk' | 'bench';

/** Seat players by band in squad order — see the header. */
function syntheticXi(formation: ClubXi['formation'], players: readonly SquadPlayerView[], state: State): ClubXi {
  if (state === 'empty') return { ...EMPTY_CLUB, formation };
  const used = new Set<string>();
  const placements: Record<SlotId, string> = {};
  const slots = FORMATION_SLOTS[formation];
  const upTo = state === 'partial' ? 6 : slots.length;
  slots.slice(0, upTo).forEach((slot) => {
    const want = state === 'nogk' && slot === 'GK' ? 'DEF' : bandOf(slot);
    const p = players.find((q) => q.position === want && !used.has(q.id)) ?? players.find((q) => !used.has(q.id));
    if (p) {
      used.add(p.id);
      placements[slot] = p.id;
    }
  });
  const bench = state === 'bench' ? players.filter((p) => !used.has(p.id)).slice(0, 5).map((p) => p.id) : [];
  return { ...EMPTY_CLUB, formation, placements, bench };
}

const NOOP_ACTIONS: XiScreenActions = {
  back: () => {},
  openClubs: () => {},
  openLineups: () => {},
  openSave: () => {},
  openExport: () => {},
  tapSlot: () => {},
  tapBench: () => {},
  setFormation: () => {},
  mirror: () => {},
  clear: () => {},
  toggleBench: () => {},
  toggleFlat: () => {},
  flip: () => {},
  resetAngles: () => {},
  cameraEnd: () => {},
  gestured: () => {},
};

export default function DebugXi() {
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();
  const params = useLocalSearchParams<{
    slug?: string;
    state?: string;
    shape?: string;
    view?: string;
    rot?: string;
    tilt?: string;
    probe?: string;
    card?: string;
    size?: string;
    status?: string;
    seedV1?: string;
  }>();
  const slug = params.slug ?? 'barcelona';
  const state = (['empty', 'partial', 'full', 'nogk', 'bench'].includes(params.state ?? '') ? params.state : 'full') as State;
  const formation = isFormationId(params.shape) ? params.shape : '4-3-3';
  const size = (params.size ?? '4:5') as ExportSize;
  const xi = copy.startingXi;

  const [seeded, setSeeded] = useState<string | null>(null);
  useEffect(() => {
    if (params.seedV1 !== '1') return;
    const blob = JSON.stringify({
      v: 1,
      clubs: {
        [slug]: { formation: '4-2-3-1', look: 'turf', placed: {}, title: 'Seeded v1' },
      },
    });
    void seedV1ForDebug(blob).then(() => setSeeded(blob));
  }, [params.seedV1, slug]);

  const squad = useClubSquad(slug);
  const standings = useStandings();
  const teams = useTeams();
  const players = useMemo(() => squad.data?.players ?? [], [squad.data]);
  const club = useMemo(() => syntheticXi(formation, players, state), [formation, players, state]);

  if (params.seedV1 === '1') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.eight, padding: Spacing.five, gap: Spacing.three }]}>
        <Text variant="headline">{seeded ? 'Seeded a v1 blob — relaunch the app' : 'Seeding…'}</Text>
        <Text variant="caption" color="textSecondary">
          {seeded ?? ''}
        </Text>
      </View>
    );
  }

  if (!squad.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.eight, padding: Spacing.five }]}>
        <SkeletonRows count={6} height={Size.rowSkeleton} />
      </View>
    );
  }

  const team = squad.data.team;
  const byId = new Map(players.map((p) => [p.id, p]));
  const card = {
    team: { name: displayName(team.name), crestUrl: team.crestUrl, abbr: abbreviate(team.name, team.slug, team.shortName) },
    title: xi.defaultTitle,
    formation,
    placements: club.placements,
    players: byId,
    labels: { cardLabel: xi.cardLabel, cardFormation: xi.cardFormation, cardUrl: xi.cardUrl },
  };

  const status = params.status;
  if (status === 'saved' || status === 'denied' || status === 'failed') {
    const text = status === 'saved' ? xi.saved : status === 'denied' ? xi.photosDenied : xi.exportFailed;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top }}>
        <XiExportSheet
          card={card}
          size={size}
          onSize={() => {}}
          title={xi.defaultTitle}
          onTitle={() => {}}
          onSave={() => {}}
          onShare={() => {}}
          busy={false}
          status={{ kind: status, text }}
          labels={{
            heading: xi.exportTitle, cardTitle: xi.cardTitleLabel, sizes: xi.sizeLabels,
            save: xi.savePhotos, share: xi.share, note: xi.exportNote, done: xi.done,
          }}
          onDone={() => {}}
        />
      </ScrollView>
    );
  }

  if (params.card === '1') {
    const scale = W / EXPORT_SIZES[size].w;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.six }]}>
        <Text variant="caption" color="textFaint">
          {`${formation} · ${size} at ${Math.round(scale * 100)}%`}
        </Text>
        <View style={{ width: W, height: EXPORT_SIZES[size].h * scale }}>
          <LineupCard {...card} size={size} scale={scale} />
        </View>
      </ScrollView>
    );
  }

  const catalogueTeam = teams.data?.find((t) => t.slug === slug);
  const league = leagueOfClub(standings.data?.tables, slug);
  const index = squadIndex(players);
  const validity = validateXi(club, index);
  const flat = params.view !== '3d';
  const model: XiScreenClub = {
    kind: 'club',
    host: 'tab',
    slug,
    squad: 'ready',
    team: {
      name: displayName(team.name),
      abbr: abbreviate(team.name, team.slug, team.shortName),
      crest: catalogueTeam ? crestSrc(catalogueTeam.logoUrls, catalogueTeam.logoUrl, 'small') : team.crestUrl,
      watermark: catalogueTeam ? crestSrc(catalogueTeam.logoUrls, catalogueTeam.logoUrl, 'hero') : null,
      scene: catalogueTeam ? clubSceneTheme(catalogueTeam) : null,
    },
    meta: league ? `${league.name} · ${leagueSeasonLabel(league, SEASON)}` : leagueSeasonLabel(undefined, SEASON),
    league,
    players,
    byId,
    index,
    xi: club,
    view: {
      ...DEFAULT_VIEW,
      flat,
      rotZ: Number(params.rot ?? 0) || 0,
      tiltX: Number(params.tilt ?? CAMERA.tilt) || CAMERA.tilt,
      benchOpen: state === 'bench',
      gestured: true,
      onboarded: state !== 'empty',
    },
    validity,
    canSave: validity.ready,
    fx: null,
  };
  return <StartingXiScreen model={model} actions={NOOP_ACTIONS} probe={params.probe === '1'} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four, paddingBottom: Spacing.eight },
});
