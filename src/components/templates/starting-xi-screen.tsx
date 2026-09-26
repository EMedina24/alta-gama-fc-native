/**
 * The Starting XI screen (ADR 0212–0217), from `handoff_lineup/` — one layout
 * for both hosts: the fifth TAB, and the builder PUSHED from a club page.
 *
 * Top to bottom, a FIXED column with no vertical ScrollView (a one-finger drag
 * on the pitch is the camera, and a scroll would fight it):
 * - the header: club, saved lineups, save;
 * - the controls: formation, export;
 * - the pitch card, which takes what is left;
 * - the bench row, and its tray when open.
 *
 * Prop-driven: `useXiScreen` owns the data and the actions. What lives here is
 * UI state — the pop-over, the slot whose sheet is open — and the export's
 * off-screen capture host.
 *
 * ⚠ The club scene is a BACKGROUND SIBLING that crossfades on a club switch,
 * never an ancestor of the controls or the tab bar: an animated opacity over
 * the tab's own subtree is trap 64.
 *
 * ⚠ The capture host is HERE, not in the export sheet: a 9:16 card at @3x is
 * 640pt tall, taller than any detent. It mounts only while an export is
 * running, UNDER the opaque scene — never `opacity: 0` or `display: 'none'`,
 * both of which capture blank (ADR 0065/0073).
 */
import { useFocusEffect, useIsFocused } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BookmarkGlyph,
  Button,
  Check,
  Chevron,
  GlassIconButton,
  LimeGlow,
  SceneGround,
  ShareGlyph,
  SkeletonRows,
  Text,
} from '@/components/atoms';
import { BenchTray } from '@/components/molecules/bench-tray';
import { FormationMenu } from '@/components/molecules/formation-menu';
import { GlassPill } from '@/components/molecules/glass-pill';
import { XiClubButton } from '@/components/molecules/xi-club-button';
import { LineupCard } from '@/components/organisms/lineup-card';
import { XiPitch } from '@/components/organisms/xi-pitch';
import {
  BottomTabInset,
  ClubScene,
  Colors,
  Radius,
  Size,
  Spacing,
  Xi,
  XiMotion,
} from '@/constants/theme';
import { EXPORT_SIZES, orbInitials, tokenName, type ExportSize } from '@/features/starting-xi/card-geometry';
import { captureView, registerCapture, type XiHost } from '@/features/starting-xi/export';
import { FORMATION_IDS, type SlotId } from '@/features/starting-xi/slots';
import type { XiScreenActions, XiScreenClub, XiScreenModel } from '@/features/starting-xi/use-xi-screen';
import { BENCH_SIZE } from '@/features/starting-xi/xi-state';
import { useI18n } from '@/lib/i18n/use-i18n';

export interface StartingXiScreenProps {
  model: XiScreenModel;
  actions: XiScreenActions;
  /** `_debug/xi?probe=1`. */
  probe?: boolean;
}

const SCENE_IN = FadeIn.duration(XiMotion.scene).reduceMotion(ReduceMotion.System);
const SCENE_OUT = FadeOut.duration(XiMotion.scene).reduceMotion(ReduceMotion.System);

export function StartingXiScreen({ model, actions, probe = false }: StartingXiScreenProps) {
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const padBottom = model.host === 'tab' ? BottomTabInset + Spacing.three : Math.max(insets.bottom, Spacing.seven);
  const column = [styles.column, { paddingTop: insets.top + Spacing.one, paddingBottom: padBottom }];

  if (model.kind !== 'club') {
    return (
      <View style={styles.screen}>
        <LimeGlow />
        <View style={column}>
          {model.kind === 'pending' ? (
            <SkeletonRows count={6} height={Size.rowSkeleton} />
          ) : (
            <View style={styles.emptyCard}>
              <Text variant="heroTitle">{xi.noClubTitle}</Text>
              <Text variant="body" color="textSecondary">
                {xi.noClubBody}
              </Text>
              <Button label={xi.pickClub} onPress={actions.openClubs} />
            </View>
          )}
        </View>
      </View>
    );
  }

  return <ClubScreen model={model} actions={actions} probe={probe} column={column} />;
}

function ClubScreen({
  model,
  actions,
  probe,
  column,
}: {
  model: XiScreenClub;
  actions: XiScreenActions;
  probe: boolean;
  column: object[];
}) {
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const { team, view, xi: club, validity } = model;
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const [controlsBottom, setControlsBottom] = useState(0);
  const [active, setActive] = useState<SlotId | 'bench' | null>(null);
  const capture = useCaptureHost(model);
  // ⚠ A placement lands while its sheet still covers the pitch, so its pop
  // waits for the screen to be focused again (ADR 0217).
  const focused = useIsFocused();

  // Back from a sheet: the slot it was opened for stops glowing.
  useFocusEffect(
    useCallback(() => {
      setActive(null);
    }, []),
  );

  const status = validity.noGk
    ? { tone: 'noGk' as const, label: xi.status.noGk }
    : validity.ready
      ? { tone: 'ready' as const, label: xi.status.ready }
      : { tone: 'count' as const, label: xi.status.count(validity.count) };

  const bench = Array.from({ length: BENCH_SIZE }, (_, i) => {
    const id = club.bench[i];
    const p = id === undefined ? undefined : model.byId.get(id);
    return p ? { id: p.id, initials: orbInitials(p), photoUrl: p.photoUrl, shirt: p.shirt, name: tokenName(p) } : null;
  });
  const placedCount = Object.keys(club.placements).length;
  const hasAnyone = placedCount > 0 || club.bench.length > 0;

  return (
    <View style={styles.screen}>
      {capture.host}
      <Animated.View key={model.slug} entering={SCENE_IN} exiting={SCENE_OUT} style={StyleSheet.absoluteFill}>
        {team.scene ? (
          <SceneGround
            kind="club"
            base={team.scene.base}
            glow={team.scene.glow}
            mark={
              team.watermark ? (
                <Image source={{ uri: team.watermark }} style={styles.watermark} contentFit="contain" accessible={false} />
              ) : null
            }
          />
        ) : (
          <LimeGlow />
        )}
      </Animated.View>

      <View style={column}>
        {/* Header */}
        <View style={styles.row}>
          {model.host === 'club' ? (
            <GlassIconButton onPress={actions.back} accessibilityLabel={xi.back}>
              <Chevron direction="left" color="text" />
            </GlassIconButton>
          ) : null}
          <XiClubButton
            crest={team.crest}
            abbr={team.abbr}
            name={team.name}
            meta={model.meta}
            onPress={model.host === 'tab' ? actions.openClubs : undefined}
            accessibilityHint={xi.clubHint}
          />
          <View>
            <GlassIconButton onPress={actions.openLineups} accessibilityLabel={xi.lineupsCount(club.lineups.length)}>
              <BookmarkGlyph size={17} />
            </GlassIconButton>
            {club.lineups.length > 0 ? (
              <View style={styles.countBadge} pointerEvents="none">
                <Text variant="rankBadge" color="onAccent">
                  {club.lineups.length}
                </Text>
              </View>
            ) : null}
          </View>
          <SaveCircle
            enabled={model.canSave}
            onPress={actions.openSave}
            label={xi.save}
            hint={validity.ready ? xi.limitReached : xi.saveHint}
          />
        </View>

        {/* Controls */}
        <View
          style={styles.row}
          onLayout={(e) => setControlsBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <GlassPill
            height={Xi.control}
            onPress={() => setMenuTop((open) => (open === null ? controlsBottom + Spacing.two : null))}
            accessibilityLabel={xi.formationA11y(club.formation)}
            accessibilityState={{ expanded: menuTop !== null }}
            disabled={model.squad !== 'ready'}>
            <Text variant="xiFormation" tabular>
              {club.formation}
            </Text>
            <Chevron color="textSecondary" expanded={menuTop !== null} />
          </GlassPill>
          <View style={styles.spacer} />
          <GlassPill
            height={Xi.control}
            padX={0}
            style={styles.circle}
            onPress={actions.openExport}
            disabled={placedCount === 0}
            accessibilityLabel={xi.export}
            accessibilityHint={placedCount === 0 ? xi.exportHint : undefined}>
            <ShareGlyph size={Size.shareGlyph} color={placedCount === 0 ? 'textFaint' : 'text'} />
          </GlassPill>
        </View>

        {/* Pitch */}
        {model.squad === 'ready' ? (
          <XiPitch
            formation={club.formation}
            placements={club.placements}
            players={model.byId}
            flat={view.flat}
            flatRot={view.flatRot}
            rotZ={view.rotZ}
            tiltX={view.tiltX}
            gestured={view.gestured}
            fx={focused ? model.fx : null}
            gkHint={!view.onboarded && placedCount === 0}
            rippleColor={team.scene?.glow ?? null}
            status={status}
            activeSlot={active === 'bench' ? null : active}
            labels={{
              reset: xi.reset,
              view3d: xi.view3d,
              viewFlat: xi.viewFlat,
              flip: xi.flip,
              tapHint: xi.tapHint,
              gestureFlat: xi.gestureFlat,
              gesture3d: xi.gesture3d,
              emptySlot: xi.emptySlot,
              filledSlot: xi.filledSlot,
            }}
            onTapSlot={(slot, playerId) => {
              setActive(slot);
              actions.tapSlot(slot, playerId);
            }}
            onToggleFlat={actions.toggleFlat}
            onFlip={actions.flip}
            onResetAngles={actions.resetAngles}
            onCameraEnd={actions.cameraEnd}
            onGestured={actions.gestured}
            probe={probe}
          />
        ) : (
          <View style={styles.placeholder}>
            {model.squad === 'pending' ? (
              <SkeletonRows count={6} height={Size.rowSkeleton} />
            ) : (
              <>
                <Text variant="headline">{xi.squadEmptyTitle}</Text>
                <Text variant="body" color="textSecondary">
                  {xi.squadEmptyBody}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Bench */}
        {model.squad === 'ready' ? (
          <>
            <View style={styles.row}>
              <GlassPill
                height={Xi.benchChipH}
                onPress={actions.toggleBench}
                accessibilityLabel={`${xi.bench}, ${xi.benchCount(club.bench.length, BENCH_SIZE)}`}
                accessibilityState={{ expanded: view.benchOpen }}>
                <Chevron color="textSecondary" expanded={view.benchOpen} />
                <Text variant="callout">{xi.bench}</Text>
                <Text variant="caption" color="textMuted" tabular>
                  {xi.benchCount(club.bench.length, BENCH_SIZE)}
                </Text>
              </GlassPill>
              <View style={styles.spacer} />
              <GlassPill height={Xi.benchChipH} onPress={actions.mirror} disabled={placedCount === 0} accessibilityLabel={xi.mirror}>
                <Text variant="caption" style={styles.chipLabel} color={placedCount === 0 ? 'textFaint' : 'text'}>
                  {xi.mirror}
                </Text>
              </GlassPill>
              <GlassPill height={Xi.benchChipH} onPress={actions.clear} disabled={!hasAnyone} accessibilityLabel={xi.clear}>
                <Text variant="caption" style={styles.chipLabel} color={hasAnyone ? 'text' : 'textFaint'}>
                  {xi.clear}
                </Text>
              </GlassPill>
            </View>
            {view.benchOpen ? (
              <BenchTray
                cells={bench}
                onPress={(index, id) => {
                  setActive('bench');
                  actions.tapBench(index, id);
                }}
                labels={{ empty: xi.benchEmpty, filled: xi.benchFilled }}
              />
            ) : null}
          </>
        ) : null}
      </View>

      {menuTop !== null ? (
        <FormationMenu
          title={xi.formation}
          value={club.formation}
          options={FORMATION_IDS}
          top={menuTop}
          left={Spacing.four}
          closeLabel={copy.sheets.close}
          onClose={() => setMenuTop(null)}
          onPick={(formation) => {
            // ⚠ One commit: the menu closes WITH the change (trap 71).
            setMenuTop(null);
            actions.setFormation(formation);
          }}
        />
      ) : null}
    </View>
  );
}

/** The header's Save: lime when the XI would save, a quiet circle when not. */
function SaveCircle({ enabled, onPress, label, hint }: { enabled: boolean; onPress: () => void; label: string; hint: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={enabled ? undefined : hint}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [styles.save, enabled ? styles.saveOn : styles.saveOff, pressed && styles.savePressed]}>
      <Check color={enabled ? 'onAccent' : 'textFaint'} size={18} />
    </Pressable>
  );
}

/**
 * The export's off-screen card: registered for this HOST on mount, drawn only
 * while a capture runs. Keyed by host (ADR 0214) because the tab's builder
 * stays mounted under a pushed one.
 */
function useCaptureHost(model: XiScreenClub): { host: ReactNode } {
  const { copy } = useI18n();
  const xi = copy.startingXi;
  const [exporting, setExporting] = useState<{ size: ExportSize; resolve: () => void } | null>(null);
  const cardRef = useRef<View>(null);
  const hostKey: XiHost = model.host;

  useEffect(
    () =>
      registerCapture(
        hostKey,
        (size) =>
          new Promise<string>((resolve, reject) => {
            let done = false;
            // Images have 4 s; if the host itself has not mounted by then, one
            // more 2 s before giving up with a reason that names the race.
            const timer = setTimeout(() => finish(), 4000);
            const finish = () => {
              if (done) return;
              if (!cardRef.current) {
                // ⚠ view-shot's ref guard does not fire on a null `current` —
                // it rejects with an opaque "findNodeHandle failed". Name it.
                setTimeout(() => {
                  if (done) return;
                  if (cardRef.current) finish();
                  else {
                    done = true;
                    setExporting(null);
                    reject(new Error('capture-host-not-mounted'));
                  }
                }, 2000);
                return;
              }
              done = true;
              clearTimeout(timer);
              captureView(cardRef)
                .then(resolve, reject)
                .finally(() => setExporting(null));
            };
            setExporting({ size, resolve: finish });
          }),
      ),
    [hostKey],
  );

  if (!exporting) return { host: null };
  const scale = 1 / PixelRatio.get();
  return {
    host: (
      <View
        ref={cardRef}
        collapsable={false}
        pointerEvents="none"
        style={[
          styles.capture,
          { width: EXPORT_SIZES[exporting.size].w * scale, height: EXPORT_SIZES[exporting.size].h * scale },
        ]}>
        <LineupCard
          size={exporting.size}
          scale={scale}
          team={{ name: model.team.name, crestUrl: model.team.crest, abbr: model.team.abbr }}
          title={model.xi.title ?? xi.defaultTitle}
          formation={model.xi.formation}
          placements={model.xi.placements}
          players={model.byId}
          labels={{ cardLabel: xi.cardLabel, cardFormation: xi.cardFormation, cardUrl: xi.cardUrl }}
          onImagesSettled={exporting.resolve}
        />
      </View>
    ),
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  column: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  spacer: { flex: 1 },
  circle: { width: Xi.control, alignItems: 'center' },
  watermark: { width: ClubScene.mark.width, height: ClubScene.mark.width, opacity: ClubScene.mark.alpha },
  countBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: Xi.countBadge,
    height: Xi.countBadge,
    borderRadius: Xi.countBadge / 2,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accent,
  },
  save: {
    width: Xi.circle,
    height: Xi.circle,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOn: { backgroundColor: Colors.dark.accent },
  saveOff: { backgroundColor: Colors.dark.xiControl, borderWidth: Size.glassBorder, borderColor: Colors.dark.hairlineStrong },
  savePressed: { transform: [{ scale: 0.96 }] },
  chipLabel: { fontWeight: '600' },
  placeholder: {
    flex: 1,
    borderRadius: Xi.cardRadius,
    padding: Spacing.five,
    gap: Spacing.two,
    backgroundColor: Colors.dark.xiCardFill,
  },
  emptyCard: { marginTop: Spacing.eight, gap: Spacing.four },
  capture: { position: 'absolute', left: 0, top: 0, zIndex: -1, backgroundColor: Colors.dark.cardGround },
});

