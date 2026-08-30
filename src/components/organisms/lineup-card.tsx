/**
 * The shareable card (ADR 0065), drawn at `1080 × scale` — the export sheet's
 * preview and the off-screen capture are the SAME component at two scales,
 * which is what makes the preview honest.
 *
 * Contents, top to bottom, as the web card (`cronogol/components/starting-xi/card-face.tsx`):
 * crest · club name · title · accent rule · STARTING XI label · the Alta Gama
 * mark top-right · pitch with eleven tokens (portrait when the league has one,
 * shirt number otherwise) · formation pill · ALTAGAMAFC.COM.
 *
 * ⚠ Every dimension is `unit * scale`, fonts included, and every `Text` has
 * `allowFontScaling={false}`: the card is an image, not a screen, and Dynamic
 * Type must not reflow it.
 *
 * ⚠ Never tilts. The Angled look tilts the on-screen pitch only (decided
 * 2026-08-29); here it is line art with the lime stripe wash.
 *
 * ⚠ `onImagesSettled` fires once every portrait and the crest has loaded or
 * failed, so a capture can wait. Images use `transition={0}` — a capture in
 * the middle of a cross-fade is a half-faded portrait.
 */
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { SlotToken } from '@/components/atoms';
import { PitchSlots, PitchSurface } from '@/components/molecules';
import { Colors } from '@/constants/theme';
import {
  CARD,
  EXPORT_SIZES,
  initials,
  nameSize,
  pitchHeight,
  pitchTop,
  pitchWidth,
  titleSize,
  tokenName,
  type ExportSize,
} from '@/features/starting-xi/card-geometry';
import { FORMATIONS, type FormationId, type Look } from '@/features/starting-xi/formations';
import type { Placed } from '@/features/starting-xi/lineup';
import type { SquadPlayerView } from '@/lib/cronogol/types';

export interface LineupCardProps {
  size: ExportSize;
  scale: number;
  team: { name: string; crestUrl: string | null; abbr: string };
  title: string;
  formation: FormationId;
  look: Look;
  placed: Placed;
  players: ReadonlyMap<string, SquadPlayerView>;
  labels: { cardLabel: string; cardFormation: string; cardUrl: string };
  onImagesSettled?: () => void;
}

export function LineupCard({
  size,
  scale,
  team,
  title,
  formation,
  look,
  placed,
  players,
  labels,
  onImagesSettled,
}: LineupCardProps) {
  const { w, h } = EXPORT_SIZES[size];
  const s = (n: number) => n * scale;
  const slots = FORMATIONS[formation];
  const pw = pitchWidth();
  const ph = pitchHeight(h);

  // Count image settles: the crest (if any) plus one per portrait drawn.
  const portraits = slots.filter((_, i) => {
    const p = placed[i] === undefined ? undefined : players.get(placed[i]);
    return !!p?.photoUrl;
  }).length;
  const expected = portraits + (team.crestUrl ? 1 : 0);
  const settled = useRef(0);
  const settle = () => {
    settled.current += 1;
    if (settled.current >= expected) onImagesSettled?.();
  };
  // ⚠ In an effect, not during render (ADR 0073): the old inline `setTimeout`
  // fired on EVERY render and could report "settled" before the host's ref
  // existed. Runs once per mount per `expected`, after layout — and resets the
  // tally so a re-render with a different squad cannot short-count.
  useEffect(() => {
    settled.current = 0;
    if (expected === 0 && onImagesSettled) {
      const t = setTimeout(onImagesSettled, 0);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire per `expected`, not per callback identity
  }, [expected]);

  const tSize = titleSize(title);

  return (
    <View style={[styles.card, { width: s(w), height: s(h), borderRadius: 0 }]}>
      {/* Header */}
      <View style={[styles.header, { left: s(CARD.padX), top: s(CARD.padTop), right: s(CARD.padX) }]}>
        {team.crestUrl ? (
          <Image
            source={{ uri: team.crestUrl }}
            style={{ width: s(CARD.crest), height: s(CARD.crest) }}
            contentFit="contain"
            transition={0}
            cachePolicy="memory-disk"
            onLoad={settle}
            onError={settle}
            accessible={false}
          />
        ) : (
          <View
            style={[
              styles.crestTile,
              { width: s(CARD.crest), height: s(CARD.crest), borderRadius: s(28), borderWidth: s(3) },
            ]}>
            <RNText allowFontScaling={false} style={[styles.abbr, { fontSize: s(56) }]}>
              {team.abbr}
            </RNText>
          </View>
        )}
        <View style={[styles.titles, { marginLeft: s(CARD.crestGap) }]}>
          <RNText
            allowFontScaling={false}
            numberOfLines={1}
            style={[
              styles.club,
              { fontSize: s(CARD.clubSize), letterSpacing: s(CARD.clubTracking), marginBottom: s(14) },
            ]}>
            {team.name.toUpperCase()}
          </RNText>
          <RNText
            allowFontScaling={false}
            numberOfLines={2}
            style={[styles.title, { fontSize: s(tSize), lineHeight: s(tSize * 1.05), letterSpacing: s(-tSize * 0.02) }]}>
            {title.toUpperCase()}
          </RNText>
          <View style={[styles.rule, { width: s(CARD.ruleW), height: s(CARD.ruleH), marginVertical: s(18) }]} />
          <RNText
            allowFontScaling={false}
            style={[styles.label, { fontSize: s(CARD.labelSize), letterSpacing: s(CARD.labelTracking) }]}>
            {labels.cardLabel.toUpperCase()}
          </RNText>
        </View>
      </View>

      {/* The Alta Gama mark, top-right (logos/mark-currentcolor.svg). */}
      <Svg
        width={s(CARD.mark)}
        height={s(CARD.mark * (30 / 42))}
        viewBox="0 0 42 30"
        style={{ position: 'absolute', right: s(CARD.padX), top: s(CARD.padTop) }}
        accessible={false}>
        <Rect x={1.25} y={1.25} width={39.5} height={27.5} rx={4.75} stroke={Colors.dark.accent} strokeWidth={2.5} fill="none" />
        <Path d="M21 1.25V8.5M21 21.5V28.75M0 8.25H4.75V21.75H0M42 8.25H37.25V21.75H42" stroke={Colors.dark.accent} strokeWidth={2.5} fill="none" />
        <Circle cx={21} cy={15} r={5.25} stroke={Colors.dark.accent} strokeWidth={2.5} fill="none" />
      </Svg>

      {/* Pitch */}
      <View style={{ position: 'absolute', left: s(CARD.padX), top: s(pitchTop()) }}>
        <PitchSurface
          look={look === 'angled' ? 'angled' : look}
          width={s(pw)}
          height={s(ph)}
          borderRadius={s(CARD.pitchRadius)}>
          <PitchSlots
            slots={slots}
            width={s(pw)}
            height={s(ph)}
            ring={s(CARD.ring)}
            columnWidth={s(CARD.captionMax + 20)}
            renderSlot={(slot, i) => {
              const id = placed[i];
              const player = id === undefined ? undefined : players.get(id);
              if (!player) {
                return (
                  <SlotToken
                    mode="empty"
                    label={slot.label}
                    size={s(CARD.ring)}
                    labelSize={s(CARD.chipSize * 1.4)}
                  />
                );
              }
              const name = tokenName(player);
              return (
                <SlotToken
                  mode="filled"
                  label={player.shirt === null ? initials(player.name) : String(player.shirt)}
                  caption={name.toUpperCase()}
                  portrait={player.photoUrl}
                  onPortraitSettled={settle}
                  size={s(CARD.ring)}
                  captionWidth={s(CARD.captionMax)}
                  labelSize={s(CARD.numeral)}
                  captionSize={s(nameSize(name))}
                />
              );
            }}
          />
        </PitchSurface>
      </View>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { left: s(CARD.padX), right: s(CARD.padX), bottom: s(CARD.padTop), height: s(CARD.pillH) },
        ]}>
        <View style={[styles.pill, { width: s(CARD.pillW), height: s(CARD.pillH), borderRadius: s(CARD.pillH / 2) }]}>
          <RNText allowFontScaling={false} style={[styles.pillText, { fontSize: s(CARD.pillSize) }]}>
            {formation}
          </RNText>
        </View>
        <RNText
          allowFontScaling={false}
          style={[
            styles.footerWord,
            { fontSize: s(CARD.footerSize), letterSpacing: s(CARD.footerTracking), marginLeft: s(20) },
          ]}>
          {labels.cardFormation.toUpperCase()}
        </RNText>
        <View style={styles.spacer} />
        <RNText
          allowFontScaling={false}
          style={[styles.url, { fontSize: s(CARD.footerSize), letterSpacing: s(CARD.footerTracking) }]}>
          {labels.cardUrl}
        </RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.dark.cardGround, overflow: 'hidden' },
  header: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-start' },
  crestTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.dark.hairlineStrong,
    backgroundColor: Colors.dark.raised,
  },
  abbr: { color: Colors.dark.textSecondary, fontWeight: '800' },
  titles: { flex: 1, minWidth: 0, justifyContent: 'center' },
  club: { color: Colors.dark.accent, fontWeight: '800' },
  title: { color: Colors.dark.text, fontWeight: '800' },
  rule: { backgroundColor: Colors.dark.accent },
  label: { color: Colors.dark.textMuted, fontWeight: '700' },
  footer: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  pill: { backgroundColor: Colors.dark.accent, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: Colors.dark.onAccent, fontWeight: '800', fontVariant: ['tabular-nums'] },
  footerWord: { color: Colors.dark.textFaint, fontWeight: '700' },
  spacer: { flex: 1 },
  url: { color: Colors.dark.textMuted, fontWeight: '700' },
});
