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
import { StartingXiBoard } from '@/components/organisms/starting-xi-board';
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
  const params = useLocalSearchParams<{ slug?: string; shape?: string; look?: string; size?: string }>();
  const slug = params.slug ?? 'athletic-club';
  const formation = (params.shape ?? '4-3-3') as FormationId;
  const look = (params.look ?? 'turf') as Look;
  const size = (params.size ?? '4:5') as ExportSize;

  const squad = useClubSquad(slug);
  const players = useMemo(() => squad.data?.players ?? [], [squad.data]);
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
      <SectionHeader title="Card" meta={`${size} at ${Math.round(scale * 100)}%`} />
      <View style={{ width: W, height: EXPORT_SIZES[size].h * scale }}>
        <LineupCard
          size={size}
          scale={scale}
          team={{ name: displayName(team.name), crestUrl: team.crestUrl, abbr: abbreviate(team.name, team.slug, team.shortName) }}
          title={xi.defaultTitle}
          formation={formation}
          look={look}
          placed={placed}
          players={byId}
          labels={{ cardLabel: xi.cardLabel, cardFormation: xi.cardFormation, cardUrl: xi.cardUrl }}
        />
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
