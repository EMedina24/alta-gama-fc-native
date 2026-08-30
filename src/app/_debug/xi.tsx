/**
 * Starting XI previews (ADR 0065) — the board auto-filled on a real squad, a
 * selected slot, and the export card at sheet width. Dev-only, like the
 * gallery: the builder's interactions cannot be driven from a script, so this
 * is where the FILLED states are looked at first.
 */
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkeletonRows, Text } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { LineupCard } from '@/components/organisms/lineup-card';
import { SquadRail } from '@/components/organisms/squad-rail';
import { StartingXiBoard } from '@/components/organisms/starting-xi-board';
import { XiExportSheet } from '@/components/organisms/xi-export-sheet';
import { Colors, Size, Spacing } from '@/constants/theme';
import { EXPORT_SIZES, type ExportSize } from '@/features/starting-xi/card-geometry';
import { lineOfPosition, type FormationId, type Look } from '@/features/starting-xi/formations';
import { autoFill } from '@/features/starting-xi/lineup';
import { abbreviate, displayName } from '@/lib/cronogol/derive';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';

const W = 353;

export default function DebugXi() {
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();
  const params = useLocalSearchParams<{ slug?: string; shape?: string; look?: string; size?: string; status?: string }>();
  const slug = params.slug ?? 'athletic-club';
  /** `?status=saved|denied|failed` renders the export sheet in that state (ADR 0074). */
  const status = params.status;
  const formation = (params.shape ?? '4-3-3') as FormationId;
  const look = (params.look ?? 'turf') as Look;
  const size = (params.size ?? '4:5') as ExportSize;

  const squad = useClubSquad(slug);
  /**
   * The real squad, with two portraits deliberately broken (ADR 0072): the
   * second player loses his photo (→ number token) and the third gets a URL
   * that 404s (→ number token via `onError`). Everything else is live, so
   * the mixed pitch a Premier League squad produces is on screen here too.
   */
  const players = useMemo(
    () =>
      (squad.data?.players ?? []).map((p, i) =>
        i === 1 ? { ...p, photoUrl: null } : i === 2 ? { ...p, photoUrl: 'https://altagamafc.crono-gol.com/missing.png' } : p,
      ),
    [squad.data],
  );
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const placed = useMemo(
    () => autoFill(formation, {}, players.map((p) => ({ id: p.id, line: lineOfPosition(p.position) }))),
    [formation, players],
  );

  if (!squad.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.eight, padding: Spacing.five }]}>
        <SkeletonRows count={6} height={Size.rowSkeleton} />
      </View>
    );
  }
  const team = squad.data.team;
  const xi = copy.startingXi;
  const scale = W / EXPORT_SIZES[size].w;

  const card = {
    team: { name: displayName(team.name), crestUrl: team.crestUrl, abbr: abbreviate(team.name, team.slug, team.shortName) },
    title: xi.defaultTitle,
    formation,
    look,
    placed,
    players: byId,
    labels: { cardLabel: xi.cardLabel, cardFormation: xi.cardFormation, cardUrl: xi.cardUrl },
  };

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
            save: xi.save, share: xi.share, note: xi.exportNote, done: xi.done,
          }}
          onDone={() => {}}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.six }]}>
      <SectionHeader title="Board" meta={`${formation} · ${look} · slot 9 selected`} />
      <StartingXiBoard
        formation={formation}
        look={look}
        placed={placed}
        players={byId}
        selected={9}
        width={W}
        height={W * Size.xiPitchRatio}
        onTapSlot={() => {}}
        onDrop={() => {}}
        onLongPress={() => {}}
        slotLabel={(l) => l}
      />
      <SectionHeader title="Rail" meta="portrait tiles · number badge · two broken on purpose" />
      <SquadRail
        players={players}
        filter="all"
        onFilter={() => {}}
        onPick={() => {}}
        labels={{ all: xi.filterAll, lines: xi.lines, note: xi.squadNote }}
      />
      <SectionHeader title="Card" meta={`${size} at ${Math.round(scale * 100)}%`} />
      <View style={{ width: W, height: EXPORT_SIZES[size].h * scale }}>
        <LineupCard {...card} size={size} scale={scale} />
      </View>
      <Text variant="caption" color="textFaint">
        ?slug=&shape=&look=&size= to vary
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four, paddingBottom: Spacing.eight },
});
