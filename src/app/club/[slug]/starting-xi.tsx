/**
 * The Starting XI builder (ADR 0065) — `/club/[slug]/starting-xi`.
 *
 * Tap a slot, tap a player. The squad is a rail under the pitch, filtered to
 * the line you tapped; the three panels are root-stack sheets; export renders
 * a true 1080-px card off-screen and hands it to the system share sheet.
 * Design: `handoff_squad-builder/`.
 *
 * ⚠ Reads the SAME `useClubSquad(slug)` the club page filled — a cache read.
 * Persisted state (formation, look, placements, title) lives in
 * `store/starting-xi.ts`, keyed by club; the selection is local. The reducer
 * in `features/starting-xi/lineup.ts` is the only thing that changes either.
 *
 * ⚠ A FIXED column, no vertical `ScrollView`: the drag gesture on a placed
 * token must never compete with a scroll. On a short screen the pitch gives
 * up height (it is sized to what is left after the fixed rows), never the rail.
 *
 * ⚠ The capture host is HERE, not in the export sheet: a 9:16 card at @3x is
 * 640pt tall, taller than any detent. It mounts only while an export is
 * running, under the screen's opaque ground — never `opacity: 0` or
 * `display: 'none'`, both of which capture blank.
 *
 * ⚠ Departed players are hidden at render (`visiblePlaced`) and pruned inside
 * the next user action — never in an effect with a setState (lint baseline).
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, PixelRatio, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Crest, SkeletonRows, Text } from '@/components/atoms';
import { HintLine, XiToolbar } from '@/components/molecules';
import { LineupCard } from '@/components/organisms/lineup-card';
import { SquadRail } from '@/components/organisms/squad-rail';
import { StartingXiBoard } from '@/components/organisms/starting-xi-board';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { EXPORT_SIZES, type ExportSize } from '@/features/starting-xi/card-geometry';
import { FORMATIONS, lineOfPosition } from '@/features/starting-xi/formations';
import { hapticFor } from '@/features/starting-xi/haptics';
import { captureView, registerCapture } from '@/features/starting-xi/export';
import {
  NO_SELECTION,
  isFull,
  placedCount,
  reduce,
  visiblePlaced,
  type Action,
  type Selection,
} from '@/features/starting-xi/lineup';
import { abbreviate, displayName, primaryCompetition } from '@/lib/cronogol/derive';
import type { SquadPlayerView } from '@/lib/cronogol/types';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubFixtures, useClubSquad } from '@/queries/use-club';
import { commitLineup, useClubLineup } from '@/store/starting-xi';

/** Fixed rows under the pitch: toolbar, hint, chips, rail, and the gaps between. */
const BELOW_PITCH = Size.minTouch + 20 + Size.xiFilterH + Size.xiRailCard + 12 + Spacing.three * 4;
/** Above it: the club strip. */
const STRIP_H = Size.crestList + Spacing.three;

export default function StartingXiScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();
  const xi = copy.startingXi;

  const squad = useClubSquad(slug);
  const fixtures = useClubFixtures(slug);
  const lineup = useClubLineup(slug);

  const [selection, setSelection] = useState<Selection>(NO_SELECTION);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [exporting, setExporting] = useState<{ size: ExportSize; resolve: () => void } | null>(null);
  const cardRef = useRef<View>(null);

  const players = useMemo(() => squad.data?.players ?? [], [squad.data]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const ids = useMemo(() => new Set(players.map((p) => p.id)), [players]);
  const placed = useMemo(() => visiblePlaced(lineup.placed, ids), [lineup.placed, ids]);

  const dispatch = (action: Action) => {
    // Prune departed ids as part of this user action, then apply it.
    const pruned = reduce({ formation: lineup.formation, placed: lineup.placed, ...selection }, { type: 'prune', ids });
    const { state, effect } = reduce(pruned.state, action);
    setSelection({ slot: state.slot, filter: state.filter });
    commitLineup(slug, { formation: state.formation, placed: state.placed });
    void hapticFor(effect);
  };

  const openSheet = (pathname: '/(sheets)/xi-shape' | '/(sheets)/xi-look' | '/(sheets)/xi-export') => {
    dispatch({ type: 'deselect' });
    router.push({ pathname, params: { slug } });
  };

  // The export sheet asks for a capture; mount the card at true size, wait for
  // its images, then rasterise. Registered in an effect (React Compiler).
  useEffect(() => {
    registerCapture(
      (size) =>
        new Promise<string>((resolve, reject) => {
          let done = false;
          const timer = setTimeout(() => finish(), 4000);
          const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            captureView(cardRef)
              .then(resolve, reject)
              .finally(() => setExporting(null));
          };
          setExporting({ size, resolve: finish });
        }),
    );
    return () => registerCapture(null);
  }, []);

  if (squad.isPending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.eight, paddingHorizontal: Spacing.five }]}>
        <Stack.Screen options={header(xi.title)} />
        <SkeletonRows count={6} height={Size.rowSkeleton} />
      </View>
    );
  }

  if (!squad.data || players.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.eight, paddingHorizontal: Spacing.five }]}>
        <Stack.Screen options={header(xi.title)} />
        <View style={styles.empty}>
          <Text variant="headline">{xi.squadEmptyTitle}</Text>
          <Text variant="body" color="textDim">
            {xi.squadEmptyBody}
          </Text>
        </View>
      </View>
    );
  }

  const team = squad.data.team;
  const abbr = abbreviate(team.name, team.slug, team.shortName);
  const competition = fixtures.data ? primaryCompetition(fixtures.data.fixtures) : null;
  const slots = FORMATIONS[lineup.formation];
  const count = placedCount(placed);
  const full = isFull(placed);

  const selLabel = selection.slot === null ? null : slots[selection.slot]?.label ?? null;
  const selFilled = selection.slot !== null && placed[selection.slot] !== undefined;
  const hint =
    selLabel === null
      ? full
        ? xi.hintFull
        : xi.hintIdle
      : selFilled
        ? xi.hintSwap(selLabel)
        : xi.hintPick(selLabel);

  const bench = players
    .filter((p) => !Object.values(placed).includes(p.id))
    .filter((p) => selection.filter === 'all' || lineOfPosition(p.position) === selection.filter);

  const onLongPress = (slot: number) => {
    const id = placed[slot];
    if (id === undefined) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [xi.menuSwap, xi.menuRemove, xi.menuPlayer, xi.cancel],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 3,
        userInterfaceStyle: 'dark',
      },
      (index) => {
        if (index === 0) dispatch({ type: 'tapSlot', slot });
        else if (index === 1) dispatch({ type: 'remove', slot });
        else if (index === 2) router.push({ pathname: '/(sheets)/player', params: { slug, id } });
      },
    );
  };

  const onClear = () => {
    if (count === 0) return;
    Alert.alert(xi.clearTitle, xi.clearBody, [
      { text: xi.cancel, style: 'cancel' },
      { text: xi.clearConfirm, style: 'destructive', onPress: () => dispatch({ type: 'clear' }) },
    ]);
  };

  const pitchW = box ? box.w - Spacing.four * 2 : 0;
  const pitchH = box ? Math.min(pitchW * Size.xiPitchRatio, box.h - STRIP_H - BELOW_PITCH) : 0;

  const cardScale = 1 / PixelRatio.get();

  return (
    <View
      style={[styles.screen, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Stack.Screen
        options={{
          ...header(xi.title),
          headerRight: () => (
            <Pressable onPress={() => openSheet('/(sheets)/xi-export')} accessibilityRole="button" hitSlop={Spacing.two}>
              <Text variant="bodyStrong" color="accent">
                {xi.export}
              </Text>
            </Pressable>
          ),
        }}
      />

      {/* Club strip */}
      <View style={styles.strip}>
        <Crest src={team.crestUrl} fallback={abbr} size={Size.crestList} />
        <View style={styles.stripText}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {displayName(team.name)}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {xi.sourceLine(competition ?? '')}
          </Text>
        </View>
        <View style={[styles.count, full && styles.countFull]}>
          <Text variant="callout" tabular color={full ? 'onAccent' : 'textSecondary'}>
            {xi.placed(count)}
          </Text>
        </View>
      </View>

      {box ? (
        <>
          <View style={styles.pitchWrap}>
            <StartingXiBoard
              formation={lineup.formation}
              look={lineup.look}
              placed={placed}
              players={byId}
              selected={selection.slot}
              width={pitchW}
              height={pitchH}
              onTapSlot={(slot) => dispatch({ type: 'tapSlot', slot })}
              onDrop={(from, to) => dispatch({ type: 'dropOn', from, to })}
              onLongPress={onLongPress}
              slotLabel={(label) => xi.hintPick(label)}
            />
          </View>

          <View style={styles.tools}>
            <XiToolbar
              formation={lineup.formation}
              labels={{ shape: xi.shape, look: xi.look, autoFill: xi.autoFill, clear: xi.clear }}
              onShape={() => openSheet('/(sheets)/xi-shape')}
              onLook={() => openSheet('/(sheets)/xi-look')}
              onAutoFill={() =>
                dispatch({
                  type: 'autoFill',
                  squad: players.map((p) => ({ id: p.id, line: lineOfPosition(p.position) })),
                })
              }
              onClear={onClear}
            />
            <HintLine
              text={hint}
              active={selLabel !== null}
              removeLabel={selFilled ? xi.remove : undefined}
              onRemove={
                selFilled && selection.slot !== null
                  ? () => dispatch({ type: 'remove', slot: selection.slot as number })
                  : undefined
              }
            />
          </View>

          <SquadRail
            players={bench}
            filter={selection.filter}
            onFilter={(filter) => setSelection((s) => ({ ...s, filter }))}
            onPick={(p: SquadPlayerView) => dispatch({ type: 'tapPlayer', id: p.id, line: lineOfPosition(p.position) })}
            labels={{ all: xi.filterAll, lines: xi.lines, note: xi.squadNote }}
          />
        </>
      ) : null}

      {/* Off-screen capture host — true 1080 px at device pixel ratio. */}
      {exporting ? (
        <View
          ref={cardRef}
          collapsable={false}
          pointerEvents="none"
          style={[
            styles.capture,
            {
              width: EXPORT_SIZES[exporting.size].w * cardScale,
              height: EXPORT_SIZES[exporting.size].h * cardScale,
            },
          ]}>
          <LineupCard
            size={exporting.size}
            scale={cardScale}
            team={{ name: displayName(team.name), crestUrl: team.crestUrl, abbr }}
            title={lineup.title ?? xi.defaultTitle}
            formation={lineup.formation}
            look={lineup.look}
            placed={placed}
            players={byId}
            labels={{ cardLabel: xi.cardLabel, cardFormation: xi.cardFormation, cardUrl: xi.cardUrl }}
            onImagesSettled={exporting.resolve}
          />
        </View>
      ) : null}
    </View>
  );
}

function header(title: string) {
  return {
    headerShown: true,
    headerTitle: title,
    headerTintColor: Colors.dark.accent,
    headerStyle: { backgroundColor: Colors.dark.background },
    headerShadowVisible: false,
    headerTitleStyle: { color: Colors.dark.text },
    headerBackButtonDisplayMode: 'minimal' as const,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  empty: { backgroundColor: Colors.dark.card, borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two - 2,
    height: STRIP_H,
  },
  stripText: { flex: 1, minWidth: 0 },
  count: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two - 1,
    borderRadius: Radius.seg,
    backgroundColor: Colors.dark.card,
  },
  countFull: { backgroundColor: Colors.dark.accent },
  pitchWrap: { alignItems: 'center', paddingHorizontal: Spacing.four },
  tools: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.one },
  capture: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: -1,
    backgroundColor: Colors.dark.cardGround,
  },
});
